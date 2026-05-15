import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

/**
 * Servicio encargado de la lógica de autenticación.
 */
@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(Usuario)
        private readonly usuarioRepositorio: Repository<Usuario>,
        private readonly jwtServicio: JwtService,
    ) { }

    /**
     * Valida un usuario por sus credenciales.
     */
    async validarUsuario(loginDto: LoginDto): Promise<any> {
        const { usuario, clave } = loginDto;
        const usuarioEncontrado = await this.usuarioRepositorio.findOne({
            where: { username: usuario },
            relations: ['docente'],
        });

        if (usuarioEncontrado && (await bcrypt.compare(clave, usuarioEncontrado.password_hash))) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password_hash, ...resultado } = usuarioEncontrado;
            return resultado;
        }
        return null;
    }

    /**
     * Genera un token JWT para el usuario autenticado.
     */
    async login(usuario: any) {
        const payload = {
            username: usuario.username,
            sub: usuario.id_usuario,
            rol: usuario.rol,
            id_docente: usuario.id_docente
        };
        return {
            token_acceso: this.jwtServicio.sign(payload),
            usuario: {
                id: usuario.id_usuario,
                username: usuario.username,
                rol: usuario.rol,
                docente: usuario.docente,
            },
        };
    }
}
