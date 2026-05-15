import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import ExcelJS from 'exceljs';
import { ScopeService, UserScope } from '../auth/scope.service';
import { Docente } from '../docente/entities/docente.entity';
import { Facultad } from '../docente/entities/facultad.entity';

interface FiltrosReporte {
    facultades: number[];
    periodos: string[];
    cortes: number[];
    semanas: number[];
    docentes: string[];
    identificacion: string;
    nombreDocente: string;
}

interface PaginacionReporte {
    page: number;
    pageSize: number;
}

interface OrdenReporte {
    sortBy: string;
    sortDir: 'ASC' | 'DESC';
}

@Injectable()
export class InformesService {
    private readonly vistaReporte = 'vw_reporte_seguimiento_detallado';

    constructor(
        private readonly dataSource: DataSource,
        private readonly scopeService: ScopeService,
        @InjectRepository(Docente)
        private readonly docenteRepo: Repository<Docente>,
        @InjectRepository(Facultad)
        private readonly facultadRepo: Repository<Facultad>,
    ) {}

    private parseCsvToStringArray(value?: string): string[] {
        if (!value) return [];
        return value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    }

    private parseCsvToNumberArray(value?: string): number[] {
        if (!value) return [];
        return value
            .split(',')
            .map((item) => Number(item.trim()))
            .filter((item) => Number.isFinite(item));
    }

    private parseFiltros(query: Record<string, any>): FiltrosReporte {
        const facultades = this.parseCsvToNumberArray(query.facultades || query.id_facultad);
        return {
            facultades,
            periodos: this.parseCsvToStringArray(query.periodos),
            cortes: this.parseCsvToNumberArray(query.cortes),
            semanas: this.parseCsvToNumberArray(query.semanas),
            docentes: this.parseCsvToStringArray(query.docentes),
            identificacion: String(query.identificacion || '').trim(),
            nombreDocente: String(query.docente || query.nombre || '').trim(),
        };
    }

    private parsePaginacion(query: Record<string, any>): PaginacionReporte {
        const page = Math.max(1, Number(query.page || 1));
        const requestedPageSize = Math.max(1, Number(query.pageSize || 20));
        const pageSize = Math.min(200, requestedPageSize);
        return { page, pageSize };
    }

    private parseOrden(query: Record<string, any>): OrdenReporte {
        const sortByRaw = String(query.sortBy || 'fecha_registro').trim();
        const sortDirRaw = String(query.sortDir || 'DESC').toUpperCase();

        const sortMap: Record<string, string> = {
            periodo_academico: 'vw.periodo_academico',
            numero_corte: 'vw.numero_corte',
            nombre_corte: 'vw.nombre_corte',
            semana: 'vw.semana',
            cedula: 'vw.cedula',
            docente: 'vw.docente',
            programa_adscrito: 'vw.programa_adscrito',
            facultad: 'vw.facultad',
            tipo_actividad: 'vw.tipo_actividad',
            actividad: 'vw.actividad',
            horas_semanales: 'vw.horas_semanales',
            horas_planeadas: 'vw.horas_planeadas',
            horas_ejecutadas: 'vw.horas_ejecutadas',
            avance_semanal_actividad: 'vw.avance_semanal_actividad',
            avance_vs_corte: 'vw.avance_vs_corte',
            estado_avance: 'vw.estado_avance',
            fecha_registro: 'vw.fecha_registro',
        };

        const sortBy = sortMap[sortByRaw] ? sortByRaw : 'fecha_registro';
        const sortDir: 'ASC' | 'DESC' = sortDirRaw === 'ASC' ? 'ASC' : 'DESC';

        return { sortBy, sortDir };
    }

    private buildInClause(values: Array<string | number>, params: Array<string | number>) {
        const placeholders = values.map(() => '?').join(', ');
        params.push(...values);
        return `(${placeholders})`;
    }

    private normalizarAnio(valor: any): string {
        const texto = String(valor ?? '').trim();
        if (!texto) return '';

        const matchPunto = texto.match(/^(\d)\.(\d{3})$/);
        if (matchPunto) {
            return `${matchPunto[1]}${matchPunto[2]}`;
        }

        return texto;
    }

    private normalizarPeriodoAcademico(valor: any): string {
        const texto = String(valor ?? '').trim();
        if (!texto) return '';
        return texto.replace(/(\d)\.(\d{3})(?=-|$)/g, '$1$2');
    }

