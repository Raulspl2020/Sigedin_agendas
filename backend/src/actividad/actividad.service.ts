import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Actividad } from './entities/actividad.entity';
import { TipoActividad } from './entities/tipo-actividad.entity';
import { PlanCorteActividad } from './entities/plan-corte-actividad.entity';
import { CrearActividadDto } from './dto/crear-actividad.dto';
import { CrearTipoActividadDto, ActualizarTipoActividadDto } from './dto/tipo-actividad.dto';
import { AgendaDocente } from '../agenda/entities/agenda.entity';
import { CorteAcademico } from '../agenda/entities/corte-academico.entity';
import { ScopeService, UserScope } from '../auth/scope.service';

/**
 * Servicio encargado de gestionar las actividades de los docentes.
 */
@Injectable()
export class ActividadService {
    constructor(
        @InjectRepository(Actividad)
        private readonly actividadRepositorio: Repository<Actividad>,
        @InjectRepository(TipoActividad)
        private readonly tipoActividadRepositorio: Repository<TipoActividad>,
        @InjectRepository(AgendaDocente)
        private readonly agendaRepositorio: Repository<AgendaDocente>,
        @InjectRepository(PlanCorteActividad)
        private readonly planCorteRepositorio: Repository<PlanCorteActividad>,
        @InjectRepository(CorteAcademico)
        private readonly corteRepositorio: Repository<CorteAcademico>,
        private readonly scopeServicio: ScopeService,
        private readonly dataSource: DataSource,
    ) { }

    private async obtenerScope(user: any): Promise<UserScope> {
        return this.scopeServicio.getScope(user);
    }

    private async validarAccesoAgenda(idAgenda: number, scope: UserScope) {
        const qb = this.agendaRepositorio
            .createQueryBuilder('agenda')
            .innerJoin('agenda.docente', 'docente')
            .innerJoin('docente.programa', 'programa')
            .where('agenda.id_agenda = :idAgenda', { idAgenda });

        if (scope.rol === 'DOCENTE') {
            qb.andWhere('agenda.id_docente = :idDocente', { idDocente: scope.idDocente });
        } else {
            qb.andWhere('programa.id_facultad = :idFacultad', { idFacultad: scope.idFacultad });
        }

        const agenda = await qb.getOne();
        if (!agenda) {
            throw new NotFoundException('Agenda no encontrada o fuera de alcance');
        }

        return agenda;
    }

    private async validarAccesoActividad(idActividad: number, scope: UserScope) {
        const qb = this.actividadRepositorio
            .createQueryBuilder('actividad')
            .innerJoin('actividad.agenda', 'agenda')
            .innerJoin('agenda.docente', 'docente')
            .innerJoin('docente.programa', 'programa')
            .where('actividad.id_actividad = :idActividad', { idActividad });

        if (scope.rol === 'DOCENTE') {
            qb.andWhere('agenda.id_docente = :idDocente', { idDocente: scope.idDocente });
        } else {
            qb.andWhere('programa.id_facultad = :idFacultad', { idFacultad: scope.idFacultad });
        }

        const actividad = await qb.getOne();
        if (!actividad) {
            throw new NotFoundException('Actividad no encontrada o fuera de alcance');
        }

        return actividad;
    }

    /**
     * Semana académica: bloque de 7 días.
     * Regla institucional: conservar entero exacto; si hay decimal,
     * redondear hacia abajo salvo fracciones >= 0.80 (sube al entero siguiente), mínimo 1.
     */
    private calcularSemanasEntre(fechaInicio: Date | string, fechaFin: Date | string): number {
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);

