import { Methodology } from '../../../common/enums/methodology.enum';

export interface ProfileSnapshot {
  technicalAreaIds: number[];
  methodology: Methodology | null;
  weeklyHours: number | null;
  roleIds: number[];
  interestAreaIds: number[];
}

export interface ProjectSnapshot {
  id: string;
  technicalAreaIds: number[];
  methodology: Methodology;
  weeklyHours: number | null;
  requiredRoleIds: number[];
  interestAreaIds: number[];
}

// Extiende Record para que sea asignable a la columna jsonb de TypeORM
export interface ScoreBreakdown extends Record<string, number> {
  roles: number;
  interestAreas: number;
  technicalArea: number;
  methodology: number;
  weeklyHours: number;
}

export interface ComputedScore {
  score: number;
  breakdown: ScoreBreakdown;
}