    private normalizarFilas(rows: any[]): any[] {
        return rows.map((row) => ({
            ...row,
            anio: row?.anio !== undefined && row?.anio !== null ? this.normalizarAnio(row.anio) : row?.anio,
            periodo_academico: this.normalizarPeriodoAcademico(row?.periodo_academico),
        }));
    }

    private async obtenerRestriccionScope(scope: UserScope): Promise<{ cedulaDocente?: string; nombreFacultad?: string }> {
        if (scope.rol === 'DOCENTE') {
            const docente = await this.docenteRepo.findOne({ where: { id_docente: scope.idDocente } });
            if (!docente?.identificacion) {
                throw new BadRequestException('No se pudo determinar la identificacion del docente autenticado');
            }
            return { cedulaDocente: String(docente.identificacion) };
        }

        const facultad = await this.facultadRepo.findOne({ where: { id_facultad: scope.idFacultad } as any });
        if (!facultad?.nombre) {
            throw new BadRequestException('No se pudo determinar la facultad del usuario administrador');
        }

        return { nombreFacultad: String(facultad.nombre) };
    }

    private async construirWhereSql(
        filtros: FiltrosReporte,
        scope: UserScope,
        params: Array<string | number>,
        opciones?: { incluirNombreDocente?: boolean; incluirIdentificacion?: boolean; incluirFacultad?: boolean },
    ): Promise<string> {
        const includeName = opciones?.incluirNombreDocente !== false;
        const includeId = opciones?.incluirIdentificacion !== false;
        const includeFacultad = opciones?.incluirFacultad !== false;
        const where: string[] = ['1=1'];

        const restricciones = await this.obtenerRestriccionScope(scope);
        if (restricciones.cedulaDocente) {
            where.push('CAST(vw.cedula AS CHAR) = ?');
            params.push(restricciones.cedulaDocente);
        }

        if (restricciones.nombreFacultad) {
            where.push('LOWER(vw.facultad) = LOWER(?)');
            params.push(restricciones.nombreFacultad);
        }

        if (filtros.periodos.length > 0) {
            where.push(`vw.periodo_academico IN ${this.buildInClause(filtros.periodos, params)}`);
        }

        if (filtros.cortes.length > 0) {
            where.push(`vw.numero_corte IN ${this.buildInClause(filtros.cortes, params)}`);
        }

        if (filtros.semanas.length > 0) {
            where.push(`vw.semana IN ${this.buildInClause(filtros.semanas, params)}`);
        }

        if (filtros.docentes.length > 0) {
            where.push(`CAST(vw.cedula AS CHAR) IN ${this.buildInClause(filtros.docentes, params)}`);
        }

        if (includeFacultad && filtros.facultades.length > 0) {
            const facultadesSeleccionadas = Array.from(new Set(filtros.facultades)).filter(
                (id) => Number.isFinite(id) && id > 0,
            );

            if (facultadesSeleccionadas.length === 0) {
                where.push('1=0');
            } else {
                const facultades = await this.facultadRepo.find({
                    where: { id_facultad: In(facultadesSeleccionadas) },
                    select: { nombre: true },
                });

                const nombresFacultad = facultades
                    .map((item) => String(item.nombre || '').trim().toLowerCase())
                    .filter(Boolean);

                if (nombresFacultad.length === 0) {
                    where.push('1=0');
                } else {
                    where.push(`LOWER(TRIM(vw.facultad)) IN ${this.buildInClause(nombresFacultad, params)}`);
                }
            }
        }

        if (includeId && filtros.identificacion) {
            where.push('CAST(vw.cedula AS CHAR) LIKE ?');
            params.push(`%${filtros.identificacion}%`);
        }

        if (includeName && filtros.nombreDocente) {
            where.push('LOWER(vw.docente) LIKE ?');
            params.push(`%${filtros.nombreDocente.toLowerCase()}%`);
        }

        return where.join(' AND ');
    }

    async obtenerPeriodosDisponibles(query: Record<string, any>, user: any) {
        const scope = await this.scopeService.getScope(user);
        const filtros = this.parseFiltros(query);
        const params: Array<string | number> = [];
        const whereSql = await this.construirWhereSql(filtros, scope, params);

        const rows = await this.dataSource.query(
            `SELECT DISTINCT vw.periodo_academico
             FROM ${this.vistaReporte} vw
             WHERE ${whereSql}
             ORDER BY vw.periodo_academico DESC`,
            params,
        );

        return this.normalizarFilas(rows)
            .map((row: any) => String(row.periodo_academico || '').trim())
            .filter(Boolean);
    }

