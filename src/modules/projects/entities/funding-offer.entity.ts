import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NumericTransformer } from '../../../common/transformers/numeric.transformer';
import { CompanyProfile } from '../../companies/entities/company-profile.entity';
import { Project } from './project.entity';

export enum FundingOfferStatus {
  PENDING = 'pending',
  COUNTERED = 'countered',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

@Entity('funding_offers')
export class FundingOffer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  project: Project;

  @Column()
  projectId: string;

  @ManyToOne(() => CompanyProfile, { onDelete: 'CASCADE' })
  company: CompanyProfile;

  @Column()
  companyId: string;

  @Column({ type: 'numeric', precision: 14, scale: 2, transformer: new NumericTransformer() })
  amount: number;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'int', default: 1 })
  round: number;

  @ManyToOne(() => FundingOffer, { nullable: true, onDelete: 'SET NULL' })
  parentOffer: FundingOffer | null;

  @Column({ type: 'uuid', nullable: true })
  parentOfferId: string | null;

  @Column({
    type: 'enum',
    enum: FundingOfferStatus,
    default: FundingOfferStatus.PENDING,
  })
  status: FundingOfferStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
