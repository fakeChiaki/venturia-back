import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Role } from '../../catalogs/entities/role.entity';
import { Project } from '../../projects/entities/project.entity';
import { NaturalPersonProfile } from '../../users/entities/natural-person-profile.entity';
import { Application } from './application.entity';

// RF-18/RF-19: integrantes confirmados; el conteo se hace sobre esta tabla
// dentro de la misma transacción que acepta la postulación (RF-20)
@Entity('team_members')
@Unique(['projectId', 'profileId'])
export class TeamMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  project: Project;

  @Column()
  projectId: string;

  @ManyToOne(() => NaturalPersonProfile, { onDelete: 'CASCADE' })
  profile: NaturalPersonProfile;

  @Column()
  profileId: string;

  @ManyToOne(() => Role, { onDelete: 'RESTRICT' })
  role: Role;

  @Column()
  roleId: number;

  @OneToOne(() => Application, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn()
  application: Application | null;

  @Column({ type: 'uuid', nullable: true, unique: true })
  applicationId: string | null;

  @CreateDateColumn()
  joinedAt: Date;
}
