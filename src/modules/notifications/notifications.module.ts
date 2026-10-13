import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NaturalPersonProfile } from '../users/entities/natural-person-profile.entity';
import { Notification } from './entities/notification.entity';
import { MailService } from './mail.service';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, NaturalPersonProfile])],
  providers: [MailService, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
