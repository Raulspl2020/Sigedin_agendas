import { Body, Controller, Get, Patch, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UsuarioService } from './usuario.service';
import { ActualizarPerfilDocenteDto } from './dto/perfil-docente.dto';

@Controller('perfil')
@UseGuards(JwtAuthGuard)
export class PerfilController {
    constructor(private readonly usuarioService: UsuarioService) { }

    @Get()
    obtenerPerfil(@Request() req: any) {
        return this.usuarioService.obtenerPerfilDocenteAutenticado(req.user);
    }

    @Patch()
    actualizarPerfil(
        @Request() req: any,
        @Body() dto: ActualizarPerfilDocenteDto,
    ) {
        return this.usuarioService.actualizarPerfilDocenteAutenticado(req.user, dto);
    }
}
