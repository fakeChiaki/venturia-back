import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { NaturalPersonProfile } from '../users/entities/natural-person-profile.entity';
import { Project, ProjectStatus } from '../projects/entities/project.entity';
import { AffinityCalculatorService } from './affinity-calculator.service';
import { AffinityScore } from './entities/affinity-score.entity';
import type { ProfileSnapshot, ProjectSnapshot } from './interfaces/affinity.interfaces';

@Injectable()
export class AffinityService {
  constructor(
    @InjectRepository(AffinityScore)
    private readonly scoreRepo: Repository<AffinityScore>,
    @InjectRepository(NaturalPersonProfile)
    private readonly profileRepo: Repository<NaturalPersonProfile>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly calculator: AffinityCalculatorService,
  ) {}

  /**
   * Recalcula la afinidad de un perfil frente a todos los proyectos publicados.
   * Usado al completar/actualizar el onboarding (RF-11) y como job de BullMQ (RF-08).
   */
  async computeForProfile(profileId: string): Promise<void> {
    const profile = await this.profileRepo.findOne({
      where: { id: profileId, onboardingCompleted: true },
      relations: { roles: true, interestAreas: true, technicalAreas: true },
    });
    if (!profile) return;

    const projects = await this.loadPublishedProjects();
    if (projects.length === 0) return;

    const profileSnap = toProfileSnapshot(profile);
    const rows = projects.map((project) => {
      const { score, breakdown } = this.calculator.compute(
        profileSnap,
        toProjectSnapshot(project),
      );
      return { profileId, projectId: project.id, score, breakdown };
    });

    // Upsert masivo: una sola sentencia INSERT ... ON CONFLICT DO UPDATE
    await this.scoreRepo.upsert(rows, {
      conflictPaths: ['profileId', 'projectId'],
      skipUpdateIfNoValuesChanged: false,
    });
  }

  /**
   * Calcula la afinidad de todos los perfiles con onboarding completo contra
   * un proyecto recién publicado. Punto de entrada para el job RF-08.
   */
  async computeForProject(projectId: string): Promise<void> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId, status: ProjectStatus.OPEN, deletedAt: IsNull() },
      relations: { roleRequirements: true, interestAreas: true },
    });
    if (!project) return;

    const profiles = await this.profileRepo.find({
      where: { onboardingCompleted: true },
      relations: { roles: true, interestAreas: true, technicalAreas: true },
    });
    if (profiles.length === 0) return;

    const projectSnap = toProjectSnapshot(project);
    const rows = profiles.map((profile) => {
      const { score, breakdown } = this.calculator.compute(
        toProfileSnapshot(profile),
        projectSnap,
      );
      return { profileId: profile.id, projectId, score, breakdown };
    });

    await this.scoreRepo.upsert(rows, {
      conflictPaths: ['profileId', 'projectId'],
      skipUpdateIfNoValuesChanged: false,
    });
  }

  /**
   * Recalcula la afinidad a partir del userId (busca el perfil internamente).
   */
  async computeForUser(userId: string): Promise<void> {
    const profile = await this.profileRepo.findOne({
      where: { userId },
      select: ['id'],
    });
    if (!profile) return;
    await this.computeForProfile(profile.id);
  }

  private async loadPublishedProjects(): Promise<Project[]> {
    return this.projectRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.roleRequirements', 'req')
      .leftJoinAndSelect('p.interestAreas', 'ia')
      .where('p.status = :status', { status: ProjectStatus.OPEN })
      .andWhere('p.deletedAt IS NULL')
      .getMany();
  }
}

// ── Mappers entity → snapshot ────────────────────────────────────────────────

function toProfileSnapshot(profile: NaturalPersonProfile): ProfileSnapshot {
  return {
    technicalAreaIds: profile.technicalAreas.map((ta) => ta.id),
    methodology: profile.methodology,
    weeklyHours: profile.weeklyHours,
    roleIds: profile.roles.map((r) => r.id),
    interestAreaIds: profile.interestAreas.map((ia) => ia.id),
  };
}

function toProjectSnapshot(project: Project): ProjectSnapshot {
  return {
    id: project.id,
    technicalAreaIds: project.technicalAreas?.map((ta) => ta.id) ?? [],
    methodology: project.methodology,
    weeklyHours: project.weeklyHours,
    requiredRoleIds: project.roleRequirements.map((r) => r.roleId),
    interestAreaIds: project.interestAreas.map((ia) => ia.id),
  };
}
