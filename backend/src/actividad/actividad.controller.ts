import { Controller, Get, Post, Put, Delete, Body, UseGuards, Param, Query, Request, ForbiddenException } from '@nestjs/common';
import { ActividadService } from './actividad.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CrearActividadDto } from './dto/crear-actividad.dto';
import { CrearTipoActividadDto, ActualizarTipoActividadDto } from './dto/tipo-actividad.dto';

/**
 * Controlador que expone los endpoints para la gestión de actividades.
 */
@Controller('actividades')
export class ActividadController {
    constructor(private readonly actividadServicio: ActividadService) { }

    /**
     * Obtiene los tipos de actividades disponibles.
     */
    @Get('tipos')
    obtenerTipos() {
        return this.actividadServicio.obtenerTipos();
    }

    @UseGuards(JwtAuthGuard)
    @Get('resumen-cortes')
    obtenerResumenCortes(@Request() req: any, @Query('id_agenda') idAgenda: string) {
        return this.actividadServicio.obtenerResumenCortesPorAgenda(+idAgenda, req.user);
    }

    @UseGuards(JwtAuthGuard)
    @Post('recalcular-plan')
    recalcularPlanPorPeriodo(@Request() req: any, @Query('id_periodo') idPeriodo: string) {
        if (req.user.rol !== 'ADMIN') {
            throw new ForbiddenException('No tiene permisos para esta acción');
        }
        return this.actividadServicio.recalcularPlanesPorPeriodo(+idPeriodo);
    }

    /**
     * Crea un nuevo tipo de actividad (Solo ADMIN).
     */
    @UseGuards(JwtAuthGuard)
    @Post('tipos')
    crearTipo(@Request() req: any, @Body() dto: CrearTipoActividadDto) {
        if (req.user.rol !== 'ADMIN') {
            throw new ForbiddenException('No tiene permisos para esta acción');
        }
        return this.actividadServicio.crearTipo(dto);
    }

    /**
     * Actualiza un tipo de actividad (Solo ADMIN).
     */
    @UseGuards(JwtAuthGuard)
    @Put('tipos/:id')
    actualizarTipo(@Request() req: any, @Param('id') id: string, @Body() dto: ActualizarTipoActividadDto) {
        if (req.user.rol !== 'ADMIN') {
            throw new ForbiddenException('No tiene permisos para esta acción');
        }
        return this.actividadServicio.actualizarTipo(+id, dto);
    }

    /**
     * Elimina un tipo de actividad (Solo ADMIN).
     */
    @UseGuards(JwtAuthGuard)
    @Delete('tipos/:id')
    eliminarTipo(@Request() req: any, @Param('id') id: string) {
        if (req.user.rol !== 'ADMIN') {
            throw new ForbiddenException('No tiene permisos para esta acción');
        }
        return this.actividadServicio.eliminarTipo(+id);
    }

    /**
     * Crea una nueva actividad.
     */
    @UseGuards(JwtAuthGuard)
    @Post()
    crear(@Request() req: any, @Body() crearActividadDto: CrearActividadDto) {
        return this.actividadServicio.crear(crearActividadDto, req.user);
    }

    /**
     * Actualiza una actividad existente.
     */
    @UseGuards(JwtAuthGuard)
    @Put(':id')
    actualizar(@Request() req: any, @Param('id') id: string, @Body() body: any) {
        return this.actividadServicio.actualizar(+id, body, req.user);
    }

    /**
     * Elimina una actividad.
     */
    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    eliminar(@Request() req: any, @Param('id') id: string) {
        return this.actividadServicio.eliminar(+id, req.user);
    }

    /**
     * Obtiene una actividad por su ID.
     * Usado para pre-poblar el formulario de edición en página completa.
     */
    @UseGuards(JwtAuthGuard)
    @Get(':id')
    obtenerPorId(@Request() req: any, @Param('id') id: string) {
        return this.actividadServicio.obtenerPorId(+id, req.user);
    }

    /**
     * Lista las actividades de una agenda específica.
     */
    @UseGuards(JwtAuthGuard)
    @Get()
    listarPorAgenda(@Request() req: any, @Query('id_agenda') idAgenda: string) {
        return this.actividadServicio.listarPorAgenda(+idAgenda, req.user);
    }
}
