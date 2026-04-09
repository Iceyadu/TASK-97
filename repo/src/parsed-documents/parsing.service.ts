import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParsedDocument } from './parsed-document.entity';
import { ContentFeature } from '../content/content-feature.entity';
import { createHash } from 'crypto';

const SHINGLE_SIZE = 5;

interface ParsedChapter {
  index: number;
  title: string | null;
  text: string;
}

@Injectable()
export class ParsingService {
  constructor(
    @InjectRepository(ParsedDocument)
    private parsedDocRepo: Repository<ParsedDocument>,
    @InjectRepository(ContentFeature)
    private featureRepo: Repository<ContentFeature>,
  ) {}

  async parseAndStore(
    versionId: string,
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<ParsedDocument[]> {
    let chapters: ParsedChapter[];

    if (mimeType.includes('pdf') || mimeType.includes('application/pdf')) {
      chapters = await this.parsePdf(fileBuffer);
    } else if (mimeType.includes('epub')) {
      chapters = await this.parseEpub(fileBuffer);
    } else if (mimeType.includes('text/plain')) {
      chapters = this.parsePlainText(fileBuffer);
    } else {
      // Non-text formats (mp4, mp3) — no text extraction
      return [];
    }

    const docs: ParsedDocument[] = [];
    for (const chapter of chapters) {
      const normalized = this.normalizeText(chapter.text);
      const contentHash = createHash('sha256').update(normalized).digest('hex');

      const doc = this.parsedDocRepo.create({
        versionId,
        chapterIndex: chapter.index,
        title: chapter.title,
        contentText: chapter.text,
        contentHash,
      });
      docs.push(await this.parsedDocRepo.save(doc));
    }

    return docs;
  }

  normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // remove punctuation
      .replace(/\s+/g, ' ') // collapse whitespace
      .trim();
  }

  computeContentHash(text: string): string {
    const normalized = this.normalizeText(text);
    return createHash('sha256').update(normalized).digest('hex');
  }

  private async parsePdf(buffer: Buffer): Promise<ParsedChapter[]> {
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);

      // Split by page markers or double newlines
      const pages = data.text.split(/\n{3,}/);
      return pages
        .filter((p: string) => p.trim().length > 0)
        .map((text: string, index: number) => ({
          index,
          title: `Page ${index + 1}`,
          text: text.trim(),
        }));
    } catch {
      return [
        { index: 0, title: 'Document', text: buffer.toString('utf8', 0, Math.min(buffer.length, 10000)) },
      ];
    }
  }

  private async parseEpub(buffer: Buffer): Promise<ParsedChapter[]> {
    try {
      // epub2 expects a file path, so we work with the buffer content
      // For now, extract text from the ZIP structure
      const content = buffer.toString('utf8');
      // Basic extraction: find text between XML tags
      const textBlocks = content.match(/<p[^>]*>([^<]+)<\/p>/gi) || [];
      const text = textBlocks
        .map((block) => block.replace(/<[^>]+>/g, '').trim())
        .filter((t) => t.length > 0)
        .join('\n\n');

      if (text.length > 0) {
        const paragraphs = text.split(/\n{2,}/);
        const chapterSize = Math.max(1, Math.ceil(paragraphs.length / 10));
        const chapters: ParsedChapter[] = [];
        for (let i = 0; i < paragraphs.length; i += chapterSize) {
          chapters.push({
            index: chapters.length,
            title: `Chapter ${chapters.length + 1}`,
            text: paragraphs.slice(i, i + chapterSize).join('\n\n'),
          });
        }
        return chapters;
      }
      return [{ index: 0, title: 'Document', text: 'No extractable text content' }];
    } catch {
      return [{ index: 0, title: 'Document', text: 'Parse error' }];
    }
  }

  private parsePlainText(buffer: Buffer): ParsedChapter[] {
    const text = buffer.toString('utf8');
    const sections = text.split(/\n{2,}/);

    if (sections.length <= 1) {
      return [{ index: 0, title: 'Document', text: text.trim() }];
    }

    return sections
      .filter((s) => s.trim().length > 0)
      .map((section, index) => ({
        index,
        title: `Section ${index + 1}`,
        text: section.trim(),
      }));
  }

  /**
   * Extract and store features for all parsed documents of a version.
   */
  async extractAndStoreFeatures(
    versionId: string,
    documents: ParsedDocument[],
  ): Promise<ContentFeature[]> {
    const features: ContentFeature[] = [];
    for (const doc of documents) {
      const text = doc.contentText;
      const tokenCount = text.split(/\s+/).filter(Boolean).length;
      const language = this.detectLanguage(text);
      const shingleHashes = this.computeShingleHashes(text);

      const feature = this.featureRepo.create({
        versionId,
        documentId: doc.id,
        tokenCount,
        language,
        shingleHashes,
      });
      features.push(await this.featureRepo.save(feature));
    }
    return features;
  }

  private detectLanguage(text: string): string | null {
    // Simple heuristic: check for common words in major languages
    const sample = text.toLowerCase().substring(0, 2000);
    const enWords = ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'that', 'it', 'for'];
    const frWords = ['le', 'la', 'les', 'de', 'des', 'un', 'une', 'et', 'est', 'en'];
    const esWords = ['el', 'la', 'los', 'las', 'de', 'en', 'un', 'una', 'que', 'es'];
    const deWords = ['der', 'die', 'das', 'und', 'ist', 'ein', 'eine', 'den', 'von', 'zu'];

    const words = sample.split(/\s+/);
    const count = (targets: string[]) =>
      words.filter((w) => targets.includes(w)).length;

    const scores = [
      { lang: 'en', score: count(enWords) },
      { lang: 'fr', score: count(frWords) },
      { lang: 'es', score: count(esWords) },
      { lang: 'de', score: count(deWords) },
    ];
    const best = scores.sort((a, b) => b.score - a.score)[0];
    return best.score >= 3 ? best.lang : null;
  }

  private computeShingleHashes(text: string): number[] {
    const normalized = this.normalizeText(text);
    const words = normalized.split(/\s+/).filter(Boolean);
    const hashes: number[] = [];
    for (let i = 0; i <= words.length - SHINGLE_SIZE; i++) {
      const shingle = words.slice(i, i + SHINGLE_SIZE).join(' ');
      const hash = createHash('sha256').update(shingle).digest();
      hashes.push(hash.readUInt32BE(0));
    }
    return hashes;
  }

  async findByVersionId(versionId: string): Promise<ParsedDocument[]> {
    return this.parsedDocRepo.find({
      where: { versionId },
      order: { chapterIndex: 'ASC' },
    });
  }
}
