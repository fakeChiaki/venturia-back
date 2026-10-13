import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../catalogs/entities/role.entity';
import { Project } from '../../projects/entities/project.entity';
import { NaturalPersonProfile } from '../../users/entities/natural-person-profile.entity';

// RF-17: aceptado, rechazado o en revisión
export enum ApplicationStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

// RF-15: una postulación ACTIVA por persona y proyecto. Las rechazadas no cuentan,
// por lo que un postulante rechazado puede volver a postular a otro rol disponible.
@Entity('applications')
@Index('UQ_active_application', ['projectId', 'applicantId'], {
  unique: true,
  where: "status IN ('pending', 'in_review', 'accepted')",
})
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  project: Project;

  @Column()
  projectId: string;

  @ManyToOne(() => NaturalPersonProfile, { onDelete: 'CASCADE' })
  applicant: NaturalPersonProfile;

  @Column()
  applicantId: string;

  @ManyToOne(() => Role, { onDelete: 'RESTRICT' })
  role: Role;

  @Column()
  roleId: number;

  @Index()
  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDING,
  })
  status: ApplicationStatus;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
