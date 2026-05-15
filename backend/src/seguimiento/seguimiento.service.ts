import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    InternalServerErrorException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SeguimientoSemanal } from './entities/seguimiento.entity';
import { CrearSeguimientoDto } from './dto/crear-seguimiento.dto';
import { Actividad } from '../actividad/entities/actividad.entity';
import { ScopeService, UserScope } from '../auth/scope.service';
import { AgendaDocente } from '../agenda/entities/agenda.entity';
import { CorteAcademico } from '../agenda/entities/corte-academico.entity';
import { PeriodoAcademico } from '../agenda/entities/periodo.entity';
import { Evidencia } from '../evidencia/entities/evidencia.entity';
import { ActualizarSeguimientoDto } from './dto/actualizar-seguimiento.dto';

interface FiltrosConsolidadoSeguimiento {
    id_periodo: number;
    id_facultad?: number;
    id_programa?: number;
    id_docente?: number;
    estado_avance?: string;
    semana?: number;
    id_corte?: number;
    id_tipo?: number;
    q?: string;
}

@Injectable()
export class SeguimientoService {
    constructor(
        @InjectRepository(SeguimientoSemanal)
        private readonly seguimientoRepositorio: Repository<SeguimientoSemanal>,
        @InjectRepository(Actividad)
        private readonly actividadRepositorio: Repository<Actividad>,
        @InjectRepository(AgendaDocente)
        private readonly agendaRepositorio: Repository<AgendaDocente>,
        @InjectRepository(CorteAcademico)
        private readonly corteRepositorio: Repository<CorteAcademico>,
        @InjectRepository(PeriodoAcademico)
        private readonly periodoRepositorio: Repository<PeriodoAcademico>,
        @InjectRepository(Evidencia)
        private readonly evidenciaRepositorio: Repository<Evidencia>,
        private readonly scopeServicio: ScopeService,
        private readonly dataSource: DataSource,
    ) { }

    private logSeguimientoDebug(evento: string, payload: Record<string, any>) {
        if (String(process.env.SEGUIMIENTO_DEBUG || '').toLowerCase() !== 'true') return;
        console.info(`[SeguimientoDebug] ${evento}`, payload);
    }

    private async obtenerScope(user: any): Promise<UserScope> {
        return this.scopeServicio.getScope(user);
    }

    private async obtenerScopeSeguimientoConFallback(user: any): Promise<UserScope> {
        const rol = String(user?.rol || '').toUpperCase();
        try {
            return await this.scopeServicio.getScope(user);
        } catch (error: any) {
            const status = typeof error?.getStatus === 'function'
                ? Number(error.getStatus())
                : Number(error?.status || 0);

            if (rol === 'ADMIN' && status === 403) {
                return {
                    rol: 'ADMIN',
                    idDocente: Number(user?.id_docente || 0),
                };
            }
            throw error;
        }
    }

    private calcularRangoSemana(fechaInicioSemestre: Date | string, semana: number) {
        const inicioSemestre = new Date(fechaInicioSemestre);
        if (Number.isNaN(inicioSemestre.getTime())) {
            throw new BadRequestException('La agenda no tiene una fecha de inicio valida');
        }

        const inicio = new Date(inicioSemestre);
        inicio.setDate(inicioSemestre.getDate() + (semana - 1) * 7);

        const fin = new Date(inicio);
        fin.setDate(inicio.getDate() + 6);

        return { inicio, fin };
    }

    private async determinarCortePorSemana(idPeriodo: number, semana: number, inicioSemestre: Date | string) {
        const cortes = await this.corteRepositorio.find({
            where: { id_periodo: idPeriodo },
            order: { numero_corte: 'ASC' },
        });

        if (!cortes.length) {
            throw new BadRequestException('El periodo no tiene cortes academicos configurados');
        }

        const rangoSemana = this.calcularRangoSemana(inicioSemestre, semana);

        const corte = cortes.find((c) => {
            const inicioCorte = new Date(c.fecha_inicio);
            const finCorte = new Date(c.fecha_fin);
            return rangoSemana.inicio >= inicioCorte && rangoSemana.inicio <= finCorte;
        }) || cortes.find((c) => {
            const inicioCorte = new Date(c.fecha_inicio);
            const finCorte = new Date(c.fecha_fin);
            return rangoSemana.fin >= inicioCorte && rangoSemana.inicio <= finCorte;
        });

        if (!corte) {
            throw new BadRequestException('No fue posible determinar el corte para la semana seleccionada');
        }

        return {
            corte,
            rangoSemana,
        };
    }

    private async obtenerActividadScope(idActividad: number, scope: UserScope) {
        const qb = this.actividadRepositorio
            .createQueryBuilder('actividad')
            .innerJoinAndSelect('actividad.agenda', 'agenda')
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

    private async obtenerSeguimientoScope(idSeguimiento: number, scope: UserScope) {
        const qb = this.seguimientoRepositorio
            .createQueryBuilder('seguimiento')
            .innerJoinAndSelect('seguimiento.actividad', 'actividad')
            .innerJoinAndSelect('actividad.agenda', 'agenda')
            .innerJoin('agenda.docente', 'docente')
            .innerJoin('docente.programa', 'programa')
            .where('seguimiento.id_seguimiento = :idSeguimiento', { idSeguimiento });

        if (scope.rol === 'DOCENTE') {
            qb.andWhere('agenda.id_docente = :idDocente', { idDocente: scope.idDocente });
        } else {
            qb.andWhere('programa.id_facultad = :idFacultad', { idFacultad: scope.idFacultad });
        }

        const seguimiento = await qb.getOne();
        if (!seguimiento) {
            throw new NotFoundException('Seguimiento no encontrado o fuera de alcance');
        }

        return seguimiento;
    }

    private async obtenerResumenHorasActividad(idActividad: number, excluirSeguimientoId?: number) {
        const [filaProgramadas] = await this.dataSource.query(
            `SELECT COALESCE(SUM(pca.horas_planeadas), 0) AS total_programadas
             FROM plan_corte_actividad pca
             WHERE pca.id_actividad = ?`,
            [idActividad],
        );

        const parametrosEjecutadas: Array<number> = [idActividad];
        let sqlEjecutadas = `SELECT COALESCE(SUM(s.horas_ejecutadas), 0) AS total_ejecutadas
                             FROM seguimiento_semanal s
                             WHERE s.id_actividad = ?`;

        if (excluirSeguimientoId) {
            sqlEjecutadas += ' AND s.id_seguimiento <> ?';
            parametrosEjecutadas.push(excluirSeguimientoId);
        }

        const [filaEjecutadas] = await this.dataSource.query(sqlEjecutadas, parametrosEjecutadas);

        const totalProgramadas = Number(filaProgramadas?.total_programadas || 0);
        const totalEjecutadas = Number(filaEjecutadas?.total_ejecutadas || 0);
        const horasFaltantes = Math.max(0, Number((totalProgramadas - totalEjecutadas).toFixed(2)));

        return {
            total_programadas: Number(totalProgramadas.toFixed(2)),
            total_ejecutadas: Number(totalEjecutadas.toFixed(2)),
            horas_faltantes: horasFaltantes,
        };
    }

    private async obtenerResumenHorasActividadPorCorte(idActividad: number, idCorte: number, excluirSeguimientoId?: number) {
        const [filaProgramadas] = await this.dataSource.query(
            `SELECT COALESCE(SUM(pca.horas_planeadas), 0) AS total_programadas
             FROM plan_corte_actividad pca
             WHERE pca.id_actividad = ? AND pca.id_corte = ?`,
            [idActividad, idCorte],
        );

        const parametrosEjecutadas: Array<number> = [idActividad, idCorte];
        let sqlEjecutadas = `SELECT COALESCE(SUM(s.horas_ejecutadas), 0) AS total_ejecutadas
                             FROM seguimiento_semanal s
                             WHERE s.id_actividad = ? AND s.id_corte = ?`;

        if (excluirSeguimientoId) {
            sqlEjecutadas += ' AND s.id_seguimiento <> ?';
            parametrosEjecutadas.push(excluirSeguimientoId);
        }

        const [filaEjecutadas] = await this.dataSource.query(sqlEjecutadas, parametrosEjecutadas);

        const totalProgramadas = Number(filaProgramadas?.total_programadas || 0);
        const totalEjecutadas = Number(filaEjecutadas?.total_ejecutadas || 0);
        const horasFaltantes = Math.max(0, Number((totalProgramadas - totalEjecutadas).toFixed(2)));

        return {
            total_programadas: Number(totalProgramadas.toFixed(2)),
            total_ejecutadas: Number(totalEjecutadas.toFixed(2)),
            horas_faltantes: horasFaltantes,
        };
    }

    private async obtenerPlanSemanalCorte(idActividad: number, idCorte: number, horasSemanalesFallback = 0) {
        const [filaPlan] = await this.dataSource.query(
            `SELECT
                COALESCE(SUM(pca.horas_planeadas), 0) AS programadas_corte,
                MAX(COALESCE(pca.numero_semanas, 0)) AS numero_semanas
             FROM plan_corte_actividad pca
             WHERE pca.id_actividad = ? AND pca.id_corte = ?`,
            [idActividad, idCorte],
        );

        const programadasCorte = Number(filaPlan?.programadas_corte || 0);
        const numeroSemanas = Number(filaPlan?.numero_semanas || 0);

        let maxSemana = 0;
        if (numeroSemanas > 0) {
            maxSemana = Number((programadasCorte / numeroSemanas).toFixed(2));
        } else {
            maxSemana = Number(Number(horasSemanalesFallback || 0).toFixed(2));
        }

        return {
            programadas_corte: Number(programadasCorte.toFixed(2)),
            numero_semanas_corte: numeroSemanas,
            programadas_semana: maxSemana,
            max_semana: maxSemana,
        };
    }

    private async obtenerCortesSemanasScope(idPeriodo: number, scope: UserScope) {
        let sql = `SELECT
                        ca.id_corte,
                        ca.numero_corte,
                        ca.nombre,
                        ca.fecha_inicio,
                        ca.fecha_fin,
                        MAX(COALESCE(pca.numero_semanas, 0)) AS numero_semanas
                   FROM corte_academico ca
                   LEFT JOIN plan_corte_actividad pca ON pca.id_corte = ca.id_corte
                   LEFT JOIN actividad a ON a.id_actividad = pca.id_actividad
                   LEFT JOIN agenda_docente ag ON ag.id_agenda = a.id_agenda
                   LEFT JOIN docente d ON d.id_docente = ag.id_docente
                   LEFT JOIN programa p ON p.id_programa = d.id_programa
                   WHERE ca.id_periodo = ?`;

        const params: Array<number> = [idPeriodo];

        if (scope.rol === 'DOCENTE') {
            sql += ' AND (ag.id_docente = ? OR ag.id_docente IS NULL)';
            params.push(scope.idDocente);
        } else {
            sql += ' AND (p.id_facultad = ? OR p.id_facultad IS NULL)';
            params.push(scope.idFacultad!);
        }

        sql += ' GROUP BY ca.id_corte, ca.numero_corte, ca.nombre, ca.fecha_inicio, ca.fecha_fin ORDER BY ca.numero_corte ASC';

        const filas = await this.dataSource.query(sql, params);

        let acumulado = 0;
        return filas.map((fila: any) => {
            const semanas = Number(fila.numero_semanas || 0);
            const semanaInicio = acumulado + 1;
            const semanaFin = acumulado + Math.max(0, semanas);
            acumulado = semanaFin;

            return {
                id_corte: Number(fila.id_corte),
                numero_corte: Number(fila.numero_corte),
                nombre: fila.nombre,
                fecha_inicio: fila.fecha_inicio,
                fecha_fin: fila.fecha_fin,
                numero_semanas: semanas,
                semana_inicio: semanaInicio,
                semana_fin: semanaFin,
            };
        });
    }

    private obtenerSemanasDelCorte(corte: CorteAcademico, inicioSemestre: Date | string) {
        const inicioBase = new Date(inicioSemestre);
        const inicioCorte = new Date(corte.fecha_inicio);
        const finCorte = new Date(corte.fecha_fin);

        if (Number.isNaN(inicioBase.getTime()) || Number.isNaN(inicioCorte.getTime()) || Number.isNaN(finCorte.getTime())) {
            return [];
        }

        const msDia = 24 * 60 * 60 * 1000;
        const inicioSemana = Math.max(1, Math.floor((inicioCorte.getTime() - inicioBase.getTime()) / msDia / 7) + 1);
        const finSemana = Math.max(inicioSemana, Math.floor((finCorte.getTime() - inicioBase.getTime()) / msDia / 7) + 1);

        return Array.from({ length: finSemana - inicioSemana + 1 }, (_, i) => inicioSemana + i);
    }

    private async validarHorasNoSuperaFaltante(idActividad: number, horasNuevas: number, excluirSeguimientoId?: number) {
        const resumen = await this.obtenerResumenHorasActividad(idActividad, excluirSeguimientoId);
        const totalTrasRegistro = Number((resumen.total_ejecutadas + Number(horasNuevas || 0)).toFixed(2));

        if (totalTrasRegistro > resumen.total_programadas) {
            throw new BadRequestException(
                `No puede registrar mas horas de las faltantes para esta actividad. Maximo disponible: ${resumen.horas_faltantes.toFixed(2)} h`,
            );
        }
    }

    private async validarHorasNoSuperaFaltanteCorte(
        idActividad: number,
        idCorte: number,
        horasNuevas: number,
        excluirSeguimientoId?: number,
    ) {
        const resumen = await this.obtenerResumenHorasActividadPorCorte(idActividad, idCorte, excluirSeguimientoId);
        const totalTrasRegistro = Number((resumen.total_ejecutadas + Number(horasNuevas || 0)).toFixed(2));

        if (totalTrasRegistro > resumen.total_programadas) {
            throw new BadRequestException(
                `No puede registrar mas horas de las faltantes para este corte. Maximo disponible: ${resumen.horas_faltantes.toFixed(2)} h`,
            );
        }
    }

    private async obtenerHorasReportadasSemanaActividad(
        idActividad: number,
        idCorte: number,
        semana: number,
        excluirSeguimientoId?: number,
    ) {
        const params: Array<number> = [idActividad, idCorte, semana];
        let sql = `SELECT COALESCE(SUM(s.horas_ejecutadas), 0) AS total_reportadas
                   FROM seguimiento_semanal s
                   WHERE s.id_actividad = ?
                     AND s.id_corte = ?
                     AND s.semana = ?`;

        if (excluirSeguimientoId) {
            sql += ' AND s.id_seguimiento <> ?';
            params.push(excluirSeguimientoId);
        }

        const [fila] = await this.dataSource.query(sql, params);
        return Number(fila?.total_reportadas || 0);
    }

    private validarHorasNoSuperaSemanaActividad(
        maxSemana: number,
        horasNuevas: number,
        horasYaReportadasSemana = 0,
    ) {
        if (Number(horasNuevas || 0) <= 0) {
            throw new BadRequestException('Las horas ejecutadas deben ser mayores que 0');
        }

        const maximoDisponible = Math.max(
            0,
            Number((Number(maxSemana || 0) - Number(horasYaReportadasSemana || 0)).toFixed(2)),
        );

        if (maximoDisponible <= 0 && Number(horasNuevas || 0) > 0) {
            throw new BadRequestException('Esta actividad ya completo las horas programadas para la semana seleccionada');
        }

        if (Number(horasNuevas || 0) > Number(maximoDisponible || 0)) {
            throw new BadRequestException(
                `No se puede registrar esta semana porque las horas ejecutadas superan las horas programadas. Maximo disponible: ${Number(maximoDisponible || 0).toFixed(2)} h`,
            );
        }
    }

    private manejarErrorPersistenciaSeguimiento(error: any): never {
        const code = String(error?.code || '');

        if (code === 'ER_DUP_ENTRY') {
            throw new ConflictException(
                'La base de datos mantiene una restriccion unica para actividad/corte/semana. Elimine ese indice para permitir multiples registros semanales.',
            );
        }

        if (code === 'ER_NO_REFERENCED_ROW_2') {
            throw new BadRequestException('La actividad o el corte seleccionado no existe o no es valido');
        }

        if (code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
            throw new BadRequestException('La semana seleccionada esta fuera del rango permitido');
        }

        throw new InternalServerErrorException('No se pudo guardar el seguimiento por un error inesperado');
    }

    async obtenerResumenActividadCorteSemana(idActividad: number, idCorte: number, semana: number, user: any) {
        const scope = await this.obtenerScope(user);
        const actividad = await this.obtenerActividadScope(idActividad, scope);

        const corte = await this.corteRepositorio.findOne({ where: { id_corte: idCorte } as any });
        if (!corte) {
            throw new NotFoundException('Corte no encontrado');
        }

        if (Number(corte.id_periodo) !== Number(actividad.agenda.id_periodo)) {
            throw new BadRequestException('El corte no pertenece al periodo de la actividad seleccionada');
        }

        const resumen = await this.obtenerResumenHorasActividadPorCorte(idActividad, idCorte);
        const planSemanal = await this.obtenerPlanSemanalCorte(
            idActividad,
            idCorte,
            Number(actividad.horas_semanales || 0),
        );
        const horasReportadasSemana = await this.obtenerHorasReportadasSemanaActividad(idActividad, idCorte, semana);
        const horasPendientesSemana = Math.max(
            0,
            Number((Number(planSemanal.max_semana || 0) - Number(horasReportadasSemana || 0)).toFixed(2)),
        );

        return {
            corte: {
                id_corte: corte.id_corte,
                numero_corte: corte.numero_corte,
            },
            actividad: {
                id_actividad: actividad.id_actividad,
                nombre: actividad.nombre,
            },
            semana,
            programadas_corte: resumen.total_programadas,
            ejecutadas_corte: resumen.total_ejecutadas,
            faltantes_corte: resumen.horas_faltantes,
            max_semana: planSemanal.max_semana,
            programadas_semana: planSemanal.programadas_semana,
            horas_reportadas_semana_actual: Number(horasReportadasSemana.toFixed(2)),
            horas_pendientes_semana_actual: horasPendientesSemana,
            inconsistencia_semana_actual: Number(horasReportadasSemana || 0) > Number(planSemanal.max_semana || 0),
            max_horas_permitidas: Math.min(planSemanal.max_semana, resumen.horas_faltantes),
            numero_semanas_corte: planSemanal.numero_semanas_corte,
            es_max_semana_estimado: planSemanal.numero_semanas_corte > 0,
        };
    }

    async obtenerStatsPorCorte(idActividad: number, idCorte: number, idPeriodo: number, user: any) {
        const scope = await this.obtenerScope(user);
        const actividad = await this.obtenerActividadScope(idActividad, scope);

        if (Number(actividad.agenda.id_periodo) !== Number(idPeriodo)) {
            throw new BadRequestException('La actividad no pertenece al periodo seleccionado');
        }

        const corte = await this.corteRepositorio.findOne({ where: { id_corte: idCorte, id_periodo: idPeriodo } as any });
        if (!corte) {
            throw new NotFoundException('Corte no encontrado para el periodo seleccionado');
        }

        const resumen = await this.obtenerResumenHorasActividadPorCorte(idActividad, idCorte);
        const cortesPeriodo = await this.obtenerCortesSemanasScope(idPeriodo, scope);
        const cortePeriodo = cortesPeriodo.find((c: any) => Number(c.id_corte) === Number(idCorte));
        const semanasDelCorte = cortePeriodo
            ? Array.from(
                { length: Math.max(0, Number(cortePeriodo.numero_semanas || 0)) },
                (_, i) => Number(cortePeriodo.semana_inicio) + i,
            )
            : this.obtenerSemanasDelCorte(corte, actividad.agenda.inicio_semestre);

        return {
            id_corte: corte.id_corte,
            numero_corte: corte.numero_corte,
            semanas_del_corte: semanasDelCorte,
            ...resumen,
            max_horas_permitidas: resumen.horas_faltantes,
        };
    }

    async obtenerSemanasPeriodo(idPeriodo: number, user: any) {
        const scope = await this.obtenerScope(user);
        const cortes = await this.obtenerCortesSemanasScope(idPeriodo, scope);
        const totalSemanas = (cortes as any[]).reduce((acc: number, c: any) => acc + Number(c.numero_semanas || 0), 0);

        const periodo = await this.periodoRepositorio.findOne({ where: { id_periodo: idPeriodo } as any });
        const fechaInicioPeriodo = periodo?.fecha_inicio ? new Date(periodo.fecha_inicio) : null;
        const fechaFinPeriodo = periodo?.fecha_fin ? new Date(periodo.fecha_fin) : null;

        const hoy = new Date();
        let semanaActual: number | null = null;
        let fueraRango = false;

        if (fechaInicioPeriodo && !Number.isNaN(fechaInicioPeriodo.getTime())) {
            const msDia = 24 * 60 * 60 * 1000;
            const diferencia = Math.floor((hoy.getTime() - fechaInicioPeriodo.getTime()) / msDia);
            semanaActual = Math.floor(diferencia / 7) + 1;

            if ((fechaFinPeriodo && hoy > fechaFinPeriodo) || hoy < fechaInicioPeriodo) {
                fueraRango = true;
                semanaActual = null;
            }
        }

        const corteActual = cortes.find((c: any) => {
            const inicio = new Date(c.fecha_inicio);
            const fin = new Date(c.fecha_fin);
            if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) return false;
            return hoy >= inicio && hoy <= fin;
        }) || null;

        const corteFallback = cortes.length > 0
            ? [...cortes].sort((a: any, b: any) => Number(a.numero_corte) - Number(b.numero_corte))[0]
            : null;

        return {
            periodo: {
                id_periodo: idPeriodo,
                fecha_inicio: periodo?.fecha_inicio || null,
                fecha_fin: periodo?.fecha_fin || null,
                total_semanas: totalSemanas,
            },
            total_semanas: totalSemanas,
            cortes,
            hoy: {
                semana_actual: semanaActual,
                fuera_rango: fueraRango,
                corte_actual_numero: corteActual?.numero_corte || corteFallback?.numero_corte || null,
                id_corte_actual: corteActual?.id_corte || corteFallback?.id_corte || null,
            },
        };
    }

