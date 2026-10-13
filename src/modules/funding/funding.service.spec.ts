import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { FundingService } from './funding.service';
import { FundingOffer, FundingOfferStatus } from '../projects/entities/funding-offer.entity';
import { Project, ProjectStatus } from '../projects/entities/project.entity';
import { CompanyProfile } from '../companies/entities/company-profile.entity';
import { NaturalPersonProfile } from '../users/entities/natural-person-profile.entity';

type AnyMock = Record<string, jest.Mock>;

const qb = (raw: Record<string, string>) => ({
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  getRawOne: jest.fn().mockResolvedValue(raw),
});

describe('FundingService', () => {
  let service: FundingService;
  let offerRepo: AnyMock;
  let projectRepo: AnyMock;
  let companyRepo: AnyMock;
  let profileRepo: AnyMock;
  let em: AnyMock;

  beforeEach(async () => {
    offerRepo = { findOne: jest.fn(), update: jest.fn(), createQueryBuilder: jest.fn() };
    projectRepo = { findOne: jest.fn() };
    companyRepo = { findOne: jest.fn() };
    profileRepo = { findOne: jest.fn() };
    em = {
      update: jest.fn(),
      findOneOrFail: jest.fn(),
      createQueryBuilder: jest.fn(),
      create: jest.fn((_e, x) => x),
      save: jest.fn((x) => Promise.resolve({ id: 'new-offer', ...x })),
    };

    const dataSource = { transaction: jest.fn((cb: (m: unknown) => unknown) => cb(em)) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        FundingService,
        { provide: getRepositoryToken(FundingOffer), useValue: offerRepo },
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        { provide: getRepositoryToken(CompanyProfile), useValue: companyRepo },
        { provide: getRepositoryToken(NaturalPersonProfile), useValue: profileRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = moduleRef.get(FundingService);
  });

  describe('createOffer', () => {
    beforeEach(() => {
      companyRepo.findOne.mockResolvedValue({ id: 'company-1' });
    });

    it('crea la oferta y pasa el proyecto OPEN → NEGOTIATING', async () => {
      projectRepo.findOne.mockResolvedValue({ id: 'proj-1', status: ProjectStatus.OPEN });
      await service.createOffer('user-1', 'proj-1', { amount: 1000000 });
      expect(em.update).toHaveBeenCalledWith(Project, 'proj-1', {
        status: ProjectStatus.NEGOTIATING,
      });
    });

    it('permite ofertar sobre un proyecto ya en NEGOTIATING sin re-cambiar estado', async () => {
      projectRepo.findOne.mockResolvedValue({ id: 'proj-1', status: ProjectStatus.NEGOTIATING });
      await service.createOffer('user-1', 'proj-1', { amount: 1000000 });
      const projectUpdate = em.update.mock.calls.find((c) => c[0] === Project);
      expect(projectUpdate).toBeUndefined();
    });

    it('rechaza ofertar sobre un proyecto no disponible (ej. funded)', async () => {
      projectRepo.findOne.mockResolvedValue({ id: 'proj-1', status: ProjectStatus.FUNDED });
      await expect(
        service.createOffer('user-1', 'proj-1', { amount: 1000000 }),
      ).rejects.toThrow(ConflictException);
    });

    it('rechaza si el usuario no es una empresa', async () => {
      companyRepo.findOne.mockResolvedValue(null);
      await expect(
        service.createOffer('user-1', 'proj-1', { amount: 1000000 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('counterOffer', () => {
    const parent = {
      id: 'offer-1',
      projectId: 'proj-1',
      companyId: 'company-1',
      round: 1,
      status: FundingOfferStatus.PENDING,
      project: { creatorId: 'creator-1' },
    };

    beforeEach(() => {
      profileRepo.findOne.mockResolvedValue({ id: 'creator-1' });
      offerRepo.findOne.mockResolvedValue(parent);
    });

    it('crea contraoferta con ronda+1 y marca la original como countered', async () => {
      await service.counterOffer('user-1', 'offer-1', { amount: 2000000 });
      expect(em.update).toHaveBeenCalledWith(FundingOffer, 'offer-1', {
        status: FundingOfferStatus.COUNTERED,
      });
      expect(em.create).toHaveBeenCalledWith(
        FundingOffer,
        expect.objectContaining({ round: 2, parentOfferId: 'offer-1' }),
      );
    });

    it('rechaza contraofertar a una oferta que no está pendiente', async () => {
      offerRepo.findOne.mockResolvedValue({ ...parent, status: FundingOfferStatus.COUNTERED });
      await expect(
        service.counterOffer('user-1', 'offer-1', { amount: 2000000 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('acceptOffer (co-financiamiento)', () => {
    const offer = {
      id: 'offer-1',
      projectId: 'proj-1',
      status: FundingOfferStatus.PENDING,
      project: { creatorId: 'creator-1' },
    };

    beforeEach(() => {
      profileRepo.findOne.mockResolvedValue({ id: 'creator-1' });
      offerRepo.findOne.mockResolvedValue(offer);
    });

    it('con la meta NO alcanzada: no marca funded ni rechaza pendientes', async () => {
      em.createQueryBuilder.mockReturnValue(qb({ total: '2000000' }));
      em.findOneOrFail
        .mockResolvedValueOnce({ id: 'proj-1', fundingGoal: 5000000 })
        .mockResolvedValueOnce({ id: 'offer-1', status: FundingOfferStatus.ACCEPTED });

      await service.acceptOffer('user-1', 'offer-1');

      expect(em.update).toHaveBeenCalledWith(FundingOffer, 'offer-1', {
        status: FundingOfferStatus.ACCEPTED,
      });
      const projectUpdate = em.update.mock.calls.find((c) => c[0] === Project);
      expect(projectUpdate).toBeUndefined();
    });

    it('al alcanzar la meta: proyecto → FUNDED y pendientes auto-rechazadas', async () => {
      em.createQueryBuilder.mockReturnValue(qb({ total: '5000000' }));
      em.findOneOrFail
        .mockResolvedValueOnce({ id: 'proj-1', fundingGoal: 5000000 })
        .mockResolvedValueOnce({ id: 'offer-1', status: FundingOfferStatus.ACCEPTED });

      await service.acceptOffer('user-1', 'offer-1');

      expect(em.update).toHaveBeenCalledWith(Project, 'proj-1', {
        status: ProjectStatus.FUNDED,
      });
      expect(em.update).toHaveBeenCalledWith(
        FundingOffer,
        { projectId: 'proj-1', status: FundingOfferStatus.PENDING },
        { status: FundingOfferStatus.REJECTED },
      );
    });

    it('no permite aceptar una oferta que no está pendiente', async () => {
      offerRepo.findOne.mockResolvedValue({ ...offer, status: FundingOfferStatus.ACCEPTED });
      await expect(service.acceptOffer('user-1', 'offer-1')).rejects.toThrow(ConflictException);
    });

    it('rechaza si el creador no es dueño del proyecto de la oferta', async () => {
      offerRepo.findOne.mockResolvedValue({ ...offer, project: { creatorId: 'otro' } });
      await expect(service.acceptOffer('user-1', 'offer-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('rejectOffer', () => {
    const offer = {
      id: 'offer-1',
      status: FundingOfferStatus.PENDING,
      project: { creatorId: 'creator-1' },
    };

    beforeEach(() => {
      profileRepo.findOne.mockResolvedValue({ id: 'creator-1' });
      offerRepo.findOne.mockResolvedValue(offer);
    });

    it('rechaza una oferta pendiente', async () => {
      await service.rejectOffer('user-1', 'offer-1');
      expect(offerRepo.update).toHaveBeenCalledWith('offer-1', {
        status: FundingOfferStatus.REJECTED,
      });
    });

    it('no permite rechazar una oferta que no está pendiente', async () => {
      offerRepo.findOne.mockResolvedValue({ ...offer, status: FundingOfferStatus.ACCEPTED });
      await expect(service.rejectOffer('user-1', 'offer-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('getFundingSummary', () => {
    it('calcula recaudado, restante y financistas', async () => {
      projectRepo.findOne.mockResolvedValue({ id: 'proj-1', fundingGoal: 5000000 });
      offerRepo.createQueryBuilder.mockReturnValue(qb({ total: '2000000', backers: '2' }));

      const summary = await service.getFundingSummary('proj-1');

      expect(summary).toEqual({
        goal: 5000000,
        funded: 2000000,
        remaining: 3000000,
        backers: 2,
      });
    });
  });
});
