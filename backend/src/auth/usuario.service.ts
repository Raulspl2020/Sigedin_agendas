import { Injectable, NotFoundException, ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import { CrearUsuarioDto, ActualizarUsuarioDto } from './dto/usuario-admin.dto';
import * as bcrypt from 'bcrypt';
import { Docente } from '../docente/entities/docente.entity';
import { ActualizarPerfilDocenteDto } from './dto/perfil-docente.dto';

@Injectable()
export class UsuarioService {
    constructor(
        @InjectRepository(Usuario)
        private readonly usuarioRepo: Repository<Usuario>,
        @InjectRepository(Docente)
        private readonly docenteRepo: Repository<Docente>,
    ) { }

    private async obtenerUsuarioAutenticado(user: any) {
        const idUsuario = Number(user?.id_usuario ?? user?.sub);
        if (!idUsuario) {
            throw new UnauthorizedException('Token invalido');
        }

        const usuario = await this.usuarioRepo.findOne({
            where: { id_usuario: idUsuario },
            relations: ['docente', 'docente.programa'],
        });

        if (!usuario) {
            throw new UnauthorizedException('Usuario no autorizado');
        }

        return usuario;
    }

    private mapearPerfil(usuario: Usuario) {
        const docente = usuario?.docente;
        return {
            usuario: {
                id_usuario: usuario.id_usuario,
                username: usuario.username,
                rol: usuario.rol,
                id_docente: usuario.id_docente,
                activo: usuario.activo,
            },
            docente: docente
                ? {
                    id_docente: docente.id_docente,
                    identificacion: docente.identificacion,
                    nombres: docente.nombres,
                    mail: docente.mail,
                    sede: docente.sede,
                    tipo_vinculacion: docente.tipo_vinculacion,
                    tipo_dedicacion: docente.tipo_dedicacion,
                    escalafon: docente.escalafon,
                    franja: docente.franja,
                    id_programa: docente.id_programa,
                    programa: docente.programa
                        ? {
                            id_programa: docente.programa.id_programa,
                            nombre: docente.programa.nombre,
                        }
                        : null,
                }
                : null,
            tieneDocenteAsociado: Boolean(docente),
        };
    }

    async obtenerPerfilDocenteAutenticado(user: any) {
        const usuario = await this.obtenerUsuarioAutenticado(user);
        const perfil = this.mapearPerfil(usuario);

        if (!perfil.tieneDocenteAsociado) {
            return {
                ...perfil,
                message: 'El usuario autenticado no tiene docente asociado.',
            };
        }

        return perfil;
    }

    async actualizarPerfilDocenteAutenticado(user: any, dto: ActualizarPerfilDocenteDto) {
        const usuario = await this.obtenerUsuarioAutenticado(user);

        if (!usuario.id_docente) {
            throw new BadRequestException('El usuario autenticado no tiene docente asociado.');
        }

        const docente = await this.docenteRepo.findOne({
            where: { id_docente: Number(usuario.id_docente) },
            relations: ['programa'],
        });

        if (!docente) {
            throw new NotFoundException('Docente asociado no encontrado');
        }

        const mailAnterior = String(docente.mail || '').trim().toLowerCase();

        if (dto.mail !== undefined) {
            dto.mail = String(dto.mail || '').trim().toLowerCase();
        }

        if (dto.sede !== undefined) {
            dto.sede = String(dto.sede || '').trim();
            if (!dto.sede) {
                throw new BadRequestException('La sede es obligatoria');
            }
        }

        if (dto.nombres !== undefined) {
            dto.nombres = String(dto.nombres || '').trim();
            if (!dto.nombres) {
                throw new BadRequestException('El nombre es obligatorio');
            }
        }

        const deseaCambiarPassword = Boolean(dto.password_actual || dto.password_nueva);
        if (deseaCambiarPassword) {
            if (Number(usuario.activo) !== 1) {
                throw new BadRequestException('Usuario inactivo. No puede cambiar la contraseña.');
            }

            const passwordActual = String(dto.password_actual || '').trim();
            const passwordNueva = String(dto.password_nueva || '').trim();

            if (!passwordActual || !passwordNueva) {
                throw new BadRequestException('Debe enviar contraseña actual y nueva contraseña.');
            }

            const passwordValida = await bcrypt.compare(passwordActual, usuario.password_hash || '');
            if (!passwordValida) {
                throw new BadRequestException('La contraseña actual no es correcta.');
            }

            const salt = await bcrypt.genSalt();
            usuario.password_hash = await bcrypt.hash(passwordNueva, salt);
        }

        delete (dto as any).password_actual;
        delete (dto as any).password_nueva;

        let sincronizarUsernameConCorreo = false;
        if (dto.mail) {
            const usernameActual = String(usuario.username || '').trim().toLowerCase();
            const usernameEsCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(usernameActual);
            const usernamePerteneceAlCorreo = usernameActual === mailAnterior;

            if (usernameEsCorreo || usernamePerteneceAlCorreo) {
                const conflicto = await this.usuarioRepo.findOne({ where: { username: dto.mail } });
                if (conflicto && Number(conflicto.id_usuario) !== Number(usuario.id_usuario)) {
                    throw new ConflictException('El correo no se pudo sincronizar en usuario porque ya existe en otro registro.');
                }
                sincronizarUsernameConCorreo = true;
            }
        }

        Object.assign(docente, dto);
        await this.docenteRepo.save(docente);

        if (sincronizarUsernameConCorreo) {
            usuario.username = dto.mail as string;
        }

        await this.usuarioRepo.save(usuario);

        const usuarioRefrescado = await this.obtenerUsuarioAutenticado(user);
        return this.mapearPerfil(usuarioRefrescado);
    }

    async crear(dto: CrearUsuarioDto) {
        const existente = await this.usuarioRepo.findOne({ where: { username: dto.username } });
        if (existente) throw new ConflictException('El nombre de usuario ya existe');

        const salt = await bcrypt.genSalt();
        const password_hash = await bcrypt.hash(dto.password || '12345678', salt);

        const nuevo = this.usuarioRepo.create({
            username: dto.username,
            password_hash,
            rol: dto.rol,
            id_docente: dto.id_docente,
            activo: 1
        });

        return await this.usuarioRepo.save(nuevo);
    }

    async listar() {
        return await this.usuarioRepo.find({ relations: ['docente'] });
    }

    async obtenerPorId(id: number) {
        const usuario = await this.usuarioRepo.findOne({ where: { id_usuario: id }, relations: ['docente'] });
        if (!usuario) throw new NotFoundException('Usuario no encontrado');
        return usuario;
    }

    async listarDocentesPorFacultad(idFacultad: number) {
        return await this.usuarioRepo
            .createQueryBuilder('usuario')
            .innerJoin('usuario.docente', 'docente')
            .innerJoin('docente.programa', 'programa')
            .innerJoin('programa.facultad', 'facultad')
            .where('programa.id_facultad = :idFacultad', { idFacultad })
            .select([
                'docente.id_docente AS id_docente',
                'docente.nombres AS nombres',
                'programa.id_programa AS id_programa',
                'programa.nombre AS programa',
                'facultad.id_facultad AS id_facultad',
                'facultad.nombre AS facultad',
            ])
            .orderBy('docente.nombres', 'ASC')
            .getRawMany();
    }

    async actualizar(id: number, dto: ActualizarUsuarioDto) {
        const usuario = await this.usuarioRepo.findOne({ where: { id_usuario: id } });
        if (!usuario) throw new NotFoundException('Usuario no encontrado');

        if (dto.username !== undefined) {
            const username = String(dto.username || '').trim();
            if (!username) {
                throw new BadRequestException('El username es obligatorio');
            }

            const existente = await this.usuarioRepo.findOne({ where: { username } });
            if (existente && Number(existente.id_usuario) !== Number(id)) {
                throw new ConflictException('El nombre de usuario ya existe');
            }

            usuario.username = username;
        }

        if (dto.password) {
            const salt = await bcrypt.genSalt();
            usuario.password_hash = await bcrypt.hash(dto.password, salt);
        }

        if (dto.rol) usuario.rol = dto.rol;
        if (dto.id_docente !== undefined) usuario.id_docente = dto.id_docente;
        if (dto.activo !== undefined) usuario.activo = dto.activo;

        return await this.usuarioRepo.save(usuario);
    }

    async eliminar(id: number) {
        const usuario = await this.usuarioRepo.findOne({ where: { id_usuario: id } });
        if (!usuario) throw new NotFoundException('Usuario no encontrado');

        // No permitir auto-eliminación si quisiéramos ser estrictos, 
        // pero por ahora lo dejamos simple.

        return await this.usuarioRepo.remove(usuario);
    }
}
