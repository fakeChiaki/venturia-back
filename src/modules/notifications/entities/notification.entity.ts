import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

// RF-07 (cuenta) y RF-17 (postulación); emailSentAt registra el envío real
export enum NotificationType {
  ACCOUNT_CREATED = 'account_created',
  ACCOUNT_DELETED = 'account_deleted',
  APPLICATION_SUBMITTED = 'application_submitted',
  APPLICATION_IN_REVIEW = 'application_in_review',
  APPLICATION_ACCEPTED = 'application_accepted',
  APPLICATION_REJECTED = 'application_rejected',
  TEAM_COMPLETED = 'team_completed',
  EVENT_SCHEDULED = 'event_scheduled',
}

@Entity('notifications')
@Index(['userId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  // datos de contexto (projectId, applicationId, etc.)
  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  emailSentAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