    async obtenerFacultadesDisponibles(query: Record<string, any>, user: any) {
        const scope = await this.scopeService.getScope(user);
        const filtros = this.parseFiltros(query);
        const whereFacultad: Record<string, any> = {};

        if (scope.rol === 'ADMIN' && scope.idFacultad) {
            whereFacultad.id_facultad = scope.idFacultad;
        }

        const facultades = await this.facultadRepo.find({
            where: whereFacultad,
            select: { id_facultad: true, nombre: true },
            order: { nombre: 'ASC' },
        });

        if (filtros.periodos.length === 0 && filtros.cortes.length === 0 && filtros.semanas.length === 0 && filtros.docentes.length === 0 && !filtros.identificacion && !filtros.nombreDocente) {
            return facultades.map((item) => ({
                id_facultad: Number(item.id_facultad),
                nombre: String(item.nombre || '').trim(),
            }));
        }

        const params: Array<string | number> = [];
        const whereSql = await this.construirWhereSql(
            { ...filtros, facultades: [] },
            scope,
            params,
            { incluirFacultad: false },
        );

        const rows = await this.dataSource.query(
            `SELECT DISTINCT LOWER(TRIM(vw.facultad)) AS facultad
             FROM ${this.vistaReporte} vw
             WHERE ${whereSql}
               AND vw.facultad IS NOT NULL
               AND TRIM(vw.facultad) <> ''`,
            params,
        );

        const facultadesDisponibles = new Set(
            rows.map((row: any) => String(row.facultad || '').trim().toLowerCase()).filter(Boolean),
        );

        return facultades
            .filter((item) => facultadesDisponibles.has(String(item.nombre || '').trim().toLowerCase()))
            .map((item) => ({
                id_facultad: Number(item.id_facultad),
                nombre: String(item.nombre || '').trim(),
            }));
    }

    async obtenerCortesDisponibles(query: Record<string, any>, user: any) {
        const scope = await this.scopeService.getScope(user);
        const filtros = this.parseFiltros(query);
        const params: Array<string | number> = [];
        const whereSql = await this.construirWhereSql(filtros, scope, params);

        const rows = await this.dataSource.query(
            `SELECT DISTINCT vw.numero_corte, vw.nombre_corte
             FROM ${this.vistaReporte} vw
             WHERE ${whereSql}
             ORDER BY vw.numero_corte ASC`,
            params,
        );

        return rows.map((row: any) => ({
            numero_corte: Number(row.numero_corte || 0),
            nombre_corte: String(row.nombre_corte || `Corte ${row.numero_corte || ''}`).trim(),
        }));
    }

    async obtenerSemanasDisponibles(query: Record<string, any>, user: any) {
        const scope = await this.scopeService.getScope(user);
        const filtros = this.parseFiltros(query);
        const params: Array<string | number> = [];
        const whereSql = await this.construirWhereSql(filtros, scope, params);

        const rows = await this.dataSource.query(
            `SELECT DISTINCT vw.semana
             FROM ${this.vistaReporte} vw
             WHERE ${whereSql}
             ORDER BY vw.semana ASC`,
            params,
        );

        return rows.map((row: any) => Number(row.semana || 0)).filter((n: number) => Number.isFinite(n) && n > 0);
    }

    async obtenerDocentesDisponibles(query: Record<string, any>, user: any) {
        const scope = await this.scopeService.getScope(user);
        const filtros = this.parseFiltros(query);
        const params: Array<string | number> = [];
        const whereSql = await this.construirWhereSql(filtros, scope, params, {
            incluirNombreDocente: false,
            incluirIdentificacion: false,
        });

        const textoBusqueda = String(query.q || '').trim().toLowerCase();
        const identificacionBusqueda = String(query.identificacion || '').trim();

        let sql = `SELECT DISTINCT vw.cedula, vw.docente, vw.programa_adscrito, vw.facultad
                   FROM ${this.vistaReporte} vw
                   WHERE ${whereSql}`;

        if (textoBusqueda) {
            sql += ' AND LOWER(vw.docente) LIKE ?';
            params.push(`%${textoBusqueda}%`);
        }

        if (identificacionBusqueda) {
            sql += ' AND CAST(vw.cedula AS CHAR) LIKE ?';
            params.push(`%${identificacionBusqueda}%`);
        }

        sql += ' ORDER BY vw.docente ASC LIMIT 200';

        const rows = await this.dataSource.query(sql, params);
        return rows.map((row: any) => ({
            cedula: String(row.cedula || '').trim(),
            docente: String(row.docente || '').trim(),
            programa_adscrito: String(row.programa_adscrito || '').trim(),
            facultad: String(row.facultad || '').trim(),
        }));
    }