    async obtenerActividades(user: any, idPeriodo?: number, semana?: number, idCorte?: number, idDocenteQuery?: number) {
        const scope = await this.obtenerScope(user);

        const qb = this.actividadRepositorio
            .createQueryBuilder('actividad')
            .innerJoinAndSelect('actividad.tipoActividad', 'tipoActividad')
            .innerJoinAndSelect('actividad.agenda', 'agenda')
            .innerJoin('agenda.docente', 'docente')
            .innerJoin('docente.programa', 'programa')
            .orderBy('actividad.nombre', 'ASC');

        if (scope.rol === 'DOCENTE') {
            qb.where('agenda.id_docente = :idDocente', { idDocente: scope.idDocente });
        } else {
            qb.where('programa.id_facultad = :idFacultad', { idFacultad: scope.idFacultad });

            if (idDocenteQuery) {
                const filasDocente = await this.dataSource.query(
                    `SELECT d.id_docente
                     FROM docente d
                     INNER JOIN programa p ON p.id_programa = d.id_programa
                     WHERE d.id_docente = ? AND p.id_facultad = ?`,
                    [idDocenteQuery, scope.idFacultad],
                );

                if (!filasDocente.length) {
                    throw new BadRequestException('El docente no pertenece a la facultad del administrador');
                }

                qb.andWhere('agenda.id_docente = :idDocenteQuery', { idDocenteQuery });
            }
        }

        if (idPeriodo) {
            qb.andWhere('agenda.id_periodo = :idPeriodo', { idPeriodo });
        }

        const actividades = await qb.getMany();
        const idsActividades = actividades.map((a) => a.id_actividad);

        const semanaConsulta = Number(semana || 0) > 0 ? Number(semana) : null;
        const corteConsulta = Number(idCorte || 0) > 0 ? Number(idCorte) : null;

        const semanasRows = await this.seguimientoRepositorio
            .createQueryBuilder('seguimiento')
            .select('seguimiento.id_actividad', 'id_actividad')
            .addSelect('GROUP_CONCAT(DISTINCT seguimiento.semana ORDER BY seguimiento.semana)', 'semanas')
            .where('seguimiento.id_actividad IN (:...ids)', {
                ids: idsActividades.length
                    ? idsActividades
                    : [0],
            })
            .groupBy('seguimiento.id_actividad')
            .getRawMany();

        const semanasMap = new Map<number, number[]>();
        semanasRows.forEach((r: any) => {
            const semanas = String(r.semanas || '')
                .split(',')
                .map((x) => Number(x))
                .filter((n) => Number.isFinite(n));
            semanasMap.set(Number(r.id_actividad), semanas);
        });

        const reportadasSemanaMap = new Map<number, number>();
        if (semanaConsulta && idsActividades.length) {
            let sqlSemana = `SELECT
                                s.id_actividad,
                                COALESCE(SUM(s.horas_ejecutadas), 0) AS horas_reportadas_semana
                             FROM seguimiento_semanal s
                             WHERE s.id_actividad IN (${idsActividades.map(() => '?').join(',')})
                               AND s.semana = ?`;

            const paramsSemana: Array<number> = [...idsActividades, semanaConsulta];

            if (corteConsulta) {
                sqlSemana += ' AND s.id_corte = ?';
                paramsSemana.push(corteConsulta);
            }

            sqlSemana += ' GROUP BY s.id_actividad';

            const filasSemana = await this.dataSource.query(sqlSemana, paramsSemana);
            filasSemana.forEach((fila: any) => {
                reportadasSemanaMap.set(Number(fila.id_actividad), Number(fila.horas_reportadas_semana || 0));
            });
        }

        const actividadesConResumen = await Promise.all(
            actividades.map(async (a) => {
                const resumen = await this.obtenerResumenHorasActividad(a.id_actividad);
                const planSemanal = corteConsulta
                    ? await this.obtenerPlanSemanalCorte(a.id_actividad, corteConsulta, Number(a.horas_semanales || 0))
                    : {
                        max_semana: Number(Number(a.horas_semanales || 0).toFixed(2)),
                        programadas_semana: Number(Number(a.horas_semanales || 0).toFixed(2)),
                    };

                const horasProgramadasSemana = Number(planSemanal.programadas_semana || 0);
                const horasReportadasSemana = Number(reportadasSemanaMap.get(a.id_actividad) || 0);
                const horasPendientesSemana = Math.max(
                    0,
                    Number((horasProgramadasSemana - horasReportadasSemana).toFixed(2)),
                );

                return {
                    id_actividad: a.id_actividad,
                    nombre: a.nombre,
                    id_tipo: a.id_tipo,
                    nombre_tipo: a.tipoActividad?.nombre,
                    horas_semanales: a.horas_semanales,
                    id_agenda: a.id_agenda,
                    id_periodo: a.agenda?.id_periodo,
                    tipo_actividad: a.tipoActividad?.nombre,
                    semanas_reportadas: semanasMap.get(a.id_actividad) || [],
                    semana_consulta: semanaConsulta,
                    id_corte_consulta: corteConsulta,
                    horas_programadas_semana: horasProgramadasSemana,
                    horas_reportadas_semana_actual: Number(horasReportadasSemana.toFixed(2)),
                    horas_pendientes_semana_actual: horasPendientesSemana,
                    inconsistencia_semana_actual: horasReportadasSemana > horasProgramadasSemana,
                    ...resumen,
                };
            }),
        );

        return actividadesConResumen.sort((a, b) => {
            const tipoA = Number(a.id_tipo || 0);
            const tipoB = Number(b.id_tipo || 0);
            if (tipoA !== tipoB) return tipoA - tipoB;
            return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es');
        });
    }

