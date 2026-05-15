import { Body, Controller, Get, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SeguimientoService } from './seguimiento.service';

@Controller('supervision')
@UseGuards(JwtAuthGuard)
export class SupervisionController {
    constructor(private readonly seguimientoServicio: SeguimientoService) { }

    @Get('dashboard')
    obtenerDashboard(
        @Request() req: any,
        @Query('id_periodo') idPeriodo: string,
    ) {
        return this.seguimientoServicio.obtenerSupervisionDashboard(
            req.user,
            Number(idPeriodo),
        );
    }

    @Get('evidencias')
    obtenerEvidencias(
        @Request() req: any,
        @Query('id_periodo') idPeriodo: string,
        @Query('id_corte') idCorte: string,
        @Query('id_docente') idDocente: string,
    ) {
        return this.seguimientoServicio.obtenerSupervisionEvidencias(
            req.user,
            Number(idPeriodo),
            Number(idCorte),
            Number(idDocente),
        );
    }

    @Patch('aprobar-informe')
    aprobarInforme(
        @Request() req: any,
        @Body() body: { id_periodo: number; id_corte: number; id_docente: number },
    ) {
        return this.seguimientoServicio.aprobarInformeSupervision(
            req.user,
            Number(body?.id_periodo),
            Number(body?.id_corte),
            Number(body?.id_docente),
        );
    }

    @Patch('observaciones')
    guardarObservaciones(
        @Request() req: any,
        @Body() body: { id_periodo: number; id_corte: number; id_docente: number; observaciones: string },
    ) {
        return this.seguimientoServicio.guardarObservacionesSupervision(
            req.user,
            Number(body?.id_periodo),
            Number(body?.id_corte),
            Number(body?.id_docente),
            body?.observaciones,
        );
    }
}