    async obtenerFiltrosEjecutivo(query: Record<string, any>, user: any) {
        const [facultades, periodos, cortes, semanas, docentes] = await Promise.all([
            this.obtenerFacultadesDisponibles(query, user),
            this.obtenerPeriodosDisponibles(query, user),
            this.obtenerCortesDisponibles(query, user),
            this.obtenerSemanasDisponibles(query, user),
            this.obtenerDocentesDisponibles(query, user),
        ]);

        return {
            facultades,
            periodos,
            cortes,
            semanas,
            docentes,
        };
    }

    private parseOrdenEjecutivo(query: Record<string, any>): OrdenReporte {
        const sortByRaw = String(query.sortBy || 'docente').trim();
        const sortDirRaw = String(query.sortDir || 'ASC').toUpperCase();

        const sortMap: Record<string, string> = {
            periodo: 'periodo_academico',
            facultad: 'facultad',
            docente: 'docente',
            tipo_actividad: 'tipo_actividad',
            clase_actividad: 'clase_actividad',
            avance_corte1: 'avance_corte1',
            avance_corte2: 'avance_corte2',
            avance_corte3: 'avance_corte3',
            avance_semestre: 'avance_semestre',
        };

        const sortBy = sortMap[sortByRaw] ? sortByRaw : 'docente';
        const sortDir: 'ASC' | 'DESC' = sortDirRaw === 'DESC' ? 'DESC' : 'ASC';
        return { sortBy, sortDir };
    }

    private buildWhereEjecutivo(
        filtros: FiltrosReporte,
        scope: UserScope,
        params: Array<string | number>,
    ): string {
        const where: string[] = ['1=1'];

        if (scope.rol === 'DOCENTE') {
            where.push('ad.id_docente = ?');
            params.push(scope.idDocente);
        }

        if (scope.rol === 'ADMIN' && scope.idFacultad) {
            where.push('pr.id_facultad = ?');
            params.push(scope.idFacultad);
        }

        if (filtros.facultades.length > 0) {
            const facultades = Array.from(new Set(filtros.facultades)).filter((id) => Number.isFinite(id) && id > 0);
            if (facultades.length > 0) {
                where.push(`pr.id_facultad IN ${this.buildInClause(facultades, params)}`);
            }
        }

        if (filtros.periodos.length > 0) {
            where.push(`CONCAT(p.anio, '-', p.periodo) IN ${this.buildInClause(filtros.periodos, params)}`);
        }

        if (filtros.cortes.length > 0) {
            where.push(`ca.numero_corte IN ${this.buildInClause(filtros.cortes, params)}`);
        }

        if (filtros.docentes.length > 0) {
            where.push(`CAST(d.identificacion AS CHAR) IN ${this.buildInClause(filtros.docentes, params)}`);
        }

        if (filtros.identificacion) {
            where.push('CAST(d.identificacion AS CHAR) LIKE ?');
            params.push(`%${filtros.identificacion}%`);
        }

        if (filtros.nombreDocente) {
            where.push("LOWER(CONCAT_WS(' ', d.nombres, d.apellidos)) LIKE ?");
            params.push(`%${filtros.nombreDocente.toLowerCase()}%`);
        }

        return where.join(' AND ');
    }

    private buildSegSemanasClause(filtros: FiltrosReporte, params: Array<string | number>): string {
        const where: string[] = ['1=1'];
        if (filtros.semanas.length > 0) {
            where.push(`ss.semana IN ${this.buildInClause(filtros.semanas, params)}`);
        }
        return where.join(' AND ');
    }

    private calcularPorcentaje(avance: number, total: number): number {
        if (!Number.isFinite(total) || total <= 0) return 0;
        if (!Number.isFinite(avance) || avance <= 0) return 0;
        return Number(((avance / total) * 100).toFixed(2));
    }

