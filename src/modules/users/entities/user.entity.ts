import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CompanyProfile } from '../../companies/entities/company-profile.entity';
import { NaturalPersonProfile } from './natural-person-profile.entity';

export enum UserType {
  NATURAL_PERSON = 'natural_person',
  COMPANY = 'company',
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 255 })
  email: string;

  // null cuando la cuenta se creó vía OAuth (RF-03)
  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  passwordHash: string | null;

  // hash bcrypt del refresh token activo; null = sin sesión (RF-03)
  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  refreshTokenHash: string | null;

  @Column({ type: 'enum', enum: UserType })
  type: UserType;

  @Column({ type: 'enum', enum: AuthProvider, default: AuthProvider.LOCAL })
  provider: AuthProvider;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  googleId: string | null;

  // desactivación reversible (RF-06); la eliminación usa soft delete (deletedAt)
  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  emailVerified: boolean;

  @OneToOne(() => NaturalPersonProfile, (profile) => profile.user)
  naturalPersonProfile: NaturalPersonProfile | null;

  @OneToOne(() => CompanyProfile, (profile) => profile.user)
  companyProfile: CompanyProfile | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;
}
