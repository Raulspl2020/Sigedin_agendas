import { Controller, Get, Query, Request, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InformesService } from './informes.service';

@Controller('informes')
@UseGuards(JwtAuthGuard)
export class InformesController {
    constructor(private readonly informesService: InformesService) {}

    @Get('filtros/periodos')
    listarPeriodos(@Request() req: any, @Query() query: Record<string, any>) {
        return this.informesService.obtenerPeriodosDisponibles(query, req.user);
    }

    @Get('filtros/facultades')
    listarFacultades(@Request() req: any, @Query() query: Record<string, any>) {
        return this.informesService.obtenerFacultadesDisponibles(query, req.user);
    }

    @Get('filtros/cortes')
    listarCortes(@Request() req: any, @Query() query: Record<string, any>) {
        return this.informesService.obtenerCortesDisponibles(query, req.user);
    }

    @Get('filtros/semanas')
    listarSemanas(@Request() req: any, @Query() query: Record<string, any>) {
        return this.informesService.obtenerSemanasDisponibles(query, req.user);
    }

    @Get('filtros/docentes')
    listarDocentes(@Request() req: any, @Query() query: Record<string, any>) {
        return this.informesService.obtenerDocentesDisponibles(query, req.user);
    }

    @Get('ejecutivo/filtros')
    listarFiltrosEjecutivo(@Request() req: any, @Query() query: Record<string, any>) {
        return this.informesService.obtenerFiltrosEjecutivo(query, req.user);
    }

    @Get('ejecutivo/reporte')
    consultarReporteEjecutivo(@Request() req: any, @Query() query: Record<string, any>) {
        return this.informesService.consultarReporteEjecutivo(query, req.user);
    }

    @Get('ejecutivo/exportar')
    async exportarExcelEjecutivo(
        @Request() req: any,
        @Query() query: Record<string, any>,
        @Res() res: Response,
    ) {
        const fileBuffer = await this.informesService.generarExcelEjecutivo(query, req.user);
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
        const fileName = `informe_ejecutivo_avance_docente_${timestamp}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(fileBuffer);
    }

    @Get('reporte')
    consultarReporte(@Request() req: any, @Query() query: Record<string, any>) {
        return this.informesService.consultarReporte(query, req.user);
    }

    @Get('exportar')
    async exportarExcel(
        @Request() req: any,
        @Query() query: Record<string, any>,
        @Res() res: Response,
    ) {
        const fileBuffer = await this.informesService.generarExcel(query, req.user);
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
        const fileName = `reporte_consolidado_seguimiento_${timestamp}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(fileBuffer);
    }
}