    async lookup(idActividad: number, semana: number, idPeriodo: number, user: any) {
        const scope = await this.obtenerScope(user);
        const actividad = await this.obtenerActividadScope(idActividad, scope);

        if (idPeriodo && Number(actividad.agenda?.id_periodo) !== Number(idPeriodo)) {
            throw new BadRequestException('La actividad no pertenece al periodo seleccionado');
        }

        const { corte, rangoSemana } = await this.determinarCortePorSemana(
            Number(actividad.agenda.id_periodo),
            semana,
            actividad.agenda.inicio_semestre,
        );

        const seguimiento = await this.seguimientoRepositorio.findOne({
            where: {
                id_actividad: idActividad,
                id_corte: corte.id_corte,
                semana,
            } as any,
            order: { id_seguimiento: 'DESC' },
        });

        const evidencias = seguimiento
            ? await this.evidenciaRepositorio.find({
                where: { id_seguimiento: seguimiento.id_seguimiento, activo: 1 } as any,
                order: { fecha_carga: 'DESC' },
            })
            : [];

        const resumenActividad = await this.obtenerResumenHorasActividadPorCorte(idActividad, corte.id_corte);
        const horasActualesSeguimiento = Number(seguimiento?.horas_ejecutadas || 0);

        return {
            id_corte: corte.id_corte,
            corte,
            rango_semana: {
                fecha_inicio: rangoSemana.inicio,
                fecha_fin: rangoSemana.fin,
            },
            seguimiento: seguimiento || null,
            evidencias,
            resumen_actividad: {
                ...resumenActividad,
                max_horas_permitidas: Number((resumenActividad.horas_faltantes + horasActualesSeguimiento).toFixed(2)),
            },
        };
    }

    async crear(crearSeguimientoDto: CrearSeguimientoDto, user: any) {
        const { id_actividad, semana, id_corte } = crearSeguimientoDto;
        const horasEjecutadas = Number(crearSeguimientoDto.horas_ejecutadas || 0);
        if (horasEjecutadas <= 0) {
            throw new BadRequestException('Las horas ejecutadas deben ser mayores que 0');
        }

        const scope = await this.obtenerScope(user);
        const actividad = await this.obtenerActividadScope(id_actividad, scope);

        let corteFinal: CorteAcademico;

        if (id_corte) {
            const corteSeleccionado = await this.corteRepositorio.findOne({
                where: {
                    id_corte,
                    id_periodo: Number(actividad.agenda.id_periodo),
                } as any,
            });

            if (!corteSeleccionado) {
                throw new BadRequestException('El corte seleccionado no pertenece al periodo de la actividad');
            }

            corteFinal = corteSeleccionado;
        } else {
            const { corte } = await this.determinarCortePorSemana(
                Number(actividad.agenda.id_periodo),
                semana,
                actividad.agenda.inicio_semestre,
            );
            corteFinal = corte;
        }

        const { corte: cortePorSemana } = await this.determinarCortePorSemana(
            Number(actividad.agenda.id_periodo),
            semana,
            actividad.agenda.inicio_semestre,
        );

        if (Number(cortePorSemana.id_corte) !== Number(corteFinal.id_corte)) {
            throw new BadRequestException(
                `La semana ${semana} no pertenece al corte seleccionado. Debe registrarse en Corte ${cortePorSemana.numero_corte}`,
            );
        }

        await this.validarHorasNoSuperaFaltanteCorte(
            id_actividad,
            corteFinal.id_corte,
            horasEjecutadas,
        );

        const planSemanal = await this.obtenerPlanSemanalCorte(
            id_actividad,
            corteFinal.id_corte,
            Number(actividad.horas_semanales || 0),
        );
        const horasYaReportadasSemana = await this.obtenerHorasReportadasSemanaActividad(
            id_actividad,
            corteFinal.id_corte,
            semana,
        );
        this.validarHorasNoSuperaSemanaActividad(
            Number(planSemanal.max_semana || 0),
            horasEjecutadas,
            Number(horasYaReportadasSemana || 0),
        );

        const nuevoSeguimiento = this.seguimientoRepositorio.create({
            id_actividad,
            id_corte: corteFinal.id_corte,
            semana,
            horas_ejecutadas: crearSeguimientoDto.horas_ejecutadas,
            observaciones: crearSeguimientoDto.observaciones,
        });

        let guardado: SeguimientoSemanal;
        try {
            guardado = await this.seguimientoRepositorio.save(nuevoSeguimiento);
        } catch (error) {
            this.manejarErrorPersistenciaSeguimiento(error);
        }

        return {
            id_seguimiento: guardado.id_seguimiento,
            id_corte: guardado.id_corte,
            semana: guardado.semana,
            fecha_registro: guardado.fecha_registro,
        };
    }

    async obtenerDetalle(idSeguimiento: number, user: any) {
        const scope = await this.obtenerScope(user);
        const seguimiento = await this.obtenerSeguimientoScope(idSeguimiento, scope);

        const evidencias = await this.evidenciaRepositorio.find({
            where: { id_seguimiento: seguimiento.id_seguimiento, activo: 1 } as any,
            order: { fecha_carga: 'DESC' },
        });

        return {
            id_seguimiento: seguimiento.id_seguimiento,
            id_actividad: seguimiento.id_actividad,
            id_corte: seguimiento.id_corte,
            semana: seguimiento.semana,
            horas_ejecutadas: Number(seguimiento.horas_ejecutadas || 0),
            observaciones: seguimiento.observaciones || '',
            fecha_registro: seguimiento.fecha_registro,
            actividad: seguimiento.actividad
                ? {
                    id_actividad: seguimiento.actividad.id_actividad,
                    nombre: seguimiento.actividad.nombre,
                    id_agenda: seguimiento.actividad.id_agenda,
                }
                : null,
            evidencias,
        };
    }

    async actualizar(idSeguimiento: number, dto: ActualizarSeguimientoDto, user: any) {
        const scope = await this.obtenerScope(user);
        const seguimiento = await this.obtenerSeguimientoScope(idSeguimiento, scope);

        let idCorteFinal = seguimiento.id_corte;
        let semanaFinal = seguimiento.semana;

        if (dto.semana !== undefined && dto.semana !== seguimiento.semana) {
            const { corte } = await this.determinarCortePorSemana(
                Number(seguimiento.actividad.agenda.id_periodo),
                dto.semana,
                seguimiento.actividad.agenda.inicio_semestre,
            );
            idCorteFinal = corte.id_corte;
            semanaFinal = dto.semana;
        }

        if (dto.semana !== undefined && dto.semana === seguimiento.semana) {
            const { corte } = await this.determinarCortePorSemana(
                Number(seguimiento.actividad.agenda.id_periodo),
                dto.semana,
                seguimiento.actividad.agenda.inicio_semestre,
            );
            idCorteFinal = corte.id_corte;
        }

        if (dto.horas_ejecutadas !== undefined) {
            const horasEjecutadas = Number(dto.horas_ejecutadas || 0);
            if (horasEjecutadas <= 0) {
                throw new BadRequestException('Las horas ejecutadas deben ser mayores que 0');
            }

            await this.validarHorasNoSuperaFaltanteCorte(
                seguimiento.id_actividad,
                idCorteFinal,
                horasEjecutadas,
                idSeguimiento,
            );

            const planSemanal = await this.obtenerPlanSemanalCorte(
                seguimiento.id_actividad,
                idCorteFinal,
                Number(seguimiento.actividad?.horas_semanales || 0),
            );
            const horasYaReportadasSemana = await this.obtenerHorasReportadasSemanaActividad(
                seguimiento.id_actividad,
                idCorteFinal,
                semanaFinal,
                idSeguimiento,
            );
            this.validarHorasNoSuperaSemanaActividad(
                Number(planSemanal.max_semana || 0),
                horasEjecutadas,
                Number(horasYaReportadasSemana || 0),
            );
        }

        seguimiento.id_corte = idCorteFinal;
        seguimiento.semana = semanaFinal;
        if (dto.horas_ejecutadas !== undefined) seguimiento.horas_ejecutadas = dto.horas_ejecutadas;
        if (dto.observaciones !== undefined) seguimiento.observaciones = dto.observaciones;

        try {
            return await this.seguimientoRepositorio.save(seguimiento);
        } catch (error) {
            this.manejarErrorPersistenciaSeguimiento(error);
        }
    }

    async listarPorActividad(idActividad: number, user: any) {
        const scope = await this.obtenerScope(user);
        await this.obtenerActividadScope(idActividad, scope);

        return await this.seguimientoRepositorio.find({
            where: { id_actividad: idActividad },
            order: { semana: 'ASC' },
        });
    }

    private calcularNivelPorcentaje(porcentaje: number): 'ALTO' | 'MEDIO' | 'BAJO' {
        if (porcentaje >= 75) return 'ALTO';
        if (porcentaje >= 40) return 'MEDIO';
        return 'BAJO';
    }

    private toNumber(value: any): number {
        const n = Number(value || 0);
        if (!Number.isFinite(n)) return 0;
        return Number(n.toFixed(2));
    }

    private porcentajeSeguro(ejecutadas: number, planeadas: number): number {
        if (!planeadas || planeadas <= 0) return 0;
        return Number(((ejecutadas / planeadas) * 100).toFixed(2));
    }

    private async resolverDocenteDashboard(user: any, scope: UserScope, idDocenteQuery?: number, idPeriodo?: number): Promise<number> {
        const rolJWT = String(user?.rol || '').toUpperCase();

        if (rolJWT === 'DOCENTE') {
            return scope.idDocente;
        }

        const idDocenteObjetivo = Number(idDocenteQuery || scope.idDocente || 0);
        if (!idDocenteObjetivo) {
            throw new BadRequestException('Debe enviar un docente valido para consultar el dashboard');
        }

        if (rolJWT === 'ADMIN') {
            const [docenteExiste] = await this.dataSource.query(
                `SELECT d.id_docente
                 FROM docente d
                 WHERE d.id_docente = ?
                 LIMIT 1`,
                [idDocenteObjetivo],
            );

            if (!docenteExiste) {
                throw new NotFoundException('Docente no encontrado');
            }

            return idDocenteObjetivo;
        }

        if (rolJWT === 'DECANO') {
            const facultadDecano = await this.resolverFacultadDecanoSeguimiento(user, scope, idPeriodo);
            const [docenteEnFacultad] = await this.dataSource.query(
                `SELECT d.id_docente
                 FROM docente d
                 INNER JOIN programa p ON p.id_programa = d.id_programa
                 WHERE d.id_docente = ?
                   AND p.id_facultad = ?
                 LIMIT 1`,
                [idDocenteObjetivo, Number(facultadDecano.id_facultad || 0)],
            );

            if (!docenteEnFacultad) {
                throw new BadRequestException('El docente no pertenece a la facultad del decano');
            }

            return idDocenteObjetivo;
        }

        const filasDocente = await this.dataSource.query(
            `SELECT d.id_docente
             FROM docente d
             INNER JOIN programa p ON p.id_programa = d.id_programa
             WHERE d.id_docente = ? AND p.id_facultad = ?`,
            [idDocenteObjetivo, scope.idFacultad],
        );

        if (!filasDocente.length) {
            throw new BadRequestException('El docente no pertenece a la facultad del administrador');
        }

        return idDocenteObjetivo;
    }

