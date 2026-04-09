import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { ContentAssetVersion } from './content-asset-version.entity';
import { Category } from '../categories/category.entity';
import { Tag } from '../tags/tag.entity';

export enum AssetType {
  BOOK = 'book',
  CHAPTER = 'chapter',
  MEDIA = 'media',
}

@Entity('content_assets')
export class ContentAsset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'varchar', length: 20 })
  assetType: AssetType;

  @Column({ type: 'varchar', length: 500, nullable: true })
  author: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  publisher: string | null;

  @Column({ type: 'date', nullable: true })
  effectiveFrom: Date | null;

  @Column({ type: 'date', nullable: true })
  effectiveTo: Date | null;

  @Column({ type: 'boolean', default: true })
  isCanonical: boolean;

  @Column({ type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => ContentAssetVersion, (v) => v.asset)
  versions: ContentAssetVersion[];

  @ManyToMany(() => Category)
  @JoinTable({
    name: 'asset_categories',
    joinColumn: { name: 'assetId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'categoryId', referencedColumnName: 'id' },
  })
  categories: Category[];

  @ManyToMany(() => Tag)
  @JoinTable({
    name: 'asset_tags',
    joinColumn: { name: 'assetId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' },
  })
  tags: Tag[];
}
