import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, ForbiddenException, Query } from '@nestjs/common';
import { DocenteService } from './docente.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CrearFacultadDto, ActualizarFacultadDto, CrearProgramaDto, ActualizarProgramaDto } from './dto/facultad-programa.dto';
import { CrearDocenteDto, ActualizarDocenteDto } from './dto/docente.dto';

@Controller('admin-docente')
@UseGuards(JwtAuthGuard)
export class DocenteController {
    constructor(private readonly docenteService: DocenteService) { }

    private checkAdmin(req: any) {
        if (req.user.rol !== 'ADMIN') throw new ForbiddenException('No tiene permisos para esta acción');
    }

    // --- FACULTADES ---
    @Post('facultades')
    crearFacultad(@Request() req: any, @Body() dto: CrearFacultadDto) {
        this.checkAdmin(req);
        return this.docenteService.crearFacultad(dto);
    }

    @Get('facultades')
    listarFacultades() {
        return this.docenteService.listarFacultades();
    }

    @Get('facultades/:id')
    obtenerFacultad(@Param('id') id: string) {
        return this.docenteService.obtenerFacultad(+id);
    }

    @Put('facultades/:id')
    actualizarFacultad(@Request() req: any, @Param('id') id: string, @Body() dto: ActualizarFacultadDto) {
        this.checkAdmin(req);
        return this.docenteService.actualizarFacultad(+id, dto);
    }

    @Delete('facultades/:id')
    eliminarFacultad(@Request() req: any, @Param('id') id: string) {
        this.checkAdmin(req);
        return this.docenteService.eliminarFacultad(+id);
    }

    // --- PROGRAMAS ---
    @Post('programas')
    crearPrograma(@Request() req: any, @Body() dto: CrearProgramaDto) {
        this.checkAdmin(req);
        return this.docenteService.crearPrograma(dto);
    }

    @Get('programas')
    listarProgramas(@Query('id_facultad') idFacultad?: string) {
        const id = idFacultad ? Number(idFacultad) : undefined;
        return this.docenteService.listarProgramas(id);
    }

    @Put('programas/:id')
    actualizarPrograma(@Request() req: any, @Param('id') id: string, @Body() dto: ActualizarProgramaDto) {
        this.checkAdmin(req);
        return this.docenteService.actualizarPrograma(+id, dto);
    }

    @Delete('programas/:id')
    eliminarPrograma(@Request() req: any, @Param('id') id: string) {
        this.checkAdmin(req);
        return this.docenteService.eliminarPrograma(+id);
    }

    // --- DOCENTES ---
    @Post('docentes')
    crearDocente(@Request() req: any, @Body() dto: CrearDocenteDto) {
        this.checkAdmin(req);
        return this.docenteService.crearDocente(dto, req.user);
    }

    @Get('docentes')
    listarDocentes(@Request() req: any) {
        return this.docenteService.listarDocentes(req.user);
    }

    @Get('docentes/:id')
    obtenerDocente(@Request() req: any, @Param('id') id: string) {
        return this.docenteService.obtenerDocente(+id, req.user);
    }

    @Put('docentes/:id')
    actualizarDocente(@Request() req: any, @Param('id') id: string, @Body() dto: ActualizarDocenteDto) {
        this.checkAdmin(req);
        return this.docenteService.actualizarDocente(+id, dto, req.user);
    }

    @Delete('docentes/:id')
    eliminarDocente(@Request() req: any, @Param('id') id: string) {
        this.checkAdmin(req);
        return this.docenteService.eliminarDocente(+id, req.user);
    }
}