    async obtenerDashboardSeguimiento(user: any, idPeriodo: number, idDocenteQuery?: number): Promise<any> {
        if (!idPeriodo || Number.isNaN(Number(idPeriodo))) {
            throw new BadRequestException('Debe enviar un id_periodo valido');
        }

        const scope = await this.obtenerScope(user);
        const idDocente = await this.resolverDocenteDashboard(user, scope, idDocenteQuery, idPeriodo);

        const [agenda] = await this.dataSource.query(
            `SELECT id_agenda, inicio_semestre
             FROM agenda_docente
             WHERE id_docente = ? AND id_periodo = ?
             LIMIT 1`,
            [idDocente, idPeriodo],
        );

        const idAgenda = Number(agenda?.id_agenda || 0);

        const [corteVigente] = await this.dataSource.query(
            `SELECT
                c.id_corte,
                COALESCE(NULLIF(c.nombre, ''), CONCAT('Corte ', c.numero_corte)) AS nombre
             FROM corte_academico c
             WHERE c.id_periodo = ?
               AND CURDATE() BETWEEN c.fecha_inicio AND c.fecha_fin
             ORDER BY c.numero_corte ASC
             LIMIT 1`,
            [idPeriodo],
        );

        const [corteFallback] = corteVigente
            ? [null]
            : await this.dataSource.query(
                `SELECT
                    c.id_corte,
                    COALESCE(NULLIF(c.nombre, ''), CONCAT('Corte ', c.numero_corte)) AS nombre
                 FROM corte_academico c
                 WHERE c.id_periodo = ?
                 ORDER BY c.numero_corte ASC
                 LIMIT 1`,
                [idPeriodo],
            );

        const corteActual = corteVigente || corteFallback || null;
        const idCorteActual = Number(corteActual?.id_corte || 0);

        const [semanaRow] = agenda?.inicio_semestre
            ? await this.dataSource.query(
                `SELECT GREATEST(1, FLOOR(DATEDIFF(CURDATE(), ?) / 7) + 1) AS semana_actual`,
                [agenda.inicio_semestre],
            )
            : [{ semana_actual: 1 }];
        const semanaActualNumero = Number(semanaRow?.semana_actual || 1);

        const [semestreRow] = idAgenda
            ? await this.dataSource.query(
                `SELECT
                    COALESCE(SUM(COALESCE(plan.total_planeadas, 0)), 0) AS planeadas,
                    COALESCE(SUM(COALESCE(seg.total_ejecutadas, 0)), 0) AS ejecutadas
                 FROM actividad a
                 LEFT JOIN (
                    SELECT pca.id_actividad, SUM(pca.horas_planeadas) AS total_planeadas
                    FROM plan_corte_actividad pca
                    GROUP BY pca.id_actividad
                 ) plan ON plan.id_actividad = a.id_actividad
                 LEFT JOIN (
                    SELECT s.id_actividad, SUM(s.horas_ejecutadas) AS total_ejecutadas
                    FROM seguimiento_semanal s
                    GROUP BY s.id_actividad
                 ) seg ON seg.id_actividad = a.id_actividad
                 WHERE a.id_agenda = ?`,
                [idAgenda],
            )
            : [{ planeadas: 0, ejecutadas: 0 }];

        const [corteRow] = idAgenda && idCorteActual
            ? await this.dataSource.query(
                `SELECT
                    COALESCE(SUM(COALESCE(plan.total_planeadas, 0)), 0) AS planeadas,
                    COALESCE(SUM(COALESCE(seg.total_ejecutadas, 0)), 0) AS ejecutadas
                 FROM actividad a
                 LEFT JOIN (
                    SELECT pca.id_actividad, SUM(pca.horas_planeadas) AS total_planeadas
                    FROM plan_corte_actividad pca
                    WHERE pca.id_corte = ?
                    GROUP BY pca.id_actividad
                 ) plan ON plan.id_actividad = a.id_actividad
                 LEFT JOIN (
                    SELECT s.id_actividad, SUM(s.horas_ejecutadas) AS total_ejecutadas
                    FROM seguimiento_semanal s
                    WHERE s.id_corte = ?
                    GROUP BY s.id_actividad
                 ) seg ON seg.id_actividad = a.id_actividad
                 WHERE a.id_agenda = ?`,
                [idCorteActual, idCorteActual, idAgenda],
            )
            : [{ planeadas: 0, ejecutadas: 0 }];

        const [semanaRowResumen] = idAgenda
            ? await this.dataSource.query(
                `SELECT
                    COALESCE(SUM(a.horas_semanales), 0) AS programadas,
                    COALESCE(SUM(COALESCE(seg.total_ejecutadas, 0)), 0) AS ejecutadas
                 FROM actividad a
                 LEFT JOIN (
                    SELECT s.id_actividad, SUM(s.horas_ejecutadas) AS total_ejecutadas
                    FROM seguimiento_semanal s
                    WHERE s.semana = ?
                      ${idCorteActual ? 'AND s.id_corte = ?' : ''}
                    GROUP BY s.id_actividad
                 ) seg ON seg.id_actividad = a.id_actividad
                 WHERE a.id_agenda = ?`,
                idCorteActual
                    ? [semanaActualNumero, idCorteActual, idAgenda]
                    : [semanaActualNumero, idAgenda],
            )
            : [{ programadas: 0, ejecutadas: 0 }];

        const tiposRows = idAgenda
            ? await this.dataSource.query(
                `SELECT
                    ta.id_tipo,
                    ta.nombre,
                    COALESCE(SUM(a.horas_semanales), 0) AS semana_programadas,
                    COALESCE(SUM(COALESCE(seg_semana.total_ejecutadas, 0)), 0) AS semana_ejecutadas,
                    COALESCE(SUM(COALESCE(plan_corte.total_planeadas, 0)), 0) AS corte_planeadas,
                    COALESCE(SUM(COALESCE(seg_corte.total_ejecutadas, 0)), 0) AS corte_ejecutadas,
                    COALESCE(SUM(COALESCE(plan_semestre.total_planeadas, 0)), 0) AS semestre_planeadas,
                    COALESCE(SUM(COALESCE(seg_semestre.total_ejecutadas, 0)), 0) AS semestre_ejecutadas
                 FROM actividad a
                 INNER JOIN tipo_actividad ta ON ta.id_tipo = a.id_tipo
                 LEFT JOIN (
                    SELECT pca.id_actividad, SUM(pca.horas_planeadas) AS total_planeadas
                    FROM plan_corte_actividad pca
                    GROUP BY pca.id_actividad
                 ) plan_semestre ON plan_semestre.id_actividad = a.id_actividad
                 LEFT JOIN (
                    SELECT s.id_actividad, SUM(s.horas_ejecutadas) AS total_ejecutadas
                    FROM seguimiento_semanal s
                    GROUP BY s.id_actividad
                 ) seg_semestre ON seg_semestre.id_actividad = a.id_actividad
                 LEFT JOIN (
                    SELECT pca.id_actividad, SUM(pca.horas_planeadas) AS total_planeadas
                    FROM plan_corte_actividad pca
                    WHERE pca.id_corte = ?
                    GROUP BY pca.id_actividad
                 ) plan_corte ON plan_corte.id_actividad = a.id_actividad
                 LEFT JOIN (
                    SELECT s.id_actividad, SUM(s.horas_ejecutadas) AS total_ejecutadas
                    FROM seguimiento_semanal s
                    WHERE s.id_corte = ?
                    GROUP BY s.id_actividad
                 ) seg_corte ON seg_corte.id_actividad = a.id_actividad
                 LEFT JOIN (
                    SELECT s.id_actividad, SUM(s.horas_ejecutadas) AS total_ejecutadas
                    FROM seguimiento_semanal s
                    WHERE s.semana = ?
                      ${idCorteActual ? 'AND s.id_corte = ?' : 'AND 1 = 0'}
                    GROUP BY s.id_actividad
                 ) seg_semana ON seg_semana.id_actividad = a.id_actividad
                 WHERE a.id_agenda = ?
                 GROUP BY ta.id_tipo, ta.nombre
                 ORDER BY ta.nombre ASC`,
                idCorteActual
                    ? [idCorteActual, idCorteActual, semanaActualNumero, idCorteActual, idAgenda]
                    : [0, 0, semanaActualNumero, idAgenda],
            )
            : [];

        const semestrePlaneadas = this.toNumber(semestreRow?.planeadas);
        const semestreEjecutadas = this.toNumber(semestreRow?.ejecutadas);
        const semestrePendientes = this.toNumber(Math.max(0, semestrePlaneadas - semestreEjecutadas));
        const semestrePorcentaje = this.porcentajeSeguro(semestreEjecutadas, semestrePlaneadas);

        const cortePlaneadas = this.toNumber(corteRow?.planeadas);
        const corteEjecutadas = this.toNumber(corteRow?.ejecutadas);
        const cortePendientes = this.toNumber(Math.max(0, cortePlaneadas - corteEjecutadas));
        const cortePorcentaje = this.porcentajeSeguro(corteEjecutadas, cortePlaneadas);

        const semanaProgramadas = this.toNumber(semanaRowResumen?.programadas);
        const semanaEjecutadas = this.toNumber(semanaRowResumen?.ejecutadas);
        const semanaFaltantes = this.toNumber(Math.max(0, semanaProgramadas - semanaEjecutadas));
        const semanaPorcentaje = this.porcentajeSeguro(semanaEjecutadas, semanaProgramadas);

        const tipos = tiposRows.map((fila: any) => {
            const semanaProgramadasTipo = this.toNumber(fila.semana_programadas);
            const semanaEjecutadasTipo = this.toNumber(fila.semana_ejecutadas);
            const cortePlaneadasTipo = this.toNumber(fila.corte_planeadas);
            const corteEjecutadasTipo = this.toNumber(fila.corte_ejecutadas);
            const semestrePlaneadasTipo = this.toNumber(fila.semestre_planeadas);
            const semestreEjecutadasTipo = this.toNumber(fila.semestre_ejecutadas);

            return {
                id_tipo: Number(fila.id_tipo),
                nombre: fila.nombre,
                semana: {
                    programadas: semanaProgramadasTipo,
                    ejecutadas: semanaEjecutadasTipo,
                    porcentaje: this.porcentajeSeguro(semanaEjecutadasTipo, semanaProgramadasTipo),
                },
                corte: {
                    porcentaje: this.porcentajeSeguro(corteEjecutadasTipo, cortePlaneadasTipo),
                },
                semestre: {
                    porcentaje: this.porcentajeSeguro(semestreEjecutadasTipo, semestrePlaneadasTipo),
                },
            };
        });

        return {
            semestre: {
                planeadas: semestrePlaneadas,
                ejecutadas: semestreEjecutadas,
                pendientes: semestrePendientes,
                porcentaje: semestrePorcentaje,
                nivel: this.calcularNivelPorcentaje(semestrePorcentaje),
            },
            corte_actual: {
                id_corte: idCorteActual,
                nombre: corteActual?.nombre || 'Sin corte vigente',
                planeadas: cortePlaneadas,
                ejecutadas: corteEjecutadas,
                pendientes: cortePendientes,
                porcentaje: cortePorcentaje,
            },
            semana_actual: {
                numero: semanaActualNumero,
                programadas: semanaProgramadas,
                ejecutadas: semanaEjecutadas,
                faltantes: semanaFaltantes,
                porcentaje: semanaPorcentaje,
            },
            tipos,
        };
    }

    async obtenerDashboardSeguimientoCortes(user: any, idPeriodo: number): Promise<any> {
        if (!idPeriodo || Number.isNaN(Number(idPeriodo))) {
            throw new BadRequestException('Debe enviar un id_periodo valido');
        }

        const scope = await this.obtenerScope(user);

        const cortesRows = await this.dataSource.query(
            `SELECT
                c.id_corte,
                c.numero_corte,
                COALESCE(NULLIF(c.nombre, ''), CONCAT('Corte ', c.numero_corte)) AS nombre
             FROM corte_academico c
             WHERE c.id_periodo = ?
             ORDER BY c.numero_corte ASC`,
            [idPeriodo],
        );

        const cortes = await Promise.all(
            (cortesRows || []).map(async (corte: any) => {
                const idCorte = Number(corte.id_corte || 0);
                const params: Array<number> = [idCorte, idCorte, idPeriodo];
                let whereScope = '';

                if (scope.rol === 'DOCENTE') {
                    whereScope = ' AND ad.id_docente = ?';
                    params.push(scope.idDocente);
                } else {
                    whereScope = ' AND p.id_facultad = ?';
                    params.push(Number(scope.idFacultad || 0));
                }

                const docentesRows = await this.dataSource.query(
                    `SELECT
                        d.id_docente,
                        TRIM(COALESCE(d.nombres, '')) AS docente,
                        COALESCE(SUM(COALESCE(plan.total_planeadas, 0)), 0) AS horas_programadas,
                        COALESCE(SUM(COALESCE(seg.total_ejecutadas, 0)), 0) AS horas_ejecutadas
                     FROM agenda_docente ad
                     INNER JOIN docente d ON d.id_docente = ad.id_docente
                     INNER JOIN programa p ON p.id_programa = d.id_programa
                     LEFT JOIN actividad a ON a.id_agenda = ad.id_agenda
                     LEFT JOIN (
                        SELECT pca.id_actividad, SUM(pca.horas_planeadas) AS total_planeadas
                        FROM plan_corte_actividad pca
                        WHERE pca.id_corte = ?
                        GROUP BY pca.id_actividad
                     ) plan ON plan.id_actividad = a.id_actividad
                     LEFT JOIN (
                        SELECT s.id_actividad, SUM(s.horas_ejecutadas) AS total_ejecutadas
                        FROM seguimiento_semanal s
                        WHERE s.id_corte = ?
                        GROUP BY s.id_actividad
                     ) seg ON seg.id_actividad = a.id_actividad
                     WHERE ad.id_periodo = ? ${whereScope}
                     GROUP BY d.id_docente, d.nombres
                     ORDER BY d.nombres ASC`,
                    params,
                );

                const docentes = (docentesRows || []).map((fila: any) => {
                    const horasProgramadas = this.toNumber(fila.horas_programadas);
                    const horasEjecutadas = this.toNumber(fila.horas_ejecutadas);
                    const avance = this.porcentajeSeguro(horasEjecutadas, horasProgramadas);

                    return {
                        id_docente: Number(fila.id_docente || 0),
                        docente: String(fila.docente || '').trim() || `Docente ${Number(fila.id_docente || 0)}`,
                        horas_programadas: horasProgramadas,
                        horas_ejecutadas: horasEjecutadas,
                        avance_corte: avance,
                        estado: this.calcularNivelPorcentaje(avance),
                    };
                });

                return {
                    id_corte: idCorte,
                    numero_corte: Number(corte.numero_corte || 0),
                    nombre: corte.nombre,
                    docentes,
                };
            }),
        );

        return { cortes };
    }

    private validarRolSupervision(user: any) {
        const rol = String(user?.rol || '').toUpperCase();
        if (rol !== 'DECANO' && rol !== 'ADMIN') {
            throw new ForbiddenException('Este modulo es exclusivo para rol DECANO o ADMIN');
        }
        return rol;
    }

    private tipoInformePorNumeroCorte(numeroCorte: number): string {
        if (Number(numeroCorte) === 1) return 'Primer Corte';
        if (Number(numeroCorte) === 2) return 'Segundo Corte';
        return 'Final';
    }

    private nivelVisualSupervision(porcentaje: number): 'VERDE' | 'AMARILLO' | 'ROJO' {
        if (porcentaje > 80) return 'VERDE';
        if (porcentaje >= 50) return 'AMARILLO';
        return 'ROJO';
    }

    private limpiarIdentificacion(valor: any): string {
        return String(valor || '')
            .trim()
            .replace(/[\s.,-]+/g, '');
    }

    private async resolverFacultadSupervision(user: any, scope: UserScope): Promise<{ id_facultad: number; nombre_facultad: string }> {
        const rol = this.validarRolSupervision(user);

        if (rol === 'DECANO') {
            const [docenteActual] = await this.dataSource.query(
                `SELECT d.id_docente, d.identificacion
                 FROM docente d
                 WHERE d.id_docente = ?
                 LIMIT 1`,
                [scope.idDocente],
            );

            const identificacionLimpia = this.limpiarIdentificacion(docenteActual?.identificacion);
            const idDocenteLimpio = this.limpiarIdentificacion(scope.idDocente);
            const identificadoresBusqueda = [identificacionLimpia, idDocenteLimpio].filter((v, i, arr) => v && arr.indexOf(v) === i);

            if (!identificadoresBusqueda.length) {
                throw new ForbiddenException('No se encontró facultad asociada al decano actual');
            }

            let facultadDecano: any = null;
            for (const identificador of identificadoresBusqueda) {
                const [filaFacultad] = await this.dataSource.query(
                    `SELECT f.id_facultad, f.nombre AS nombre_facultad
                     FROM facultad f
                     WHERE REPLACE(REPLACE(REPLACE(REPLACE(TRIM(COALESCE(f.id_docente_decano, '')), '.', ''), ',', ''), '-', ''), ' ', '') = ?
                     LIMIT 1`,
                    [identificador],
                );

                if (filaFacultad) {
                    facultadDecano = filaFacultad;
                    break;
                }
            }

            if (!facultadDecano) {
                throw new ForbiddenException('No se encontró facultad asociada al decano actual');
            }

            return {
                id_facultad: Number(facultadDecano.id_facultad),
                nombre_facultad: String(facultadDecano.nombre_facultad || ''),
            };
        }

        const idFacultad = Number(scope.idFacultad || 0);
        if (!idFacultad) {
            throw new ForbiddenException('No fue posible determinar la facultad del administrador');
        }

        const [facultadAdmin] = await this.dataSource.query(
            `SELECT f.id_facultad, f.nombre AS nombre_facultad
             FROM facultad f
             WHERE f.id_facultad = ?
             LIMIT 1`,
            [idFacultad],
        );

        return {
            id_facultad: Number(facultadAdmin?.id_facultad || idFacultad),
            nombre_facultad: String(facultadAdmin?.nombre_facultad || ''),
        };
    }

