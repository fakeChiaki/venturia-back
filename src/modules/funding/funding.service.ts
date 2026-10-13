import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CompanyProfile } from '../companies/entities/company-profile.entity';
import { FundingOffer, FundingOfferStatus } from '../projects/entities/funding-offer.entity';
import { Project, ProjectStatus } from '../projects/entities/project.entity';
import { NaturalPersonProfile, NaturalPersonSubtype } from '../users/entities/natural-person-profile.entity';
import { CreateOfferDto } from './dto/create-offer.dto';

@Injectable()
export class FundingService {
  constructor(
    @InjectRepository(FundingOffer)
    private readonly offerRepo: Repository<FundingOffer>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(CompanyProfile)
    private readonly companyRepo: Repository<CompanyProfile>,
    @InjectRepository(NaturalPersonProfile)
    private readonly profileRepo: Repository<NaturalPersonProfile>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Empresa ──────────────────────────────────────────────────────────────────

  async createOffer(userId: string, projectId: string, dto: CreateOfferDto): Promise<FundingOffer> {
    const company = await this.getCompany(userId);

    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Proyecto no encontrado');
    if (project.status !== ProjectStatus.OPEN && project.status !== ProjectStatus.NEGOTIATING) {
      throw new ConflictException('El proyecto no está disponible para ofertas');
    }

    return this.dataSource.transaction(async (em) => {
      const offer = em.create(FundingOffer, {
        projectId,
        companyId: company.id,
        amount: dto.amount,
        message: dto.message ?? null,
        round: 1,
        status: FundingOfferStatus.PENDING,
      });
      const saved = await em.save(offer);

      if (project.status === ProjectStatus.OPEN) {
        await em.update(Project, projectId, { status: ProjectStatus.NEGOTIATING });
      }

      return saved;
    });
  }

  async getMyOffersForProject(userId: string, projectId: string): Promise<FundingOffer[]> {
    const company = await this.getCompany(userId);
    return this.offerRepo.find({
      where: { projectId, companyId: company.id },
      order: { round: 'ASC', createdAt: 'ASC' },
    });
  }

  // ─── Creador ──────────────────────────────────────────────────────────────────

  async getProjectOffers(userId: string, projectId: string): Promise<FundingOffer[]> {
    const creator = await this.getCreator(userId);

    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project || project.creatorId !== creator.id) {
      throw new ForbiddenException('No tienes acceso a este proyecto');
    }

    return this.offerRepo.find({
      where: { projectId },
      relations: { company: true },
      order: { round: 'ASC', createdAt: 'ASC' },
    });
  }

  async counterOffer(userId: string, offerId: string, dto: CreateOfferDto): Promise<FundingOffer> {
    const creator = await this.getCreator(userId);
    const parent = await this.loadOfferForCreator(offerId, creator.id);

    if (parent.status !== FundingOfferStatus.PENDING) {
      throw new ConflictException('Solo se puede contraoferta a una oferta pendiente');
    }

    return this.dataSource.transaction(async (em) => {
      await em.update(FundingOffer, offerId, { status: FundingOfferStatus.COUNTERED });

      return em.save(
        em.create(FundingOffer, {
          projectId: parent.projectId,
          companyId: parent.companyId,
          amount: dto.amount,
          message: dto.message ?? null,
          round: parent.round + 1,
          parentOfferId: parent.id,
          status: FundingOfferStatus.PENDING,
        }),
      );
    });
  }

  async acceptOffer(userId: string, offerId: string): Promise<FundingOffer> {
    const creator = await this.getCreator(userId);
    const offer = await this.loadOfferForCreator(offerId, creator.id);

    if (offer.status !== FundingOfferStatus.PENDING) {
      throw new ConflictException('Solo se puede aceptar una oferta pendiente');
    }

    return this.dataSource.transaction(async (em) => {
      await em.update(FundingOffer, offerId, { status: FundingOfferStatus.ACCEPTED });

      // Sumar todos los aportes aceptados del proyecto (incluye el recién aceptado)
      const raw = await em
        .createQueryBuilder(FundingOffer, 'o')
        .select('COALESCE(SUM(o.amount), 0)', 'total')
        .where('o.projectId = :pid AND o.status = :st', {
          pid: offer.projectId,
          st: FundingOfferStatus.ACCEPTED,
        })
        .getRawOne<{ total: string }>();

      const accepted = Number(raw?.total ?? 0);
      const project = await em.findOneOrFail(Project, { where: { id: offer.projectId } });
      const goal = project.fundingGoal !== null ? Number(project.fundingGoal) : null;

      // Meta alcanzada (o sin meta definida): se cierra el financiamiento
      if (goal === null || accepted >= goal) {
        await em.update(
          FundingOffer,
          { projectId: offer.projectId, status: FundingOfferStatus.PENDING },
          { status: FundingOfferStatus.REJECTED },
        );
        await em.update(Project, offer.projectId, { status: ProjectStatus.FUNDED });
      }

      return em.findOneOrFail(FundingOffer, { where: { id: offerId } });
    });
  }

  async rejectOffer(userId: string, offerId: string): Promise<void> {
    const creator = await this.getCreator(userId);
    const offer = await this.loadOfferForCreator(offerId, creator.id);

    if (offer.status !== FundingOfferStatus.PENDING) {
      throw new ConflictException('Solo se puede rechazar una oferta pendiente');
    }

    await this.offerRepo.update(offerId, { status: FundingOfferStatus.REJECTED });
  }

  // ─── Progreso de financiamiento ─────────────────────────────────────────────────

  async getFundingSummary(projectId: string): Promise<{
    goal: number | null;
    funded: number;
    remaining: number | null;
    backers: number;
  }> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      select: ['id', 'fundingGoal'],
    });
    if (!project) throw new NotFoundException('Proyecto no encontrado');

    const raw = await this.offerRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.amount), 0)', 'total')
      .addSelect('COUNT(DISTINCT o.companyId)', 'backers')
      .where('o.projectId = :pid AND o.status = :st', {
        pid: projectId,
        st: FundingOfferStatus.ACCEPTED,
      })
      .getRawOne<{ total: string; backers: string }>();

    const funded = Number(raw?.total ?? 0);
    const goal = project.fundingGoal !== null ? Number(project.fundingGoal) : null;

    return {
      goal,
      funded,
      remaining: goal !== null ? Math.max(goal - funded, 0) : null,
      backers: Number(raw?.backers ?? 0),
    };
  }

  // ─── Helpers privados ─────────────────────────────────────────────────────────

  private async getCompany(userId: string): Promise<CompanyProfile> {
    const company = await this.companyRepo.findOne({ where: { userId }, select: ['id'] });
    if (!company) throw new ForbiddenException('Solo empresas pueden realizar esta acción');
    return company;
  }

  private async getCreator(userId: string): Promise<NaturalPersonProfile> {
    const profile = await this.profileRepo.findOne({
      where: { userId, subtype: NaturalPersonSubtype.CREATOR },
      select: ['id'],
    });
    if (!profile) throw new ForbiddenException('Solo creadores pueden realizar esta acción');
    return profile;
  }

  private async loadOfferForCreator(offerId: string, creatorId: string): Promise<FundingOffer> {
    const offer = await this.offerRepo.findOne({
      where: { id: offerId },
      relations: { project: true },
    });
    if (!offer) throw new NotFoundException('Oferta no encontrada');
    if (offer.project.creatorId !== creatorId) {
      throw new ForbiddenException('No tienes acceso a esta oferta');
    }
    return offer;
  }
}
