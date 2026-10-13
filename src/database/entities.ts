import { AffinityScore } from '../modules/affinity/entities/affinity-score.entity';
import { Application } from '../modules/applications/entities/application.entity';
import { TeamMember } from '../modules/applications/entities/team-member.entity';
import { InterestArea } from '../modules/catalogs/entities/interest-area.entity';
import { Role } from '../modules/catalogs/entities/role.entity';
import { TechnicalArea } from '../modules/catalogs/entities/technical-area.entity';
import { CompanyOwner } from '../modules/companies/entities/company-owner.entity';
import { CompanyProfile } from '../modules/companies/entities/company-profile.entity';
import { Notification } from '../modules/notifications/entities/notification.entity';
import { FundingOffer } from '../modules/projects/entities/funding-offer.entity';
import { ProjectMedia } from '../modules/projects/entities/project-media.entity';
import { ProjectRoleRequirement } from '../modules/projects/entities/project-role-requirement.entity';
import { Project } from '../modules/projects/entities/project.entity';
import { NaturalPersonProfile } from '../modules/users/entities/natural-person-profile.entity';
import { User } from '../modules/users/entities/user.entity';

export const ENTITIES = [
  User,
  NaturalPersonProfile,
  CompanyProfile,
  CompanyOwner,
  TechnicalArea,
  Role,
  InterestArea,
  Project,
  ProjectRoleRequirement,
  ProjectMedia,
  FundingOffer,
  Application,
  TeamMember,
  AffinityScore,
  Notification,
];