    private async resolverFacultadDecanoSeguimiento(user: any, scope: UserScope, idPeriodo?: number): Promise<{ id_facultad: number; nombre_facultad: string }> {
        const rolJWT = String(user?.rol || '').toUpperCase();
        if (rolJWT !== 'DECANO') {
            const idFacultad = Number(scope.idFacultad || 0);
            if (!idFacultad) {
                throw new ForbiddenException('No fue posible determinar la facultad del usuario');
            }

            const [facultad] = await this.dataSource.query(
                `SELECT f.id_facultad, f.nombre AS nombre_facultad
                 FROM facultad f
                 WHERE f.id_facultad = ?
                 LIMIT 1`,
                [idFacultad],
            );

            return {
                id_facultad: Number(facultad?.id_facultad || idFacultad),
                nombre_facultad: String(facultad?.nombre_facultad || ''),
            };
        }

        const candidatas = new Set<number>();
        const idFacultadScope = Number(scope.idFacultad || 0);
        if (idFacultadScope > 0) candidatas.add(idFacultadScope);

        try {
            const facultadSupervision = await this.resolverFacultadSupervision(user, scope);
            const idFacultadSupervision = Number(facultadSupervision?.id_facultad || 0);
            if (idFacultadSupervision > 0) candidatas.add(idFacultadSupervision);
        } catch {
            // fallback a facultad por scope
        }

        const candidatasArray = Array.from(candidatas).filter((v) => Number(v) > 0);
        if (!candidatasArray.length) {
            throw new ForbiddenException('No fue posible determinar la facultad del decano');
        }

        let idFacultadElegida = candidatasArray[0];

        if (idPeriodo) {
            for (const idFacultad of candidatasArray) {
                const [filaConteo] = await this.dataSource.query(
                    `SELECT COUNT(1) AS total
                     FROM agenda_docente ad
                     INNER JOIN docente d ON d.id_docente = ad.id_docente
                     INNER JOIN programa p ON p.id_programa = d.id_programa
                     WHERE ad.id_periodo = ?
                       AND p.id_facultad = ?`,
                    [Number(idPeriodo), Number(idFacultad)],
                );

                if (Number(filaConteo?.total || 0) > 0) {
                    idFacultadElegida = Number(idFacultad);
                    break;
                }
            }
        }

        const [facultad] = await this.dataSource.query(
            `SELECT f.id_facultad, f.nombre AS nombre_facultad
             FROM facultad f
             WHERE f.id_facultad = ?
             LIMIT 1`,
            [idFacultadElegida],
        );

        return {
            id_facultad: Number(facultad?.id_facultad || idFacultadElegida),
            nombre_facultad: String(facultad?.nombre_facultad || ''),
        };
    }

    async obtenerSupervisionDashboard(user: any, idPeriodo: number): Promise<any> {
        if (!idPeriodo || Number.isNaN(Number(idPeriodo))) {
            throw new BadRequestException('Debe enviar un id_periodo valido');
        }

        const scope = await this.obtenerScope(user);
        const facultad = await this.resolverFacultadSupervision(user, scope);

        const [resumenRow] = await this.dataSource.query(
            `SELECT
                COALESCE(SUM(COALESCE(plan.total_planeadas, 0)), 0) AS planeadas,
                COALESCE(SUM(COALESCE(seg.total_ejecutadas, 0)), 0) AS ejecutadas
             FROM docente d
             INNER JOIN programa p ON p.id_programa = d.id_programa
             INNER JOIN agenda_docente ad ON ad.id_docente = d.id_docente AND ad.id_periodo = ?
             LEFT JOIN actividad a ON a.id_agenda = ad.id_agenda
                 LEFT JOIN (
                    SELECT
                        pca.id_actividad,
                        SUM(COALESCE(pca.horas_planeadas, 0)) AS total_planeadas
                    FROM plan_corte_actividad pca
                    GROUP BY pca.id_actividad
                 ) plan ON plan.id_actividad = a.id_actividad
             LEFT JOIN (
                SELECT s.id_actividad, SUM(COALESCE(s.horas_ejecutadas, 0)) AS total_ejecutadas
                FROM seguimiento_semanal s
                GROUP BY s.id_actividad
             ) seg ON seg.id_actividad = a.id_actividad
             WHERE p.id_facultad = ?`,
            [idPeriodo, facultad.id_facultad],
        );

        const planeadas = this.toNumber(resumenRow?.planeadas);
        const ejecutadas = this.toNumber(resumenRow?.ejecutadas);
        const pendientes = this.toNumber(Math.max(0, planeadas - ejecutadas));
        const porcentaje = this.porcentajeSeguro(ejecutadas, planeadas);

        const cortesRows = await this.dataSource.query(
            `SELECT
                c.id_corte,
                c.numero_corte,
                COALESCE(NULLIF(c.nombre, ''), CONCAT('Corte ', c.numero_corte)) AS nombre
             FROM corte_academico c
             WHERE c.id_periodo = ?
             ORDER BY c.numero_corte ASC`,
            [idPeriodo],
        );

        const cortes: Record<string, any[]> = {
            corte1: [],
            corte2: [],
            corte3: [],
            general: [],
        };

        for (const corte of cortesRows || []) {
            const idCorte = Number(corte.id_corte || 0);
            const numeroCorte = Number(corte.numero_corte || 0);
            const tipoInforme = this.tipoInformePorNumeroCorte(numeroCorte);

            const docentesRows = await this.dataSource.query(
                `SELECT
                    d.id_docente,
                    COALESCE(NULLIF(TRIM(d.nombres), ''), CONCAT('Docente ', d.id_docente)) AS docente,
                    COALESCE(SUM(COALESCE(plan.total_planeadas, 0)), 0) AS horas_planeadas,
                    COALESCE(SUM(COALESCE(seg.total_ejecutadas, 0)), 0) AS horas_ejecutadas,
                    MAX(ad.id_agenda) AS id_agenda,
                    MAX(i.id_informe) AS id_informe,
                    MAX(i.estado) AS estado_informe
                 FROM docente d
                 INNER JOIN programa p ON p.id_programa = d.id_programa
                 INNER JOIN agenda_docente ad ON ad.id_docente = d.id_docente AND ad.id_periodo = ?
                 LEFT JOIN actividad a ON a.id_agenda = ad.id_agenda
                 LEFT JOIN (
                    SELECT
                        pca.id_actividad,
                        SUM(COALESCE(pca.horas_planeadas, 0)) AS total_planeadas
                    FROM plan_corte_actividad pca
                    WHERE pca.id_corte = ?
                    GROUP BY pca.id_actividad
                 ) plan ON plan.id_actividad = a.id_actividad
                 LEFT JOIN (
                    SELECT s.id_actividad, SUM(COALESCE(s.horas_ejecutadas, 0)) AS total_ejecutadas
                    FROM seguimiento_semanal s
                    WHERE s.id_corte = ?
                    GROUP BY s.id_actividad
                 ) seg ON seg.id_actividad = a.id_actividad
                 LEFT JOIN informe i ON i.id_agenda = ad.id_agenda AND i.tipo_informe = ?
                 WHERE p.id_facultad = ?
                 GROUP BY d.id_docente, d.nombres
                 ORDER BY d.nombres ASC`,
                [idPeriodo, idCorte, idCorte, tipoInforme, facultad.id_facultad],
            );

            const filasDocentes = (docentesRows || []).map((fila: any) => {
                const horasPlaneadas = this.toNumber(fila.horas_planeadas);
                const horasEjecutadas = this.toNumber(fila.horas_ejecutadas);
                const horasPendientes = this.toNumber(Math.max(0, horasPlaneadas - horasEjecutadas));
                const porcentajeCorte = this.porcentajeSeguro(horasEjecutadas, horasPlaneadas);

                return {
                    id_docente: Number(fila.id_docente || 0),
                    docente: String(fila.docente || '').trim(),
                    id_agenda: Number(fila.id_agenda || 0),
                    id_informe: Number(fila.id_informe || 0),
                    estado_informe: String(fila.estado_informe || 'Pendiente'),
                    horas_planeadas: horasPlaneadas,
                    horas_ejecutadas: horasEjecutadas,
                    horas_pendientes: horasPendientes,
                    porcentaje_avance: porcentajeCorte,
                    nivel: this.nivelVisualSupervision(porcentajeCorte),
                };
            });

            if (numeroCorte === 1) cortes.corte1 = filasDocentes;
            if (numeroCorte === 2) cortes.corte2 = filasDocentes;
            if (numeroCorte === 3) cortes.corte3 = filasDocentes;
        }

        const acumuladoDocentes = new Map<number, any>();
        const cortesConNumero = [
            { numero: 1, filas: cortes.corte1 || [] },
            { numero: 2, filas: cortes.corte2 || [] },
            { numero: 3, filas: cortes.corte3 || [] },
        ];

        cortesConNumero.forEach(({ numero, filas }) => {
            (filas || []).forEach((fila: any) => {
                const idDocente = Number(fila.id_docente || 0);
                if (!idDocente) return;

                if (!acumuladoDocentes.has(idDocente)) {
                    acumuladoDocentes.set(idDocente, {
                        id_docente: idDocente,
                        docente: fila.docente,
                        id_agenda: Number(fila.id_agenda || 0),
                        id_informe: Number(fila.id_informe || 0),
                        estado_informe: String(fila.estado_informe || 'Pendiente'),
                        id_corte_accion: numero,
                        horas_planeadas: 0,
                        horas_ejecutadas: 0,
                        horas_pendientes: 0,
                        porcentaje_avance: 0,
                        nivel: 'ROJO',
                    });
                }

                const acc = acumuladoDocentes.get(idDocente);
                acc.horas_planeadas += this.toNumber(fila.horas_planeadas);
                acc.horas_ejecutadas += this.toNumber(fila.horas_ejecutadas);

                const estadoInformeActual = String(fila.estado_informe || 'Pendiente');
                const estadosPrioridad = ['Aprobado', 'Entregado', 'Pendiente', 'Rechazado'];
                if (
                    numero >= Number(acc.id_corte_accion || 0)
                    || estadosPrioridad.indexOf(estadoInformeActual) < estadosPrioridad.indexOf(String(acc.estado_informe || 'Pendiente'))
                ) {
                    acc.id_corte_accion = numero;
                    acc.id_informe = Number(fila.id_informe || acc.id_informe || 0);
                    acc.estado_informe = estadoInformeActual;
                }
            });
        });

        const avanceGeneral = Array.from(acumuladoDocentes.values()).map((fila: any) => {
            const horasPlaneadas = this.toNumber(fila.horas_planeadas);
            const horasEjecutadas = this.toNumber(fila.horas_ejecutadas);
            const horasPendientes = this.toNumber(Math.max(0, horasPlaneadas - horasEjecutadas));
            const porcentajeAvance = this.porcentajeSeguro(horasEjecutadas, horasPlaneadas);
            return {
                ...fila,
                horas_planeadas: horasPlaneadas,
                horas_ejecutadas: horasEjecutadas,
                horas_pendientes: horasPendientes,
                porcentaje_avance: porcentajeAvance,
                nivel: this.nivelVisualSupervision(porcentajeAvance),
            };
        });

        cortes.avance_general = avanceGeneral;
        cortes.general = avanceGeneral;

        return {
            facultad,
            id_periodo: Number(idPeriodo),
            resumen: {
                planeadas,
                ejecutadas,
                pendientes,
                porcentaje,
            },
            cortes,
        };
    }

    async obtenerDashboardSupervisionResumen(user: any, idPeriodo: number): Promise<any> {
        const dashboard = await this.obtenerSupervisionDashboard(user, idPeriodo);
        return {
            semestre: {
                planeadas: dashboard?.resumen?.planeadas || 0,
                ejecutadas: dashboard?.resumen?.ejecutadas || 0,
                pendientes: dashboard?.resumen?.pendientes || 0,
                porcentaje: dashboard?.resumen?.porcentaje || 0,
                nivel: this.calcularNivelPorcentaje(Number(dashboard?.resumen?.porcentaje || 0)),
            },
            corte_actual: {
                id_corte: 0,
                nombre: 'Supervisión por cortes',
                planeadas: 0,
                ejecutadas: 0,
                pendientes: 0,
                porcentaje: 0,
            },
        };
    }

    async obtenerDashboardSupervisionCortes(user: any, idPeriodo: number): Promise<any> {
        const dashboard = await this.obtenerSupervisionDashboard(user, idPeriodo);

        const cortesRows = await this.dataSource.query(
            `SELECT
                c.id_corte,
                c.numero_corte,
                COALESCE(NULLIF(c.nombre, ''), CONCAT('Corte ', c.numero_corte)) AS nombre
             FROM corte_academico c
             WHERE c.id_periodo = ?
             ORDER BY c.numero_corte ASC`,
            [idPeriodo],
        );

        const cortes = (cortesRows || []).map((c: any) => {
            const numero = Number(c.numero_corte || 0);
            const key = numero === 1 ? 'corte1' : numero === 2 ? 'corte2' : 'corte3';
            return {
                id_corte: Number(c.id_corte || 0),
                numero_corte: numero,
                nombre: c.nombre,
                docentes: dashboard?.cortes?.[key] || [],
            };
        });

        return { cortes };
    }

