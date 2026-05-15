import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';

export type ScopeRol = 'ADMIN' | 'DOCENTE';

export interface UserScope {
    rol: ScopeRol;
    idDocente: number;
    idFacultad?: number;
}

@Injectable()
export class ScopeService {
    constructor(
        @InjectRepository(Usuario)
        private readonly usuarioRepo: Repository<Usuario>,
    ) { }

    async getScope(user: any): Promise<UserScope> {
        const idUsuario = Number(user?.id_usuario ?? user?.sub);
        if (!idUsuario) {
            throw new UnauthorizedException('Token invalido');
        }

        const usuario = await this.usuarioRepo.findOne({
            where: { id_usuario: idUsuario },
            relations: ['docente', 'docente.programa', 'docente.programa.facultad'],
        });

        if (!usuario || usuario.activo !== 1) {
            throw new UnauthorizedException('Usuario no autorizado');
        }

        if (usuario.rol !== 'ADMIN' && usuario.rol !== 'DECANO' && usuario.rol !== 'DOCENTE') {
            throw new ForbiddenException('Rol no permitido');
        }

        const idDocente = Number(usuario.id_docente ?? usuario.docente?.id_docente);
        if (!idDocente) {
            throw new ForbiddenException('El usuario no tiene docente asociado');
        }

        if (usuario.rol === 'DOCENTE') {
            return {
                rol: 'DOCENTE',
                idDocente,
            };
        }

        const idFacultad = Number(usuario.docente?.programa?.id_facultad);
        if (!idFacultad) {
            throw new ForbiddenException('No fue posible determinar la facultad del administrador/decano');
        }

        return {
            rol: 'ADMIN',
            idDocente,
            idFacultad,
        };
    }
}
