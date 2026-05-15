import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import {
    AlertTriangle,
    BarChart3,
    Check,
    CheckCircle2,
    Clock3,
    Download,
    Eye,
    ExternalLink,
    FileText,
    Info,
    RefreshCw,
    Send,
    X,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const ROWS_PER_PAGE = 5;

const fmt = (valor) => {
    const n = Number(valor || 0);
    if (!Number.isFinite(n)) return '0.00';
    return n.toFixed(2);
};

const normalizarPorcentaje = (valor) => {
    const n = Number(valor || 0);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
};

const fmtPct = (valor) => {
    return String(Math.round(normalizarPorcentaje(valor)));
};

const colorNivel = (pct) => {
    const valor = normalizarPorcentaje(pct);
    if (valor >= 80) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (valor >= 50) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-red-100 text-red-800 border-red-200';
};

const colorBarraAvance = (pct) => {
    const valor = normalizarPorcentaje(pct);
    if (valor >= 80) return 'bg-emerald-500';
    if (valor >= 50) return 'bg-amber-500';
    return 'bg-red-500';
};

const ordenarDocentesPorCumplimiento = (filas) => {
    return [...(filas || [])].sort((a, b) => {
        const avanceA = normalizarPorcentaje(a?.porcentaje_avance || 0);
        const avanceB = normalizarPorcentaje(b?.porcentaje_avance || 0);
        if (avanceB !== avanceA) return avanceB - avanceA;

        const ejecutadasA = Number(a?.horas_ejecutadas || 0);
        const ejecutadasB = Number(b?.horas_ejecutadas || 0);
        if (ejecutadasB !== ejecutadasA) return ejecutadasB - ejecutadasA;

        return String(a?.docente || '').localeCompare(String(b?.docente || ''), 'es');
    });
};

const ProgressCircle = ({ porcentaje }) => {
    const safe = Math.max(0, Math.min(100, Number(porcentaje || 0)));
    return (
        <div
            className="relative w-24 h-24 rounded-full grid place-items-center"
            style={{
                background: `conic-gradient(#006431 ${safe}%, #d9e2dc ${safe}% 100%)`,
            }}
        >
            <div className="w-16 h-16 rounded-full bg-white grid place-items-center border border-slate-200">
                <span className="text-sm font-black text-slate-900">{fmtPct(safe)}%</span>
            </div>
        </div>
    );
};

const KpiCard = ({ title, value, icon: Icon, unit = 'h', tone }) => {
    const toneClass = {
        planeadas: 'from-sky-50 to-sky-100 border-sky-200 text-sky-900',
        ejecutadas: 'from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-900',
        pendientes: 'from-orange-50 to-red-100 border-orange-200 text-orange-900',
    };

    return (
        <article className={`rounded-3xl border p-5 bg-gradient-to-br shadow-sm ${toneClass[tone] || 'from-white to-slate-50 border-slate-200 text-slate-900'}`}>
            <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] opacity-80">{title}</p>
                <div className="w-10 h-10 rounded-2xl bg-white/70 border border-white/70 grid place-items-center">
                    <Icon size={18} />
                </div>
            </div>
            <p className="text-3xl font-black tracking-tight">
                {fmt(value)}
                <span className="ml-1 text-sm font-bold opacity-80">{unit}</span>
            </p>
        </article>
    );
};

