import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeguimientoSemanal } from './entities/seguimiento.entity';
import { SeguimientoService } from './seguimiento.service';
import { SeguimientoController } from './seguimiento.controller';
import { DashboardController } from './dashboard.controller';
import { SupervisionController } from './supervision.controller';
import { Actividad } from '../actividad/entities/actividad.entity';
import { AuthModule } from '../auth/auth.module';
import { AgendaDocente } from '../agenda/entities/agenda.entity';
import { CorteAcademico } from '../agenda/entities/corte-academico.entity';
import { Evidencia } from '../evidencia/entities/evidencia.entity';
import { PeriodoAcademico } from '../agenda/entities/periodo.entity';

@Module({
    imports: [TypeOrmModule.forFeature([SeguimientoSemanal, Actividad, AgendaDocente, CorteAcademico, Evidencia, PeriodoAcademico]), AuthModule],
    controllers: [SeguimientoController, DashboardController, SupervisionController],
    providers: [SeguimientoService],
    exports: [SeguimientoService],
})
export class SeguimientoModule { }
