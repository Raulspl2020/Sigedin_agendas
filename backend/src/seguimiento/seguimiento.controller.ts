import { Controller, Get, Post, Body, UseGuards, Query, Request, Put, Param, ParseIntPipe } from '@nestjs/common';
import { SeguimientoService } from './seguimiento.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CrearSeguimientoDto } from './dto/crear-seguimiento.dto';
import { ActualizarSeguimientoDto } from './dto/actualizar-seguimiento.dto';

/**
 * Controlador que expone los endpoints para el seguimiento semanal.
 */
@Controller('seguimiento')
export class SeguimientoController {
    constructor(private readonly seguimientoServicio: SeguimientoService) { }

    @UseGuards(JwtAuthGuard)
    @Get('actividades')
    obtenerActividades(
        @Request() req: any,
        @Query('periodo') idPeriodo?: string,
        @Query('semana') semana?: string,
        @Query('corte') idCorte?: string,
        @Query('id_docente') idDocente?: string,
    ) {
        return this.seguimientoServicio.obtenerActividades(
            req.user,
            idPeriodo ? +idPeriodo : undefined,
            semana ? +semana : undefined,
            idCorte ? +idCorte : undefined,
            idDocente ? +idDocente : undefined,
        );
    }

    @UseGuards(JwtAuthGuard)
    @Get('lookup')
    lookup(
        @Request() req: any,
        @Query('actividad', ParseIntPipe) idActividad: number,
        @Query('semana', ParseIntPipe) semana: number,
        @Query('periodo', ParseIntPipe) idPeriodo: number,
    ) {
        return this.seguimientoServicio.lookup(idActividad, semana, idPeriodo, req.user);
    }

    @UseGuards(JwtAuthGuard)
    @Get('stats-corte')
    obtenerStatsPorCorte(
        @Request() req: any,
        @Query('actividad', ParseIntPipe) idActividad: number,
        @Query('corte', ParseIntPipe) idCorte: number,
        @Query('periodo', ParseIntPipe) idPeriodo: number,
    ) {
        return this.seguimientoServicio.obtenerStatsPorCorte(idActividad, idCorte, idPeriodo, req.user);
    }

    @UseGuards(JwtAuthGuard)
    @Get('resumen')
    obtenerResumenActividadCorteSemana(
        @Request() req: any,
        @Query('actividad', ParseIntPipe) idActividad: number,
        @Query('corte', ParseIntPipe) idCorte: number,
        @Query('semana', ParseIntPipe) semana: number,
    ) {
        return this.seguimientoServicio.obtenerResumenActividadCorteSemana(idActividad, idCorte, semana, req.user);
    }

    @UseGuards(JwtAuthGuard)
    @Get('semanas-periodo')
    obtenerSemanasPeriodo(
        @Request() req: any,
        @Query('periodo', ParseIntPipe) idPeriodo: number,
    ) {
        return this.seguimientoServicio.obtenerSemanasPeriodo(idPeriodo, req.user);
    }

    /**
     * Registra un nuevo seguimiento semanal.
     */
    @UseGuards(JwtAuthGuard)
    @Post()
    crear(@Request() req: any, @Body() crearSeguimientoDto: CrearSeguimientoDto) {
        return this.seguimientoServicio.crear(crearSeguimientoDto, req.user);
    }

    @UseGuards(JwtAuthGuard)
    @Put(':id_seguimiento')
    actualizar(
        @Request() req: any,
        @Param('id_seguimiento', ParseIntPipe) idSeguimiento: number,
        @Body() dto: ActualizarSeguimientoDto,
    ) {
        return this.seguimientoServicio.actualizar(idSeguimiento, dto, req.user);
    }

    /**
     * Obtiene los seguimientos de una actividad específica.
     */
    @UseGuards(JwtAuthGuard)
    @Get()
    listarPorActividad(@Request() req: any, @Query('id_actividad') idActividad: string) {
        return this.seguimientoServicio.listarPorActividad(+idActividad, req.user);
    }

    /**
     * Obtiene el resumen de avance del docente autenticado desde la vista
     * `vw_dashboard_docente`, agrupado por tipo de actividad.
     *
     * @param req      - Objeto request (contiene usuario JWT)
     * @param idPeriodo - ID del periodo académico a consultar
     */
    @UseGuards(JwtAuthGuard)
    @Get('dashboard')
    obtenerDashboard(
        @Request() req: any,
        @Query('id_periodo') idPeriodo: string,
        @Query('id_docente') idDocente?: string,
    ) {
        return this.seguimientoServicio.obtenerDashboard(
            req.user,
            +idPeriodo,
            idDocente ? +idDocente : undefined,
        );
    }

    @UseGuards(JwtAuthGuard)
    @Get('consolidado')
    obtenerConsolidadoPorDocente(
        @Request() req: any,
        @Query('id_periodo') idPeriodo: string,
        @Query('id_facultad') idFacultad?: string,
        @Query('id_programa') idPrograma?: string,
        @Query('id_docente') idDocente?: string,
        @Query('estado_avance') estadoAvance?: string,
        @Query('semana') semana?: string,
        @Query('corte') idCorte?: string,
        @Query('id_tipo') idTipo?: string,
        @Query('q') q?: string,
    ) {
        return this.seguimientoServicio.obtenerConsolidadoSeguimientoPorDocente(req.user, {
            id_periodo: Number(idPeriodo),
            id_facultad: idFacultad ? Number(idFacultad) : undefined,
            id_programa: idPrograma ? Number(idPrograma) : undefined,
            id_docente: idDocente ? Number(idDocente) : undefined,
            estado_avance: estadoAvance,
            semana: semana ? Number(semana) : undefined,
            id_corte: idCorte ? Number(idCorte) : undefined,
            id_tipo: idTipo ? Number(idTipo) : undefined,
            q,
        });
    }

    @UseGuards(JwtAuthGuard)
    @Get('docente-historial')
    obtenerHistorialDocente(
        @Request() req: any,
        @Query('id_periodo') idPeriodo: string,
        @Query('id_docente') idDocente: string,
    ) {
        return this.seguimientoServicio.obtenerHistorialSemanalDocente(
            req.user,
            Number(idPeriodo),
            Number(idDocente),
        );
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id_seguimiento')
    obtenerDetalle(
        @Request() req: any,
        @Param('id_seguimiento', ParseIntPipe) idSeguimiento: number,
    ) {
        return this.seguimientoServicio.obtenerDetalle(idSeguimiento, req.user);
    }
}
