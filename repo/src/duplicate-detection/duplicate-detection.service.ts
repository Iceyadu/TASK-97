import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DuplicateGroup } from './duplicate-group.entity';
import { DuplicateLink } from './duplicate-link.entity';
import { CanonicalLink } from './canonical-link.entity';
import { ParsedDocument } from '../parsed-documents/parsed-document.entity';
import { createHash } from 'crypto';
import { AuditService } from '../audit/audit.service';

const SHINGLE_SIZE = 5; // 5-word shingles
const MINHASH_PERMUTATIONS = 128;
const SIMILARITY_THRESHOLD = 0.8;

@Injectable()
export class DuplicateDetectionService {
  constructor(
    @InjectRepository(DuplicateGroup)
    private groupRepo: Repository<DuplicateGroup>,
    @InjectRepository(DuplicateLink)
    private linkRepo: Repository<DuplicateLink>,
    @InjectRepository(CanonicalLink)
    private canonicalRepo: Repository<CanonicalLink>,
    @InjectRepository(ParsedDocument)
    private parsedDocRepo: Repository<ParsedDocument>,
    private auditService: AuditService,
  ) {}

  /**
   * Detect exact duplicates by content hash.
   */
  async detectExactDuplicates(documentId: string): Promise<DuplicateLink[]> {
    const doc = await this.parsedDocRepo.findOne({
      where: { id: documentId },
    });
    if (!doc) return [];

    const duplicates = await this.parsedDocRepo.find({
      where: { contentHash: doc.contentHash },
    });

    const links: DuplicateLink[] = [];
    for (const dup of duplicates) {
      if (dup.id === doc.id) continue;

      // Check if link already exists
      const existing = await this.linkRepo.findOne({
        where: [
          { docAId: doc.id, docBId: dup.id },
          { docAId: dup.id, docBId: doc.id },
        ],
      });
      if (existing) continue;

      const groupId = await this.resolveOrCreateGroupId(doc.id, dup.id);
      const link = this.linkRepo.create({
        groupId,
        docAId: doc.id,
        docBId: dup.id,
        similarityScore: 1.0,
      });
      links.push(await this.linkRepo.save(link));
    }

    return links;
  }

  /**
   * Detect near-duplicates using MinHash/shingle overlap.
   */
  async detectNearDuplicates(documentId: string): Promise<DuplicateLink[]> {
    const doc = await this.parsedDocRepo.findOne({
      where: { id: documentId },
    });
    if (!doc) return [];

    const docShingles = this.generateShingles(doc.contentText);
    const docMinHash = this.computeMinHash(docShingles);

    // Compare against all other documents
    const allDocs = await this.parsedDocRepo.find();
    const links: DuplicateLink[] = [];

    for (const other of allDocs) {
      if (other.id === doc.id) continue;
      if (other.contentHash === doc.contentHash) continue; // Already caught by exact

      const otherShingles = this.generateShingles(other.contentText);
      const otherMinHash = this.computeMinHash(otherShingles);

      const similarity = this.estimateJaccard(docMinHash, otherMinHash);

      if (similarity >= SIMILARITY_THRESHOLD) {
        const existing = await this.linkRepo.findOne({
          where: [
            { docAId: doc.id, docBId: other.id },
            { docAId: other.id, docBId: doc.id },
          ],
        });
        if (existing) continue;

        const groupId = await this.resolveOrCreateGroupId(doc.id, other.id);
        const link = this.linkRepo.create({
          groupId,
          docAId: doc.id,
          docBId: other.id,
          similarityScore: similarity,
        });
        links.push(await this.linkRepo.save(link));
      }
    }

    return links;
  }

  /**
   * Designate a canonical record from a set of duplicates.
   */
  async mergeCanonical(
    sourceAssetIds: string[],
    canonicalAssetId: string,
    userId: string,
  ): Promise<CanonicalLink[]> {
    const links: CanonicalLink[] = [];

    for (const sourceId of sourceAssetIds) {
      if (sourceId === canonicalAssetId) continue;

      const existing = await this.canonicalRepo.findOne({
        where: { sourceAssetId: sourceId },
      });
      if (existing) continue;

      const link = this.canonicalRepo.create({
        sourceAssetId: sourceId,
        canonicalAssetId,
        mergedBy: userId,
      });
      links.push(await this.canonicalRepo.save(link));
    }

    await this.auditService.recordEvent({
      action: 'duplicate.merge',
      resourceType: 'content_assets',
      resourceId: canonicalAssetId,
      actorId: userId,
      changes: { sourceAssetIds, canonicalAssetId },
    });

    return links;
  }

  /**
   * Generate w-word shingles from text.
   */
  generateShingles(text: string): Set<string> {
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    const shingles = new Set<string>();
    for (let i = 0; i <= words.length - SHINGLE_SIZE; i++) {
      shingles.add(words.slice(i, i + SHINGLE_SIZE).join(' '));
    }
    return shingles;
  }

  /**
   * Compute MinHash signature for a set of shingles.
   */
  computeMinHash(shingles: Set<string>): number[] {
    const signature: number[] = new Array(MINHASH_PERMUTATIONS).fill(Infinity);

    for (const shingle of shingles) {
      for (let i = 0; i < MINHASH_PERMUTATIONS; i++) {
        const hash = this.hashShingle(shingle, i);
        if (hash < signature[i]) {
          signature[i] = hash;
        }
      }
    }

    return signature;
  }

  /**
   * Estimate Jaccard similarity from two MinHash signatures.
   */
  estimateJaccard(sig1: number[], sig2: number[]): number {
    let matches = 0;
    for (let i = 0; i < sig1.length; i++) {
      if (sig1[i] === sig2[i]) matches++;
    }
    return matches / sig1.length;
  }

  private hashShingle(shingle: string, seed: number): number {
    const hash = createHash('sha256')
      .update(`${seed}:${shingle}`)
      .digest();
    // Use first 4 bytes as a 32-bit integer
    return hash.readUInt32BE(0);
  }

  async getDuplicateLinks(documentId: string): Promise<DuplicateLink[]> {
    return this.linkRepo.find({
      where: [{ docAId: documentId }, { docBId: documentId }],
    });
  }

  private async resolveOrCreateGroupId(
    docAId: string,
    docBId: string,
  ): Promise<string> {
    const anyLinkedGroup = await this.linkRepo
      .createQueryBuilder('dl')
      .where(
        '(dl.docAId = :docAId OR dl.docBId = :docAId OR dl.docAId = :docBId OR dl.docBId = :docBId)',
        { docAId, docBId },
      )
      .andWhere('dl.groupId IS NOT NULL')
      .orderBy('dl.detectedAt', 'ASC')
      .getOne();

    if (anyLinkedGroup?.groupId) {
      return anyLinkedGroup.groupId;
    }

    const group = await this.groupRepo.save(
      this.groupRepo.create({
        canonicalDocumentId: docAId,
      }),
    );
    return group.id;
  }
}