    async obtenerSupervisionEvidencias(user: any, idPeriodo: number, idCorte: number, idDocente: number): Promise<any> {
        if (!idPeriodo || !idCorte || !idDocente) {
            throw new BadRequestException('Debe enviar id_periodo, id_corte e id_docente validos');
        }

        const scope = await this.obtenerScope(user);
        const facultad = await this.resolverFacultadSupervision(user, scope);

        const filas = await this.dataSource.query(
            `SELECT
                s.id_seguimiento,
                s.semana,
                s.horas_ejecutadas,
                s.observaciones,
                a.id_actividad,
                a.nombre AS actividad,
                e.id_evidencia,
                e.nombre_archivo,
                e.ruta_archivo,
                e.descripcion,
                e.validado,
                e.fecha_carga
             FROM seguimiento_semanal s
             INNER JOIN actividad a ON a.id_actividad = s.id_actividad
             INNER JOIN agenda_docente ad ON ad.id_agenda = a.id_agenda
             INNER JOIN docente d ON d.id_docente = ad.id_docente
             INNER JOIN programa p ON p.id_programa = d.id_programa
             LEFT JOIN evidencia e ON e.id_seguimiento = s.id_seguimiento AND e.activo = 1
             WHERE ad.id_periodo = ?
               AND s.id_corte = ?
               AND d.id_docente = ?
               AND p.id_facultad = ?
             ORDER BY s.semana ASC, a.nombre ASC, e.fecha_carga DESC`,
            [idPeriodo, idCorte, idDocente, facultad.id_facultad],
        );

        const mapSeguimientos = new Map<number, any>();
        (filas || []).forEach((fila: any) => {
            const idSeguimiento = Number(fila.id_seguimiento || 0);
            if (!mapSeguimientos.has(idSeguimiento)) {
                mapSeguimientos.set(idSeguimiento, {
                    id_seguimiento: idSeguimiento,
                    semana: Number(fila.semana || 0),
                    actividad: String(fila.actividad || ''),
                    horas_ejecutadas: this.toNumber(fila.horas_ejecutadas),
                    observaciones: fila.observaciones || null,
                    evidencias: [],
                });
            }

            if (fila.id_evidencia) {
                mapSeguimientos.get(idSeguimiento).evidencias.push({
                    id_evidencia: Number(fila.id_evidencia),
                    nombre_archivo: fila.nombre_archivo,
                    ruta_archivo: fila.ruta_archivo,
                    descripcion: fila.descripcion,
                    validado: Number(fila.validado || 0),
                    fecha_carga: fila.fecha_carga,
                });
            }
        });

        const seguimientos = Array.from(mapSeguimientos.values());
        return {
            total_seguimientos: seguimientos.length,
            total_evidencias: seguimientos.reduce((acc, s) => acc + (s.evidencias?.length || 0), 0),
            seguimientos,
        };
    }

    async aprobarInformeSupervision(user: any, idPeriodo: number, idCorte: number, idDocente: number): Promise<any> {
        if (!idPeriodo || !idCorte || !idDocente) {
            throw new BadRequestException('Debe enviar id_periodo, id_corte e id_docente validos');
        }

        const scope = await this.obtenerScope(user);
        const facultad = await this.resolverFacultadSupervision(user, scope);

        const [agenda] = await this.dataSource.query(
            `SELECT ad.id_agenda
             FROM agenda_docente ad
             INNER JOIN docente d ON d.id_docente = ad.id_docente
             INNER JOIN programa p ON p.id_programa = d.id_programa
             WHERE ad.id_docente = ?
               AND ad.id_periodo = ?
               AND p.id_facultad = ?
             LIMIT 1`,
            [idDocente, idPeriodo, facultad.id_facultad],
        );

        if (!agenda?.id_agenda) {
            throw new NotFoundException('No existe agenda del docente para el periodo seleccionado');
        }

        const tipoInforme = this.tipoInformePorNumeroCorte(idCorte);
        const [informe] = await this.dataSource.query(
            `SELECT id_informe
             FROM informe
             WHERE id_agenda = ? AND tipo_informe = ?
             LIMIT 1`,
            [agenda.id_agenda, tipoInforme],
        );

        if (informe?.id_informe) {
            await this.dataSource.query(
                `UPDATE informe
                 SET estado = 'Aprobado'
                 WHERE id_informe = ?`,
                [informe.id_informe],
            );
        } else {
            await this.dataSource.query(
                `INSERT INTO informe (id_agenda, tipo_informe, fecha_entrega, estado, observaciones)
                 VALUES (?, ?, CURDATE(), 'Aprobado', NULL)`,
                [agenda.id_agenda, tipoInforme],
            );
        }

        return {
            message: 'Informe aprobado correctamente',
            id_agenda: Number(agenda.id_agenda),
            tipo_informe: tipoInforme,
            estado: 'Aprobado',
        };
    }

    async guardarObservacionesSupervision(
        user: any,
        idPeriodo: number,
        idCorte: number,
        idDocente: number,
        observaciones: string,
    ): Promise<any> {
        if (!idPeriodo || !idCorte || !idDocente) {
            throw new BadRequestException('Debe enviar id_periodo, id_corte e id_docente validos');
        }

        const texto = String(observaciones || '').trim();
        if (!texto) {
            throw new BadRequestException('La observacion no puede estar vacia');
        }

        const scope = await this.obtenerScope(user);
        const facultad = await this.resolverFacultadSupervision(user, scope);

        const resultado: any = await this.dataSource.query(
            `UPDATE seguimiento_semanal s
             INNER JOIN actividad a ON a.id_actividad = s.id_actividad
             INNER JOIN agenda_docente ad ON ad.id_agenda = a.id_agenda
             INNER JOIN docente d ON d.id_docente = ad.id_docente
             INNER JOIN programa p ON p.id_programa = d.id_programa
             SET s.observaciones = ?
             WHERE ad.id_periodo = ?
               AND s.id_corte = ?
               AND d.id_docente = ?
               AND p.id_facultad = ?`,
            [texto, idPeriodo, idCorte, idDocente, facultad.id_facultad],
        );

        const afectados = Number(resultado?.affectedRows || resultado?.affected || 0);
        if (!afectados) {
            throw new NotFoundException('No se encontraron seguimientos para registrar la observacion');
        }

        return {
            message: 'Observaciones guardadas correctamente',
            registros_actualizados: afectados,
        };
    }

    async obtenerDashboardActividadesDetalle(user: any, idPeriodo: number, idDocenteQuery?: number): Promise<any[]> {
        const scope = await this.obtenerScope(user);

        if (!idPeriodo || Number.isNaN(Number(idPeriodo))) {
            throw new BadRequestException('Debe enviar un id_periodo valido');
        }

        let sql = `SELECT
                    ta.id_tipo,
                    ta.nombre AS tipo_actividad,
                    a.id_actividad,
                    a.nombre AS actividad,
                    COALESCE(plan.horas_programadas, 0) AS horas_programadas,
                    COALESCE(seg.horas_ejecutadas, 0) AS horas_ejecutadas,
                    COALESCE(plan_cortes.horas_programadas_corte1, 0) AS horas_programadas_corte1,
                    COALESCE(plan_cortes.horas_programadas_corte2, 0) AS horas_programadas_corte2,
                    COALESCE(plan_cortes.horas_programadas_corte3, 0) AS horas_programadas_corte3,
                    COALESCE(seg_cortes.horas_ejecutadas_corte1, 0) AS horas_ejecutadas_corte1,
                    COALESCE(seg_cortes.horas_ejecutadas_corte2, 0) AS horas_ejecutadas_corte2,
                    COALESCE(seg_cortes.horas_ejecutadas_corte3, 0) AS horas_ejecutadas_corte3
                 FROM actividad a
                 INNER JOIN tipo_actividad ta ON ta.id_tipo = a.id_tipo
                 INNER JOIN agenda_docente ag ON ag.id_agenda = a.id_agenda
                 INNER JOIN docente d ON d.id_docente = ag.id_docente
                 INNER JOIN programa p ON p.id_programa = d.id_programa
                 LEFT JOIN (
                    SELECT pca.id_actividad, COALESCE(SUM(pca.horas_planeadas), 0) AS horas_programadas
                    FROM plan_corte_actividad pca
                    GROUP BY pca.id_actividad
                 ) plan ON plan.id_actividad = a.id_actividad
                 LEFT JOIN (
                    SELECT s.id_actividad, COALESCE(SUM(s.horas_ejecutadas), 0) AS horas_ejecutadas
                    FROM seguimiento_semanal s
                    GROUP BY s.id_actividad
                 ) seg ON seg.id_actividad = a.id_actividad
                 LEFT JOIN (
                    SELECT
                        pca.id_actividad,
                        COALESCE(SUM(CASE WHEN ca.numero_corte = 1 THEN pca.horas_planeadas ELSE 0 END), 0) AS horas_programadas_corte1,
                        COALESCE(SUM(CASE WHEN ca.numero_corte = 2 THEN pca.horas_planeadas ELSE 0 END), 0) AS horas_programadas_corte2,
                        COALESCE(SUM(CASE WHEN ca.numero_corte = 3 THEN pca.horas_planeadas ELSE 0 END), 0) AS horas_programadas_corte3
                    FROM plan_corte_actividad pca
                    INNER JOIN corte_academico ca ON ca.id_corte = pca.id_corte
                    GROUP BY pca.id_actividad
                 ) plan_cortes ON plan_cortes.id_actividad = a.id_actividad
                 LEFT JOIN (
                    SELECT
                        s.id_actividad,
                        COALESCE(SUM(CASE WHEN ca.numero_corte = 1 THEN s.horas_ejecutadas ELSE 0 END), 0) AS horas_ejecutadas_corte1,
                        COALESCE(SUM(CASE WHEN ca.numero_corte = 2 THEN s.horas_ejecutadas ELSE 0 END), 0) AS horas_ejecutadas_corte2,
                        COALESCE(SUM(CASE WHEN ca.numero_corte = 3 THEN s.horas_ejecutadas ELSE 0 END), 0) AS horas_ejecutadas_corte3
                    FROM seguimiento_semanal s
                    INNER JOIN corte_academico ca ON ca.id_corte = s.id_corte
                    GROUP BY s.id_actividad
                 ) seg_cortes ON seg_cortes.id_actividad = a.id_actividad
                 WHERE ag.id_periodo = ?`;

        const params: Array<number> = [idPeriodo];

        if (scope.rol === 'DOCENTE') {
            sql += ' AND ag.id_docente = ?';
            params.push(scope.idDocente);
        } else {
            sql += ' AND p.id_facultad = ?';
            params.push(scope.idFacultad!);

            if (idDocenteQuery) {
                const filasDocente = await this.dataSource.query(
                    `SELECT d.id_docente
                     FROM docente d
                     INNER JOIN programa p ON p.id_programa = d.id_programa
                     WHERE d.id_docente = ? AND p.id_facultad = ?`,
                    [idDocenteQuery, scope.idFacultad],
                );

                if (!filasDocente.length) {
                    throw new BadRequestException('El docente no pertenece a la facultad del administrador');
                }

                sql += ' AND d.id_docente = ?';
                params.push(idDocenteQuery);
            }
        }

        sql += ' ORDER BY ta.nombre ASC, a.nombre ASC';

        const filas = await this.dataSource.query(sql, params);

        const agrupado = new Map<number, any>();
        filas.forEach((fila: any) => {
            const idTipo = Number(fila.id_tipo);
            const horasProgramadasActividad = Number(fila.horas_programadas || 0);
            const horasEjecutadasActividad = Number(fila.horas_ejecutadas || 0);
            const porcentajeActividad = horasProgramadasActividad > 0
                ? Number(((horasEjecutadasActividad / horasProgramadasActividad) * 100).toFixed(2))
                : 0;

            if (!agrupado.has(idTipo)) {
                agrupado.set(idTipo, {
                    id_tipo: idTipo,
                    tipo_actividad: fila.tipo_actividad,
                    horas_programadas: 0,
                    horas_ejecutadas: 0,
                    horas_programadas_corte1: 0,
                    horas_programadas_corte2: 0,
                    horas_programadas_corte3: 0,
                    horas_ejecutadas_corte1: 0,
                    horas_ejecutadas_corte2: 0,
                    horas_ejecutadas_corte3: 0,
                    horas_faltantes: 0,
                    porcentaje_avance: 0,
                    nivel_avance: 'BAJO',
                    actividades: [],
                });
            }

            const tipo = agrupado.get(idTipo);
            tipo.actividades.push({
                id_actividad: Number(fila.id_actividad),
                nombre: fila.actividad,
                horas_programadas: Number(horasProgramadasActividad.toFixed(2)),
                horas_ejecutadas: Number(horasEjecutadasActividad.toFixed(2)),
                horas_faltantes: Number(Math.max(0, horasProgramadasActividad - horasEjecutadasActividad).toFixed(2)),
                porcentaje_avance: porcentajeActividad,
                nivel_avance: this.calcularNivelPorcentaje(porcentajeActividad),
                avance_corte1: Number(fila.horas_programadas_corte1 || 0) > 0
                    ? Number((((Number(fila.horas_ejecutadas_corte1 || 0) / Number(fila.horas_programadas_corte1 || 0)) * 100)).toFixed(2))
                    : 0,
                avance_corte2: Number(fila.horas_programadas_corte2 || 0) > 0
                    ? Number((((Number(fila.horas_ejecutadas_corte2 || 0) / Number(fila.horas_programadas_corte2 || 0)) * 100)).toFixed(2))
                    : 0,
                avance_corte3: Number(fila.horas_programadas_corte3 || 0) > 0
                    ? Number((((Number(fila.horas_ejecutadas_corte3 || 0) / Number(fila.horas_programadas_corte3 || 0)) * 100)).toFixed(2))
                    : 0,
            });

            tipo.horas_programadas += horasProgramadasActividad;
            tipo.horas_ejecutadas += horasEjecutadasActividad;
            tipo.horas_programadas_corte1 += Number(fila.horas_programadas_corte1 || 0);
            tipo.horas_programadas_corte2 += Number(fila.horas_programadas_corte2 || 0);
            tipo.horas_programadas_corte3 += Number(fila.horas_programadas_corte3 || 0);
            tipo.horas_ejecutadas_corte1 += Number(fila.horas_ejecutadas_corte1 || 0);
            tipo.horas_ejecutadas_corte2 += Number(fila.horas_ejecutadas_corte2 || 0);
            tipo.horas_ejecutadas_corte3 += Number(fila.horas_ejecutadas_corte3 || 0);
        });

        const tiposOrden = [
            'Docencia Directa',
            'Docencia Indirecta',
            'Labor Investigación',
            'Labor Extensión',
            'Labor Administrativa',
        ];

        const salida = Array.from(agrupado.values()).map((tipo: any) => {
            const horasProgramadas = Number(tipo.horas_programadas || 0);
            const horasEjecutadas = Number(tipo.horas_ejecutadas || 0);
            const porcentaje = horasProgramadas > 0
                ? Number(((horasEjecutadas / horasProgramadas) * 100).toFixed(2))
                : 0;
            const horasProgramadasCorte1 = Number(tipo.horas_programadas_corte1 || 0);
            const horasProgramadasCorte2 = Number(tipo.horas_programadas_corte2 || 0);
            const horasProgramadasCorte3 = Number(tipo.horas_programadas_corte3 || 0);
            const horasEjecutadasCorte1 = Number(tipo.horas_ejecutadas_corte1 || 0);
            const horasEjecutadasCorte2 = Number(tipo.horas_ejecutadas_corte2 || 0);
            const horasEjecutadasCorte3 = Number(tipo.horas_ejecutadas_corte3 || 0);

            const avanceCorte1 = horasProgramadasCorte1 > 0
                ? Number(((horasEjecutadasCorte1 / horasProgramadasCorte1) * 100).toFixed(2))
                : 0;
            const avanceCorte2 = horasProgramadasCorte2 > 0
                ? Number(((horasEjecutadasCorte2 / horasProgramadasCorte2) * 100).toFixed(2))
                : 0;
            const avanceCorte3 = horasProgramadasCorte3 > 0
                ? Number(((horasEjecutadasCorte3 / horasProgramadasCorte3) * 100).toFixed(2))
                : 0;

            return {
                ...tipo,
                nombre_tipo: tipo.tipo_actividad,
                horas_programadas: Number(horasProgramadas.toFixed(2)),
                horas_ejecutadas: Number(horasEjecutadas.toFixed(2)),
                horas_faltantes: Number(Math.max(0, horasProgramadas - horasEjecutadas).toFixed(2)),
                porcentaje_avance: porcentaje,
                avance_semestre: porcentaje,
                avance_corte1: avanceCorte1,
                avance_corte2: avanceCorte2,
                avance_corte3: avanceCorte3,
                nivel_avance: this.calcularNivelPorcentaje(porcentaje),
                actividades: [...tipo.actividades].sort((a: any, b: any) => a.nombre.localeCompare(b.nombre, 'es')),
            };
        });

        salida.sort((a: any, b: any) => {
            const ia = tiposOrden.indexOf(a.tipo_actividad);
            const ib = tiposOrden.indexOf(b.tipo_actividad);
            const pa = ia >= 0 ? ia : 999;
            const pb = ib >= 0 ? ib : 999;
            if (pa !== pb) return pa - pb;
            return String(a.tipo_actividad).localeCompare(String(b.tipo_actividad), 'es');
        });

        return salida;
    }

