import { Injectable } from '@nestjs/common';
import type {
  ComputedScore,
  ProfileSnapshot,
  ProjectSnapshot,
  ScoreBreakdown,
} from './interfaces/affinity.interfaces';

// Pesos de cada dimensión — deben sumar 1.0
const W = {
  roles: 0.40,
  interestAreas: 0.25,
  technicalArea: 0.20,
  methodology: 0.10,
  weeklyHours: 0.05,
} as const;

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

@Injectable()
export class AffinityCalculatorService {
  compute(profile: ProfileSnapshot, project: ProjectSnapshot): ComputedScore {
    const breakdown: ScoreBreakdown = {
      roles: this.scoreRoles(profile.roleIds, project.requiredRoleIds),
      interestAreas: this.scoreInterestAreas(
        profile.interestAreaIds,
        project.interestAreaIds,
      ),
      technicalArea: this.scoreTechnicalArea(
        profile.technicalAreaIds,
        project.technicalAreaIds,
      ),
      methodology: this.scoreMethodology(
        profile.methodology,
        project.methodology,
      ),
      weeklyHours: this.scoreWeeklyHours(
        profile.weeklyHours,
        project.weeklyHours,
      ),
    };

    const score = r2(
      W.roles * breakdown.roles +
        W.interestAreas * breakdown.interestAreas +
        W.technicalArea * breakdown.technicalArea +
        W.methodology * breakdown.methodology +
        W.weeklyHours * breakdown.weeklyHours,
    );

    return { score, breakdown };
  }

  private scoreRoles(profileIds: number[], projectIds: number[]): number {
    // Sin roles requeridos → cualquier perfil califica
    if (projectIds.length === 0) return 100;
    if (profileIds.length === 0) return 0;

    const projectSet = new Set(projectIds);
    const matches = profileIds.filter((id) => projectSet.has(id)).length;
    // Proporción de roles del proyecto cubiertos por el perfil
    return r2((matches / projectIds.length) * 100);
  }

  private scoreInterestAreas(
    profileIds: number[],
    projectIds: number[],
  ): number {
    if (projectIds.length === 0) return 100;
    if (profileIds.length === 0) return 0;

    const profileSet = new Set(profileIds);
    const overlap = projectIds.filter((id) => profileSet.has(id)).length;
    // Cobertura: ¿cuántos intereses del proyecto comparte el perfil?
    return r2((overlap / projectIds.length) * 100);
  }

  private scoreTechnicalArea(
    profileIds: number[],
    projectIds: number[],
  ): number {
    if (profileIds.length === 0 || projectIds.length === 0) return 0;
    return profileIds.some((id) => projectIds.includes(id)) ? 100 : 0;
  }

  private scoreMethodology(
    profileMethod: string | null,
    projectMethod: string,
  ): number {
    if (profileMethod === null) return 0;
    return profileMethod === projectMethod ? 100 : 0;
  }

  private scoreWeeklyHours(
    profileHours: number | null,
    projectHours: number | null,
  ): number {
    // El proyecto no declara horas → no es una restricción
    if (projectHours === null) return 100;
    if (profileHours === null) return 0;
    if (profileHours >= projectHours) return 100;
    return r2((profileHours / projectHours) * 100);
  }
}
