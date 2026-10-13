import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { ProjectRoleRequirement } from '../projects/entities/project-role-requirement.entity';
import { Project, ProjectStatus } from '../projects/entities/project.entity';
import { NaturalPersonProfile } from '../users/entities/natural-person-profile.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { Application, ApplicationStatus } from './entities/application.entity';
import { TeamMember } from './entities/team-member.entity';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private readonly appRepo: Repository<Application>,
    @InjectRepository(TeamMember)
    private readonly memberRepo: Repository<TeamMember>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectRoleRequirement)
    private readonly reqRepo: Repository<ProjectRoleRequirement>,
    @InjectRepository(NaturalPersonProfile)
    private readonly profileRepo: Repository<NaturalPersonProfile>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─── Persona natural (developer) ─────────────────────────────────────────────

  async apply(userId: string, dto: CreateApplicationDto): Promise<Application> {
    const profile = await this.profileRepo.findOne({
      where: { userId },
      select: ['id'],
    });
    if (!profile) throw new ForbiddenException('Solo personas naturales pueden postular');

    const project = await this.projectRepo.findOne({
      where: { id: dto.projectId, status: ProjectStatus.SEEKING_TEAM },
    });
    if (!project) throw new NotFoundException('Proyecto no encontrado o no disponible');

    const roleExists = await this.reqRepo.existsBy({
      projectId: dto.projectId,
      roleId: dto.roleId,
    });
    if (!roleExists) throw new ConflictException('El rol no es un requisito de este proyecto');

    const alreadyMember = await this.memberRepo.existsBy({
      projectId: dto.projectId,
      profileId: profile.id,
    });
    if (alreadyMember) {
      throw new ConflictException('Ya formas parte del equipo de este proyecto');
    }

    const hasActiveApplication = await this.appRepo.existsBy({
      projectId: dto.projectId,
      applicantId: profile.id,
      status: In([
        ApplicationStatus.PENDING,
        ApplicationStatus.IN_REVIEW,
        ApplicationStatus.ACCEPTED,
      ]),
    });
    if (hasActiveApplication) {
      throw new ConflictException('Ya tienes una postulación activa en este proyecto');
    }

    let application: Application;
    try {
      application = await this.appRepo.save(
        this.appRepo.create({
          projectId: dto.projectId,
          applicantId: profile.id,
          roleId: dto.roleId,
          message: dto.message ?? null,
        }),
      );
    } catch (err: any) {
      if ((err as { code?: string })?.code === '23505') {
        throw new ConflictException('Ya tienes una postulación activa en este proyecto');
      }
      throw err;
    }

    await this.notificationsService.notifyApplicationSubmitted(profile.id, project.name);

    return application;
  }

  async getMyApplications(userId: string): Promise<Application[]> {
    const profile = await this.profileRepo.findOne({
      where: { userId },
      select: ['id'],
    });
    if (!profile) return [];

    return this.appRepo.find({
      where: { applicantId: profile.id },
      relations: { project: true, role: true },
      order: { createdAt: 'DESC' },
    });
  }

  // ─── Creador del proyecto ─────────────────────────────────────────────────────

  async getProjectApplications(userId: string, projectId: string): Promise<Application[]> {
    await this.assertCreatorOwnsProject(userId, projectId);
    return this.appRepo.find({
      where: { projectId },
      relations: { applicant: true, role: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getProjectTeam(userId: string, projectId: string): Promise<TeamMember[]> {
    await this.assertCreatorOwnsProject(userId, projectId);
    return this.memberRepo.find({
      where: { projectId },
      relations: { profile: true, role: true },
      order: { joinedAt: 'ASC' },
    });
  }

  async markInReview(applicationId: string, userId: string): Promise<void> {
    const app = await this.loadForCreator(applicationId, userId);
    if (app.status !== ApplicationStatus.PENDING) {
      throw new ConflictException('Solo se pueden revisar postulaciones pendientes');
    }
    await this.appRepo.update(applicationId, { status: ApplicationStatus.IN_REVIEW });
  }

  async reject(applicationId: string, userId: string): Promise<void> {
    const app = await this.loadForCreator(applicationId, userId);
    if (
      app.status !== ApplicationStatus.PENDING &&
      app.status !== ApplicationStatus.IN_REVIEW
    ) {
      throw new ConflictException('La postulación ya fue procesada');
    }
    await this.appRepo.update(applicationId, { status: ApplicationStatus.REJECTED });
    await this.notificationsService.notifyApplicationRejected(app.applicantId, app.project.name);
  }

  async accept(applicationId: string, userId: string): Promise<{ teamComplete: boolean }> {
    const creator = await this.getCreatorProfile(userId);

    let applicantProfileId!: string;
    let projectId!: string;
    let projectName!: string;

    const result = await this.dataSource.transaction(async (em) => {
      const app = await em.findOne(Application, {
        where: { id: applicationId },
        relations: { project: true },
      });

      if (!app) throw new NotFoundException('Postulación no encontrada');
      applicantProfileId = app.applicantId;
      projectId = app.projectId;
      projectName = app.project.name;
      if (app.project.creatorId !== creator.id) {
        throw new ForbiddenException('No tienes acceso a este proyecto');
      }
      if (
        app.status !== ApplicationStatus.PENDING &&
        app.status !== ApplicationStatus.IN_REVIEW
      ) {
        throw new ConflictException('La postulación ya fue procesada');
      }
      if (app.project.status !== ProjectStatus.SEEKING_TEAM) {
        throw new ConflictException('El proyecto no está aceptando postulaciones');
      }

      const requirement = await em
        .createQueryBuilder(ProjectRoleRequirement, 'req')
        .where('req.projectId = :projectId AND req.roleId = :roleId', {
          projectId: app.projectId,
          roleId: app.roleId,
        })
        .setLock('pessimistic_write')
        .getOne();

      if (!requirement) {
        throw new ConflictException('El rol ya no existe como requisito del proyecto');
      }

      const filled = await em.countBy(TeamMember, {
        projectId: app.projectId,
        roleId: app.roleId,
      });

      if (filled >= requirement.quantity) {
        throw new ConflictException(
          `Cupo completo para este rol (${filled}/${requirement.quantity})`,
        );
      }

      await em.save(
        em.create(TeamMember, {
          projectId: app.projectId,
          profileId: app.applicantId,
          roleId: app.roleId,
          applicationId: app.id,
        }),
      );

      await em.update(Application, applicationId, {
        status: ApplicationStatus.ACCEPTED,
      });

      const rejectedApplicantIds: string[] = [];

      if (filled + 1 >= requirement.quantity) {
        rejectedApplicantIds.push(
          ...(await this.rejectPendingApplications(em, app.projectId, app.roleId)),
        );
      }

      const teamComplete = await this.checkTeamComplete(em, app.projectId);

      if (teamComplete) {
        await em.update(Project, app.projectId, {
          status: ProjectStatus.IN_PROGRESS,
        });

        rejectedApplicantIds.push(
          ...(await this.rejectPendingApplications(em, app.projectId)),
        );
      }

      return { teamComplete, rejectedApplicantIds };
    });

    await this.notificationsService.notifyApplicationAccepted(applicantProfileId, projectName);

    for (const rejectedId of result.rejectedApplicantIds) {
      await this.notificationsService.notifyApplicationRejected(rejectedId, projectName);
    }

    if (result.teamComplete) {
      const members = await this.memberRepo.findBy({ projectId });
      await this.notificationsService.notifyTeamCompleted(
        members.map((m) => m.profileId),
        projectName,
      );
    }

    return { teamComplete: result.teamComplete };
  }

  // ─── Helpers privados ─────────────────────────────────────────────────────────

  private async rejectPendingApplications(
    em: EntityManager,
    projectId: string,
    roleId?: number,
  ): Promise<string[]> {
    const remaining = await em.find(Application, {
      where: {
        projectId,
        ...(roleId !== undefined ? { roleId } : {}),
        status: In([ApplicationStatus.PENDING, ApplicationStatus.IN_REVIEW]),
      },
      select: ['id', 'applicantId'],
    });
    if (!remaining.length) return [];

    await em.update(
      Application,
      { id: In(remaining.map((r) => r.id)) },
      { status: ApplicationStatus.REJECTED },
    );
    return remaining.map((r) => r.applicantId);
  }

  private async checkTeamComplete(em: EntityManager, projectId: string): Promise<boolean> {
    const requirements = await em.findBy(ProjectRoleRequirement, { projectId });
    if (requirements.length === 0) return false;

    const counts: { roleId: number; total: string }[] = await em
      .createQueryBuilder(TeamMember, 'tm')
      .select('tm.roleId', 'roleId')
      .addSelect('COUNT(*)', 'total')
      .where('tm.projectId = :projectId', { projectId })
      .groupBy('tm.roleId')
      .getRawMany();

    const filled = new Map(counts.map((c) => [Number(c.roleId), parseInt(c.total, 10)]));

    return requirements.every((req) => (filled.get(req.roleId) ?? 0) >= req.quantity);
  }

  private async getCreatorProfile(userId: string): Promise<NaturalPersonProfile> {
    const profile = await this.profileRepo.findOne({
      where: { userId },
      select: ['id'],
    });
    if (!profile) {
      throw new ForbiddenException('Solo creadores de proyecto pueden gestionar postulaciones');
    }
    return profile;
  }

  private async assertCreatorOwnsProject(userId: string, projectId: string): Promise<void> {
    const creator = await this.getCreatorProfile(userId);
    const owns = await this.projectRepo.existsBy({ id: projectId, creatorId: creator.id });
    if (!owns) throw new ForbiddenException('No tienes acceso a este proyecto');
  }

  private async loadForCreator(applicationId: string, userId: string): Promise<Application> {
    const creator = await this.getCreatorProfile(userId);
    const app = await this.appRepo.findOne({
      where: { id: applicationId },
      relations: { project: true },
    });
    if (!app) throw new NotFoundException('Postulación no encontrada');
    if (app.project.creatorId !== creator.id) {
      throw new ForbiddenException('No tienes acceso a esta postulación');
    }
    return app;
  }
}
