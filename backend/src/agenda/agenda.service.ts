import { Injectable, ConflictException, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AgendaDocente } from './entities/agenda.entity';
import { PeriodoAcademico } from './entities/periodo.entity';
import { CorteAcademico } from './entities/corte-academico.entity';
import { CrearAgendaDto } from './dto/crear-agenda.dto';
import { CrearPeriodoDto, ActualizarPeriodoDto, CortePeriodoDto } from './dto/periodo.dto';
import { CrearCorteAcademicoDto, ActualizarCorteAcademicoDto } from './dto/corte-academico.dto';
import { ActividadService } from '../actividad/actividad.service';
import { ScopeService, UserScope } from '../auth/scope.service';

/**
 * Servicio encargado de la lógica de negocio de las agendas.
 */
@Injectable()
export class AgendaService {
    constructor(
        @InjectRepository(AgendaDocente)
        private readonly agendaRepositorio: Repository<AgendaDocente>,
        @InjectRepository(PeriodoAcademico)
        private readonly periodoRepositorio: Repository<PeriodoAcademico>,
        @InjectRepository(CorteAcademico)
        private readonly corteRepositorio: Repository<CorteAcademico>,
        private readonly dataSource: DataSource,
        @Inject(forwardRef(() => ActividadService))
        private readonly actividadServicio: ActividadService,
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

    private async validarAgendaScope(idAgenda: number, scope: UserScope, userRol?: string) {
        const esAdminSistema = String(userRol || '').toUpperCase() === 'ADMIN';
        const qb = this.agendaRepositorio
            .createQueryBuilder('agenda')
            .innerJoin('agenda.docente', 'docente')
            .innerJoin('docente.programa', 'programa')
            .where('agenda.id_agenda = :idAgenda', { idAgenda });

        if (scope.rol === 'DOCENTE') {
            qb.andWhere('agenda.id_docente = :idDocente', { idDocente: scope.idDocente });
        } else if (!esAdminSistema) {
            qb.andWhere('programa.id_facultad = :idFacultad', { idFacultad: scope.idFacultad });
        }

        const agenda = await qb.getOne();
        if (!agenda) {
            throw new NotFoundException('Agenda no encontrada o fuera de alcance');
        }
        return agenda;
    }

    private async validarDocenteScope(idDocente: number, scope: UserScope, userRol?: string) {
        const esAdminSistema = String(userRol || '').toUpperCase() === 'ADMIN';
        if (scope.rol === 'DOCENTE') {
            if (idDocente !== scope.idDocente) {
                throw new BadRequestException('No tiene permisos para usar ese docente');
            }
            return;
        }

        if (esAdminSistema) {
            return;
        }

        const filas = await this.dataSource.query(
            `SELECT d.id_docente
             FROM docente d
             INNER JOIN programa p ON p.id_programa = d.id_programa
             WHERE d.id_docente = ? AND p.id_facultad = ?`,
            [idDocente, scope.idFacultad],
        );

        if (!filas.length) {
            throw new BadRequestException('El docente no pertenece a la facultad del administrador');
        }
    }

    async obtenerCortes(idPeriodo?: number) {
        const where = idPeriodo ? ({ id_periodo: idPeriodo } as any) : undefined;
        return this.corteRepositorio.find({
            where,
            relations: ['periodo'],
            order: { id_corte: 'DESC' },
        });
    }

    async obtenerCortePorId(idCorte: number) {
        const corte = await this.corteRepositorio.findOne({
            where: { id_corte: idCorte },
            relations: ['periodo'],
        });

        if (!corte) throw new NotFoundException('Corte académico no encontrado');
        return corte;
    }

    async crearCorte(dto: CrearCorteAcademicoDto) {
        const periodo = await this.periodoRepositorio.findOneBy({ id_periodo: dto.id_periodo });
        if (!periodo) throw new BadRequestException('El periodo seleccionado no existe');

        if (new Date(dto.fecha_inicio) > new Date(dto.fecha_fin)) {
            throw new BadRequestException('La fecha de inicio no puede ser mayor a la fecha fin');
        }

        const duplicado = await this.corteRepositorio.findOne({
            where: { id_periodo: dto.id_periodo, numero_corte: dto.numero_corte },
        });

        if (duplicado) {
            throw new ConflictException('Ya existe un corte con ese número para el periodo seleccionado');
        }

        const corte = this.corteRepositorio.create({
            ...dto,
            fecha_inicio: new Date(dto.fecha_inicio),
            fecha_fin: new Date(dto.fecha_fin),
        });

        const corteGuardado = await this.corteRepositorio.save(corte);
        await this.actividadServicio.recalcularPlanesPorPeriodo(corteGuardado.id_periodo);
        return corteGuardado;
    }

    async actualizarCorte(idCorte: number, dto: ActualizarCorteAcademicoDto) {
        const corte = await this.corteRepositorio.findOneBy({ id_corte: idCorte });
        if (!corte) throw new NotFoundException('Corte académico no encontrado');

        const idPeriodoFinal = dto.id_periodo ?? corte.id_periodo;
        const numeroCorteFinal = dto.numero_corte ?? corte.numero_corte;

        if (dto.id_periodo) {
            const periodo = await this.periodoRepositorio.findOneBy({ id_periodo: dto.id_periodo });
            if (!periodo) throw new BadRequestException('El periodo seleccionado no existe');
        }

        const fechaInicioFinal = dto.fecha_inicio ? new Date(dto.fecha_inicio) : new Date(corte.fecha_inicio);
        const fechaFinFinal = dto.fecha_fin ? new Date(dto.fecha_fin) : new Date(corte.fecha_fin);
        if (fechaInicioFinal > fechaFinFinal) {
            throw new BadRequestException('La fecha de inicio no puede ser mayor a la fecha fin');
        }

        const duplicado = await this.corteRepositorio.findOne({
            where: { id_periodo: idPeriodoFinal, numero_corte: numeroCorteFinal },
        });
        if (duplicado && duplicado.id_corte !== corte.id_corte) {
            throw new ConflictException('Ya existe un corte con ese número para el periodo seleccionado');
        }

        Object.assign(corte, dto);
        if (dto.fecha_inicio) corte.fecha_inicio = new Date(dto.fecha_inicio);
        if (dto.fecha_fin) corte.fecha_fin = new Date(dto.fecha_fin);

        const corteActualizado = await this.corteRepositorio.save(corte);
        await this.actividadServicio.recalcularPlanesPorPeriodo(corteActualizado.id_periodo);
        return corteActualizado;
    }

    async eliminarCorte(idCorte: number) {
        const corte = await this.corteRepositorio.findOneBy({ id_corte: idCorte });
        if (!corte) throw new NotFoundException('Corte académico no encontrado');
        await this.corteRepositorio.delete(idCorte);
        return { message: 'Corte académico eliminado correctamente' };
    }

    /**
     * Crea una nueva agenda para un docente en un periodo específico.
     * Valida que no exista una agenda previa para ese docente en ese periodo.
     */
    async crear(idDocente: number, crearAgendaDto: CrearAgendaDto, user: any) {
        const scope = await this.obtenerScope(user);
        const idDocenteFinal = scope.rol === 'DOCENTE' ? scope.idDocente : idDocente;
        await this.validarDocenteScope(idDocenteFinal, scope, user?.rol);

        const {
            id_periodo,
            fecha_diligenciamiento,
            inicio_semestre,
            fin_semestre,
        } = crearAgendaDto;

        // Verificar si ya existe una agenda para este docente y periodo
        const agendaExistente = await this.agendaRepositorio.findOne({
            where: { id_docente: idDocenteFinal, id_periodo: id_periodo },
        });

        if (agendaExistente) {
            throw new ConflictException('Ya existe una agenda registrada para este periodo');
        }

        const nuevaAgenda = this.agendaRepositorio.create({
            id_docente: idDocenteFinal,
            id_periodo,
            fecha_diligenciamiento: new Date(fecha_diligenciamiento),
            estado: 'En_Elaboracion',
            inicio_semestre: new Date(inicio_semestre),
            fin_semestre: new Date(fin_semestre),
        });

        const agendaGuardada = await this.agendaRepositorio.save(nuevaAgenda);
        return { ...agendaGuardada, total_horas_planeadas: 0 };
    }

    /**
     * Obtiene todas las agendas registradas (Para vista administrativa).
     */
    async obtenerTodas(user: any) {
        const scope = await this.obtenerScope(user);
        const esAdminSistema = String(user?.rol || '').toUpperCase() === 'ADMIN';

        const qb = this.agendaRepositorio
            .createQueryBuilder('agenda')
            .leftJoinAndSelect('agenda.docente', 'docente')
            .leftJoinAndSelect('agenda.periodo', 'periodo')
            .leftJoinAndSelect('agenda.actividades', 'actividades')
            .leftJoin('docente.programa', 'programa')
            .orderBy('agenda.id_agenda', 'DESC');

        if (scope.rol === 'DOCENTE') {
            qb.where('agenda.id_docente = :idDocente', { idDocente: scope.idDocente });
        } else if (!esAdminSistema) {
            qb.where('programa.id_facultad = :idFacultad', { idFacultad: scope.idFacultad });
        }

        const agendas = await qb.getMany();

        return this.asignarTotalHorasPlaneadas(agendas);
    }

    /**
     * Obtiene una agenda por su ID incluyendo relaciones principales.
     * Usado para pre-poblar el formulario de edición en página completa.
     * @param idAgenda - ID de la agenda a recuperar.
     */
    async obtenerPorId(idAgenda: number, user: any) {
        const scope = await this.obtenerScope(user);
        await this.validarAgendaScope(idAgenda, scope, user?.rol);

        const agenda = await this.agendaRepositorio.findOne({
            where: { id_agenda: idAgenda },
            relations: ['docente', 'periodo', 'actividades'],
        });

        if (!agenda) {
            throw new NotFoundException('Agenda no encontrada');
        }

        return this.asignarTotalHorasPlaneadas(agenda);
    }

    /**
     * Actualiza los datos de una agenda existente (Solo ADMIN).
     */
    async actualizarAgenda(idAgenda: number, datos: Partial<AgendaDocente>, user: any) {
        const scope = await this.obtenerScope(user);
        await this.validarAgendaScope(idAgenda, scope, user?.rol);

        if (datos.id_docente !== undefined) {
            await this.validarDocenteScope(Number(datos.id_docente), scope, user?.rol);
        }

        const agenda = await this.agendaRepositorio.findOne({
            where: { id_agenda: idAgenda },
        });

        if (!agenda) {
            throw new NotFoundException('Agenda no encontrada');
        }

        Object.assign(agenda, datos);
        return await this.agendaRepositorio.save(agenda);
    }

    /**
     * Elimina una agenda (Solo ADMIN).
     */
    async eliminarAgenda(idAgenda: number, user: any) {
        const scope = await this.obtenerScope(user);
        await this.validarAgendaScope(idAgenda, scope, user?.rol);

        const agenda = await this.agendaRepositorio.findOne({
            where: { id_agenda: idAgenda },
            relations: ['actividades'],
        });

        if (!agenda) {
            throw new NotFoundException('Agenda no encontrada');
        }

        if (agenda.actividades && agenda.actividades.length > 0) {
            throw new BadRequestException('No se puede eliminar la agenda porque tiene actividades asociadas');
        }

        await this.agendaRepositorio.remove(agenda);
        return { message: 'Agenda eliminada correctamente' };
    }

    /**
     * Obtiene la agenda de un docente para un periodo específico.
     */
    async obtenerPorPeriodo(idDocente: number, idPeriodo: number) {
        const agenda = await this.agendaRepositorio.findOne({
            where: { id_docente: idDocente, id_periodo: idPeriodo },
            relations: ['actividades', 'actividades.tipoActividad', 'periodo'],
        });

        if (!agenda) {
            throw new NotFoundException('No se encontró agenda para el periodo seleccionado');
        }

        return this.asignarTotalHorasPlaneadas(agenda);
    }

    /**
     * Obtiene todos los periodos académicos disponibles.
     */
    async obtenerPeriodos() {
        return await this.periodoRepositorio.find({
            order: { anio: 'DESC', periodo: 'DESC', fecha_inicio: 'DESC' },
        });
    }

    private formatearFechaISO(fecha?: Date | string | null) {
        if (!fecha) return null;
        if (typeof fecha === 'string') return fecha;
        return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
    }

    async obtenerPeriodoActual() {
        const hoy = new Date();
        const hoyServidor = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

        let periodo = await this.periodoRepositorio
            .createQueryBuilder('periodo')
            .where('periodo.fecha_inicio IS NOT NULL')
            .andWhere('periodo.fecha_fin IS NOT NULL')
            .andWhere(':hoy BETWEEN periodo.fecha_inicio AND periodo.fecha_fin', { hoy: hoyServidor })
            .orderBy('periodo.fecha_fin', 'DESC')
            .addOrderBy('periodo.id_periodo', 'DESC')
            .getOne();

        if (!periodo) {
            periodo = await this.periodoRepositorio.findOne({
                order: { fecha_fin: 'DESC', anio: 'DESC', periodo: 'DESC' },
            });
        }

        if (!periodo) {
            throw new NotFoundException('No existen periodos académicos registrados');
        }

        return {
            id_periodo: periodo.id_periodo,
            anio: periodo.anio,
            periodo: periodo.periodo,
            nombre: `${periodo.anio} - ${periodo.periodo}`,
            fecha_inicio: this.formatearFechaISO(periodo.fecha_inicio),
            fecha_fin: this.formatearFechaISO(periodo.fecha_fin),
        };
    }

    private validarCortesPeriodo(cortes: CortePeriodoDto[], fechaInicioPeriodo?: string | null, fechaFinPeriodo?: string | null) {
        if (!cortes || cortes.length === 0) return;

        const numeros = new Set<number>();
        let sumaPorcentajes = 0;
        let tienePorcentaje = false;

        for (const corte of cortes) {
            if (numeros.has(corte.numero_corte)) {
                throw new BadRequestException('No se permiten números de corte duplicados');
            }
            numeros.add(corte.numero_corte);

            const inicio = new Date(corte.fecha_inicio);
            const fin = new Date(corte.fecha_fin);
            if (inicio > fin) {
                throw new BadRequestException(`La fecha inicial del corte ${corte.numero_corte} no puede ser mayor a su fecha final`);
            }

            if (fechaInicioPeriodo && fechaFinPeriodo) {
                const inicioPeriodo = new Date(fechaInicioPeriodo);
                const finPeriodo = new Date(fechaFinPeriodo);
                if (inicio < inicioPeriodo || fin > finPeriodo) {
                    throw new BadRequestException(`Las fechas del corte ${corte.numero_corte} deben estar dentro del rango del periodo académico`);
                }
            }

            if (corte.porcentaje_evaluacion !== null && corte.porcentaje_evaluacion !== undefined) {
                tienePorcentaje = true;
                sumaPorcentajes += Number(corte.porcentaje_evaluacion);
            }
        }

        if (tienePorcentaje && Number(sumaPorcentajes.toFixed(2)) !== 100) {
            throw new BadRequestException('La suma de porcentajes de evaluación de los cortes debe ser 100');
        }
    }

    /**
     * Obtiene un periodo académico por su ID.
     * Usado para pre-poblar el formulario de edición en página completa.
     * @param id - ID del periodo a recuperar.
     */
    async obtenerPeriodoPorId(id: number) {
        try {
            console.log('--- SERVICIO: Buscando Periodo por ID:', id);
            const periodo = await this.periodoRepositorio.findOneBy({ id_periodo: id });

            if (!periodo) {
                console.warn('--- SERVICIO: Periodo no encontrado ID:', id);
                throw new NotFoundException(`El periodo con ID ${id} no existe`);
            }

            return periodo;
        } catch (error) {
            console.error('--- ERROR SERVICIO (obtenerPeriodoPorId):', error);
            throw error;
        }
    }

    /**
     * Obtiene las estadísticas de una agenda para el dashboard.
     */
    async obtenerEstadisticas(idAgenda: number, user: any) {
        const scope = await this.obtenerScope(user);
        await this.validarAgendaScope(idAgenda, scope, user?.rol);

        const agenda = await this.agendaRepositorio.findOne({
            where: { id_agenda: idAgenda },
            relations: ['actividades', 'actividades.seguimientos'],
        });

        if (!agenda) {
            throw new NotFoundException('Agenda no encontrada');
        }

        const totalHorasSemanales = (agenda.actividades || []).reduce(
            (sum, actividad: any) => sum + Number(actividad.horas_semanales || 0),
            0,
        );
        let totalHorasEjecutadas = 0;

        agenda.actividades.forEach((actividad: any) => {
            (actividad.seguimientos || []).forEach((seguimiento: any) => {
                totalHorasEjecutadas += Number(seguimiento.horas_ejecutadas);
            });
        });

        // El cálculo del porcentaje global limitado al 100%.
        // Asumimos 16 semanas por periodo para el cálculo semestral.
        let porcentajeGlobal = 0;
        if (totalHorasSemanales > 0) {
            porcentajeGlobal = (totalHorasEjecutadas / (totalHorasSemanales * 16)) * 100;
            if (porcentajeGlobal > 100) porcentajeGlobal = 100;
        }

        // Semáforo institucional
        let semaforo = 'ROJO';
        if (porcentajeGlobal >= 90) semaforo = 'VERDE';
        else if (porcentajeGlobal >= 70) semaforo = 'AMARILLO';

        return {
            totalHorasPlaneadas: totalHorasSemanales * 16,
            totalHorasEjecutadas,
            porcentajeGlobal: Math.round(porcentajeGlobal * 100) / 100,
            semaforo,
            estadoAgenda: agenda.estado,
        };
    }

    private asignarTotalHorasPlaneadas(agenda: any): any;
    private asignarTotalHorasPlaneadas(agendas: any[]): any[];
    private asignarTotalHorasPlaneadas(agendaOAgendas: any | any[]) {
        if (Array.isArray(agendaOAgendas)) {
            return agendaOAgendas.map((agenda) => ({
                ...agenda,
                total_horas_planeadas: Number(
                    (agenda.actividades || []).reduce(
                        (sum: number, actividad: any) => sum + Number(actividad.horas_semanales || 0),
                        0,
                    ),
                ),
            }));
        }

        return {
            ...agendaOAgendas,
            total_horas_planeadas: Number(
                (agendaOAgendas.actividades || []).reduce(
                    (sum: number, actividad: any) => sum + Number(actividad.horas_semanales || 0),
                    0,
                ),
            ),
        };
    }
    /**
     * Crea un nuevo periodo académico.
     */
    async crearPeriodo(crearPeriodoDto: CrearPeriodoDto) {
        console.log('BACKEND: RECIBIENDO CREACIÓN DE PERIODO:', crearPeriodoDto);

        if (!crearPeriodoDto) {
            throw new BadRequestException('Los datos del periodo son obligatorios');
        }

        const { anio, periodo, fecha_inicio, fecha_fin, cortes = [] } = crearPeriodoDto;

        try {
            if (fecha_inicio && fecha_fin && new Date(fecha_inicio) > new Date(fecha_fin)) {
                throw new BadRequestException('La fecha de inicio del periodo no puede ser mayor a la fecha de fin');
            }

            this.validarCortesPeriodo(cortes, fecha_inicio, fecha_fin);

            const existente = await this.periodoRepositorio.findOne({
                where: { anio, periodo } as any,
            });

            if (existente) {
                console.warn('BACKEND: PERIODO YA EXISTE EN DB:', { anio, periodo });
                throw new ConflictException(`El periodo ${anio}-${periodo} ya existe`);
            }

            const queryRunner = this.dataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();

            let guardado: any;
            try {
                const nuevoPeriodo = queryRunner.manager.create(PeriodoAcademico, {
                    anio,
                    periodo,
                    fecha_inicio: fecha_inicio || null,
                    fecha_fin: fecha_fin || null,
                } as any);

                guardado = await queryRunner.manager.save(nuevoPeriodo);

                if (cortes.length > 0) {
                    const cortesEntidades = cortes.map((c) =>
                        queryRunner.manager.create(CorteAcademico, {
                            id_periodo: guardado.id_periodo,
                            numero_corte: c.numero_corte,
                            nombre: c.nombre || null,
                            fecha_inicio: new Date(c.fecha_inicio),
                            fecha_fin: new Date(c.fecha_fin),
                            porcentaje_evaluacion: c.porcentaje_evaluacion ?? null,
                        } as any),
                    );
                    await queryRunner.manager.save(cortesEntidades);
                }

                await queryRunner.commitTransaction();
            } catch (txError) {
                await queryRunner.rollbackTransaction();
                throw txError;
            } finally {
                await queryRunner.release();
            }

            console.log('BACKEND: PERIODO GUARDADO CON ÉXITO:', guardado);
            return guardado;
        } catch (error) {
            console.error('ERROR CRÍTICO AL CREAR PERIODO:', error);
            if (error instanceof ConflictException) throw error;
            throw error;
        }
    }

    /**
     * Actualiza un periodo académico existente.
     */
    async actualizarPeriodo(id: number, actualizarPeriodoDto: ActualizarPeriodoDto) {
        console.log(`BACKEND: INTENTANDO ACTUALIZAR PERIODO ${id}`, actualizarPeriodoDto);

        if (!actualizarPeriodoDto) {
            throw new BadRequestException('Los datos para actualizar son obligatorios');
        }

        const periodo = await this.periodoRepositorio.findOne({
            where: { id_periodo: id } as any,
        });

        if (!periodo) {
            console.error(`BACKEND: PERIODO ${id} NO ENCONTRADO PARA ACTUALIZAR`);
            throw new NotFoundException('Periodo no encontrado');
        }

        // Si se intenta cambiar anio o periodo, verificar que no cause conflicto
        if (actualizarPeriodoDto.anio || actualizarPeriodoDto.periodo) {
            const anioFinal = actualizarPeriodoDto.anio || periodo.anio;
            const periodoFinal = actualizarPeriodoDto.periodo || periodo.periodo;

            if (anioFinal !== periodo.anio || periodoFinal !== periodo.periodo) {
                const existente = await this.periodoRepositorio.findOne({
                    where: { anio: anioFinal, periodo: periodoFinal } as any,
                });

                if (existente) {
                    throw new ConflictException(`Ya existe el periodo ${anioFinal}-${periodoFinal}`);
                }
            }
        }

        try {
            Object.assign(periodo, actualizarPeriodoDto);
            const actualizado = await this.periodoRepositorio.save(periodo);
            console.log('BACKEND: PERIODO ACTUALIZADO CON ÉXITO:', actualizado);
            return actualizado;
        } catch (error) {
            console.error('ERROR CRÍTICO AL ACTUALIZAR PERIODO:', error);
            throw error;
        }
    }

    /**
     * Elimina un periodo académico.
     * Valida que no tenga agendas asociadas.
     */
    async eliminarPeriodo(id: number) {
        // Buscamos el periodo sin cargar relaciones para evitar el error de columnas faltantes en agenda_docente
        const periodo = await this.periodoRepositorio.findOneBy({ id_periodo: id });

        if (!periodo) {
            throw new NotFoundException('Periodo no encontrado');
        }

        // Verificamos si existen agendas asociadas usando un count directo
        // Esto es mucho más eficiente y evita el JOIN problemático
        const agendasAsociadas = await this.agendaRepositorio.count({
            where: { id_periodo: id }
        });

        if (agendasAsociadas > 0) {
            throw new BadRequestException(`No se puede eliminar el periodo porque tiene ${agendasAsociadas} agendas asociadas`);
        }

        try {
            await this.periodoRepositorio.delete(id);
            return { message: 'Periodo eliminado correctamente' };
        } catch (error) {
            console.error('ERROR AL ELIMINAR PERIODO:', error);
            throw error;
        }
    }
}
