import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SeguimientoService } from './seguimiento.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
    constructor(private readonly seguimientoServicio: SeguimientoService) { }

    @Get('seguimiento')
    obtenerDashboardSeguimiento(
        @Request() req: any,
        @Query('id_periodo') idPeriodo: string,
        @Query('id_docente') idDocente?: string,
    ) {
        return this.seguimientoServicio.obtenerDashboardSeguimiento(
            req.user,
            Number(idPeriodo),
            idDocente ? Number(idDocente) : undefined,
        );
    }

    @Get('seguimiento-cortes')
    obtenerDashboardSeguimientoCortes(
        @Request() req: any,
        @Query('id_periodo') idPeriodo: string,
    ) {
        return this.seguimientoServicio.obtenerDashboardSeguimientoCortes(
            req.user,
            Number(idPeriodo),
        );
    }

    @Get('supervision/resumen')
    obtenerDashboardSupervisionResumen(
        @Request() req: any,
        @Query('id_periodo') idPeriodo: string,
    ) {
        return this.seguimientoServicio.obtenerDashboardSupervisionResumen(
            req.user,
            Number(idPeriodo),
        );
    }

    @Get('supervision/cortes')
    obtenerDashboardSupervisionCortes(
        @Request() req: any,
        @Query('id_periodo') idPeriodo: string,
    ) {
        return this.seguimientoServicio.obtenerDashboardSupervisionCortes(
            req.user,
            Number(idPeriodo),
        );
    }

    @Get('actividades-detalle')
    obtenerActividadesDetalle(
        @Request() req: any,
        @Query('id_periodo') idPeriodo: string,
        @Query('id_docente') idDocente?: string,
    ) {
        return this.seguimientoServicio.obtenerDashboardActividadesDetalle(
            req.user,
            Number(idPeriodo),
            idDocente ? Number(idDocente) : undefined,
        );
    }
}