    async obtenerDashboard(user: any, idPeriodo: number, idDocenteQuery?: number): Promise<any[]> {
        const scope = await this.obtenerScope(user);

        if (scope.rol === 'DOCENTE') {
            return await this.dataSource.query(
                `SELECT
                    tipo_actividad,
                    horas_programadas,
                    horas_cumplidas,
                    horas_faltantes,
                    porcentaje_avance,
                    nivel_avance
                 FROM vw_dashboard_docente
                 WHERE id_docente = ? AND id_periodo = ?`,
                [scope.idDocente, idPeriodo],
            );
        }

        if (idDocenteQuery) {
            const filasDoc = await this.dataSource.query(
                `SELECT d.id_docente
                 FROM docente d
                 INNER JOIN programa p ON p.id_programa = d.id_programa
                 WHERE d.id_docente = ? AND p.id_facultad = ?`,
                [idDocenteQuery, scope.idFacultad],
            );
            if (!filasDoc.length) {
                throw new BadRequestException('El docente no pertenece a la facultad del administrador');
            }

            return await this.dataSource.query(
                `SELECT
                    tipo_actividad,
                    horas_programadas,
                    horas_cumplidas,
                    horas_faltantes,
                    porcentaje_avance,
                    nivel_avance
                 FROM vw_dashboard_docente
                 WHERE id_docente = ? AND id_periodo = ?`,
                [idDocenteQuery, idPeriodo],
            );
        }

        return await this.dataSource.query(
            `SELECT
                v.tipo_actividad,
                SUM(v.horas_programadas) AS horas_programadas,
                SUM(v.horas_cumplidas) AS horas_cumplidas,
                SUM(v.horas_faltantes) AS horas_faltantes,
                ROUND((SUM(v.horas_cumplidas) / NULLIF(SUM(v.horas_programadas), 0)) * 100, 2) AS porcentaje_avance,
                CASE
                    WHEN (SUM(v.horas_cumplidas) / NULLIF(SUM(v.horas_programadas), 0)) >= 0.75 THEN 'ALTO'
                    WHEN (SUM(v.horas_cumplidas) / NULLIF(SUM(v.horas_programadas), 0)) >= 0.40 THEN 'MEDIO'
                    ELSE 'BAJO'
                END AS nivel_avance
             FROM vw_dashboard_docente v
             INNER JOIN docente d ON d.id_docente = v.id_docente
             INNER JOIN programa p ON p.id_programa = d.id_programa
             WHERE v.id_periodo = ? AND p.id_facultad = ?
             GROUP BY v.tipo_actividad`,
            [idPeriodo, scope.idFacultad],
        );
    }

    async obtenerConsolidadoSeguimientoPorDocente(user: any, filtros: FiltrosConsolidadoSeguimiento): Promise<any> {
        const idPeriodo = Number(filtros?.id_periodo || 0);
        if (!idPeriodo || Number.isNaN(idPeriodo)) {
            throw new BadRequestException('Debe enviar un id_periodo valido');
        }

        const rolJWT = String(user?.rol || '').toUpperCase();
        const scope = await this.obtenerScopeSeguimientoConFallback(user);
        const facultadSeguimiento = rolJWT === 'DECANO'
            ? await this.resolverFacultadDecanoSeguimiento(user, scope, idPeriodo)
            : null;

        const idFacultadFiltro = Number(filtros?.id_facultad || 0) || undefined;
        const idProgramaFiltro = Number(filtros?.id_programa || 0) || undefined;
        const idDocenteFiltro = Number(filtros?.id_docente || 0) || undefined;
        const idCorteFiltro = Number(filtros?.id_corte || 0) || undefined;
        const semanaFiltro = Number(filtros?.semana || 0) || undefined;
        const idTipoFiltro = Number(filtros?.id_tipo || 0) || undefined;
        const estadoAvanceFiltro = String(filtros?.estado_avance || '').trim().toUpperCase();
        const textoBusqueda = String(filtros?.q || '').trim();

        const [corteActualRow] = await this.dataSource.query(
            `SELECT c.id_corte
             FROM corte_academico c
             WHERE c.id_periodo = ?
               AND CURDATE() BETWEEN c.fecha_inicio AND c.fecha_fin
             ORDER BY c.numero_corte DESC
             LIMIT 1`,
            [idPeriodo],
        );
        const idCorteActual = Number(idCorteFiltro || corteActualRow?.id_corte || 0);

        const condicionesBase: string[] = ['ad.id_periodo = ?'];
        const paramsBase: Array<number | string> = [idPeriodo];

        if (scope.rol === 'DOCENTE') {
            condicionesBase.push('d.id_docente = ?');
            paramsBase.push(Number(scope.idDocente));
        } else if (rolJWT === 'DECANO') {
            const idFacultadDecano = Number(facultadSeguimiento?.id_facultad || 0);
            if (!idFacultadDecano) {
                throw new ForbiddenException('No fue posible determinar la facultad del decano');
            }
            condicionesBase.push('p.id_facultad = ?');
            paramsBase.push(idFacultadDecano);
        } else if (rolJWT !== 'ADMIN') {
            throw new ForbiddenException('Rol no permitido para seguimiento consolidado');
        }

        if (idFacultadFiltro) {
            condicionesBase.push('p.id_facultad = ?');
            paramsBase.push(idFacultadFiltro);
        }
        if (idProgramaFiltro) {
            condicionesBase.push('p.id_programa = ?');
            paramsBase.push(idProgramaFiltro);
        }
        if (idDocenteFiltro) {
            condicionesBase.push('d.id_docente = ?');
            paramsBase.push(idDocenteFiltro);
        }
        if (textoBusqueda) {
            condicionesBase.push("(LOWER(TRIM(COALESCE(d.nombres, ''))) LIKE ? OR REPLACE(REPLACE(REPLACE(COALESCE(d.identificacion, ''), '.', ''), '-', ''), ' ', '') LIKE ?)");
            paramsBase.push(`%${textoBusqueda.toLowerCase()}%`);
            const identificacionSanitizada = textoBusqueda.replace(/[^0-9a-zA-Z]/g, '').toLowerCase();
            paramsBase.push(`%${identificacionSanitizada}%`);
        }

        const condicionesActividad: string[] = [];
        const paramsActividad: Array<number | string> = [];
        if (idTipoFiltro) {
            condicionesActividad.push('a.id_tipo = ?');
            paramsActividad.push(idTipoFiltro);
        }

        const whereActividad = condicionesActividad.length ? ` AND ${condicionesActividad.join(' AND ')}` : '';

        let planSubquery = `
            SELECT
                pca.id_actividad,
                SUM(COALESCE(pca.horas_planeadas, 0)) AS horas_planeadas
            FROM plan_corte_actividad pca
            WHERE 1 = 1
        `;
        const paramsPlan: Array<number | string> = [];

        if (idCorteFiltro) {
            planSubquery += ' AND pca.id_corte = ?';
            paramsPlan.push(idCorteFiltro);
        }

        if (semanaFiltro) {
            planSubquery = `
                SELECT
                    a_sem.id_actividad,
                    COALESCE(a_sem.horas_semanales, 0) AS horas_planeadas
                FROM actividad a_sem
                WHERE 1 = 1
            `;
            if (idCorteFiltro) {
                planSubquery += ' AND EXISTS (SELECT 1 FROM plan_corte_actividad pca_sem WHERE pca_sem.id_actividad = a_sem.id_actividad AND pca_sem.id_corte = ?)';
                paramsPlan.push(idCorteFiltro);
            }
        } else {
            planSubquery += ' GROUP BY pca.id_actividad';
        }

        let segSubquery = `
            SELECT
                s.id_actividad,
                SUM(COALESCE(s.horas_ejecutadas, 0)) AS horas_ejecutadas
            FROM seguimiento_semanal s
            WHERE 1 = 1
        `;
        const paramsSeg: Array<number | string> = [];

        if (idCorteFiltro) {
            segSubquery += ' AND s.id_corte = ?';
            paramsSeg.push(idCorteFiltro);
        }
        if (semanaFiltro) {
            segSubquery += ' AND s.semana = ?';
            paramsSeg.push(semanaFiltro);
        }
        segSubquery += ' GROUP BY s.id_actividad';

        const sqlDocentes = `
            SELECT
                d.id_docente,
                TRIM(COALESCE(d.nombres, '')) AS docente,
                COALESCE(d.identificacion, '') AS identificacion,
                p.id_programa,
                COALESCE(p.nombre, '') AS programa,
                f.id_facultad,
                COALESCE(f.nombre, '') AS facultad,
                MAX(ad.id_agenda) AS id_agenda,
                COALESCE(SUM(COALESCE(plan.horas_planeadas, 0)), 0) AS horas_planeadas,
                COALESCE(SUM(COALESCE(seg.horas_ejecutadas, 0)), 0) AS horas_ejecutadas,
                COALESCE(SUM(COALESCE(plan_corte_actual.horas_planeadas_corte_actual, 0)), 0) AS horas_planeadas_corte_actual,
                COALESCE(SUM(COALESCE(seg_corte_actual.horas_ejecutadas_corte_actual, 0)), 0) AS horas_ejecutadas_corte_actual,
                COALESCE(MAX(COALESCE(plan_semana.horas_planeadas_semana, 0)), 0) AS horas_planeadas_semana_actual,
                COALESCE(MAX(COALESCE(seg_semana.horas_ejecutadas_semana, 0)), 0) AS horas_ejecutadas_semana_actual,
                MAX(GREATEST(1, FLOOR(DATEDIFF(CURDATE(), ad.inicio_semestre) / 7) + 1)) AS semana_actual_numero
            FROM agenda_docente ad
            INNER JOIN docente d ON d.id_docente = ad.id_docente
            INNER JOIN programa p ON p.id_programa = d.id_programa
            INNER JOIN facultad f ON f.id_facultad = p.id_facultad
            LEFT JOIN actividad a ON a.id_agenda = ad.id_agenda${whereActividad}
            LEFT JOIN (${planSubquery}) plan ON plan.id_actividad = a.id_actividad
            LEFT JOIN (${segSubquery}) seg ON seg.id_actividad = a.id_actividad
            LEFT JOIN (
                SELECT pca.id_actividad, SUM(COALESCE(pca.horas_planeadas, 0)) AS horas_planeadas_corte_actual
                FROM plan_corte_actividad pca
                WHERE pca.id_corte = ?
                GROUP BY pca.id_actividad
            ) plan_corte_actual ON plan_corte_actual.id_actividad = a.id_actividad
            LEFT JOIN (
                SELECT s.id_actividad, SUM(COALESCE(s.horas_ejecutadas, 0)) AS horas_ejecutadas_corte_actual
                FROM seguimiento_semanal s
                WHERE s.id_corte = ?
                GROUP BY s.id_actividad
            ) seg_corte_actual ON seg_corte_actual.id_actividad = a.id_actividad
            LEFT JOIN (
                SELECT adw.id_agenda, COALESCE(SUM(COALESCE(a2.horas_semanales, 0)), 0) AS horas_planeadas_semana
                FROM agenda_docente adw
                LEFT JOIN actividad a2 ON a2.id_agenda = adw.id_agenda
                WHERE adw.id_periodo = ?
                GROUP BY adw.id_agenda
            ) plan_semana ON plan_semana.id_agenda = ad.id_agenda
            LEFT JOIN (
                SELECT a3.id_agenda, s3.semana, COALESCE(SUM(COALESCE(s3.horas_ejecutadas, 0)), 0) AS horas_ejecutadas_semana
                FROM seguimiento_semanal s3
                INNER JOIN actividad a3 ON a3.id_actividad = s3.id_actividad
                GROUP BY a3.id_agenda, s3.semana
            ) seg_semana ON seg_semana.id_agenda = ad.id_agenda
                AND seg_semana.semana = GREATEST(1, FLOOR(DATEDIFF(CURDATE(), ad.inicio_semestre) / 7) + 1)
            WHERE ${condicionesBase.join(' AND ')}
            GROUP BY d.id_docente, d.nombres, d.identificacion, p.id_programa, p.nombre, f.id_facultad, f.nombre
            ORDER BY docente ASC
        `;

        const filasDocentesRaw = await this.dataSource.query(sqlDocentes, [
            ...paramsActividad,
            ...paramsPlan,
            ...paramsSeg,
            idCorteActual,
            idCorteActual,
            idPeriodo,
            ...paramsBase,
        ]);

        const docentes = (filasDocentesRaw || []).map((fila: any) => {
            const horasPlaneadas = Number(fila.horas_planeadas || 0);
            const horasEjecutadas = Number(fila.horas_ejecutadas || 0);
            const horasPendientes = Math.max(0, Number((horasPlaneadas - horasEjecutadas).toFixed(2)));
            const porcentaje = horasPlaneadas > 0
                ? Number(((horasEjecutadas / horasPlaneadas) * 100).toFixed(2))
                : 0;
            const horasPlaneadasCorteActual = Number(fila.horas_planeadas_corte_actual || 0);
            const horasEjecutadasCorteActual = Number(fila.horas_ejecutadas_corte_actual || 0);
            const porcentajeCorteActual = horasPlaneadasCorteActual > 0
                ? Number(((horasEjecutadasCorteActual / horasPlaneadasCorteActual) * 100).toFixed(2))
                : 0;
            const horasPlaneadasSemanaActual = Number(fila.horas_planeadas_semana_actual || 0);
            const horasEjecutadasSemanaActual = Number(fila.horas_ejecutadas_semana_actual || 0);
            const porcentajeSemanaActual = horasPlaneadasSemanaActual > 0
                ? Number(((horasEjecutadasSemanaActual / horasPlaneadasSemanaActual) * 100).toFixed(2))
                : 0;
            const nivel = this.calcularNivelPorcentaje(porcentaje);

            return {
                id_docente: Number(fila.id_docente || 0),
                docente: String(fila.docente || '').trim(),
                identificacion: String(fila.identificacion || ''),
                id_programa: Number(fila.id_programa || 0),
                programa: String(fila.programa || ''),
                id_facultad: Number(fila.id_facultad || 0),
                facultad: String(fila.facultad || ''),
                id_agenda: Number(fila.id_agenda || 0),
                horas_planeadas: Number(horasPlaneadas.toFixed(2)),
                horas_ejecutadas: Number(horasEjecutadas.toFixed(2)),
                horas_pendientes: horasPendientes,
                porcentaje_avance: porcentaje,
                nivel_avance: nivel,
                estado_avance: nivel,
                corte_actual: {
                    id_corte: idCorteActual || null,
                    horas_planeadas: Number(horasPlaneadasCorteActual.toFixed(2)),
                    horas_ejecutadas: Number(horasEjecutadasCorteActual.toFixed(2)),
                    horas_pendientes: Number(Math.max(0, horasPlaneadasCorteActual - horasEjecutadasCorteActual).toFixed(2)),
                    porcentaje_avance: porcentajeCorteActual,
                    nivel_avance: this.calcularNivelPorcentaje(porcentajeCorteActual),
                },
                semana_actual: {
                    numero: Number(fila.semana_actual_numero || 0),
                    horas_planeadas: Number(horasPlaneadasSemanaActual.toFixed(2)),
                    horas_ejecutadas: Number(horasEjecutadasSemanaActual.toFixed(2)),
                    horas_pendientes: Number(Math.max(0, horasPlaneadasSemanaActual - horasEjecutadasSemanaActual).toFixed(2)),
                    porcentaje_avance: porcentajeSemanaActual,
                    nivel_avance: this.calcularNivelPorcentaje(porcentajeSemanaActual),
                },
            };
        });

        const docentesFiltrados = estadoAvanceFiltro
            ? docentes.filter((fila: any) => String(fila.estado_avance || '').toUpperCase() === estadoAvanceFiltro)
            : docentes;

        this.logSeguimientoDebug('consolidado', {
            rol: rolJWT,
            id_periodo: idPeriodo,
            id_facultad_scope: Number(scope.idFacultad || 0),
            id_facultad_decano: Number(facultadSeguimiento?.id_facultad || 0),
            docentes_totales: docentes.length,
            docentes_filtrados: docentesFiltrados.length,
            filtros: {
                id_facultad: idFacultadFiltro || null,
                id_programa: idProgramaFiltro || null,
                id_docente: idDocenteFiltro || null,
                estado_avance: estadoAvanceFiltro || null,
                semana: semanaFiltro || null,
                id_corte: idCorteFiltro || null,
                id_tipo: idTipoFiltro || null,
                q: textoBusqueda || null,
            },
        });

        const totalPlaneadas = docentesFiltrados.reduce((acc: number, fila: any) => acc + Number(fila.horas_planeadas || 0), 0);
        const totalEjecutadas = docentesFiltrados.reduce((acc: number, fila: any) => acc + Number(fila.horas_ejecutadas || 0), 0);
        const totalPendientes = Math.max(0, Number((totalPlaneadas - totalEjecutadas).toFixed(2)));
        const porcentajeGlobal = totalPlaneadas > 0
            ? Number(((totalEjecutadas / totalPlaneadas) * 100).toFixed(2))
            : 0;

        const docentesAlto = docentesFiltrados.filter((fila: any) => fila.nivel_avance === 'ALTO').length;
        const docentesMedio = docentesFiltrados.filter((fila: any) => fila.nivel_avance === 'MEDIO').length;
        const docentesBajo = docentesFiltrados.filter((fila: any) => fila.nivel_avance === 'BAJO').length;

        let opcionesFacultadRaw: any[] = [];
        let opcionesProgramaRaw: any[] = [];

        if (rolJWT === 'DECANO') {
            const idFacultadDecano = Number(facultadSeguimiento?.id_facultad || 0);
            opcionesFacultadRaw = await this.dataSource.query(
                `SELECT f.id_facultad, f.nombre
                 FROM facultad f
                 WHERE f.id_facultad = ?
                 ORDER BY f.nombre ASC`,
                [idFacultadDecano],
            );

            opcionesProgramaRaw = await this.dataSource.query(
                `SELECT p.id_programa, p.nombre, p.id_facultad
                 FROM programa p
                 WHERE p.id_facultad = ?
                 ORDER BY p.nombre ASC`,
                [idFacultadDecano],
            );
        } else {
            opcionesFacultadRaw = await this.dataSource.query(
                `SELECT f.id_facultad, f.nombre
                 FROM facultad f
                 ORDER BY f.nombre ASC`,
            );

            opcionesProgramaRaw = await this.dataSource.query(
                `SELECT p.id_programa, p.nombre, p.id_facultad
                 FROM programa p
                 ORDER BY p.nombre ASC`,
            );
        }

        const opcionesDocentes = docentes.map((fila: any) => ({
            id_docente: fila.id_docente,
            docente: fila.docente,
            identificacion: fila.identificacion,
            id_programa: fila.id_programa,
            id_facultad: fila.id_facultad,
        }));

        const opcionesCortes = await this.dataSource.query(
            `SELECT c.id_corte, c.numero_corte, COALESCE(NULLIF(c.nombre, ''), CONCAT('Corte ', c.numero_corte)) AS nombre
             FROM corte_academico c
             WHERE c.id_periodo = ?
             ORDER BY c.numero_corte ASC`,
            [idPeriodo],
        );

        const opcionesTipos = await this.dataSource.query(
            `SELECT ta.id_tipo, ta.nombre
             FROM tipo_actividad ta
             ORDER BY ta.nombre ASC`,
        );

        return {
            resumen: {
                total_docentes_adscritos: docentesFiltrados.length,
                total_horas_planeadas: Number(totalPlaneadas.toFixed(2)),
                total_horas_ejecutadas: Number(totalEjecutadas.toFixed(2)),
                total_horas_pendientes: totalPendientes,
                porcentaje_global_avance: porcentajeGlobal,
                docentes_avance_alto: docentesAlto,
                docentes_avance_medio: docentesMedio,
                docentes_avance_bajo: docentesBajo,
            },
            docentes: docentesFiltrados,
            filtros: {
                id_periodo: idPeriodo,
                id_facultad: idFacultadFiltro || null,
                id_programa: idProgramaFiltro || null,
                id_docente: idDocenteFiltro || null,
                estado_avance: estadoAvanceFiltro || null,
                semana: semanaFiltro || null,
                id_corte: idCorteFiltro || null,
                id_tipo: idTipoFiltro || null,
                q: textoBusqueda || null,
            },
            opciones: {
                facultades: (opcionesFacultadRaw || []).map((fila: any) => ({
                    id_facultad: Number(fila.id_facultad || 0),
                    nombre: String(fila.nombre || ''),
                })),
                programas: (opcionesProgramaRaw || []).map((fila: any) => ({
                    id_programa: Number(fila.id_programa || 0),
                    nombre: String(fila.nombre || ''),
                    id_facultad: Number(fila.id_facultad || 0),
                })),
                docentes: opcionesDocentes,
                cortes: (opcionesCortes || []).map((fila: any) => ({
                    id_corte: Number(fila.id_corte || 0),
                    numero_corte: Number(fila.numero_corte || 0),
                    nombre: String(fila.nombre || ''),
                })),
                tipos_actividad: (opcionesTipos || []).map((fila: any) => ({
                    id_tipo: Number(fila.id_tipo || 0),
                    nombre: String(fila.nombre || ''),
                })),
            },
        };
    }