    private mapearFilaEjecutiva(row: any) {
        const planCorte1 = Number(row.plan_corte1 || 0);
        const planCorte2 = Number(row.plan_corte2 || 0);
        const planCorte3 = Number(row.plan_corte3 || 0);
        const planSemestre = Number(row.plan_semestre || 0);

        const ejecCorte1 = Number(row.ejec_corte1 || 0);
        const ejecCorte2 = Number(row.ejec_corte2 || 0);
        const ejecCorte3 = Number(row.ejec_corte3 || 0);
        const ejecSemestre = Number(row.ejec_semestre || 0);

        return {
            periodo: String(row.periodo || '').trim(),
            facultad: String(row.facultad || '').trim(),
            docente: String(row.docente || '').trim(),
            identificacion: String(row.identificacion || '').trim(),
            tipo_actividad: String(row.tipo_actividad || '').trim(),
            clase_actividad: String(row.clase_actividad || '').trim(),
            avance_corte1: this.calcularPorcentaje(ejecCorte1, planCorte1),
            avance_corte2: this.calcularPorcentaje(ejecCorte2, planCorte2),
            avance_corte3: this.calcularPorcentaje(ejecCorte3, planCorte3),
            avance_semestre: this.calcularPorcentaje(ejecSemestre, planSemestre),
        };
    }

    private buildSortColumnEjecutivo(sortBy: string): string {
        const sortMap: Record<string, string> = {
            periodo: 'periodo',
            facultad: 'facultad',
            docente: 'docente',
            tipo_actividad: 'tipo_actividad',
            clase_actividad: 'clase_actividad',
            avance_corte1: 'avance_corte1',
            avance_corte2: 'avance_corte2',
            avance_corte3: 'avance_corte3',
            avance_semestre: 'avance_semestre',
        };

        return sortMap[sortBy] || 'docente';
    }

    private construirSqlBaseEjecutivo(
        filtros: FiltrosReporte,
        scope: UserScope,
    ): { whereSql: string; segWhereSql: string; whereParams: Array<string | number>; segParams: Array<string | number> } {
        const whereParams: Array<string | number> = [];
        const segParams: Array<string | number> = [];

        const whereSql = this.buildWhereEjecutivo(filtros, scope, whereParams);
        const segWhereSql = this.buildSegSemanasClause(filtros, segParams);

        return { whereSql, segWhereSql, whereParams, segParams };
    }

