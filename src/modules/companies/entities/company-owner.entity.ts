import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { CompanyProfile } from './company-profile.entity';

@Entity('company_owners')
@Unique(['companyProfileId', 'rut'])
export class CompanyOwner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CompanyProfile, (company) => company.owners, {
    onDelete: 'CASCADE',
  })
  companyProfile: CompanyProfile;

  @Column()
  companyProfileId: string;

  @Column({ length: 150 })
  fullName: string;

  // RUT chileno normalizado sin puntos, con guión: 12345678-9
  @Column({ length: 12 })
  rut: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;
}
