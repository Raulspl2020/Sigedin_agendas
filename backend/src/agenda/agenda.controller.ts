import { Controller, Get, Post, Put, Delete, Body, UseGuards, Request, Query, Param, ForbiddenException } from '@nestjs/common';
import { AgendaService } from './agenda.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CrearAgendaDto } from './dto/crear-agenda.dto';
import { CrearPeriodoDto, ActualizarPeriodoDto } from './dto/periodo.dto';
import { CrearCorteAcademicoDto, ActualizarCorteAcademicoDto } from './dto/corte-academico.dto';

/**
 * Controlador que expone los endpoints para la gestión de agendas.
 */
@Controller('agendas')
export class AgendaController {
    constructor(private readonly agendaServicio: AgendaService) { }

    /**
     * Obtiene todos los periodos académicos.
     */
    @Get('periodos')
    obtenerPeriodos() {
        return this.agendaServicio.obtenerPeriodos();
    }

    @Get('cortes')
    obtenerCortes(@Query('id_periodo') idPeriodo?: string) {
        const id = idPeriodo ? +idPeriodo : undefined;
        return this.agendaServicio.obtenerCortes(id);
    }

    @Get('cortes/:id')
    obtenerCortePorId(@Param('id') id: string) {
        return this.agendaServicio.obtenerCortePorId(+id);
    }

    @UseGuards(JwtAuthGuard)
    @Post('cortes')
    crearCorte(@Request() req: any, @Body() dto: CrearCorteAcademicoDto) {
        if (req.user.rol !== 'ADMIN') {
            throw new ForbiddenException('No tiene permisos para realizar esta acción');
        }
        return this.agendaServicio.crearCorte(dto);
    }

