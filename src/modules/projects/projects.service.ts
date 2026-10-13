import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, In, Repository } from 'typeorm';

import { Project, ProjectStatus } from './entities/project.entity';
import { ProjectMedia, ProjectMediaType } from './entities/project-media.entity';
import { ProjectRoleRequirement } from './entities/project-role-requirement.entity';
import { InterestArea } from '../catalogs/entities/interest-area.entity';
import { TechnicalArea } from '../catalogs/entities/technical-area.entity';
import { NaturalPersonProfile } from '../users/entities/natural-person-profile.entity';
import { StorageService } from '../storage/storage.service';

import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateVisibilityDto } from './dto/update-visibility.dto';
import { SetRoleRequirementsDto } from './dto/set-role-requirements.dto';

import { AffinityQueueService } from '../affinity/affinity-queue.service';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepo: Repository<Project>,
    @InjectRepository(ProjectRoleRequirement)
    private readonly requirementsRepo: Repository<ProjectRoleRequirement>,
    @InjectRepository(InterestArea)
    private readonly interestAreasRepo: Repository<InterestArea>,
    @InjectRepository(TechnicalArea)
    private readonly technicalAreasRepo: Repository<TechnicalArea>,
    @InjectRepository(NaturalPersonProfile)
    private readonly creatorRepo: Repository<NaturalPersonProfile>,
    @InjectRepository(ProjectMedia)
    private readonly mediaRepo: Repository<ProjectMedia>,

    private readonly dataSource: DataSource,
    private readonly affinityQueue: AffinityQueueService,
    private readonly storageService: StorageService,
  ) {}

  async create(createProjectDto: CreateProjectDto, userId: string): Promise<Project> {
    const creator = await this.creatorRepo.findOne({
      where: { userId },
      select: ['id'],
    });
    if (!creator) {
      throw new NotFoundException('No se encontró un perfil de persona natural para el usuario autenticado');
    }

    const { roleRequirements, interestAreaIds, technicalAreaIds, ...projectData } = createProjectDto;

    return this.dataSource.manager.transaction(async (em) => {
      const newProject = em.create(Project, {
        ...projectData,
        creatorId: creator.id,
        status: ProjectStatus.DRAFT,
      });
      const savedProject = await em.save(newProject);

      if (technicalAreaIds?.length) {
        const areas = await this.technicalAreasRepo.findBy({ id: In(technicalAreaIds) });
        savedProject.technicalAreas = areas;
        await em.save(savedProject);
      }

      if (roleRequirements?.length) {
        const requirements = roleRequirements.map((r) =>
          em.create(ProjectRoleRequirement, {
            projectId: savedProject.id,
            roleId: r.roleId,
            quantity: r.quantity,
            estimatedPay: r.estimatedPay ?? null,
            weeklyHours: r.weeklyHours ?? null,
          }),
        );
        await em.save(requirements);
      }

      if (interestAreaIds?.length) {
        const areas = await this.interestAreasRepo.findBy({ id: In(interestAreaIds) });
        savedProject.interestAreas = areas;
        await em.save(savedProject);
      }

      return em.findOneOrFail(Project, {
        where: { id: savedProject.id },
        relations: ['technicalAreas', 'roleRequirements', 'interestAreas'],
      });
    });
  }

  async publish(projectId: string, userId: string): Promise<Project> {
    const creator = await this.creatorRepo.findOne({
      where: { userId },
      select: ['id'],
    });
    if (!creator) {
      throw new NotFoundException('Perfil de persona natural no encontrado');
    }

    const project = await this.projectsRepo.findOne({
      where: { id: projectId, creatorId: creator.id },
    });
    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    if (project.status !== ProjectStatus.DRAFT) {
      throw new ConflictException('Solo los proyectos en borrador pueden publicarse');
    }

    project.status = ProjectStatus.OPEN;
    const savedProject = await this.projectsRepo.save(project);

    await this.affinityQueue.enqueueForProject(projectId);

    return savedProject;
  }

  async findAllByCreator(userId: string): Promise<Project[]> {
    const creator = await this.creatorRepo.findOne({ where: { userId }, select: ['id'] });
    if (!creator) return [];
    return this.projectsRepo.find({
      where: { creatorId: creator.id },
      relations: ['technicalAreas', 'roleRequirements', 'roleRequirements.role'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Project> {
    return await this.projectsRepo.findOneOrFail({
      where: { id },
      relations: [
        'creator',
        'technicalAreas',
        'interestAreas',
        'roleRequirements',
        'roleRequirements.role',
        'media',
      ],
    });
  }

  async update(id: string, userId: string, dto: UpdateProjectDto): Promise<Project> {
    await this.assertOwnership(id, userId);
    const project = await this.findOne(id);
    Object.assign(project, dto);
    return await this.projectsRepo.save(project);
  }

  async updateVisibility(id: string, userId: string, dto: UpdateVisibilityDto): Promise<Project> {
    await this.assertOwnership(id, userId);
    const project = await this.findOne(id);
    project.fieldVisibility = dto.fieldVisibility;
    return this.projectsRepo.save(project);
  }

  async setRoleRequirements(id: string, userId: string, dto: SetRoleRequirementsDto): Promise<ProjectRoleRequirement[]> {
    await this.assertOwnership(id, userId);
    const project = await this.findOne(id);

    if (project.status !== ProjectStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se pueden modificar requerimientos de proyectos en estado DRAFT',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.delete(ProjectRoleRequirement, { projectId: id });

      const requirements = dto.requirements.map((r) =>
        manager.create(ProjectRoleRequirement, {
          projectId: id,
          roleId: r.roleId,
          quantity: r.quantity,
          estimatedPay: r.estimatedPay ?? null,
          weeklyHours: r.weeklyHours ?? null,
        }),
      );

      return manager.save(requirements);
    });
  }

  async getTeamCount(id: string): Promise<{ projectId: string; totalSlots: number; byRole: { roleId: number; quantity: number }[] }> {
    await this.findOne(id);

    const requirements = await this.requirementsRepo.find({
      where: { projectId: id },
    });

    const totalSlots = requirements.reduce((sum, r) => sum + r.quantity, 0);

    return {
      projectId: id,
      totalSlots,
      byRole: requirements.map((r) => ({ roleId: r.roleId, quantity: r.quantity })),
    };
  }

  async updateStatus(id: string, userId: string, dto: { status: ProjectStatus }): Promise<Project> {
    await this.assertOwnership(id, userId);
    const project = await this.findOne(id);

    const allowed: Partial<Record<ProjectStatus, ProjectStatus[]>> = {
      [ProjectStatus.DRAFT]: [ProjectStatus.OPEN, ProjectStatus.CANCELLED],
      [ProjectStatus.OPEN]: [ProjectStatus.NEGOTIATING, ProjectStatus.CANCELLED],
      [ProjectStatus.NEGOTIATING]: [ProjectStatus.FUNDED, ProjectStatus.OPEN, ProjectStatus.CANCELLED],
      [ProjectStatus.FUNDED]: [ProjectStatus.SEEKING_TEAM, ProjectStatus.CANCELLED],
      [ProjectStatus.SEEKING_TEAM]: [ProjectStatus.IN_PROGRESS, ProjectStatus.CANCELLED],
      [ProjectStatus.IN_PROGRESS]: [ProjectStatus.FINISHED, ProjectStatus.CANCELLED],
    };

    const validNext = allowed[project.status] ?? [];
    if (!validNext.includes(dto.status)) {
      throw new BadRequestException(
        `No se puede pasar de '${project.status}' a '${dto.status}'. ` +
          `Transiciones válidas: ${validNext.join(', ') || 'ninguna'}`,
      );
    }

    project.status = dto.status;
    return this.projectsRepo.save(project);
  }

  async remove(id: string, userId: string): Promise<{ deleted: true }> {
    await this.assertOwnership(id, userId);
    await this.projectsRepo.softDelete(id);
    return { deleted: true };
  }

  async addMedia(
    projectId: string,
    userId: string,
    type: ProjectMediaType,
    name: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<ProjectMedia> {
    const creator = await this.creatorRepo.findOne({ where: { userId }, select: ['id'] });
    if (!creator) throw new NotFoundException('Perfil no encontrado');

    const project = await this.projectsRepo.findOne({
      where: { id: projectId, creatorId: creator.id },
    });
    if (!project) throw new NotFoundException('Proyecto no encontrado');

    const ext = mimeType.split('/')[1] ?? 'bin';
    const key = `projects/${projectId}/media/${randomUUID()}.${ext}`;
    const fileUrl = await this.storageService.upload(key, buffer, mimeType);

    return this.mediaRepo.save(
      this.mediaRepo.create({ projectId, type, name, fileUrl }),
    );
  }

  private async assertOwnership(projectId: string, userId: string): Promise<void> {
    const creator = await this.creatorRepo.findOne({ where: { userId }, select: ['id'] });
    if (!creator) throw new NotFoundException('Perfil no encontrado');
    const owns = await this.projectsRepo.existsBy({ id: projectId, creatorId: creator.id });
    if (!owns) throw new ForbiddenException('No tienes acceso a este proyecto');
  }

  async removeMedia(projectId: string, mediaId: string, userId: string): Promise<void> {
    const creator = await this.creatorRepo.findOne({ where: { userId }, select: ['id'] });
    if (!creator) throw new NotFoundException('Perfil no encontrado');

    const media = await this.mediaRepo.findOne({
      where: { id: mediaId, projectId },
      relations: { project: true },
    });
    if (!media || media.project.creatorId !== creator.id) {
      throw new NotFoundException('Media no encontrado');
    }

    const key = this.storageService.keyFromUrl(media.fileUrl);
    await this.storageService.delete(key);
    await this.mediaRepo.remove(media);
  }
}
