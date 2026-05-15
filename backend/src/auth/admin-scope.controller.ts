import { Controller, ForbiddenException, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UsuarioService } from './usuario.service';
import { ScopeService } from './scope.service';

@Controller('usuario/admin')
@UseGuards(JwtAuthGuard)
export class AdminScopeController {
    constructor(
        private readonly usuarioService: UsuarioService,
        private readonly scopeService: ScopeService,
    ) { }

    @Get('docentes')
    async listarDocentesFacultad(@Request() req: any) {
        const scope = await this.scopeService.getScope(req.user);
        if (scope.rol !== 'ADMIN') {
            throw new ForbiddenException('No tiene permisos para esta accion');
        }
        return this.usuarioService.listarDocentesPorFacultad(scope.idFacultad!);
    }
}