    @UseGuards(JwtAuthGuard)
    @Put('cortes/:id')
    actualizarCorte(@Request() req: any, @Param('id') id: string, @Body() dto: ActualizarCorteAcademicoDto) {
        if (req.user.rol !== 'ADMIN') {
            throw new ForbiddenException('No tiene permisos para realizar esta acción');
        }
        return this.agendaServicio.actualizarCorte(+id, dto);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('cortes/:id')
    eliminarCorte(@Request() req: any, @Param('id') id: string) {
        if (req.user.rol !== 'ADMIN') {
            throw new ForbiddenException('No tiene permisos para realizar esta acción');
        }
        return this.agendaServicio.eliminarCorte(+id);
    }

    /**
     * Obtiene un periodo académico por su ID.
     * Usado para pre-poblar el formulario de edición en página completa.
     */
    @Get('periodos/:id')
    obtenerPeriodoPorId(@Param('id') id: string) {
        console.log('--- BACKEND: Buscando Periodo ID:', id);
        return this.agendaServicio.obtenerPeriodoPorId(+id);
    }

    /**
     * Crea un nuevo periodo académico (Solo ADMIN).
     */
    @UseGuards(JwtAuthGuard)
    @Post('periodos')
    crearPeriodo(@Request() req: any, @Body() crearPeriodoDto: CrearPeriodoDto) {
        if (req.user.rol !== 'ADMIN') {
            throw new ForbiddenException('No tiene permisos para realizar esta acción');
        }
        return this.agendaServicio.crearPeriodo(crearPeriodoDto);
    }

    /**
     * Actualiza un periodo académico (Solo ADMIN).
     */
    @UseGuards(JwtAuthGuard)
    @Put('periodos/:id')
    actualizarPeriodo(
        @Request() req: any,
        @Param('id') id: string,
        @Body() actualizarPeriodoDto: ActualizarPeriodoDto
    ) {
        if (req.user.rol !== 'ADMIN') {
            throw new ForbiddenException('No tiene permisos para realizar esta acción');
        }
        return this.agendaServicio.actualizarPeriodo(+id, actualizarPeriodoDto);
    }

    /**
     * Elimina un periodo académico (Solo ADMIN).
     */
    @UseGuards(JwtAuthGuard)
    @Delete('periodos/:id')
    eliminarPeriodo(@Request() req: any, @Param('id') id: string) {
        if (req.user.rol !== 'ADMIN') {
            throw new ForbiddenException('No tiene permisos para realizar esta acción');
        }
        return this.agendaServicio.eliminarPeriodo(+id);
    }

    /**
     * Obtiene todas las agendas (Solo ADMIN).
     */
    @UseGuards(JwtAuthGuard)
    @Get()
    obtenerTodas(@Request() req: any) {
        const rol = String(req.user?.rol || '').toUpperCase();
        if (rol !== 'ADMIN' && rol !== 'DECANO') {
            throw new ForbiddenException('No tiene permisos para realizar esta acción');
        }
        return this.agendaServicio.obtenerTodas(req.user);
    }

    /**
     * Crea una nueva agenda para el docente autenticado.
     */
    @UseGuards(JwtAuthGuard)
    @Post()
    crear(@Request() req: any, @Body() crearAgendaDto: CrearAgendaDto) {
        let idDocente = req.user.id_docente;

        // Si es admin, puede especificar el docente en el body
        if (req.user.rol === 'ADMIN' && crearAgendaDto.id_docente) {
            idDocente = crearAgendaDto.id_docente;
        }

        return this.agendaServicio.crear(idDocente, crearAgendaDto, req.user);
    }

    /**
     * Actualiza una agenda existente (Solo ADMIN).
     */
    @UseGuards(JwtAuthGuard)
    @Put(':id')
    actualizarAgenda(@Request() req: any, @Param('id') id: string, @Body() body: any) {
        if (req.user.rol !== 'ADMIN') {
            throw new ForbiddenException('No tiene permisos para realizar esta acción');
        }
        return this.agendaServicio.actualizarAgenda(+id, body, req.user);
    }

    /**
     * Elimina una agenda (Solo ADMIN).
     */
    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    eliminarAgenda(@Request() req: any, @Param('id') id: string) {
        if (req.user.rol !== 'ADMIN') {
            throw new ForbiddenException('No tiene permisos para realizar esta acción');
        }
        return this.agendaServicio.eliminarAgenda(+id, req.user);
    }

    /**
     * Obtiene la agenda del docente autenticado para un periodo específico.
     * IMPORTANTE: debe estar declarado ANTES de ':id' para que NestJS
     * no lo interprete como parámetro dinámico.
     */
    @UseGuards(JwtAuthGuard)
    @Get('mi-agenda')
    obtenerMiAgenda(@Request() req: any, @Query('id_periodo') idPeriodo: string) {
        const idDocente = req.user.id_docente;
        return this.agendaServicio.obtenerPorPeriodo(idDocente, +idPeriodo);
    }

    /**
     * Obtiene las estadísticas (horas, porcentaje, semáforo) de una agenda.
     * IMPORTANTE: debe estar declarado ANTES de ':id' para que NestJS
     * no lo interprete como parámetro dinámico.
     */
    @UseGuards(JwtAuthGuard)
    @Get('estadisticas/:id')
    obtenerEstadisticas(@Request() req: any, @Param('id') id: string) {
        return this.agendaServicio.obtenerEstadisticas(+id, req.user);
    }

    /**
     * Obtiene una agenda por su ID (Solo ADMIN).
     * Usado para pre-poblar el formulario de edición en página completa.
     * IMPORTANTE: debe estar declarado DESPUÉS de las rutas con segmentos
     * literales ('mi-agenda', 'estadisticas/:id') para evitar colisiones.
     */
    @UseGuards(JwtAuthGuard)
    @Get(':id')
    obtenerPorId(@Request() req: any, @Param('id') id: string) {
        if (req.user.rol !== 'ADMIN') {
            throw new ForbiddenException('No tiene permisos para realizar esta acción');
        }
        return this.agendaServicio.obtenerPorId(+id, req.user);
    }
}
