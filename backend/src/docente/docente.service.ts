import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Docente } from './entities/docente.entity';
import { Programa } from './entities/programa.entity';
import { Facultad } from './entities/facultad.entity';
import { CrearFacultadDto, ActualizarFacultadDto, CrearProgramaDto, ActualizarProgramaDto } from './dto/facultad-programa.dto';
import { CrearDocenteDto, ActualizarDocenteDto } from './dto/docente.dto';
import { ScopeService, UserScope } from '../auth/scope.service';

const ESCALAFON_POR_DEFECTO = 'Titular';
const FRANJA_POR_DEFECTO = 'Diurna';
const SEDES_PERMITIDAS = ['Mocoa', 'Sibundoy'];

@Injectable()
export class DocenteService {
    constructor(
        @InjectRepository(Docente)
        private readonly docenteRepo: Repository<Docente>,
        @InjectRepository(Programa)
        private readonly programaRepo: Repository<Programa>,
        @InjectRepository(Facultad)
        private readonly facultadRepo: Repository<Facultad>,
        private readonly scopeServicio: ScopeService,
    ) { }

    private async obtenerScope(user: any): Promise<UserScope> {
        const esAdminSistema = String(user?.rol || '').toUpperCase() === 'ADMIN';
        if (!esAdminSistema) {
            return this.scopeServicio.getScope(user);
        }

        try {
            return await this.scopeServicio.getScope(user);
        } catch (error: any) {
            const status = typeof error?.getStatus === 'function' ? Number(error.getStatus()) : Number(error?.status || 0);
            if (status === 403) {
                return {
                    rol: 'ADMIN',
                    idDocente: Number(user?.id_docente || 0),
                };
            }
            throw error;
        }
    }

    private async validarProgramaScope(idPrograma: number, scope: UserScope, userRol?: string) {
        const esAdminSistema = String(userRol || '').toUpperCase() === 'ADMIN';
        const programa = await this.programaRepo.findOne({ where: { id_programa: idPrograma } });
        if (!programa) {
            throw new BadRequestException('El programa seleccionado no existe');
        }

        if (!esAdminSistema && Number(programa.id_facultad) !== Number(scope.idFacultad)) {
            throw new BadRequestException('El programa no pertenece al alcance permitido');
        }
    }

    private async validarDocenteScope(idDocente: number, scope: UserScope, userRol?: string) {
        const esAdminSistema = String(userRol || '').toUpperCase() === 'ADMIN';
        const qb = this.docenteRepo
            .createQueryBuilder('docente')
            .innerJoin('docente.programa', 'programa')
            .where('docente.id_docente = :idDocente', { idDocente });

        if (scope.rol === 'DOCENTE') {
            qb.andWhere('docente.id_docente = :idDocenteScope', { idDocenteScope: scope.idDocente });
        } else if (!esAdminSistema) {
            qb.andWhere('programa.id_facultad = :idFacultad', { idFacultad: scope.idFacultad });
        }

        const docente = await qb.getOne();
        if (!docente) {
            throw new NotFoundException('Docente no encontrado o fuera de alcance');
        }
    }

    private normalizarCamposDocente(payload: Partial<CrearDocenteDto & ActualizarDocenteDto>) {
        if (payload.identificacion !== undefined) {
            payload.identificacion = String(payload.identificacion || '').trim();
            if (!/^\d+$/.test(payload.identificacion)) {
                throw new BadRequestException('La identificación debe contener solo números');
            }
        }

        if (payload.mail !== undefined) {
            payload.mail = String(payload.mail || '').trim().toLowerCase();
        }

        if (payload.sede !== undefined) {
            payload.sede = String(payload.sede || '').trim();
            if (!payload.sede) {
                throw new BadRequestException('La sede es obligatoria');
            }

            if (!SEDES_PERMITIDAS.includes(payload.sede)) {
                throw new BadRequestException('La sede debe ser Mocoa o Sibundoy');
            }
        }

        const escalafon = String(payload.escalafon || '').trim();
        payload.escalafon = escalafon || ESCALAFON_POR_DEFECTO;

        const franja = String(payload.franja || '').trim();
        payload.franja = franja || FRANJA_POR_DEFECTO;
    }

    // --- FACULTADES ---
    async crearFacultad(dto: CrearFacultadDto) {
        const existente = await this.facultadRepo.findOne({ where: { nombre: dto.nombre } });
        if (existente) throw new ConflictException('La facultad ya existe');
        const nueva = this.facultadRepo.create(dto);
        return await this.facultadRepo.save(nueva);
    }

    async listarFacultades() {
        return await this.facultadRepo.find({ relations: ['programas'] });
    }

    async obtenerFacultad(id: number) {
        const facultad = await this.facultadRepo.findOne({ where: { id_facultad: id }, relations: ['programas'] });
        if (!facultad) throw new NotFoundException('Facultad no encontrada');
        return facultad;
    }

