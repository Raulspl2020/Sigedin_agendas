import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Actividad } from './entities/actividad.entity';
import { TipoActividad } from './entities/tipo-actividad.entity';
import { PlanCorteActividad } from './entities/plan-corte-actividad.entity';
import { CorteAcademico } from '../agenda/entities/corte-academico.entity';
import { AgendaDocente } from '../agenda/entities/agenda.entity';
import { ActividadService } from './actividad.service';
import { ActividadController } from './actividad.controller';
import { CatalogoActividadController } from './catalogo-actividad.controller';
import { AgendaModule } from '../agenda/agenda.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [TypeOrmModule.forFeature([Actividad, TipoActividad, PlanCorteActividad, CorteAcademico, AgendaDocente]), forwardRef(() => AgendaModule), AuthModule],
    controllers: [ActividadController, CatalogoActividadController],
    providers: [ActividadService],
    exports: [ActividadService],
})
export class ActividadModule { }