const Supervision = () => {
    const { usuario, periodoSeleccionado } = useAuth();

    const [dashboard, setDashboard] = useState(null);
    const [tabActiva, setTabActiva] = useState('corte1');
    const [paginasPorTab, setPaginasPorTab] = useState({
        corte1: 1,
        corte2: 1,
        corte3: 1,
        avance_general: 1,
    });
    const [cargando, setCargando] = useState(true);
    const [guardandoObservacion, setGuardandoObservacion] = useState(false);
    const [aprobando, setAprobando] = useState(false);

    const [modalEvidencias, setModalEvidencias] = useState({ open: false, docente: null, corte: null, data: null, loading: false });
    const [modalObservacion, setModalObservacion] = useState({ open: false, docente: null, corte: null, texto: '' });
    const [modalVisorArchivo, setModalVisorArchivo] = useState({
        open: false,
        url: '',
        nombre: '',
        descripcion: '',
    });

    const rol = String(usuario?.rol || '').toUpperCase();

    const cargarDashboard = useCallback(async () => {
        if (!periodoSeleccionado?.id_periodo) {
            setCargando(false);
            return;
        }

        setCargando(true);
        try {
            const { data } = await api.get(`/supervision/dashboard?id_periodo=${periodoSeleccionado.id_periodo}`);
            setDashboard(data || null);
        } catch (error) {
            toast.error(error?.response?.data?.message || 'No se pudo cargar el dashboard de supervisión');
            setDashboard(null);
        } finally {
            setCargando(false);
        }
    }, [periodoSeleccionado]);

    useEffect(() => {
        cargarDashboard();
    }, [cargarDashboard]);

    const cortesTabs = useMemo(() => ([
        { key: 'corte1', label: 'Corte 1', numeroCorte: 1 },
        { key: 'corte2', label: 'Corte 2', numeroCorte: 2 },
        { key: 'corte3', label: 'Corte 3', numeroCorte: 3 },
        { key: 'avance_general', label: 'Avance general', numeroCorte: null },
    ]), []);

    const corteActual = useMemo(() => {
        const tab = cortesTabs.find((item) => item.key === tabActiva) || cortesTabs[0];

        const filasBase = Array.isArray(dashboard?.cortes?.[tab.key])
            ? dashboard.cortes[tab.key]
            : (tab.key === 'avance_general' && Array.isArray(dashboard?.cortes?.general))
                ? dashboard.cortes.general
            : [];

        const filas = ordenarDocentesPorCumplimiento(
            filasBase.map((fila) => {
                const planeadas = Number(fila?.horas_planeadas || 0);
                const ejecutadas = Number(fila?.horas_ejecutadas || 0);
                const pendientes = Math.max(0, planeadas - ejecutadas);
                const porcentaje = planeadas > 0 ? (ejecutadas / planeadas) * 100 : 0;
                return {
                    ...fila,
                    horas_planeadas: planeadas,
                    horas_ejecutadas: ejecutadas,
                    horas_pendientes: pendientes,
                    porcentaje_avance: normalizarPorcentaje(porcentaje),
                };
            }),
        );

        return {
            ...tab,
            filas,
        };
    }, [cortesTabs, tabActiva, dashboard]);

    const resumenCorteActual = useMemo(() => {
        const filas = corteActual?.filas || [];
        const totalPlaneadas = filas.reduce((acc, fila) => acc + Number(fila?.horas_planeadas || 0), 0);
        const totalEjecutadas = filas.reduce((acc, fila) => acc + Number(fila?.horas_ejecutadas || 0), 0);
        const totalPendientes = Math.max(0, totalPlaneadas - totalEjecutadas);
        const porcentaje = totalPlaneadas > 0 ? (totalEjecutadas / totalPlaneadas) * 100 : 0;

        return {
            total_planeadas: Number(totalPlaneadas.toFixed(2)),
            total_ejecutadas: Number(totalEjecutadas.toFixed(2)),
            total_pendientes: Number(totalPendientes.toFixed(2)),
            porcentaje_avance: normalizarPorcentaje(porcentaje),
        };
    }, [corteActual]);

    const tituloCorteActual = useMemo(() => {
        const esAvanceGeneral = corteActual?.key === 'avance_general';
        const base = esAvanceGeneral ? 'Avance General' : (corteActual?.label || 'Corte');
        return `${base} - Avance ${fmtPct(resumenCorteActual?.porcentaje_avance || 0)}%`;
    }, [corteActual, resumenCorteActual]);

    const totalPaginas = useMemo(() => {
        const total = Math.ceil((corteActual?.filas?.length || 0) / ROWS_PER_PAGE);
        return Math.max(1, total);
    }, [corteActual]);

    const paginaActiva = Number(paginasPorTab[tabActiva] || 1);

    useEffect(() => {
        setPaginasPorTab((prev) => {
            const actual = Number(prev[tabActiva] || 1);
            const normalizada = Math.min(Math.max(1, actual), totalPaginas);
            if (normalizada === actual) return prev;
            return { ...prev, [tabActiva]: normalizada };
        });
    }, [tabActiva, totalPaginas]);

    const filasPaginadas = useMemo(() => {
        const inicio = (paginaActiva - 1) * ROWS_PER_PAGE;
        return (corteActual?.filas || []).slice(inicio, inicio + ROWS_PER_PAGE);
    }, [corteActual, paginaActiva]);

    const dataResumen = dashboard?.resumen || { planeadas: 0, ejecutadas: 0, pendientes: 0, porcentaje: 0 };
    const ratioPlaneadoVsEjecutado = Math.max(0, Math.min(100, Number(dataResumen?.porcentaje || 0)));
    const nombreFacultad = String(dashboard?.facultad?.nombre_facultad || '').trim();
    const facultadLabel = nombreFacultad || 'No se encontró facultad asociada al decano actual';

    const resolverCorteAccion = (fila) => {
        if (corteActual?.numeroCorte) return corteActual.numeroCorte;
        const corteFila = Number(fila?.id_corte_accion || 0);
        if (corteFila >= 1 && corteFila <= 3) return corteFila;
        return 3;
    };

    const abrirEvidencias = async (fila) => {
        const corteAccion = resolverCorteAccion(fila);
        setModalEvidencias({ open: true, docente: fila, corte: corteAccion, data: null, loading: true });
        try {
            const { data } = await api.get(
                `/supervision/evidencias?id_periodo=${periodoSeleccionado.id_periodo}&id_corte=${corteAccion}&id_docente=${fila.id_docente}`,
            );
            setModalEvidencias((prev) => ({ ...prev, data: data || null, loading: false }));
        } catch (error) {
            toast.error(error?.response?.data?.message || 'No fue posible cargar evidencias');
            setModalEvidencias((prev) => ({ ...prev, data: { seguimientos: [] }, loading: false }));
        }
    };

    const cerrarModalEvidencias = () => {
        setModalEvidencias({ open: false, docente: null, corte: null, data: null, loading: false });
        setModalVisorArchivo({ open: false, url: '', nombre: '', descripcion: '' });
    };

    const abrirVisorArchivo = (evidencia) => {
        setModalVisorArchivo({
            open: true,
            url: String(evidencia?.ruta_archivo || ''),
            nombre: String(evidencia?.nombre_archivo || 'Archivo adjunto'),
            descripcion: String(evidencia?.descripcion || ''),
        });
    };

    const cerrarVisorArchivo = () => {
        setModalVisorArchivo({ open: false, url: '', nombre: '', descripcion: '' });
    };

    const aprobarInforme = async (fila) => {
        const corteAccion = resolverCorteAccion(fila);
        try {
            setAprobando(true);
            await api.patch('/supervision/aprobar-informe', {
                id_periodo: periodoSeleccionado.id_periodo,
                id_corte: corteAccion,
                id_docente: fila.id_docente,
            });
            toast.success(`Informe aprobado para ${fila.docente}`);
            await cargarDashboard();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'No se pudo aprobar el informe');
        } finally {
            setAprobando(false);
        }
    };

    const abrirObservaciones = (fila) => {
        setModalObservacion({ open: true, docente: fila, corte: resolverCorteAccion(fila), texto: '' });
    };

    const guardarObservaciones = async () => {
        const texto = String(modalObservacion?.texto || '').trim();
        if (!texto) {
            toast.info('Debes escribir una observación antes de guardar.');
            return;
        }
        try {
            setGuardandoObservacion(true);
            await api.patch('/supervision/observaciones', {
                id_periodo: periodoSeleccionado.id_periodo,
                id_corte: modalObservacion.corte,
                id_docente: modalObservacion.docente?.id_docente,
                observaciones: texto,
            });
            toast.success('Observaciones guardadas correctamente');
            setModalObservacion({ open: false, docente: null, corte: null, texto: '' });
        } catch (error) {
            toast.error(error?.response?.data?.message || 'No se pudieron guardar las observaciones');
        } finally {
            setGuardandoObservacion(false);
        }
    };

    if (!periodoSeleccionado) {
        return (
            <Layout>
                <section className="max-w-3xl mx-auto rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <Info size={38} className="mx-auto text-slate-300 mb-3" />
                    <h1 className="text-2xl font-black text-slate-800 mb-2">Sin periodo seleccionado</h1>
                    <p className="text-slate-500">Selecciona un periodo académico para habilitar el módulo de supervisión.</p>
                </section>
            </Layout>
        );
    }

    if (rol !== 'DECANO' && rol !== 'ADMIN') {
        return (
            <Layout>
                <section className="max-w-3xl mx-auto rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <AlertTriangle size={38} className="mx-auto text-slate-300 mb-3" />
                    <h1 className="text-2xl font-black text-slate-800 mb-2">Acceso restringido</h1>
                    <p className="text-slate-500">Este módulo está disponible para rol DECANO (y ADMIN para soporte).</p>
                </section>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-7xl mx-auto space-y-6">
                <header className="rounded-3xl border border-[#d3e3d9] bg-gradient-to-r from-[#f6fbf8] to-white p-6 shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#006431]">Módulo Supervisión BI</p>
                            <h1 className="text-3xl font-black text-[#0f2923] tracking-tight">Visión Macro del Semestre</h1>
                            <p className="text-sm text-slate-600 font-medium mt-1">
                                Facultad: <span className="font-black text-[#0f2923]">{facultadLabel}</span>
                                {' · '}
                                Periodo {periodoSeleccionado?.anio}-{periodoSeleccionado?.periodo}
                            </p>
                        </div>
                        <button
                            onClick={cargarDashboard}
                            className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-2xl border border-[#9fc9b1] bg-white text-[#1c4f3f] font-black text-xs uppercase tracking-wider hover:bg-[#eef7f1] transition-colors"
                        >
                            <RefreshCw size={16} />
                            Actualizar
                        </button>
                    </div>
                </header>

                {cargando ? (
                    <section className="rounded-3xl border border-slate-200 bg-white p-14 shadow-sm flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-institutional-green border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-slate-500 font-semibold">Cargando analítica de supervisión...</p>
                    </section>
                ) : (
                    <>
                        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            <KpiCard title="Planeadas semestre" value={dataResumen?.planeadas} icon={Clock3} tone="planeadas" />
                            <KpiCard title="Ejecutadas semestre" value={dataResumen?.ejecutadas} icon={CheckCircle2} tone="ejecutadas" />
                            <KpiCard title="Pendientes semestre" value={dataResumen?.pendientes} icon={AlertTriangle} tone="pendientes" />
                            <article className="rounded-3xl border border-[#d6e5db] bg-white p-5 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Avance general</p>
                                    <BarChart3 size={18} className="text-[#1f9d78]" />
                                </div>
                                <div className="flex items-center gap-4">
                                    <ProgressCircle porcentaje={dataResumen?.porcentaje || 0} />
                                    <div>
                                        <p className={`inline-flex px-2 py-1 rounded-full text-[10px] border font-black uppercase tracking-widest ${colorNivel(dataResumen?.porcentaje || 0)}`}>
                                            {normalizarPorcentaje(dataResumen?.porcentaje || 0) >= 80 ? 'Verde' : normalizarPorcentaje(dataResumen?.porcentaje || 0) >= 50 ? 'Amarillo' : 'Rojo'}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-2">Cumplimiento acumulado de la facultad</p>
                                    </div>
                                </div>
                            </article>
                        </section>

                        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between gap-4 mb-3">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1f9d78]">Comparativo global</p>
                                    <h2 className="text-lg font-black text-slate-900">Planeadas vs ejecutadas</h2>
                                </div>
                                <p className="text-xs text-slate-500 font-semibold">Referencia: total semestre facultad</p>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between text-xs font-black text-slate-600 mb-1"><span>Horas planeadas</span><span>{fmt(dataResumen?.planeadas)} h</span></div>
                                    <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-sky-500 to-sky-400" style={{ width: '100%' }} />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs font-black text-slate-600 mb-1"><span>Horas ejecutadas</span><span>{fmt(dataResumen?.ejecutadas)} h</span></div>
                                    <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400" style={{ width: `${ratioPlaneadoVsEjecutado}%` }} />
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1f9d78]">Por cortes</p>
                                    <h2 className="text-xl font-black text-slate-900">Cumplimiento por docente</h2>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {cortesTabs.map((tab) => (
                                        <button
                                            key={tab.key}
                                            type="button"
                                            onClick={() => setTabActiva(tab.key)}
                                            className={`h-10 px-4 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${tab.key === tabActiva
                                                ? 'bg-institutional-green text-white border-institutional-green shadow-sm'
                                                : 'bg-white text-slate-700 border-slate-200 hover:border-institutional-green/40 hover:text-institutional-green'
                                                }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                    <h3 className="text-base font-black text-slate-900">{tituloCorteActual}</h3>
                                    <span className={`px-2.5 py-1 rounded-full border text-[10px] uppercase font-black tracking-widest ${colorNivel(resumenCorteActual?.porcentaje_avance || 0)}`}>
                                        {normalizarPorcentaje(resumenCorteActual?.porcentaje_avance || 0) >= 80
                                            ? 'VERDE'
                                            : normalizarPorcentaje(resumenCorteActual?.porcentaje_avance || 0) >= 50
                                                ? 'AMARILLO'
                                                : 'ROJO'}
                                    </span>
                                </div>
                                <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
                                    <div
                                        className={`h-full transition-all ${colorBarraAvance(resumenCorteActual?.porcentaje_avance || 0)}`}
                                        style={{ width: `${Math.round(normalizarPorcentaje(resumenCorteActual?.porcentaje_avance || 0))}%` }}
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-[980px] w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 border-y border-slate-200">
                                            <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-600">Docente</th>
                                            <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-600">{corteActual.key === 'avance_general' ? 'Planeadas semestre' : 'Planeadas'}</th>
                                            <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-600">{corteActual.key === 'avance_general' ? 'Ejecutadas semestre' : 'Ejecutadas'}</th>
                                            <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-600">{corteActual.key === 'avance_general' ? 'Pendientes semestre' : 'Pendientes'}</th>
                                            <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-600">{corteActual.key === 'avance_general' ? '% Avance general' : '% Avance'}</th>
                                            <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-600">Informe</th>
                                            <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-widest text-slate-600">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {!corteActual.filas.length ? (
                                            <tr>
                                                <td colSpan="7" className="px-4 py-12 text-center">
                                                    <p className="text-slate-500 font-semibold">No hay docentes con datos para {corteActual.label}.</p>
                                                </td>
                                            </tr>
                                        ) : filasPaginadas.map((fila) => (
                                            <tr key={fila.id_docente} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                                                <td className="px-4 py-3 font-bold text-slate-900">{fila.docente}</td>
                                                <td className="px-4 py-3 font-semibold text-slate-700">{fmt(fila.horas_planeadas)} h</td>
                                                <td className="px-4 py-3 font-semibold text-slate-700">{fmt(fila.horas_ejecutadas)} h</td>
                                                <td className="px-4 py-3 font-semibold text-slate-700">{fmt(fila.horas_pendientes)} h</td>
                                                <td className="px-4 py-3">
                                                    <div className="min-w-[170px]">
                                                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                                                            <span>{fmtPct(fila.porcentaje_avance)}%</span>
                                                            <span className={`px-2 py-0.5 rounded-full border text-[10px] uppercase ${colorNivel(fila.porcentaje_avance)}`}>
                                                                {normalizarPorcentaje(fila.porcentaje_avance) >= 80 ? 'VERDE' : normalizarPorcentaje(fila.porcentaje_avance) >= 50 ? 'AMARILLO' : 'ROJO'}
                                                            </span>
                                                        </div>
                                                        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                                                            <div
                                                                className={`h-full ${colorBarraAvance(fila.porcentaje_avance)}`}
                                                                style={{ width: `${Math.round(normalizarPorcentaje(fila.porcentaje_avance))}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-slate-100 text-slate-700 border-slate-200">
                                                        <FileText size={12} /> {fila.estado_informe || 'Pendiente'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            title="Revisar evidencias"
                                                            onClick={() => abrirEvidencias(fila)}
                                                            className="h-8 px-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-black text-[11px] uppercase tracking-wide inline-flex items-center gap-1"
                                                        >
                                                            <Eye size={13} /> Revisar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={aprobando}
                                                            title="Aprobar informe"
                                                            onClick={() => aprobarInforme(fila)}
                                                            className="h-8 px-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 font-black text-[11px] uppercase tracking-wide inline-flex items-center gap-1"
                                                        >
                                                            <Check size={13} /> Aprobar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            title="Enviar observaciones"
                                                            onClick={() => abrirObservaciones(fila)}
                                                            className="h-8 px-3 rounded-lg bg-amber-500 text-white hover:bg-amber-600 font-black text-[11px] uppercase tracking-wide inline-flex items-center gap-1"
                                                        >
                                                            <Send size={13} /> Observar
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    {!!corteActual.filas.length && (
                                        <tfoot>
                                            <tr className="border-t-2 border-slate-200 bg-[#eef6ef]">
                                                <td className="px-4 py-3 font-black text-slate-900 uppercase tracking-wide">TOTAL</td>
                                                <td className="px-4 py-3 font-black text-slate-800">{fmt(resumenCorteActual.total_planeadas)} h</td>
                                                <td className="px-4 py-3 font-black text-slate-800">{fmt(resumenCorteActual.total_ejecutadas)} h</td>
                                                <td className="px-4 py-3 font-black text-slate-800">{fmt(resumenCorteActual.total_pendientes)} h</td>
                                                <td className="px-4 py-3 font-black text-slate-900">{fmtPct(resumenCorteActual.porcentaje_avance)}%</td>
                                                <td className="px-4 py-3" />
                                                <td className="px-4 py-3" />
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>

                            {!!corteActual.filas.length && (
                                <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <p className="text-xs font-semibold text-slate-500">
                                        Mostrando {filasPaginadas.length} de {corteActual.filas.length} docentes · Página {paginaActiva} de {totalPaginas}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            disabled={paginaActiva <= 1}
                                            onClick={() => setPaginasPorTab((prev) => ({ ...prev, [tabActiva]: Math.max(1, paginaActiva - 1) }))}
                                            className="h-9 px-3 rounded-lg border border-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 text-xs font-black uppercase tracking-wider"
                                        >
                                            Anterior
                                        </button>

                                        {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((pagina) => (
                                            <button
                                                key={pagina}
                                                type="button"
                                                onClick={() => setPaginasPorTab((prev) => ({ ...prev, [tabActiva]: pagina }))}
                                                className={`h-9 w-9 rounded-lg border text-xs font-black ${pagina === paginaActiva
                                                    ? 'bg-institutional-green text-white border-institutional-green'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                                    }`}
                                            >
                                                {pagina}
                                            </button>
                                        ))}

                                        <button
                                            type="button"
                                            disabled={paginaActiva >= totalPaginas}
                                            onClick={() => setPaginasPorTab((prev) => ({ ...prev, [tabActiva]: Math.min(totalPaginas, paginaActiva + 1) }))}
                                            className="h-9 px-3 rounded-lg border border-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 text-xs font-black uppercase tracking-wider"
                                        >
                                            Siguiente
                                        </button>
                                    </div>
                                </div>
                            )}
                        </section>
                    </>
                )}
            </div>

            {modalEvidencias.open && (
                <div className="fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-[2px] p-4 md:p-8 overflow-y-auto">
                    <div className="max-w-5xl mx-auto rounded-3xl bg-white border border-slate-200 shadow-xl">
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1f9d78]">Revisar evidencias</p>
                                <h3 className="text-lg font-black text-slate-900">{modalEvidencias.docente?.docente} · Corte {modalEvidencias.corte}</h3>
                            </div>
                            <button
                                type="button"
                                onClick={cerrarModalEvidencias}
                                className="h-9 w-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 grid place-items-center"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6">
                            {modalEvidencias.loading ? (
                                <div className="py-8 text-center text-slate-500 font-semibold">Cargando evidencias...</div>
                            ) : !modalEvidencias.data?.seguimientos?.length ? (
                                <div className="py-8 text-center text-slate-500 font-semibold">No hay evidencias cargadas para este docente en el corte.</div>
                            ) : (
                                <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                                    {modalEvidencias.data.seguimientos.map((item) => (
                                        <article key={item.id_seguimiento} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                                            <div className="flex flex-wrap justify-between gap-2 mb-2">
                                                <p className="font-black text-slate-900">Semana {item.semana} · {item.actividad}</p>
                                                <p className="text-xs font-bold text-slate-600">{fmt(item.horas_ejecutadas)} h ejecutadas</p>
                                            </div>
                                            {item.observaciones && (
                                                <p className="text-xs text-slate-600 mb-3"><span className="font-bold">Observación:</span> {item.observaciones}</p>
                                            )}
                                            <div className="space-y-2">
                                                {item.evidencias?.length ? item.evidencias.map((ev) => (
                                                    <div key={ev.id_evidencia} className="rounded-xl border border-slate-200 bg-white px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-800">{ev.nombre_archivo}</p>
                                                            <p className="text-[11px] text-slate-500">{ev.descripcion || 'Sin descripción'}</p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => abrirVisorArchivo(ev)}
                                                            className="h-8 px-3 rounded-lg border border-[#1f9d78] text-[#1f9d78] hover:bg-[#eef9f5] font-black text-[11px] uppercase tracking-wide inline-flex items-center"
                                                        >
                                                            Ver archivo
                                                        </button>
                                                    </div>
                                                )) : (
                                                    <p className="text-xs text-slate-500">Sin archivos adjuntos en este seguimiento.</p>
                                                )}
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {modalVisorArchivo.open && (
                <div className="fixed inset-0 z-[80] bg-slate-900/70 backdrop-blur-[3px] p-4 md:p-8 overflow-y-auto">
                    <div className="max-w-6xl mx-auto rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-[#f1f8f4] to-white flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1f9d78]">Visor de evidencia</p>
                                <h3 className="text-base md:text-lg font-black text-slate-900 truncate" title={modalVisorArchivo.nombre}>
                                    {modalVisorArchivo.nombre}
                                </h3>
                                {!!modalVisorArchivo.descripcion && (
                                    <p className="text-xs text-slate-500 font-semibold mt-1 truncate" title={modalVisorArchivo.descripcion}>
                                        {modalVisorArchivo.descripcion}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <a
                                    href={modalVisorArchivo.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="h-9 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-black text-[11px] uppercase tracking-wide inline-flex items-center gap-1"
                                >
                                    <ExternalLink size={13} /> Abrir
                                </a>
                                <a
                                    href={modalVisorArchivo.url}
                                    download
                                    className="h-9 px-3 rounded-xl border border-[#1f9d78] text-[#1f9d78] hover:bg-[#eef9f5] font-black text-[11px] uppercase tracking-wide inline-flex items-center gap-1"
                                >
                                    <Download size={13} /> Descargar
                                </a>
                                <button
                                    type="button"
                                    onClick={cerrarVisorArchivo}
                                    className="h-9 w-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 grid place-items-center"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="bg-slate-100 p-2 md:p-3">
                            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                                <iframe
                                    title={modalVisorArchivo.nombre || 'Visor PDF'}
                                    src={modalVisorArchivo.url}
                                    className="w-full h-[72vh]"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {modalObservacion.open && (
                <div className="fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-[2px] p-4 md:p-8 overflow-y-auto">
                    <div className="max-w-xl mx-auto rounded-3xl bg-white border border-slate-200 shadow-xl">
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1f9d78]">Enviar observaciones</p>
                                <h3 className="text-lg font-black text-slate-900">{modalObservacion.docente?.docente} · Corte {modalObservacion.corte}</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setModalObservacion({ open: false, docente: null, corte: null, texto: '' })}
                                className="h-9 w-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 grid place-items-center"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <textarea
                                rows={5}
                                value={modalObservacion.texto}
                                onChange={(e) => setModalObservacion((prev) => ({ ...prev, texto: e.target.value }))}
                                placeholder="Escribe observaciones para registrar en el seguimiento semanal del corte..."
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1f9d78]/25"
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setModalObservacion({ open: false, docente: null, corte: null, texto: '' })}
                                    className="h-10 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-black text-xs uppercase tracking-widest"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    disabled={guardandoObservacion}
                                    onClick={guardarObservaciones}
                                    className="h-10 px-4 rounded-xl bg-institutional-green text-white hover:bg-institutional-green/90 disabled:opacity-60 font-black text-xs uppercase tracking-widest inline-flex items-center gap-2"
                                >
                                    <Send size={14} /> Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Supervision;
