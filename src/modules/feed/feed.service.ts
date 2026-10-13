import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, ProjectStatus } from '../projects/entities/project.entity';
import { AffinityScore } from '../affinity/entities/affinity-score.entity';
import { NaturalPersonProfile, NaturalPersonSubtype } from '../users/entities/natural-person-profile.entity';
import { UserType } from '../users/entities/user.entity';
import type { JwtPayload } from '../auth/interfaces/auth.interfaces';
import { FeedQueryDto } from './dto/feed-query.dto';

export interface FeedProject {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  status: ProjectStatus;
  methodology: string;
  weeklyHours: number | null;
  technicalAreaIds: number[];
  creatorId: string;
  creatorName: string | null;
  /** Score de afinidad 0–100. null si no se pasó profileId. */
  affinityScore: number | null;
  /** Desglose del score por dimensión (si existe en affinity_scores). */
  affinityBreakdown: Record<string, number> | null;
  createdAt: Date;
}

export interface FeedResult {
  data: FeedProject[];
  total: number;
  page: number;
  totalPages: number;
}

@Injectable()
export class FeedService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepo: Repository<Project>,
    @InjectRepository(AffinityScore)
    private readonly affinityRepo: Repository<AffinityScore>,
    @InjectRepository(NaturalPersonProfile)
    private readonly profileRepo: Repository<NaturalPersonProfile>,
  ) {}

  async getFeed(query: FeedQueryDto, user: JwtPayload): Promise<FeedResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    // ── Derivar filtro de estados según tipo de usuario ───────────────────────
    const statuses: ProjectStatus[] = query.status
      ? [query.status]
      : user.type === UserType.NATURAL_PERSON && user.subtype === NaturalPersonSubtype.DEVELOPER
        ? [ProjectStatus.SEEKING_TEAM]
        : [ProjectStatus.OPEN, ProjectStatus.NEGOTIATING];

    // ── Construir la query SQL con todos los filtros aplicados en BD ──────────
    const qb = this.projectsRepo
      .createQueryBuilder('p')
      .leftJoin('p.creator', 'np')
      .select([
        'p.id            AS id',
        'p.name          AS name',
        'p.description   AS description',
        'p.image_url     AS "imageUrl"',
        'p.status        AS status',
        'p.methodology   AS methodology',
        'p.weekly_hours  AS "weeklyHours"',
        `ARRAY(SELECT pta.technical_area_id FROM project_technical_areas pta WHERE pta.project_id = p.id) AS "technicalAreaIds"`,
        'p.creator_id    AS "creatorId"',
        'np.full_name    AS "creatorName"',
        'p.created_at    AS "createdAt"',
      ])
      .where('p.status IN (:...statuses)', { statuses })
      .andWhere('p.deleted_at IS NULL');

    // ── Filtros opcionales ───────────────────────────────────────────────────

    if (query.areaTecnica !== undefined) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM project_technical_areas pta WHERE pta.project_id = p.id AND pta.technical_area_id = :areaId)`,
        { areaId: query.areaTecnica },
      );
    }

    if (query.metodologia !== undefined) {
      qb.andWhere('p.methodology = :metodologia', {
        metodologia: query.metodologia,
      });
    }

    if (query.disponibilidadMin !== undefined) {
      qb.andWhere('p.weekly_hours >= :minHours', {
        minHours: query.disponibilidadMin,
      });
    }

    if (query.roleIds?.length) {
      // El proyecto debe tener al menos un requerimiento de rol que coincida
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM project_role_requirements prr
          WHERE prr.project_id = p.id
            AND prr.role_id = ANY(:roleIds)
        )`,
        { roleIds: query.roleIds },
      );
    }

    if (query.interestAreaIds?.length) {
      // El proyecto debe compartir al menos una área de interés
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM project_interest_areas pia
          WHERE pia.project_id = p.id
            AND pia.interest_area_id = ANY(:interestAreaIds)
        )`,
        { interestAreaIds: query.interestAreaIds },
      );
    }

    // ── Conteo total (sin take/skip para el total real) ──────────────────────
    const total = await qb.getCount();

    // ── Si hay profileId intentamos ordenar por score de afinidad ────────────
    let resolvedProfileId: string | null = null;
    if (query.profileId) {
      const profile = await this.profileRepo.findOne({
        where: { userId: query.profileId },
        select: ['id'],
      });
      resolvedProfileId = profile?.id ?? null;
    }

    if (resolvedProfileId) {
      // LEFT JOIN con affinity_scores para obtener el score precalculado
      qb.leftJoin(
        'affinity_scores',
        'aff',
        'aff.project_id = p.id AND aff.profile_id = :profileId',
        { profileId: resolvedProfileId },
      )
        .addSelect('aff.score      AS "affinityScore"')
        .addSelect('aff.breakdown  AS "affinityBreakdown"')
        // Proyectos con score precalculado primero, luego por fecha
        .orderBy('aff.score', 'DESC', 'NULLS LAST')
        .addOrderBy('p.created_at', 'DESC');
    } else {
      qb.addSelect('NULL::numeric AS "affinityScore"')
        .addSelect('NULL::jsonb   AS "affinityBreakdown"')
        .orderBy('p.created_at', 'DESC');
    }

    // ── Paginación real con OFFSET/LIMIT en la BD ────────────────────────────
    qb.offset(skip).limit(limit);

    const rows = await qb.getRawMany<FeedProject>();

    // Convertir tipos que vienen como string de Postgres
    const data = rows.map((r) => ({
      ...r,
      weeklyHours: r.weeklyHours !== null ? Number(r.weeklyHours) : null,
      technicalAreaIds: (r.technicalAreaIds as unknown as string[])?.map(Number) ?? [],
      affinityScore:
        r.affinityScore !== null && r.affinityScore !== undefined
          ? Number(r.affinityScore)
          : null,
    }));

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
