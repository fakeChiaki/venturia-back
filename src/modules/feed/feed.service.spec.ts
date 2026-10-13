import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FeedService } from './feed.service';
import { Project, ProjectStatus } from '../projects/entities/project.entity';
import { AffinityScore } from '../affinity/entities/affinity-score.entity';
import { NaturalPersonProfile, NaturalPersonSubtype } from '../users/entities/natural-person-profile.entity';
import { UserType } from '../users/entities/user.entity';
import type { JwtPayload } from '../auth/interfaces/auth.interfaces';

type AnyMock = Record<string, jest.Mock>;

describe('FeedService', () => {
  let service: FeedService;
  let qb: AnyMock;

  beforeEach(async () => {
    qb = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    const projectsRepo = { createQueryBuilder: jest.fn(() => qb) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        FeedService,
        { provide: getRepositoryToken(Project), useValue: projectsRepo },
        { provide: getRepositoryToken(AffinityScore), useValue: {} },
        { provide: getRepositoryToken(NaturalPersonProfile), useValue: { findOne: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(FeedService);
  });

  const asUser = (over: Partial<JwtPayload>): JwtPayload => ({
    sub: 'u1',
    email: 'x@x.cl',
    type: UserType.NATURAL_PERSON,
    provider: 'local',
    subtype: null,
    ...over,
  }) as JwtPayload;

  const expectStatuses = (statuses: ProjectStatus[]) =>
    expect(qb.where).toHaveBeenCalledWith('p.status IN (:...statuses)', { statuses });

  it('la empresa ve proyectos open y negotiating', async () => {
    await service.getFeed({}, asUser({ type: UserType.COMPANY, subtype: null }));
    expectStatuses([ProjectStatus.OPEN, ProjectStatus.NEGOTIATING]);
  });

  it('el developer ve proyectos seeking_team', async () => {
    await service.getFeed({}, asUser({ subtype: NaturalPersonSubtype.DEVELOPER }));
    expectStatuses([ProjectStatus.SEEKING_TEAM]);
  });

  it('el creador ve open y negotiating (default)', async () => {
    await service.getFeed({}, asUser({ subtype: NaturalPersonSubtype.CREATOR }));
    expectStatuses([ProjectStatus.OPEN, ProjectStatus.NEGOTIATING]);
  });

  it('un filtro de estado explícito sobrescribe el default', async () => {
    await service.getFeed({ status: ProjectStatus.FUNDED }, asUser({ type: UserType.COMPANY }));
    expectStatuses([ProjectStatus.FUNDED]);
  });
});
