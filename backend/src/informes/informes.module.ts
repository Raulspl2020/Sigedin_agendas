import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Docente } from '../docente/entities/docente.entity';
import { Facultad } from '../docente/entities/facultad.entity';
import { InformesController } from './informes.controller';
import { InformesService } from './informes.service';

@Module({
    imports: [TypeOrmModule.forFeature([Docente, Facultad]), AuthModule],
    controllers: [InformesController],
    providers: [InformesService],
})
export class InformesModule {}
