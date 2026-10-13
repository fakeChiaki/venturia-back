import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Project } from './project.entity';

export enum ProjectMediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
}

@Entity('project_media')
export class ProjectMedia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, (project) => project.media, {
    onDelete: 'CASCADE',
  })
  project: Project;

  @Column()
  projectId: string;

  @Column({ type: 'enum', enum: ProjectMediaType })
  type: ProjectMediaType;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 500 })
  fileUrl: string;

  @Column({ default: true })
  isPublic: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