        if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
            throw new BadRequestException('Las fechas del corte académico no son válidas');
        }

        const milisegundosPorDia = 24 * 60 * 60 * 1000;
        const dias = Math.floor((fin.getTime() - inicio.getTime()) / milisegundosPorDia) + 1;
        const semanasExactas = dias / 7;
        const semanasEnteras = Math.floor(semanasExactas);
        const fraccion = semanasExactas - semanasEnteras;
        const epsilon = 1e-9;

        if (Math.abs(fraccion) < epsilon) {
            return Math.max(1, semanasEnteras);
        }

        const semanasAjustadas = fraccion >= 0.8 ? semanasEnteras + 1 : semanasEnteras;
        return Math.max(1, semanasAjustadas);
    }

    private normalizarInicioSinDobleConteo(fechaInicio: Date, fechaFinAnterior: Date | null): Date {
        if (!fechaFinAnterior) return fechaInicio;

        const inicioNormalizado = new Date(fechaInicio);
        const diaSiguienteFinAnterior = new Date(fechaFinAnterior);
        diaSiguienteFinAnterior.setDate(diaSiguienteFinAnterior.getDate() + 1);

        if (inicioNormalizado < diaSiguienteFinAnterior) {
            return diaSiguienteFinAnterior;
        }

        return inicioNormalizado;
    }

    private async upsertPlanCortesPorActividad(idActividad: number, manager?: EntityManager) {
        const gestor = manager ?? this.dataSource.manager;
        const actividadRepositorio = gestor.getRepository(Actividad);
        const agendaRepositorio = gestor.getRepository(AgendaDocente);
        const corteRepositorio = gestor.getRepository(CorteAcademico);
        const planCorteRepositorio = gestor.getRepository(PlanCorteActividad);

        const actividad = await actividadRepositorio.findOne({
            where: { id_actividad: idActividad },
        });

        if (!actividad) throw new NotFoundException('Actividad no encontrada para generar plan por cortes');

        const agenda = await agendaRepositorio.findOne({
            where: { id_agenda: actividad.id_agenda },
        });

        if (!agenda) throw new NotFoundException('No existe la agenda asociada a la actividad');

        const cortes = await corteRepositorio.find({
            where: { id_periodo: agenda.id_periodo },
            order: { numero_corte: 'ASC' },
        });

        if (!cortes.length) {
            throw new BadRequestException('El periodo de la agenda no tiene cortes académicos registrados');
        }

        const registros: Array<Partial<PlanCorteActividad>> = [];
        let fechaFinCorteAnterior: Date | null = null;

        for (const corte of cortes) {
            const inicioOriginal = new Date(corte.fecha_inicio);
            const finOriginal = new Date(corte.fecha_fin);
            const inicioNormalizado = this.normalizarInicioSinDobleConteo(inicioOriginal, fechaFinCorteAnterior);
            const semanasDelCorte = this.calcularSemanasEntre(inicioNormalizado, finOriginal);
            const horasPlaneadas = Number((Number(actividad.horas_semanales) * semanasDelCorte).toFixed(2));

            registros.push({
                id_actividad: actividad.id_actividad,
                id_corte: corte.id_corte,
                horas_planeadas: horasPlaneadas,
                numero_semanas: semanasDelCorte,
            });

            fechaFinCorteAnterior = finOriginal;
        }

        if (registros.length > 0) {
            await planCorteRepositorio.upsert(registros, ['id_actividad', 'id_corte']);
        }
    }

    private normalizarNombreActividad(nombre: string): string {
        return String(nombre || '').trim().toLowerCase();
    }

    private async validarActividadDuplicada(
        idAgenda: number,
        idTipo: number,
        nombre: string,
        idActividadExcluir?: number,
        manager?: EntityManager,
    ) {
        const nombreNormalizado = this.normalizarNombreActividad(nombre);
        if (!nombreNormalizado) return;

        const actividadRepositorio = manager ? manager.getRepository(Actividad) : this.actividadRepositorio;

        const qb = actividadRepositorio
            .createQueryBuilder('actividad')
            .where('actividad.id_agenda = :idAgenda', { idAgenda })
            .andWhere('actividad.id_tipo = :idTipo', { idTipo })
            .andWhere('LOWER(TRIM(actividad.nombre)) = :nombreNormalizado', { nombreNormalizado });

        if (idActividadExcluir) {
            qb.andWhere('actividad.id_actividad != :idActividadExcluir', { idActividadExcluir });
        }

        const existente = await qb.getOne();

        if (existente) {
            throw new BadRequestException('Ya existe una actividad con el mismo nombre para este tipo en la agenda seleccionada');
        }
    }

    /**
     * Crea un nuevo tipo de actividad.
     */
    async crearTipo(dto: CrearTipoActividadDto) {
        const existente = await this.tipoActividadRepositorio.findOne({
            where: { nombre: dto.nombre },
        });

        if (existente) {
            throw new BadRequestException(`El tipo de actividad "${dto.nombre}" ya existe`);
        }

        const nuevo = this.tipoActividadRepositorio.create(dto);
        return await this.tipoActividadRepositorio.save(nuevo);
    }

    /**
     * Actualiza un tipo de actividad.
     */
    async actualizarTipo(id: number, dto: ActualizarTipoActividadDto) {
        const tipo = await this.tipoActividadRepositorio.findOne({ where: { id_tipo: id } });
        if (!tipo) throw new NotFoundException('Tipo de actividad no encontrado');

        if (dto.nombre && dto.nombre !== tipo.nombre) {
            const existente = await this.tipoActividadRepositorio.findOne({ where: { nombre: dto.nombre } });
            if (existente) throw new BadRequestException(`El nombre "${dto.nombre}" ya está en uso`);
        }

        Object.assign(tipo, dto);
        return await this.tipoActividadRepositorio.save(tipo);
    }

    /**
     * Elimina un tipo de actividad validando dependencias.
     */
    async eliminarTipo(id: number) {
        const tipo = await this.tipoActividadRepositorio.findOne({
            where: { id_tipo: id },
            relations: ['actividades'],
        });

        if (!tipo) throw new NotFoundException('Tipo de actividad no encontrado');

        if (tipo.actividades && tipo.actividades.length > 0) {
            throw new BadRequestException('No se puede eliminar porque tiene actividades asociadas');
        }

        return await this.tipoActividadRepositorio.remove(tipo);
    }

    /**
     * Crea una nueva actividad validando que no exceda las horas permitidas.
     */
    async crear(crearActividadDto: CrearActividadDto, user: any) {
        const { id_agenda, id_tipo, horas_semanales } = crearActividadDto;
        const scope = await this.obtenerScope(user);

        await this.validarAccesoAgenda(id_agenda, scope);

        await this.validarActividadDuplicada(id_agenda, id_tipo, crearActividadDto.nombre);

        // Obtener la agenda y la dedicación del docente
        const agenda = await this.agendaRepositorio.findOne({
            where: { id_agenda },
            relations: ['docente'],
        });

        if (!agenda) {
            throw new NotFoundException('La agenda especificada no existe');
        }

        // Aquí iría la validación contra configuracion_dedicacion si se requiere dinámica,
        // por ahora usamos los límites de tipo_actividad si existen.
        const tipoActividad = await this.tipoActividadRepositorio.findOne({
            where: { id_tipo },
        });

        if (tipoActividad && tipoActividad.max_horas_semana && horas_semanales > tipoActividad.max_horas_semana) {
            throw new BadRequestException(`Esta actividad excede el máximo de ${tipoActividad.max_horas_semana} horas para su tipo`);
        }

        // Validar total acumulado en la agenda
        const actividadesActuales = await this.actividadRepositorio.find({
            where: { id_agenda: id_agenda },
        });

        const totalActual = actividadesActuales.reduce((sum, act) => sum + Number(act.horas_semanales), 0);
        // Límite genérico de 40 horas si es tiempo completo (esto debería venir de la DB)
        if (totalActual + horas_semanales > 40) {
            throw new BadRequestException('El total de horas semanales planeadas no puede superar las 40 horas');
        }

        return this.dataSource.transaction(async (manager) => {
            const actividadRepositorio = manager.getRepository(Actividad);
            const nuevaActividad = actividadRepositorio.create(crearActividadDto);
            const guardada = await actividadRepositorio.save(nuevaActividad);
            await this.upsertPlanCortesPorActividad(guardada.id_actividad, manager);
            return guardada;
        });
    }

    /**
     * Lista actividades de una agenda.
     */
    async listarPorAgenda(idAgenda: number, user: any) {
        const scope = await this.obtenerScope(user);
        await this.validarAccesoAgenda(idAgenda, scope);

        return await this.actividadRepositorio.find({
            where: { id_agenda: idAgenda },
            relations: ['tipoActividad'],
            order: { id_actividad: 'DESC' },
        });
    }

    /**
     * Obtiene una actividad por su ID incluyendo su tipo.
     * Usado para pre-poblar el formulario de edición en página completa.
     * @param idActividad - ID de la actividad a recuperar.
     */
    async obtenerPorId(idActividad: number, user: any) {
        const scope = await this.obtenerScope(user);
        await this.validarAccesoActividad(idActividad, scope);

        const actividad = await this.actividadRepositorio.findOne({
            where: { id_actividad: idActividad },
            relations: ['tipoActividad'],
        });

        if (!actividad) {
            throw new NotFoundException('Actividad no encontrada');
        }

        return actividad;
    }

    /**
     * Actualiza una actividad existente.
     */
    async actualizar(id: number, datos: Partial<Actividad>, user: any) {
        const scope = await this.obtenerScope(user);
        await this.validarAccesoActividad(id, scope);

        if (datos.id_agenda) {
            await this.validarAccesoAgenda(Number(datos.id_agenda), scope);
        }

        return this.dataSource.transaction(async (manager) => {
            const actividadRepositorio = manager.getRepository(Actividad);
            const actividad = await actividadRepositorio.findOne({
                where: { id_actividad: id },
            });

            if (!actividad) {
                throw new NotFoundException('Actividad no encontrada');
            }

            const idAgendaValidar = Number(datos.id_agenda ?? actividad.id_agenda);
            const idTipoValidar = Number(datos.id_tipo ?? actividad.id_tipo);
            const nombreValidar = String(datos.nombre ?? actividad.nombre);

            await this.validarActividadDuplicada(idAgendaValidar, idTipoValidar, nombreValidar, id, manager);

            Object.assign(actividad, datos);
            const guardada = await actividadRepositorio.save(actividad);
            await this.upsertPlanCortesPorActividad(guardada.id_actividad, manager);
            return guardada;
        });
    }

    /**
     * Elimina una actividad y recalcula el total de horas de su agenda.
     */
    async eliminar(id: number, user: any) {
        const scope = await this.obtenerScope(user);
        await this.validarAccesoActividad(id, scope);

        const actividad = await this.actividadRepositorio.findOne({
            where: { id_actividad: id },
        });

        if (!actividad) {
            throw new NotFoundException('Actividad no encontrada');
        }

        await this.planCorteRepositorio.delete({ id_actividad: actividad.id_actividad });
        await this.actividadRepositorio.remove(actividad);

        return { message: 'Actividad eliminada correctamente' };
    }

    /**
     * Obtiene todos los tipos de actividades.
     */
    async obtenerTipos() {
        return await this.tipoActividadRepositorio.find();
    }

    async obtenerTiposCatalogo() {
        return await this.tipoActividadRepositorio.find({
            select: { id_tipo: true, nombre: true },
            order: { nombre: 'ASC' },
        });
    }

    async obtenerClasesPorTipo(idTipo: number) {
        if (!Number.isInteger(idTipo) || idTipo <= 0) {
            throw new BadRequestException('El id_tipo debe ser un numero entero positivo');
        }

        const filas = await this.dataSource.query(
            `SELECT id_clase, nombre
             FROM clase_actividad
             WHERE id_tipo = ? AND activo = 1
             ORDER BY nombre`,
            [idTipo],
        );

        return filas.map((fila: { id_clase: number | string; nombre: string }) => ({
            id_clase: Number(fila.id_clase),
            nombre: fila.nombre,
        }));
    }

    async obtenerResumenCortesPorAgenda(idAgenda: number, user: any) {
        const scope = await this.obtenerScope(user);
        await this.validarAccesoAgenda(idAgenda, scope);

        const agenda = await this.agendaRepositorio.findOne({ where: { id_agenda: idAgenda } });
        if (!agenda) throw new NotFoundException('Agenda no encontrada');

        const cortes = await this.corteRepositorio.find({
            where: { id_periodo: agenda.id_periodo },
            order: { numero_corte: 'ASC' },
        });

        const totalesPorCorteRaw = await this.planCorteRepositorio
            .createQueryBuilder('plan')
            .innerJoin(Actividad, 'actividad', 'actividad.id_actividad = plan.id_actividad')
            .select('plan.id_corte', 'id_corte')
            .addSelect('COALESCE(SUM(plan.horas_planeadas), 0)', 'horas_planeadas_total')
            .addSelect('MAX(COALESCE(plan.numero_semanas, 0))', 'numero_semanas')
            .where('actividad.id_agenda = :idAgenda', { idAgenda })
            .groupBy('plan.id_corte')
            .getRawMany();

        const totalesPorCorte = new Map<number, { horas_planeadas_total: number; numero_semanas: number }>();
        totalesPorCorteRaw.forEach((fila: any) => {
            totalesPorCorte.set(Number(fila.id_corte), {
                horas_planeadas_total: Number(fila.horas_planeadas_total || 0),
                numero_semanas: Number(fila.numero_semanas || 0),
            });
        });

        const resumen = [];
        for (const corte of cortes) {
            const acumuladoCorte = totalesPorCorte.get(corte.id_corte);
            const semanasPlan = Number(acumuladoCorte?.numero_semanas || 0);
            const semanas = semanasPlan > 0
                ? semanasPlan
                : this.calcularSemanasEntre(corte.fecha_inicio, corte.fecha_fin);

            resumen.push({
                id_corte: corte.id_corte,
                numero_corte: corte.numero_corte,
                nombre: corte.nombre,
                fecha_inicio: corte.fecha_inicio,
                fecha_fin: corte.fecha_fin,
                semanas,
                horas_planeadas_total: Number(Number(acumuladoCorte?.horas_planeadas_total || 0).toFixed(2)),
            });
        }

        return resumen;
    }

    async recalcularPlanCortesPorPeriodo(idPeriodo: number, manager?: EntityManager) {
        const gestor = manager ?? this.dataSource.manager;
        const agendaRepositorio = gestor.getRepository(AgendaDocente);
        const actividadRepositorio = gestor.getRepository(Actividad);

        const agendas = await agendaRepositorio.find({ where: { id_periodo: idPeriodo } });
        for (const agenda of agendas) {
            const actividades = await actividadRepositorio.find({ where: { id_agenda: agenda.id_agenda } });
            for (const actividad of actividades) {
                await this.upsertPlanCortesPorActividad(actividad.id_actividad, gestor);
            }
        }
    }

    async recalcularPlanesPorPeriodo(idPeriodo: number) {
        await this.dataSource.transaction(async (manager) => {
            await this.recalcularPlanCortesPorPeriodo(idPeriodo, manager);
        });
        return { message: 'Recalculo de planes por corte ejecutado correctamente' };
    }
}