    async consultarReporteEjecutivo(query: Record<string, any>, user: any) {
        const scope = await this.scopeService.getScope(user);
        const filtros = this.parseFiltros(query);
        const paginacion = this.parsePaginacion(query);
        const orden = this.parseOrdenEjecutivo(query);
        const { whereSql, segWhereSql, whereParams, segParams } = this.construirSqlBaseEjecutivo(filtros, scope);

        const fromSql = `
            FROM actividad a
            INNER JOIN agenda_docente ad ON ad.id_agenda = a.id_agenda
            INNER JOIN periodo_academico p ON p.id_periodo = ad.id_periodo
            INNER JOIN docente d ON d.id_docente = ad.id_docente
            INNER JOIN programa pr ON pr.id_programa = d.id_programa
            INNER JOIN facultad f ON f.id_facultad = pr.id_facultad
            INNER JOIN tipo_actividad ta ON ta.id_tipo = a.id_tipo
            INNER JOIN plan_corte_actividad pca ON pca.id_actividad = a.id_actividad
            INNER JOIN corte_academico ca ON ca.id_corte = pca.id_corte
            LEFT JOIN (
                SELECT ss.id_actividad, ss.id_corte, SUM(ss.horas_ejecutadas) AS horas_ejecutadas
                FROM seguimiento_semanal ss
                WHERE ${segWhereSql}
                GROUP BY ss.id_actividad, ss.id_corte
            ) seg ON seg.id_actividad = a.id_actividad AND seg.id_corte = pca.id_corte
            WHERE ${whereSql}
        `;

        const groupBySql = `
            GROUP BY
                CONCAT(p.anio, '-', p.periodo),
                f.nombre,
                d.identificacion,
                CONCAT_WS(' ', d.nombres, d.apellidos),
                ta.nombre,
                a.nombre
        `;

        const baseSelectSql = `
            SELECT
                CONCAT(p.anio, '-', p.periodo) AS periodo,
                f.nombre AS facultad,
                CAST(d.identificacion AS CHAR) AS identificacion,
                CONCAT_WS(' ', d.nombres, d.apellidos) AS docente,
                ta.nombre AS tipo_actividad,
                a.nombre AS clase_actividad,
                SUM(CASE WHEN ca.numero_corte = 1 THEN pca.horas_planeadas ELSE 0 END) AS plan_corte1,
                SUM(CASE WHEN ca.numero_corte = 2 THEN pca.horas_planeadas ELSE 0 END) AS plan_corte2,
                SUM(CASE WHEN ca.numero_corte = 3 THEN pca.horas_planeadas ELSE 0 END) AS plan_corte3,
                SUM(pca.horas_planeadas) AS plan_semestre,
                SUM(CASE WHEN ca.numero_corte = 1 THEN COALESCE(seg.horas_ejecutadas, 0) ELSE 0 END) AS ejec_corte1,
                SUM(CASE WHEN ca.numero_corte = 2 THEN COALESCE(seg.horas_ejecutadas, 0) ELSE 0 END) AS ejec_corte2,
                SUM(CASE WHEN ca.numero_corte = 3 THEN COALESCE(seg.horas_ejecutadas, 0) ELSE 0 END) AS ejec_corte3,
                SUM(COALESCE(seg.horas_ejecutadas, 0)) AS ejec_semestre
            ${fromSql}
            ${groupBySql}
        `;

        const countSql = `SELECT COUNT(1) AS total FROM (${baseSelectSql}) reporte`;
        const countRows = await this.dataSource.query(countSql, [...segParams, ...whereParams]);
        const total = Number(countRows?.[0]?.total || 0);

        const offset = (paginacion.page - 1) * paginacion.pageSize;
        const sortColumn = this.buildSortColumnEjecutivo(orden.sortBy);
        const dataSql = `
            SELECT *
            FROM (${baseSelectSql}) reporte
            ORDER BY ${sortColumn} ${orden.sortDir}
            LIMIT ? OFFSET ?
        `;

        const rows = await this.dataSource.query(dataSql, [...segParams, ...whereParams, paginacion.pageSize, offset]);
        const data = rows.map((row: any) => this.mapearFilaEjecutiva(row));

        return {
            data,
            meta: {
                total,
                page: paginacion.page,
                pageSize: paginacion.pageSize,
                totalPages: Math.max(1, Math.ceil(total / paginacion.pageSize)),
                sortBy: orden.sortBy,
                sortDir: orden.sortDir,
            },
        };
    }

