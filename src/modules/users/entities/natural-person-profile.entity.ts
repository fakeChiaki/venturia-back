import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InterestArea } from '../../catalogs/entities/interest-area.entity';
import { Role } from '../../catalogs/entities/role.entity';
import { TechnicalArea } from '../../catalogs/entities/technical-area.entity';
import { Methodology } from '../../../common/enums/methodology.enum';
import { User } from './user.entity';

export enum NaturalPersonSubtype {
  CREATOR = 'creator',
  DEVELOPER = 'developer',
}

/**
 * Disponibilidad horaria declarada en el onboarding (RF-04).
 * Ej: { "days": ["mon", "wed"], "from": "18:00", "to": "21:00" }
 */
export interface AvailabilitySchedule {
  days: string[];
  from: string;
  to: string;
}

@Entity('natural_person_profiles')
export class NaturalPersonProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.naturalPersonProfile, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  user: User;

  @Column({ unique: true })
  userId: string;

  @Column({ type: 'enum', enum: NaturalPersonSubtype, nullable: true })
  subtype: NaturalPersonSubtype | null;

  @Column({ length: 150 })
  fullName: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  photoUrl: string | null;

  // CV en PDF (RF-01)
  @Column({ type: 'varchar', length: 500, nullable: true })
  cvUrl: string | null;

  // Campos del onboarding técnico (RF-04); null hasta completarlo
  @ManyToMany(() => TechnicalArea)
  @JoinTable({
    name: 'profile_technical_areas',
    joinColumn: { name: 'profile_id' },
    inverseJoinColumn: { name: 'technical_area_id' },
  })
  technicalAreas: TechnicalArea[];

  @Column({ type: 'enum', enum: Methodology, nullable: true })
  methodology: Methodology | null;

  @Column({ type: 'int', nullable: true })
  weeklyHours: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  timezone: string | null;

  @Column({ type: 'jsonb', nullable: true })
  availability: AvailabilitySchedule | null;

  @Column({ default: false })
  onboardingCompleted: boolean;

  @ManyToMany(() => Role)
  @JoinTable({
    name: 'profile_roles',
    joinColumn: { name: 'profile_id' },
    inverseJoinColumn: { name: 'role_id' },
  })
  roles: Role[];

  @ManyToMany(() => InterestArea)
  @JoinTable({
    name: 'profile_interest_areas',
    joinColumn: { name: 'profile_id' },
    inverseJoinColumn: { name: 'interest_area_id' },
  })
  interestAreas: InterestArea[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
