import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProjectRoleRequirement } from '../projects/entities/project-role-requirement.entity';
import { Project } from '../projects/entities/project.entity';
import { NaturalPersonProfile } from '../users/entities/natural-person-profile.entity';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { Application } from './entities/application.entity';
import { TeamMember } from './entities/team-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Application,
      TeamMember,
      Project,
      ProjectRoleRequirement,
      NaturalPersonProfile,
    ]),
    NotificationsModule,
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
