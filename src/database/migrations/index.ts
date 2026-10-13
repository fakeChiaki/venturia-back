import { InitialSchema1781313316151 } from './1781313316151-InitialSchema';
import { SeedCatalogs1781313400000 } from './1781313400000-SeedCatalogs';
import { AddRefreshTokenHashToUser1781318557644 } from './1781318557644-AddRefreshTokenHashToUser';
import { AddEstimatedPayAndApplicationSubmittedType1781470113657 } from './1781470113657-AddEstimatedPayAndApplicationSubmittedType';
import { RemoveTeamCompleteStatus1781492055100 } from './1781492055100-RemoveTeamCompleteStatus';
import { TechnicalAreaMultiSelect1781492533968 } from './1781492533968-TechnicalAreaMultiSelect';
import { AddTimezoneToProfile1781497737514 } from './1781497737514-AddTimezoneToProfile';
import { ProjectTechnicalAreasMultiSelect1781600000000 } from './1781600000000-ProjectTechnicalAreasMultiSelect';
import { AddPrivateDescriptionToProject1781600100000 } from './1781600100000-AddPrivateDescriptionToProject';
import { AddWeeklyHoursToRoleRequirement1781600200000 } from './1781600200000-AddWeeklyHoursToRoleRequirement';
import { KickstarterRefactoring1781700000000 } from './1781700000000-KickstarterRefactoring';
import { AddPhotoUrlToCompanyProfile1781800000000 } from './1781800000000-AddPhotoUrlToCompanyProfile';
import { ActiveApplicationPartialUnique1781900000000 } from './1781900000000-ActiveApplicationPartialUnique';
import { DropCalendarEvents1782000000000 } from './1782000000000-DropCalendarEvents';

// Registro central de migraciones, importado por typeorm-options.ts.
// Cada migración nueva debe agregarse aquí.
export const MIGRATIONS = [
  InitialSchema1781313316151,
  SeedCatalogs1781313400000,
  AddRefreshTokenHashToUser1781318557644,
  AddEstimatedPayAndApplicationSubmittedType1781470113657,
  RemoveTeamCompleteStatus1781492055100,
  TechnicalAreaMultiSelect1781492533968,
  AddTimezoneToProfile1781497737514,
  ProjectTechnicalAreasMultiSelect1781600000000,
  AddPrivateDescriptionToProject1781600100000,
  AddWeeklyHoursToRoleRequirement1781600200000,
  KickstarterRefactoring1781700000000,
  AddPhotoUrlToCompanyProfile1781800000000,
  ActiveApplicationPartialUnique1781900000000,
  DropCalendarEvents1782000000000,
];
