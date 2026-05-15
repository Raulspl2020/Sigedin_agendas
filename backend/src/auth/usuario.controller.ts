import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CrearUsuarioDto, ActualizarUsuarioDto } from './dto/usuario-admin.dto';

@Controller('admin-usuario')
@UseGuards(JwtAuthGuard)
export class UsuarioController {
    constructor(private readonly usuarioService: UsuarioService) { }

    private checkAdmin(req: any) {
        if (req.user.rol !== 'ADMIN') throw new ForbiddenException('No tiene permisos para esta acción');
    }

    @Post()
    crear(@Request() req: any, @Body() dto: CrearUsuarioDto) {
        this.checkAdmin(req);
        return this.usuarioService.crear(dto);
    }

    @Get()
    listar(@Request() req: any) {
        this.checkAdmin(req);
        return this.usuarioService.listar();
    }

    @Get(':id')
    obtenerPorId(@Request() req: any, @Param('id') id: string) {
        this.checkAdmin(req);
        return this.usuarioService.obtenerPorId(+id);
    }

    @Put(':id')
    actualizar(@Request() req: any, @Param('id') id: string, @Body() dto: ActualizarUsuarioDto) {
        this.checkAdmin(req);
        return this.usuarioService.actualizar(+id, dto);
    }

    @Delete(':id')
    eliminar(@Request() req: any, @Param('id') id: string) {
        this.checkAdmin(req);
        return this.usuarioService.eliminar(+id);
    }
}
