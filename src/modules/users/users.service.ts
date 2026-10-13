import * as bcrypt from 'bcrypt';
import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyOwner } from '../companies/entities/company-owner.entity';
import { CompanyProfile } from '../companies/entities/company-profile.entity';
import { InterestArea } from '../catalogs/entities/interest-area.entity';
import { Role } from '../catalogs/entities/role.entity';
import { TechnicalArea } from '../catalogs/entities/technical-area.entity';
import { StorageService } from '../storage/storage.service';
import { AffinityQueueService } from '../affinity/affinity-queue.service';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';
import { UpdateNaturalProfileDto } from './dto/update-natural-profile.dto';
import { NaturalPersonProfile } from './entities/natural-person-profile.entity';
import { User, UserType } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(NaturalPersonProfile)
    private readonly naturalProfileRepo: Repository<NaturalPersonProfile>,
    @InjectRepository(CompanyProfile)
    private readonly companyRepo: Repository<CompanyProfile>,
    @InjectRepository(CompanyOwner)
    private readonly ownerRepo: Repository<CompanyOwner>,
    private readonly affinityQueue: AffinityQueueService,
    private readonly storageService: StorageService,
  ) {}

  private async findUser(userId: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  // ---- Consulta polimórfica (RF-05 / lectura) ----

  async getProfile(userId: string): Promise<NaturalPersonProfile | CompanyProfile> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { naturalPersonProfile: true, companyProfile: { owners: true } },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (user.type === UserType.NATURAL_PERSON) {
      const profile = await this.naturalProfileRepo.findOne({
        where: { userId },
        relations: { roles: true, interestAreas: true, technicalAreas: true },
      });
      if (!profile) throw new NotFoundException('Perfil no encontrado');
      return profile;
    }

    if (user.type === UserType.COMPANY) {
      if (!user.companyProfile) {
        throw new NotFoundException('Perfil de empresa no encontrado');
      }
      return user.companyProfile;
    }

    throw new NotFoundException('Tipo de usuario inválido');
  }

  // ---- Edición de perfil base (RF-05) ----

  async updateNaturalProfile(
    userId: string,
    dto: UpdateNaturalProfileDto,
  ): Promise<NaturalPersonProfile> {
    const profile = await this.naturalProfileRepo.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Perfil no encontrado');

    if (dto.fullName !== undefined) profile.fullName = dto.fullName;
    if (dto.photoUrl !== undefined) profile.photoUrl = dto.photoUrl;
    if (dto.cvUrl !== undefined) profile.cvUrl = dto.cvUrl;

    await this.naturalProfileRepo.save(profile);

    if (dto.email !== undefined) {
      const user = await this.userRepo.findOne({
        where: { id: userId },
        select: ['id', 'email', 'passwordHash'],
      });
      if (!user) throw new NotFoundException('Usuario no encontrado');
      const valid = await bcrypt.compare(dto.currentPassword ?? '', user.passwordHash ?? '');
      if (!valid) throw new UnauthorizedException('Contraseña incorrecta');
      user.email = dto.email;
      await this.userRepo.save(user);
    }

    return this.getProfile(userId) as Promise<NaturalPersonProfile>;
  }

  async updateCompanyProfile(
    userId: string,
    dto: UpdateCompanyProfileDto,
  ): Promise<CompanyProfile> {
    const profile = await this.companyRepo.findOne({
      where: { userId },
      relations: { owners: true },
    });
    if (!profile) throw new NotFoundException('Perfil de empresa no encontrado');

    if (dto.companyName !== undefined) profile.companyName = dto.companyName;
    if (dto.address !== undefined) profile.address = dto.address;
    if (dto.phone !== undefined) profile.phone = dto.phone;
    if (dto.photoUrl !== undefined) profile.photoUrl = dto.photoUrl;
    if (dto.businessHours !== undefined) profile.businessHours = dto.businessHours;
    if (dto.policies !== undefined) profile.policies = dto.policies;

    if (dto.owners !== undefined) {
      await this.ownerRepo.delete({ companyProfileId: profile.id });
      profile.owners = dto.owners.map((o) =>
        this.ownerRepo.create({ ...o, companyProfileId: profile.id }),
      );
    }

    await this.companyRepo.save(profile);
    return this.companyRepo.findOne({
      where: { userId },
      relations: { owners: true },
    }) as Promise<CompanyProfile>;
  }

  // ---- Onboarding técnico (RF-04) y re-actualización (RF-05) ----

  async completeOnboarding(
    userId: string,
    dto: CompleteOnboardingDto,
  ): Promise<NaturalPersonProfile> {
    const profile = await this.naturalProfileRepo.findOne({
      where: { userId },
      relations: { roles: true, interestAreas: true, technicalAreas: true },
    });
    if (!profile) throw new NotFoundException('Perfil no encontrado');

    profile.technicalAreas = dto.technicalAreaIds.map((id) => ({ id }) as TechnicalArea);
    profile.methodology = dto.methodology;
    profile.weeklyHours = dto.weeklyHours;
    if (dto.timezone !== undefined) profile.timezone = dto.timezone;
    if (dto.availability !== undefined) profile.availability = dto.availability;
    profile.roles = dto.roleIds.map((id) => ({ id }) as Role);
    profile.interestAreas = dto.interestAreaIds.map(
      (id) => ({ id }) as InterestArea,
    );
    profile.onboardingCompleted = true;

    await this.naturalProfileRepo.save(profile);
    await this.affinityQueue.enqueueForUser(userId);
    return this.getProfile(userId) as Promise<NaturalPersonProfile>;
  }

  // ---- Subida de CV (RF-01) ----

  async uploadCv(userId: string, buffer: Buffer): Promise<NaturalPersonProfile> {
    const profile = await this.naturalProfileRepo.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Perfil no encontrado');

    const url = await this.storageService.upload(
      `cvs/${userId}.pdf`,
      buffer,
      'application/pdf',
    );

    profile.cvUrl = url;
    await this.naturalProfileRepo.save(profile);
    return this.getProfile(userId) as Promise<NaturalPersonProfile>;
  }

  // ---- Desactivación de cuenta (RF-06) ----

  async deactivateUser(userId: string): Promise<void> {
    const user = await this.findUser(userId);
    user.isActive = false;
    await this.userRepo.save(user);
  }
}