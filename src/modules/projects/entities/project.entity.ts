import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InterestArea } from '../../catalogs/entities/interest-area.entity';
import { TechnicalArea } from '../../catalogs/entities/technical-area.entity';
import { Methodology } from '../../../common/enums/methodology.enum';
import { NaturalPersonProfile } from '../../users/entities/natural-person-profile.entity';
import { ProjectMedia } from './project-media.entity';
import { ProjectRoleRequirement } from './project-role-requirement.entity';

export enum ProjectStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  NEGOTIATING = 'negotiating',
  FUNDED = 'funded',
  SEEKING_TEAM = 'seeking_team',
  IN_PROGRESS = 'in_progress',
  FINISHED = 'finished',
  CANCELLED = 'cancelled',
}

export type FieldVisibility = Record<string, boolean>;

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => NaturalPersonProfile, { onDelete: 'CASCADE' })
  creator: NaturalPersonProfile;

  @Column()
  creatorId: string;

  @Column({ length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  privateDescription: string | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  fundingGoal: number | null;

  @ManyToMany(() => TechnicalArea)
  @JoinTable({
    name: 'project_technical_areas',
    joinColumn: { name: 'project_id' },
    inverseJoinColumn: { name: 'technical_area_id' },
  })
  technicalAreas: TechnicalArea[];

  @Column({ type: 'enum', enum: Methodology })
  methodology: Methodology;

  @Column({ type: 'jsonb', nullable: true })
  schedule: any | null;

  @Column({ type: 'int', nullable: true })
  weeklyHours: number | null;

  @Index()
  @Column({ type: 'enum', enum: ProjectStatus, default: ProjectStatus.DRAFT })
  status: ProjectStatus;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  fieldVisibility: FieldVisibility;

  @OneToMany(() => ProjectRoleRequirement, (req) => req.project, {
    cascade: true,
  })
  roleRequirements: ProjectRoleRequirement[];

  @OneToMany(() => ProjectMedia, (media) => media.project, { cascade: true })
  media: ProjectMedia[];

  @ManyToMany(() => InterestArea)
  @JoinTable({
    name: 'project_interest_areas',
    joinColumn: { name: 'project_id' },
    inverseJoinColumn: { name: 'interest_area_id' },
  })
  interestAreas: InterestArea[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;
}
