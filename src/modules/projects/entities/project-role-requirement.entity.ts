import {
  Check,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Role } from '../../catalogs/entities/role.entity';
import { Project } from './project.entity';

// RF-14: roles requeridos y cupos por rol; la suma de quantity es el total del equipo (RF-19)
@Entity('project_role_requirements')
@Unique(['projectId', 'roleId'])
@Check('"quantity" > 0')
export class ProjectRoleRequirement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, (project) => project.roleRequirements, {
    onDelete: 'CASCADE',
  })
  project: Project;

  @Column()
  projectId: string;

  @ManyToOne(() => Role, { onDelete: 'RESTRICT' })
  role: Role;

  @Column()
  roleId: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  estimatedPay: number | null;

  @Column({ type: 'int', nullable: true })
  weeklyHours: number | null;
}
