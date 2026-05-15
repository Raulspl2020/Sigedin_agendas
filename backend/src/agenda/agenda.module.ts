import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgendaDocente } from './entities/agenda.entity';
import { PeriodoAcademico } from './entities/periodo.entity';
import { CorteAcademico } from './entities/corte-academico.entity';
import { Informe } from './entities/informe.entity';
import { AgendaService } from './agenda.service';
import { AgendaController } from './agenda.controller';
import { PeriodoController } from './periodo.controller';
import { ActividadModule } from '../actividad/actividad.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [TypeOrmModule.forFeature([AgendaDocente, PeriodoAcademico, CorteAcademico, Informe]), forwardRef(() => ActividadModule), AuthModule],
    controllers: [AgendaController, PeriodoController],
    providers: [AgendaService],
    exports: [AgendaService, TypeOrmModule],
})
export class AgendaModule { }