    async actualizarFacultad(id: number, dto: ActualizarFacultadDto) {
        const facultad = await this.facultadRepo.findOne({ where: { id_facultad: id } });
        if (!facultad) throw new NotFoundException('Facultad no encontrada');
        Object.assign(facultad, dto);
        return await this.facultadRepo.save(facultad);
    }

    async eliminarFacultad(id: number) {
        const facultad = await this.facultadRepo.findOne({ where: { id_facultad: id }, relations: ['programas'] });
        if (!facultad) throw new NotFoundException('Facultad no encontrada');
        if (facultad.programas.length > 0) throw new BadRequestException('No se puede eliminar una facultad con programas asociados');
        return await this.facultadRepo.remove(facultad);
    }

    // --- PROGRAMAS ---
    async crearPrograma(dto: CrearProgramaDto) {
        const existente = await this.programaRepo.findOne({ where: { nombre: dto.nombre } });
        if (existente) throw new ConflictException('El programa ya existe');
        const nuevo = this.programaRepo.create(dto);
        return await this.programaRepo.save(nuevo);
    }

    async listarProgramas(idFacultad?: number) {
        const where = idFacultad ? { id_facultad: idFacultad } : {};
        return await this.programaRepo.find({ where, relations: ['facultad'] });
    }

    async actualizarPrograma(id: number, dto: ActualizarProgramaDto) {
        const programa = await this.programaRepo.findOne({ where: { id_programa: id } });
        if (!programa) throw new NotFoundException('Programa no encontrado');
        Object.assign(programa, dto);
        return await this.programaRepo.save(programa);
    }

    async eliminarPrograma(id: number) {
        const programa = await this.programaRepo.findOne({ where: { id_programa: id }, relations: ['docentes'] });
        if (!programa) throw new NotFoundException('Programa no encontrado');
        if (programa.docentes && programa.docentes.length > 0) throw new BadRequestException('No se puede eliminar un programa con docentes asociados');
        return await this.programaRepo.remove(programa);
    }

    // --- DOCENTES ---
    async crearDocente(dto: CrearDocenteDto, user: any) {
        const scope = await this.obtenerScope(user);
        await this.validarProgramaScope(dto.id_programa, scope, user?.rol);
        this.normalizarCamposDocente(dto);

        const existente = await this.docenteRepo.findOne({ where: { identificacion: dto.identificacion } });
        if (existente) throw new ConflictException('Ya existe un docente con esa identificación');
        const nuevo = this.docenteRepo.create(dto);
        return await this.docenteRepo.save(nuevo);
    }

    async listarDocentes(user: any) {
        const scope = await this.obtenerScope(user);
        const esAdminSistema = String(user?.rol || '').toUpperCase() === 'ADMIN';

        const qb = this.docenteRepo
            .createQueryBuilder('docente')
            .leftJoinAndSelect('docente.programa', 'programa')
            .leftJoinAndSelect('programa.facultad', 'facultad')
            .leftJoinAndSelect('docente.usuarios', 'usuarios');

        if (scope.rol === 'DOCENTE') {
            qb.where('docente.id_docente = :idDocente', { idDocente: scope.idDocente });
        } else if (!esAdminSistema) {
            qb.where('programa.id_facultad = :idFacultad', { idFacultad: scope.idFacultad });
        }

        qb.orderBy('docente.id_docente', 'DESC');

        return await qb.getMany();
    }

    async obtenerDocente(id: number, user: any) {
        const scope = await this.obtenerScope(user);
        await this.validarDocenteScope(id, scope, user?.rol);

        const docente = await this.docenteRepo.findOne({ where: { id_docente: id }, relations: ['programa', 'programa.facultad', 'usuarios'] });
        if (!docente) throw new NotFoundException('Docente no encontrado');
        return docente;
    }

    async actualizarDocente(id: number, dto: ActualizarDocenteDto, user: any) {
        const scope = await this.obtenerScope(user);
        await this.validarDocenteScope(id, scope, user?.rol);
        if (dto.id_programa !== undefined) {
            await this.validarProgramaScope(dto.id_programa, scope, user?.rol);
        }
        this.normalizarCamposDocente(dto);

        const docente = await this.docenteRepo.findOne({ where: { id_docente: id } });
        if (!docente) throw new NotFoundException('Docente no encontrado');
        Object.assign(docente, dto);
        return await this.docenteRepo.save(docente);
    }

    async eliminarDocente(id: number, user: any) {
        const scope = await this.obtenerScope(user);
        await this.validarDocenteScope(id, scope, user?.rol);

        const docente = await this.docenteRepo.findOne({ where: { id_docente: id }, relations: ['usuarios', 'agendas'] });
        if (!docente) throw new NotFoundException('Docente no encontrado');
        if (docente.usuarios.length > 0 || docente.agendas.length > 0) throw new BadRequestException('No se puede eliminar un docente con usuarios o agendas asociadas');
        return await this.docenteRepo.remove(docente);
    }
}