    async generarExcelEjecutivo(query: Record<string, any>, user: any): Promise<Buffer> {
        const scope = await this.scopeService.getScope(user);
        const filtros = this.parseFiltros(query);
        const orden = this.parseOrdenEjecutivo(query);
        const { whereSql, segWhereSql, whereParams, segParams } = this.construirSqlBaseEjecutivo(filtros, scope);
        const sortColumn = this.buildSortColumnEjecutivo(orden.sortBy);

        const sql = `
            SELECT *
            FROM (
                SELECT
                    CONCAT(p.anio, '-', p.periodo) AS periodo,
                    f.nombre AS facultad,
                    CAST(d.identificacion AS CHAR) AS identificacion,
                    CONCAT_WS(' ', d.nombres, d.apellidos) AS docente,
                    ta.nombre AS tipo_actividad,
                    a.nombre AS clase_actividad,
                    SUM(CASE WHEN ca.numero_corte = 1 THEN pca.horas_planeadas ELSE 0 END) AS plan_corte1,
                    SUM(CASE WHEN ca.numero_corte = 2 THEN pca.horas_planeadas ELSE 0 END) AS plan_corte2,
                    SUM(CASE WHEN ca.numero_corte = 3 THEN pca.horas_planeadas ELSE 0 END) AS plan_corte3,
                    SUM(pca.horas_planeadas) AS plan_semestre,
                    SUM(CASE WHEN ca.numero_corte = 1 THEN COALESCE(seg.horas_ejecutadas, 0) ELSE 0 END) AS ejec_corte1,
                    SUM(CASE WHEN ca.numero_corte = 2 THEN COALESCE(seg.horas_ejecutadas, 0) ELSE 0 END) AS ejec_corte2,
                    SUM(CASE WHEN ca.numero_corte = 3 THEN COALESCE(seg.horas_ejecutadas, 0) ELSE 0 END) AS ejec_corte3,
                    SUM(COALESCE(seg.horas_ejecutadas, 0)) AS ejec_semestre
                FROM actividad a
                INNER JOIN agenda_docente ad ON ad.id_agenda = a.id_agenda
                INNER JOIN periodo_academico p ON p.id_periodo = ad.id_periodo
                INNER JOIN docente d ON d.id_docente = ad.id_docente
                INNER JOIN programa pr ON pr.id_programa = d.id_programa
                INNER JOIN facultad f ON f.id_facultad = pr.id_facultad
                INNER JOIN tipo_actividad ta ON ta.id_tipo = a.id_tipo
                INNER JOIN plan_corte_actividad pca ON pca.id_actividad = a.id_actividad
                INNER JOIN corte_academico ca ON ca.id_corte = pca.id_corte
                LEFT JOIN (
                    SELECT ss.id_actividad, ss.id_corte, SUM(ss.horas_ejecutadas) AS horas_ejecutadas
                    FROM seguimiento_semanal ss
                    WHERE ${segWhereSql}
                    GROUP BY ss.id_actividad, ss.id_corte
                ) seg ON seg.id_actividad = a.id_actividad AND seg.id_corte = pca.id_corte
                WHERE ${whereSql}
                GROUP BY
                    CONCAT(p.anio, '-', p.periodo),
                    f.nombre,
                    d.identificacion,
                    CONCAT_WS(' ', d.nombres, d.apellidos),
                    ta.nombre,
                    a.nombre
            ) reporte
            ORDER BY ${sortColumn} ${orden.sortDir}
        `;

        const rows = await this.dataSource.query(sql, [...segParams, ...whereParams]);
        const data = rows.map((row: any) => this.mapearFilaEjecutiva(row));

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Informe Ejecutivo');

        sheet.columns = [
            { header: 'Periodo', key: 'periodo', width: 16 },
            { header: 'Facultad', key: 'facultad', width: 34 },
            { header: 'Docente', key: 'docente', width: 32 },
            { header: 'Tipo Actividad', key: 'tipo_actividad', width: 28 },
            { header: 'Clase Actividad', key: 'clase_actividad', width: 34 },
            { header: 'Avance corte1', key: 'avance_corte1', width: 16 },
            { header: 'Avance corte2', key: 'avance_corte2', width: 16 },
            { header: 'Avance corte3', key: 'avance_corte3', width: 16 },
            { header: 'Avance semestre', key: 'avance_semestre', width: 18 },
        ];

        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1F9D78' },
        };

        data.forEach((row: any) => {
            sheet.addRow({
                periodo: row.periodo,
                facultad: row.facultad,
                docente: row.docente,
                tipo_actividad: row.tipo_actividad,
                clase_actividad: row.clase_actividad,
                avance_corte1: `${row.avance_corte1}%`,
                avance_corte2: `${row.avance_corte2}%`,
                avance_corte3: `${row.avance_corte3}%`,
                avance_semestre: `${row.avance_semestre}%`,
            });
        });

