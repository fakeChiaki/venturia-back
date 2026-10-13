import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { NumericTransformer } from '../../../common/transformers/numeric.transformer';
import { Project } from '../../projects/entities/project.entity';
import { NaturalPersonProfile } from '../../users/entities/natural-person-profile.entity';

/**
 * RF-08: índice de afinidad perfil × proyecto, precalculado por workers
 * (BullMQ) y recalculado al cambiar el perfil (RF-11). El feed (RF-09)
 * ordena por score descendente usando el índice (profile_id, score).
 */
@Entity('affinity_scores')
@Unique(['profileId', 'projectId'])
@Index(['profileId', 'score'])
export class AffinityScore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => NaturalPersonProfile, { onDelete: 'CASCADE' })
  profile: NaturalPersonProfile;

  @Column()
  profileId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  project: Project;

  @Column()
  projectId: string;

  // 0.00 a 100.00
  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    transformer: new NumericTransformer(),
  })
  score: number;

  /**
   * Desglose por dimensión para depurar/explicar el cálculo.
   * Ej: { "roles": 40, "interests": 25, "methodology": 15, "availability": 20 }
   */
  @Column({ type: 'jsonb', nullable: true })
  breakdown: Record<string, number> | null;

  @UpdateDateColumn()
  computedAt: Date;
}
