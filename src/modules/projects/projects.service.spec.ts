import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { Project, ProjectStatus } from './entities/project.entity';
import { ProjectRoleRequirement } from './entities/project-role-requirement.entity';
import { ProjectMedia, ProjectMediaType } from './entities/project-media.entity';
import { InterestArea } from '../catalogs/entities/interest-area.entity';
import { TechnicalArea } from '../catalogs/entities/technical-area.entity';
import { NaturalPersonProfile } from '../users/entities/natural-person-profile.entity';
import { AffinityQueueService } from '../affinity/affinity-queue.service';
import { StorageService } from '../storage/storage.service';

type AnyMock = Record<string, jest.Mock>;

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectsRepo: AnyMock;
  let creatorRepo: AnyMock;
  let technicalAreasRepo: AnyMock;
  let interestAreasRepo: AnyMock;
  let mediaRepo: AnyMock;
  let affinityQueue: AnyMock;
  let storageService: AnyMock;
  let em: AnyMock;

  beforeEach(async () => {
    projectsRepo = {
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      existsBy: jest.fn(),
      save: jest.fn((p) => Promise.resolve(p)),
      softDelete: jest.fn(),
    };
    creatorRepo = { findOne: jest.fn() };
    technicalAreasRepo = { findBy: jest.fn() };
    interestAreasRepo = { findBy: jest.fn() };
    mediaRepo = { findOne: jest.fn(), create: jest.fn((x) => x), save: jest.fn(), remove: jest.fn() };
    affinityQueue = { enqueueForProject: jest.fn() };
    storageService = { upload: jest.fn(), delete: jest.fn(), keyFromUrl: jest.fn() };
    em = {
      create: jest.fn((_e, x) => ({ id: 'p1', ...x })),
      save: jest.fn((x) => Promise.resolve(x)),
      findOneOrFail: jest.fn(),
    };

    const dataSource = { manager: { transaction: jest.fn((cb: (m: unknown) => unknown) => cb(em)) } };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: getRepositoryToken(Project), useValue: projectsRepo },
        { provide: getRepositoryToken(ProjectRoleRequirement), useValue: {} },
        { provide: getRepositoryToken(InterestArea), useValue: interestAreasRepo },
        { provide: getRepositoryToken(TechnicalArea), useValue: technicalAreasRepo },
        { provide: getRepositoryToken(NaturalPersonProfile), useValue: creatorRepo },
        { provide: getRepositoryToken(ProjectMedia), useValue: mediaRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: AffinityQueueService, useValue: affinityQueue },
        { provide: StorageService, useValue: storageService },
      ],
    }).compile();

    service = moduleRef.get(ProjectsService);
  });

  describe('create', () => {
    it('crea el proyecto en estado DRAFT para el creador autenticado', async () => {
      creatorRepo.findOne.mockResolvedValue({ id: 'creator-1' });
      technicalAreasRepo.findBy.mockResolvedValue([{ id: 1 }]);
      interestAreasRepo.findBy.mockResolvedValue([{ id: 5 }]);
      em.findOneOrFail.mockResolvedValue({ id: 'p1', status: ProjectStatus.DRAFT, name: 'Nuevo' });

      const dto = {
        name: 'Nuevo',
        description: 'desc',
        methodology: 'scrum',
        technicalAreaIds: [1],
        fundingGoal: 1000000,
        roleRequirements: [{ roleId: 2, quantity: 1 }],
        interestAreaIds: [5],
      };

      const result = await service.create(dto as never, 'user-1');

      expect(em.create).toHaveBeenCalledWith(
        Project,
        expect.objectContaining({ creatorId: 'creator-1', status: ProjectStatus.DRAFT }),
      );
      expect(result.id).toBe('p1');
    });

    it('rechaza si el usuario no tiene perfil de persona natural', async () => {
      creatorRepo.findOne.mockResolvedValue(null);
      await expect(service.create({ technicalAreaIds: [1] } as never, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStatus (transiciones + ownership)', () => {
    beforeEach(() => {
      creatorRepo.findOne.mockResolvedValue({ id: 'creator-1' });
      projectsRepo.existsBy.mockResolvedValue(true);
    });

    it('permite una transición válida DRAFT → OPEN', async () => {
      projectsRepo.findOneOrFail.mockResolvedValue({ id: 'p1', status: ProjectStatus.DRAFT });
      const result = await service.updateStatus('p1', 'user-1', { status: ProjectStatus.OPEN });
      expect(result.status).toBe(ProjectStatus.OPEN);
      expect(projectsRepo.save).toHaveBeenCalled();
    });

    it('permite FUNDED → CANCELLED', async () => {
      projectsRepo.findOneOrFail.mockResolvedValue({ id: 'p1', status: ProjectStatus.FUNDED });
      const result = await service.updateStatus('p1', 'user-1', { status: ProjectStatus.CANCELLED });
      expect(result.status).toBe(ProjectStatus.CANCELLED);
    });

    it('rechaza una transición inválida DRAFT → FUNDED', async () => {
      projectsRepo.findOneOrFail.mockResolvedValue({ id: 'p1', status: ProjectStatus.DRAFT });
      await expect(
        service.updateStatus('p1', 'user-1', { status: ProjectStatus.FUNDED }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza si el usuario no es dueño del proyecto', async () => {
      projectsRepo.existsBy.mockResolvedValue(false);
      await expect(
        service.updateStatus('p1', 'user-1', { status: ProjectStatus.OPEN }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('publish', () => {
    beforeEach(() => {
      creatorRepo.findOne.mockResolvedValue({ id: 'creator-1' });
      affinityQueue.enqueueForProject.mockResolvedValue(undefined);
    });

    it('publica un proyecto en DRAFT (→ OPEN) y encola afinidad', async () => {
      projectsRepo.findOne.mockResolvedValue({ id: 'p1', status: ProjectStatus.DRAFT });
      const result = await service.publish('p1', 'user-1');
      expect(result.status).toBe(ProjectStatus.OPEN);
      expect(affinityQueue.enqueueForProject).toHaveBeenCalledWith('p1');
    });

    it('rechaza publicar un proyecto que no está en DRAFT', async () => {
      projectsRepo.findOne.mockResolvedValue({ id: 'p1', status: ProjectStatus.OPEN });
      await expect(service.publish('p1', 'user-1')).rejects.toThrow(ConflictException);
    });

    it('rechaza si el proyecto no existe o no pertenece al creador', async () => {
      projectsRepo.findOne.mockResolvedValue(null);
      await expect(service.publish('p1', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('ownership (update / remove / setRoleRequirements)', () => {
    beforeEach(() => {
      creatorRepo.findOne.mockResolvedValue({ id: 'creator-1' });
    });

    it('update aplica cambios cuando el usuario es dueño', async () => {
      projectsRepo.existsBy.mockResolvedValue(true);
      projectsRepo.findOneOrFail.mockResolvedValue({ id: 'p1', name: 'Viejo' });
      const result = await service.update('p1', 'user-1', { name: 'Nuevo' } as never);
      expect(result.name).toBe('Nuevo');
      expect(projectsRepo.save).toHaveBeenCalled();
    });

    it('update rechaza si el usuario no es dueño', async () => {
      projectsRepo.existsBy.mockResolvedValue(false);
      await expect(service.update('p1', 'user-1', {} as never)).rejects.toThrow(ForbiddenException);
      expect(projectsRepo.save).not.toHaveBeenCalled();
    });

    it('remove hace soft delete cuando el usuario es dueño', async () => {
      projectsRepo.existsBy.mockResolvedValue(true);
      const result = await service.remove('p1', 'user-1');
      expect(projectsRepo.softDelete).toHaveBeenCalledWith('p1');
      expect(result).toEqual({ deleted: true });
    });

    it('remove rechaza si el usuario no es dueño', async () => {
      projectsRepo.existsBy.mockResolvedValue(false);
      await expect(service.remove('p1', 'user-1')).rejects.toThrow(ForbiddenException);
      expect(projectsRepo.softDelete).not.toHaveBeenCalled();
    });

    it('setRoleRequirements rechaza si el proyecto no está en DRAFT', async () => {
      projectsRepo.existsBy.mockResolvedValue(true);
      projectsRepo.findOneOrFail.mockResolvedValue({ id: 'p1', status: ProjectStatus.OPEN });
      await expect(
        service.setRoleRequirements('p1', 'user-1', { requirements: [] } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('assertOwnership rechaza si el usuario no tiene perfil', async () => {
      creatorRepo.findOne.mockResolvedValue(null);
      await expect(service.remove('p1', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('media', () => {
    it('addMedia sube el archivo a storage y guarda el registro', async () => {
      creatorRepo.findOne.mockResolvedValue({ id: 'creator-1' });
      projectsRepo.findOne.mockResolvedValue({ id: 'p1', creatorId: 'creator-1' });
      storageService.upload.mockResolvedValue('http://minio/venturia/projects/p1/media/x.png');
      mediaRepo.save.mockImplementation((x) => Promise.resolve({ id: 'media-1', ...x }));

      const result = await service.addMedia(
        'p1',
        'user-1',
        ProjectMediaType.IMAGE,
        'Demo',
        Buffer.from('x'),
        'image/png',
      );

      expect(storageService.upload).toHaveBeenCalled();
      expect(result.id).toBe('media-1');
    });

    it('addMedia rechaza si el proyecto no es del creador', async () => {
      creatorRepo.findOne.mockResolvedValue({ id: 'creator-1' });
      projectsRepo.findOne.mockResolvedValue(null);
      await expect(
        service.addMedia('p1', 'user-1', ProjectMediaType.IMAGE, 'D', Buffer.from('x'), 'image/png'),
      ).rejects.toThrow(NotFoundException);
    });

    it('removeMedia borra del storage y de la BD', async () => {
      creatorRepo.findOne.mockResolvedValue({ id: 'creator-1' });
      mediaRepo.findOne.mockResolvedValue({
        id: 'm1',
        fileUrl: 'http://minio/venturia/x.png',
        project: { creatorId: 'creator-1' },
      });
      storageService.keyFromUrl.mockReturnValue('x.png');

      await service.removeMedia('p1', 'm1', 'user-1');

      expect(storageService.delete).toHaveBeenCalledWith('x.png');
      expect(mediaRepo.remove).toHaveBeenCalled();
    });

    it('removeMedia rechaza si el media no pertenece al creador', async () => {
      creatorRepo.findOne.mockResolvedValue({ id: 'creator-1' });
      mediaRepo.findOne.mockResolvedValue({ id: 'm1', project: { creatorId: 'otro' } });
      await expect(service.removeMedia('p1', 'm1', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });
});