    async obtenerHistorialSemanalDocente(user: any, idPeriodo: number, idDocente: number): Promise<any> {
        if (!idPeriodo || Number.isNaN(Number(idPeriodo))) {
            throw new BadRequestException('Debe enviar un id_periodo valido');
        }
        if (!idDocente || Number.isNaN(Number(idDocente))) {
            throw new BadRequestException('Debe enviar un id_docente valido');
        }

        const rolJWT = String(user?.rol || '').toUpperCase();
        const scope = await this.obtenerScopeSeguimientoConFallback(user);
        const facultadSeguimiento = rolJWT === 'DECANO'
            ? await this.resolverFacultadDecanoSeguimiento(user, scope, idPeriodo)
            : null;

        const condiciones: string[] = ['ad.id_periodo = ?', 'd.id_docente = ?'];
        const params: Array<number> = [Number(idPeriodo), Number(idDocente)];

        if (scope.rol === 'DOCENTE') {
            condiciones.push('d.id_docente = ?');
            params.push(Number(scope.idDocente));
        } else if (rolJWT === 'DECANO') {
            const idFacultadDecano = Number(facultadSeguimiento?.id_facultad || 0);
            if (!idFacultadDecano) {
                throw new ForbiddenException('No fue posible determinar la facultad del decano');
            }
            condiciones.push('p.id_facultad = ?');
            params.push(idFacultadDecano);
        } else if (rolJWT !== 'ADMIN') {
            throw new ForbiddenException('Rol no permitido para historial de seguimiento');
        }

        const [resumenPlaneadas] = await this.dataSource.query(
            `SELECT COALESCE(SUM(pca.horas_planeadas), 0) AS horas_planeadas
             FROM agenda_docente ad
             INNER JOIN actividad a ON a.id_agenda = ad.id_agenda
             INNER JOIN docente d ON d.id_docente = ad.id_docente
             INNER JOIN programa p ON p.id_programa = d.id_programa
             INNER JOIN plan_corte_actividad pca ON pca.id_actividad = a.id_actividad
             WHERE ${condiciones.join(' AND ')}`,
            params,
        );

        const historial = await this.dataSource.query(
            `SELECT
                s.semana,
                ca.numero_corte,
                COALESCE(SUM(s.horas_ejecutadas), 0) AS horas_ejecutadas
             FROM seguimiento_semanal s
             INNER JOIN actividad a ON a.id_actividad = s.id_actividad
             INNER JOIN agenda_docente ad ON ad.id_agenda = a.id_agenda
             INNER JOIN docente d ON d.id_docente = ad.id_docente
             INNER JOIN programa p ON p.id_programa = d.id_programa
             INNER JOIN corte_academico ca ON ca.id_corte = s.id_corte
             WHERE ${condiciones.join(' AND ')}
             GROUP BY s.semana, ca.numero_corte
             ORDER BY s.semana ASC`,
            params,
        );

        const [horasSemanalesDocente] = await this.dataSource.query(
            `SELECT COALESCE(SUM(a.horas_semanales), 0) AS horas_planeadas_semana
             FROM agenda_docente ad
             INNER JOIN actividad a ON a.id_agenda = ad.id_agenda
             INNER JOIN docente d ON d.id_docente = ad.id_docente
             INNER JOIN programa p ON p.id_programa = d.id_programa
             WHERE ${condiciones.join(' AND ')}`,
            params,
        );

        const horasPlaneadasSemana = Number(horasSemanalesDocente?.horas_planeadas_semana || 0);

        const filas = (historial || []).map((fila: any) => {
            const horasEjecutadas = Number(fila.horas_ejecutadas || 0);
            const porcentaje = horasPlaneadasSemana > 0
                ? Number(((horasEjecutadas / horasPlaneadasSemana) * 100).toFixed(2))
                : 0;

            return {
                semana: Number(fila.semana || 0),
                numero_corte: Number(fila.numero_corte || 0),
                horas_planeadas_semana: Number(horasPlaneadasSemana.toFixed(2)),
                horas_ejecutadas: Number(horasEjecutadas.toFixed(2)),
                horas_pendientes: Number(Math.max(0, horasPlaneadasSemana - horasEjecutadas).toFixed(2)),
                porcentaje_avance: porcentaje,
                nivel_avance: this.calcularNivelPorcentaje(porcentaje),
            };
        });

        const totalPlaneadas = Number(resumenPlaneadas?.horas_planeadas || 0);
        const totalEjecutadas = filas.reduce((acc: number, fila: any) => acc + Number(fila.horas_ejecutadas || 0), 0);

        return {
            resumen: {
                total_horas_planeadas: Number(totalPlaneadas.toFixed(2)),
                total_horas_ejecutadas: Number(totalEjecutadas.toFixed(2)),
                total_horas_pendientes: Number(Math.max(0, totalPlaneadas - totalEjecutadas).toFixed(2)),
                porcentaje_global_avance: totalPlaneadas > 0
                    ? Number(((totalEjecutadas / totalPlaneadas) * 100).toFixed(2))
                    : 0,
            },
            historial_semanal: filas,
        };
    }
}