        return Buffer.from(await workbook.xlsx.writeBuffer());
    }

    private getSortColumn(sortBy: string): string {
        const sortMap: Record<string, string> = {
            periodo_academico: 'vw.periodo_academico',
            numero_corte: 'vw.numero_corte',
            nombre_corte: 'vw.nombre_corte',
            semana: 'vw.semana',
            cedula: 'vw.cedula',
            docente: 'vw.docente',
            programa_adscrito: 'vw.programa_adscrito',
            facultad: 'vw.facultad',
            tipo_actividad: 'vw.tipo_actividad',
            actividad: 'vw.actividad',
            horas_semanales: 'vw.horas_semanales',
            horas_planeadas: 'vw.horas_planeadas',
            horas_ejecutadas: 'vw.horas_ejecutadas',
            avance_semanal_actividad: 'vw.avance_semanal_actividad',
            avance_vs_corte: 'vw.avance_vs_corte',
            estado_avance: 'vw.estado_avance',
            fecha_registro: 'vw.fecha_registro',
        };

        return sortMap[sortBy] || sortMap.fecha_registro;
    }

    async consultarReporte(query: Record<string, any>, user: any) {
        const scope = await this.scopeService.getScope(user);
        const filtros = this.parseFiltros(query);
        const paginacion = this.parsePaginacion(query);
        const orden = this.parseOrden(query);
        const params: Array<string | number> = [];
        const whereSql = await this.construirWhereSql(filtros, scope, params);

        const totalRows = await this.dataSource.query(
            `SELECT COUNT(1) AS total
             FROM ${this.vistaReporte} vw
             WHERE ${whereSql}`,
            params,
        );

        const total = Number(totalRows?.[0]?.total || 0);
        const offset = (paginacion.page - 1) * paginacion.pageSize;
        const sortColumn = this.getSortColumn(orden.sortBy);

        const dataParams = [...params, paginacion.pageSize, offset];
        const rows = await this.dataSource.query(
            `SELECT vw.*
             FROM ${this.vistaReporte} vw
             WHERE ${whereSql}
             ORDER BY ${sortColumn} ${orden.sortDir}
             LIMIT ? OFFSET ?`,
            dataParams,
        );

        return {
            data: this.normalizarFilas(rows),
            meta: {
                total,
                page: paginacion.page,
                pageSize: paginacion.pageSize,
                totalPages: Math.max(1, Math.ceil(total / paginacion.pageSize)),
                sortBy: orden.sortBy,
                sortDir: orden.sortDir,
            },
        };
    }

    async generarExcel(query: Record<string, any>, user: any): Promise<Buffer> {
        const scope = await this.scopeService.getScope(user);
        const filtros = this.parseFiltros(query);
        const orden = this.parseOrden(query);
        const params: Array<string | number> = [];
        const whereSql = await this.construirWhereSql(filtros, scope, params);
        const sortColumn = this.getSortColumn(orden.sortBy);

        const rows = await this.dataSource.query(
            `SELECT vw.*
             FROM ${this.vistaReporte} vw
             WHERE ${whereSql}
             ORDER BY ${sortColumn} ${orden.sortDir}`,
            params,
        );

        const data = this.normalizarFilas(rows);
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Reporte Seguimiento');

        sheet.columns = [
            { header: 'Periodo academico', key: 'periodo_academico', width: 18 },
            { header: 'Numero corte', key: 'numero_corte', width: 14 },
            { header: 'Nombre corte', key: 'nombre_corte', width: 20 },
            { header: 'Semana', key: 'semana', width: 12 },
            { header: 'Cedula', key: 'cedula', width: 16 },
            { header: 'Docente', key: 'docente', width: 32 },
            { header: 'Programa adscrito', key: 'programa_adscrito', width: 26 },
            { header: 'Facultad', key: 'facultad', width: 22 },
            { header: 'Tipo actividad', key: 'tipo_actividad', width: 24 },
            { header: 'Actividad', key: 'actividad', width: 34 },
            { header: 'Horas semanales', key: 'horas_semanales', width: 16 },
            { header: 'Horas planeadas', key: 'horas_planeadas', width: 16 },
            { header: 'Horas ejecutadas', key: 'horas_ejecutadas', width: 16 },
            { header: 'Avance semanal actividad', key: 'avance_semanal_actividad', width: 22 },
            { header: 'Avance vs corte', key: 'avance_vs_corte', width: 16 },
            { header: 'Estado avance', key: 'estado_avance', width: 16 },
            { header: 'Observaciones', key: 'observaciones', width: 38 },
            { header: 'Fecha registro', key: 'fecha_registro', width: 20 },
        ];

        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1F9D78' },
        };

        data.forEach((row) => {
            sheet.addRow({
                periodo_academico: row.periodo_academico,
                numero_corte: row.numero_corte,
                nombre_corte: row.nombre_corte,
                semana: row.semana,
                cedula: row.cedula,
                docente: row.docente,
                programa_adscrito: row.programa_adscrito,
                facultad: row.facultad,
                tipo_actividad: row.tipo_actividad,
                actividad: row.actividad,
                horas_semanales: row.horas_semanales,
                horas_planeadas: row.horas_planeadas,
                horas_ejecutadas: row.horas_ejecutadas,
                avance_semanal_actividad: row.avance_semanal_actividad,
                avance_vs_corte: row.avance_vs_corte,
                estado_avance: row.estado_avance,
                observaciones: row.observaciones,
                fecha_registro: row.fecha_registro,
            });
        });

        return Buffer.from(await workbook.xlsx.writeBuffer());
    }
}
