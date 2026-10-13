import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { CompanyOwner } from './company-owner.entity';

/**
 * Horario de atención por día (RF-02).
 * Ej: { "mon": { "from": "09:00", "to": "18:00" }, ... }
 */
export type BusinessHours = Record<string, { from: string; to: string }>;

@Entity('company_profiles')
export class CompanyProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.companyProfile, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column({ unique: true })
  userId: string;

  @Column({ length: 150 })
  companyName: string;

  @Column({ length: 255 })
  address: string;

  @Column({ length: 30 })
  phone: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  photoUrl: string | null;

  @Column({ type: 'jsonb', nullable: true })
  businessHours: BusinessHours | null;

  @Column({ type: 'text', nullable: true })
  policies: string | null;

  @OneToMany(() => CompanyOwner, (owner) => owner.companyProfile, {
    cascade: true,
  })
  owners: CompanyOwner[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
