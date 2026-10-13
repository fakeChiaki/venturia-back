import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InterestArea } from './entities/interest-area.entity';
import { Role } from './entities/role.entity';
import { TechnicalArea } from './entities/technical-area.entity';

@Injectable()
export class CatalogsService {
  constructor(
    @InjectRepository(TechnicalArea)
    private readonly technicalAreaRepo: Repository<TechnicalArea>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(InterestArea)
    private readonly interestAreaRepo: Repository<InterestArea>,
  ) {}

  findAllTechnicalAreas(): Promise<TechnicalArea[]> {
    return this.technicalAreaRepo.find({ order: { name: 'ASC' } });
  }

  findAllRoles(): Promise<Role[]> {
    return this.roleRepo.find({ order: { name: 'ASC' } });
  }

  findAllInterestAreas(): Promise<InterestArea[]> {
    return this.interestAreaRepo.find({ order: { name: 'ASC' } });
  }
}
