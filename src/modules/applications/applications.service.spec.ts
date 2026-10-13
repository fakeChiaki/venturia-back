import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { Application, ApplicationStatus } from './entities/application.entity';
import { TeamMember } from './entities/team-member.entity';
import { Project, ProjectStatus } from '../projects/entities/project.entity';
import { ProjectRoleRequirement } from '../projects/entities/project-role-requirement.entity';
import { NaturalPersonProfile } from '../users/entities/natural-person-profile.entity';
import { NotificationsService } from '../notifications/notifications.service';

type AnyMock = Record<string, jest.Mock>;

describe('ApplicationsService', () => {
  let service: ApplicationsService;
  let appRepo: AnyMock;
  let memberRepo: AnyMock;
  let projectRepo: AnyMock;
  let reqRepo: AnyMock;
  let profileRepo: AnyMock;
  let notifications: AnyMock;
  let em: AnyMock;

  beforeEach(async () => {
    appRepo = {
      existsBy: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve({ id: 'app-1', ...x })),
      findOne: jest.fn(),
      update: jest.fn(),
    };
    memberRepo = { existsBy: jest.fn(), findBy: jest.fn() };
    projectRepo = { findOne: jest.fn() };
    reqRepo = { existsBy: jest.fn() };
    profileRepo = { findOne: jest.fn() };
    notifications = {
      notifyApplicationSubmitted: jest.fn(),
      notifyApplicationAccepted: jest.fn(),
      notifyApplicationRejected: jest.fn(),
      notifyTeamCompleted: jest.fn(),
    };
    em = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      countBy: jest.fn(),
      create: jest.fn((_e, x) => x),
      save: jest.fn(),
      update: jest.fn(),
      find: jest.fn(),
      findBy: jest.fn(),
    };

    const dataSource = { transaction: jest.fn((cb: (m: unknown) => unknown) => cb(em)) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        { provide: getRepositoryToken(Application), useValue: appRepo },
        { provide: getRepositoryToken(TeamMember), useValue: memberRepo },
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        { provide: getRepositoryToken(ProjectRoleRequirement), useValue: reqRepo },
        { provide: getRepositoryToken(NaturalPersonProfile), useValue: profileRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = moduleRef.get(ApplicationsService);
  });

  describe('apply', () => {
    const dto = { projectId: 'proj-1', roleId: 2, message: null };

    beforeEach(() => {
      profileRepo.findOne.mockResolvedValue({ id: 'prof-1' });
      projectRepo.findOne.mockResolvedValue({ id: 'proj-1', name: 'Proyecto X' });
      reqRepo.existsBy.mockResolvedValue(true);
      memberRepo.existsBy.mockResolvedValue(false);
      appRepo.existsBy.mockResolvedValue(false);
    });

    it('crea la postulación cuando no hay una activa', async () => {
      const result = await service.apply('user-1', dto);
      expect(appRepo.save).toHaveBeenCalled();
      expect(notifications.notifyApplicationSubmitted).toHaveBeenCalledWith('prof-1', 'Proyecto X');
      expect(result.id).toBe('app-1');
    });

    it('permite re-postular a otro rol si no hay postulación activa (tras rechazo)', async () => {
      appRepo.existsBy.mockResolvedValue(false);
      const result = await service.apply('user-1', { projectId: 'proj-1', roleId: 1, message: null });
      expect(appRepo.save).toHaveBeenCalledWith(expect.objectContaining({ roleId: 1 }));
      expect(result.id).toBe('app-1');
    });

    it('bloquea una segunda postulación activa simultánea', async () => {
      appRepo.existsBy.mockResolvedValue(true);
      await expect(service.apply('user-1', dto)).rejects.toThrow(ConflictException);
      expect(appRepo.save).not.toHaveBeenCalled();
    });

    it('rechaza si el proyecto no está en seeking_team', async () => {
      projectRepo.findOne.mockResolvedValue(null);
      await expect(service.apply('user-1', dto)).rejects.toThrow(NotFoundException);
    });

    it('rechaza si el rol no es requisito del proyecto', async () => {
      reqRepo.existsBy.mockResolvedValue(false);
      await expect(service.apply('user-1', dto)).rejects.toThrow(ConflictException);
    });

    it('rechaza si el usuario no tiene perfil de persona natural', async () => {
      profileRepo.findOne.mockResolvedValue(null);
      await expect(service.apply('user-1', dto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('accept (auto-rechazo + completar equipo)', () => {
    const seekingProject = {
      creatorId: 'creator-1',
      status: ProjectStatus.SEEKING_TEAM,
      name: 'Proyecto X',
    };
    const app = {
      id: 'app-1',
      applicantId: 'prof-1',
      projectId: 'proj-1',
      roleId: 2,
      status: ApplicationStatus.PENDING,
      project: seekingProject,
    };

    beforeEach(() => {
      profileRepo.findOne.mockResolvedValue({ id: 'creator-1' });
      em.findOne.mockResolvedValue(app);
      em.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ quantity: 1 }),
        getRawMany: jest.fn().mockResolvedValue([{ roleId: 2, total: '1' }]),
      });
      em.findBy.mockResolvedValue([{ roleId: 2, quantity: 1 }]);
      memberRepo.findBy.mockResolvedValue([{ profileId: 'prof-1' }]);
    });

    it('al llenar el cupo del rol y completar el equipo: proyecto → IN_PROGRESS y pendientes auto-rechazadas', async () => {
      em.countBy.mockResolvedValue(0); // sin miembros aún → filled 0, quantity 1
      // 1ra llamada (por rol): hay otra pendiente; 2da (global): ninguna
      em.find
        .mockResolvedValueOnce([{ id: 'app-2', applicantId: 'prof-2' }])
        .mockResolvedValueOnce([]);

      const result = await service.accept('app-1', 'user-1');

      expect(result.teamComplete).toBe(true);
      expect(em.update).toHaveBeenCalledWith(Application, 'app-1', {
        status: ApplicationStatus.ACCEPTED,
      });
      expect(em.update).toHaveBeenCalledWith(Project, 'proj-1', {
        status: ProjectStatus.IN_PROGRESS,
      });
      // la postulación sobrante fue notificada como rechazada
      expect(notifications.notifyApplicationRejected).toHaveBeenCalledWith('prof-2', 'Proyecto X');
      expect(notifications.notifyTeamCompleted).toHaveBeenCalled();
    });

    it('rechaza si el cupo del rol ya está completo', async () => {
      em.countBy.mockResolvedValue(1); // filled 1 >= quantity 1
      await expect(service.accept('app-1', 'user-1')).rejects.toThrow(ConflictException);
    });

    it('rechaza si el proyecto no está en seeking_team', async () => {
      em.findOne.mockResolvedValue({ ...app, project: { ...seekingProject, status: ProjectStatus.OPEN } });
      await expect(service.accept('app-1', 'user-1')).rejects.toThrow(ConflictException);
    });

    it('rechaza si el creador no es dueño del proyecto', async () => {
      em.findOne.mockResolvedValue({ ...app, project: { ...seekingProject, creatorId: 'otro' } });
      await expect(service.accept('app-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('reject / markInReview (gestión del creador)', () => {
    const app = {
      id: 'app-1',
      applicantId: 'prof-1',
      status: ApplicationStatus.PENDING,
      project: { creatorId: 'creator-1', name: 'Proyecto X' },
    };

    beforeEach(() => {
      profileRepo.findOne.mockResolvedValue({ id: 'creator-1' });
      appRepo.findOne.mockResolvedValue(app);
    });

    it('reject marca rechazada y notifica al postulante', async () => {
      await service.reject('app-1', 'user-1');
      expect(appRepo.update).toHaveBeenCalledWith('app-1', { status: ApplicationStatus.REJECTED });
      expect(notifications.notifyApplicationRejected).toHaveBeenCalledWith('prof-1', 'Proyecto X');
    });

    it('reject falla si la postulación ya fue procesada', async () => {
      appRepo.findOne.mockResolvedValue({ ...app, status: ApplicationStatus.ACCEPTED });
      await expect(service.reject('app-1', 'user-1')).rejects.toThrow(ConflictException);
    });

    it('markInReview solo aplica a pendientes', async () => {
      appRepo.findOne.mockResolvedValue({ ...app, status: ApplicationStatus.IN_REVIEW });
      await expect(service.markInReview('app-1', 'user-1')).rejects.toThrow(ConflictException);
    });

    it('markInReview marca en revisión una pendiente', async () => {
      await service.markInReview('app-1', 'user-1');
      expect(appRepo.update).toHaveBeenCalledWith('app-1', { status: ApplicationStatus.IN_REVIEW });
    });
  });
});
