import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterestArea } from './entities/interest-area.entity';
import { Role } from './entities/role.entity';
import { TechnicalArea } from './entities/technical-area.entity';
import { CatalogsController } from './catalogs.controller';
import { CatalogsService } from './catalogs.service';

@Module({
  imports: [TypeOrmModule.forFeature([TechnicalArea, Role, InterestArea])],
  controllers: [CatalogsController],
  providers: [CatalogsService],
  exports: [TypeOrmModule],
})
export class CatalogsModule {}
