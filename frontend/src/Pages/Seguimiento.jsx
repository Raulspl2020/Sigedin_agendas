import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import api from '../services/api';
import {
    AlertCircle,
    BarChart3,
    Calendar,
    CheckCircle2,
    ChevronDown,
    Eye,
    Info,
    LayoutGrid,
    List,
    Plus,
    RefreshCw,
    Search,
    Target,
    Users,
    X,
} from 'lucide-react';
import { toast } from 'react-toastify';

const fmt = (valor) => {
    const n = parseFloat(valor);
    return Number.isNaN(n) ? '0' : (Number.isInteger(n) ? n.toString() : n.toFixed(1));
};

const nivelPorcentaje = (porcentaje) => {
    const valor = Number(porcentaje || 0);
    if (valor >= 75) return 'ALTO';
    if (valor >= 40) return 'MEDIO';
    return 'BAJO';
};

const nivelClass = (nivel) => {
    if (nivel === 'ALTO') return 'text-emerald-700 bg-emerald-100 border-emerald-200';
    if (nivel === 'MEDIO') return 'text-amber-700 bg-amber-100 border-amber-200';
    return 'text-red-700 bg-red-100 border-red-200';
};

const barraClass = (nivel) => {
    if (nivel === 'ALTO') return 'bg-emerald-500';
    if (nivel === 'MEDIO') return 'bg-amber-500';
    return 'bg-red-500';
};

const ProgressBar = ({ porcentaje, nivel }) => {
    const safe = Math.max(0, Math.min(100, Number(porcentaje || 0)));
    return (
        <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div className={`h-full ${barraClass(nivel)} transition-all duration-500`} style={{ width: `${Math.round(safe)}%` }} />
        </div>
    );
};

const HeaderMetricCard = ({ title, value, icon: Icon, tone }) => {
    const toneClass = {
        docentes: 'from-sky-50 to-sky-100 border-sky-200 text-sky-900',
        planeadas: 'from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-900',
        ejecutadas: 'from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-900',
        pendientes: 'from-orange-50 to-red-100 border-orange-200 text-orange-900',
        avance: 'from-teal-50 to-teal-100 border-teal-200 text-teal-900',
    };

    return (
        <article className={`rounded-2xl border p-4 bg-gradient-to-br shadow-sm ${toneClass[tone] || 'from-white to-slate-50 border-slate-200 text-slate-900'}`}>
            <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-80">{title}</p>
                <div className="w-8 h-8 rounded-xl bg-white/70 border border-white/70 grid place-items-center">
                    <Icon size={14} />
                </div>
            </div>
            <p className="text-2xl font-black tracking-tight">{value}</p>
        </article>
    );
};

const SectionResumenTemporal = ({ titulo, descripcion, porcentaje, children }) => {
    const nivel = nivelPorcentaje(Number(porcentaje || 0));

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                <div>
                    <h3 className="text-lg md:text-xl font-black text-slate-900">{titulo}</h3>
                    {!!descripcion && <p className="text-xs text-slate-500 font-semibold mt-1">{descripcion}</p>}
                </div>
                <span className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${nivelClass(nivel)}`}>
                    {nivel}
                </span>
            </div>

            <div className="mb-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Avance del bloque</span>
                    <span>{fmt(porcentaje || 0)}%</span>
                </div>
                <ProgressBar porcentaje={porcentaje || 0} nivel={nivel} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {children}
            </div>
        </section>
    );
};

const normalizarTexto = (valor) => String(valor || '').trim().toLowerCase();

const debugSeguimiento = (...args) => {
    if (import.meta.env.DEV) {
        console.info('[Seguimiento]', ...args);
    }
};

const formatearFecha = (valor) => {
    if (!valor) return 'Sin fecha';
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return 'Sin fecha';
    return fecha.toLocaleDateString('es-CO');
};

const obtenerEstadoAgenda = (agenda) => {
    if (!agenda) return 'sin_agenda';
    const totalActividades = Number(agenda?.actividades?.length || 0);
    if (totalActividades <= 0) return 'sin_actividades';

    const estado = String(agenda?.estado || '').toUpperCase();
    if (estado === 'EN_ELABORACION' || estado === 'CON_OBSERVACIONES' || estado === 'BORRADOR' || estado === 'RECHAZADA') {
        return 'pendiente';
    }

    return 'activo';
};

const badgeNivelAvance = (nivel) => {
    const n = String(nivel || '').toUpperCase();
    if (n === 'ALTO') {
        return { label: 'ALTO', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    }
    if (n === 'MEDIO') {
        return { label: 'MEDIO', className: 'bg-amber-100 text-amber-800 border-amber-200' };
    }
    return { label: 'BAJO', className: 'bg-red-100 text-red-800 border-red-200' };
};

const Seguimiento = () => {
    const navigate = useNavigate();
    const { usuario, periodoSeleccionado } = useAuth();

    const rol = String(usuario?.rol || '').toUpperCase();
    const esVistaGlobal = rol === 'ADMIN' || rol === 'DECANO';

    const [dashboardDocente, setDashboardDocente] = useState(null);
    const [cargandoDocente, setCargandoDocente] = useState(true);

    const [consolidado, setConsolidado] = useState(null);
    const [agendasGlobal, setAgendasGlobal] = useState([]);
    const [warningAgendas, setWarningAgendas] = useState('');
    const [cargandoGlobal, setCargandoGlobal] = useState(true);
    const [vistaGlobal, setVistaGlobal] = useState('cards');
    const [ordenTabla, setOrdenTabla] = useState({ key: 'porcentaje_avance', direction: 'desc' });

    const [filtros, setFiltros] = useState({
        q: '',
    });

    const [drawer, setDrawer] = useState({ open: false, docente: null, detalle: null, historial: null, loading: false });

    const idPeriodo = Number(periodoSeleccionado?.id_periodo || 0);
    const nombreUsuario = usuario?.docente?.nombres || usuario?.username || (esVistaGlobal ? 'Gestor' : 'Docente');

    const cargarDashboardDocente = useCallback(async () => {
        if (!idPeriodo) {
            setCargandoDocente(false);
            return;
        }

        setCargandoDocente(true);
        try {
            const { data } = await api.get(`/dashboard/seguimiento?id_periodo=${idPeriodo}`);
            setDashboardDocente(data || null);
        } catch {
            toast.error('No se pudo cargar el dashboard de seguimiento docente');
            setDashboardDocente(null);
        } finally {
            setCargandoDocente(false);
        }
    }, [idPeriodo]);

    const cargarConsolidadoGlobal = useCallback(async (filtrosActivos) => {
        if (!idPeriodo) {
            debugSeguimiento('No se ejecuta consolidado: idPeriodo invalido', {
                idPeriodo,
                rol,
                usuario: usuario?.username || usuario?.id_usuario,
                periodoSeleccionado,
            });
            setCargandoGlobal(false);
            return;
        }

        setCargandoGlobal(true);
        setWarningAgendas('');
        try {
            const params = new URLSearchParams({ id_periodo: String(idPeriodo) });
            Object.entries(filtrosActivos || {}).forEach(([k, v]) => {
                if (String(v || '').trim()) params.set(k, String(v).trim());
            });

            debugSeguimiento('Request seguimiento consolidado', {
                endpoint: `/seguimiento/consolidado?${params.toString()}`,
                rol,
                usuario: usuario?.username || usuario?.id_usuario,
                periodo: idPeriodo,
                filtros: filtrosActivos,
            });

            const [resConsolidado, resAgendas] = await Promise.allSettled([
                api.get(`/seguimiento/consolidado?${params.toString()}`),
                api.get('/agendas'),
            ]);

            if (resConsolidado.status !== 'fulfilled') {
                debugSeguimiento('Error consolidado', resConsolidado.reason);
                throw new Error('No se pudo cargar consolidado');
            }

            setConsolidado(resConsolidado.value?.data || null);
            debugSeguimiento('Response consolidado', {
                resumen: resConsolidado.value?.data?.resumen || null,
                docentes: Array.isArray(resConsolidado.value?.data?.docentes) ? resConsolidado.value.data.docentes.length : 0,
            });

            if (resAgendas.status === 'fulfilled') {
                setAgendasGlobal(Array.isArray(resAgendas.value?.data) ? resAgendas.value.data : []);
                debugSeguimiento('Response agendas', {
                    agendas: Array.isArray(resAgendas.value?.data) ? resAgendas.value.data.length : 0,
                });
            } else {
                setAgendasGlobal([]);
                setWarningAgendas('No fue posible cargar agendas para enriquecer la vista. Mostrando datos consolidados de seguimiento.');
                debugSeguimiento('Error agendas (no bloqueante)', resAgendas.reason);
            }
        } catch {
            toast.error('No se pudo cargar el seguimiento consolidado');
            setConsolidado(null);
            setAgendasGlobal([]);
            debugSeguimiento('Fallo global de carga consolidado');
        } finally {
            setCargandoGlobal(false);
        }
    }, [idPeriodo, rol, usuario, periodoSeleccionado]);

    useEffect(() => {
        if (!idPeriodo) return;
        if (esVistaGlobal) {
            cargarConsolidadoGlobal(filtros);
        } else {
            cargarDashboardDocente();
        }
    }, [idPeriodo, esVistaGlobal, cargarConsolidadoGlobal, cargarDashboardDocente]);

    const docentesGlobal = useMemo(() => {
        const baseConsolidado = Array.isArray(consolidado?.docentes) ? consolidado.docentes : [];
        const mapConsolidado = new Map(baseConsolidado.map((fila) => [Number(fila.id_docente), fila]));

        const agendasPeriodo = (Array.isArray(agendasGlobal) ? agendasGlobal : []).filter((agenda) => Number(agenda?.id_periodo) === Number(idPeriodo));

        const mergedFromAgendas = agendasPeriodo.map((agenda) => {
            const idDocente = Number(agenda?.id_docente || 0);
            const consolidadoDoc = mapConsolidado.get(idDocente) || {};
            const totalActividades = Number(agenda?.actividades?.length || 0);
            const horasSemana = Number((agenda?.actividades || []).reduce((acc, item) => acc + Number(item?.horas_semanales || 0), 0));
            const estadoAgenda = obtenerEstadoAgenda(agenda);
            const docenteNombre = agenda?.docente?.nombres || consolidadoDoc?.docente || `Docente ${idDocente}`;

            return {
                ...consolidadoDoc,
                id_docente: idDocente,
                id_agenda: Number(agenda?.id_agenda || consolidadoDoc?.id_agenda || 0),
                docente: docenteNombre,
                identificacion: agenda?.docente?.identificacion || consolidadoDoc?.identificacion || '',
                programa: consolidadoDoc?.programa || '',
                facultad: consolidadoDoc?.facultad || '',
                id_programa: Number(consolidadoDoc?.id_programa || 0),
                id_facultad: Number(consolidadoDoc?.id_facultad || 0),
                horas_planeadas: Number(consolidadoDoc?.horas_planeadas || 0),
                horas_ejecutadas: Number(consolidadoDoc?.horas_ejecutadas || 0),
                horas_pendientes: Number(consolidadoDoc?.horas_pendientes || 0),
                porcentaje_avance: Number(consolidadoDoc?.porcentaje_avance || 0),
                nivel_avance: consolidadoDoc?.nivel_avance || nivelPorcentaje(Number(consolidadoDoc?.porcentaje_avance || 0)),
                estado_avance: consolidadoDoc?.estado_avance || nivelPorcentaje(Number(consolidadoDoc?.porcentaje_avance || 0)),
                corte_actual: consolidadoDoc?.corte_actual || { porcentaje_avance: 0 },
                semana_actual: consolidadoDoc?.semana_actual || { porcentaje_avance: 0 },
                actividades_count: totalActividades,
                horas_semana: Number(horasSemana.toFixed(2)),
                estado_agenda: estadoAgenda,
                fecha_agenda: agenda?.fecha_diligenciamiento || agenda?.inicio_semestre || null,
                periodo_label: `${agenda?.periodo?.anio || periodoSeleccionado?.anio || ''}-${agenda?.periodo?.periodo || periodoSeleccionado?.periodo || ''}`,
                alerta_sin_registros: totalActividades <= 0,
            };
        });

        const idsConAgenda = new Set(mergedFromAgendas.map((fila) => Number(fila.id_docente || 0)));
        const soloConsolidado = baseConsolidado
            .filter((fila) => !idsConAgenda.has(Number(fila.id_docente || 0)))
            .map((fila) => ({
                ...fila,
                actividades_count: 0,
                horas_semana: 0,
                estado_agenda: 'sin_agenda',
                fecha_agenda: null,
                periodo_label: `${periodoSeleccionado?.anio || ''}-${periodoSeleccionado?.periodo || ''}`,
                alerta_sin_registros: true,
            }));

        const texto = normalizarTexto(filtros.q);
        const filtrados = [...mergedFromAgendas, ...soloConsolidado].filter((fila) => {
            if (texto) {
                const hayTexto = normalizarTexto(fila.docente).includes(texto) || normalizarTexto(fila.identificacion).includes(texto);
                if (!hayTexto) return false;
            }

            return true;
        });

        const sorted = [...filtrados];
        sorted.sort((a, b) => {
            const key = ordenTabla.key;
            const dir = ordenTabla.direction === 'asc' ? 1 : -1;
            const valA = a?.[key];
            const valB = b?.[key];
            if (typeof valA === 'number' || typeof valB === 'number') {
                return (Number(valA || 0) - Number(valB || 0)) * dir;
            }
            return String(valA || '').localeCompare(String(valB || ''), 'es') * dir;
        });

        return sorted;
    }, [consolidado, agendasGlobal, idPeriodo, ordenTabla, filtros, periodoSeleccionado]);

    const gruposJerarquicos = useMemo(() => {
        const mapFacultad = new Map();

        docentesGlobal.forEach((fila) => {
            const facKey = `${fila.id_facultad || 0}-${fila.facultad || 'Sin facultad'}`;
            if (!mapFacultad.has(facKey)) {
                mapFacultad.set(facKey, {
                    id_facultad: fila.id_facultad,
                    facultad: fila.facultad || 'Sin facultad',
                    programas: new Map(),
                });
            }
            const fac = mapFacultad.get(facKey);
            const progKey = `${fila.id_programa || 0}-${fila.programa || 'Sin programa'}`;
            if (!fac.programas.has(progKey)) {
                fac.programas.set(progKey, {
                    id_programa: fila.id_programa,
                    programa: fila.programa || 'Sin programa',
                    docentes: [],
                });
            }
            fac.programas.get(progKey).docentes.push(fila);
        });

        return Array.from(mapFacultad.values()).map((fac) => ({
            ...fac,
            programas: Array.from(fac.programas.values()),
        }));
    }, [docentesGlobal]);

    const limpiarFiltros = () => {
        setFiltros({
            q: '',
        });
    };

    const toggleOrden = (key) => {
        setOrdenTabla((prev) => {
            if (prev.key !== key) return { key, direction: 'asc' };
            return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
        });
    };

    const irAReportarSemanaDocente = (docente) => {
        const idDocente = Number(docente?.id_docente || 0);
        if (!idDocente) {
            toast.warning('No fue posible identificar el docente para reportar semana');
            return;
        }

        navigate(`/seguimiento/nuevo?id_docente=${idDocente}`, {
            state: {
                modo: 'crear',
                origen: 'seguimiento_consolidado_docente',
                id_docente: idDocente,
            },
        });
    };

    const abrirDrawerDocente = async (docente) => {
        if (!docente?.id_docente || !idPeriodo) return;

        setDrawer({ open: true, docente, detalle: null, historial: null, loading: true });
        try {
            const [resDetalle, resHistorial] = await Promise.all([
                api.get(`/dashboard/seguimiento?id_periodo=${idPeriodo}&id_docente=${docente.id_docente}`),
                api.get(`/seguimiento/docente-historial?id_periodo=${idPeriodo}&id_docente=${docente.id_docente}`),
            ]);

            setDrawer({
                open: true,
                docente,
                detalle: resDetalle?.data || null,
                historial: resHistorial?.data || null,
                loading: false,
            });
        } catch {
            toast.error('No se pudo cargar el detalle del docente');
            setDrawer({ open: true, docente, detalle: null, historial: null, loading: false });
        }
    };

    const cerrarDrawer = () => {
        setDrawer({ open: false, docente: null, detalle: null, historial: null, loading: false });
    };

    const renderSkeletonGlobal = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={`skeleton-seg-${i}`} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse">
                    <div className="h-4 w-20 bg-slate-200 rounded mb-3" />
                    <div className="h-6 w-40 bg-slate-200 rounded mb-4" />
                    <div className="h-3 w-full bg-slate-200 rounded mb-2" />
                    <div className="h-3 w-3/4 bg-slate-200 rounded" />
                </div>
            ))}
        </div>
    );

    const renderHeaderGlobal = () => {
        return (
            <header className="rounded-3xl border border-[#d3e3d9] bg-gradient-to-r from-[#f6fbf8] to-white p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#006431]">Seguimiento consolidado</p>
                        <h1 className="text-3xl font-black text-[#0f2923] tracking-tight">Panel jerárquico de docentes</h1>
                        <p className="text-sm text-slate-600 font-medium mt-1">
                            {nombreUsuario} · Periodo {periodoSeleccionado?.anio}-{periodoSeleccionado?.periodo}
                        </p>
                    </div>
                    <button
                        onClick={() => cargarConsolidadoGlobal(filtros)}
                        className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-2xl border border-[#9fc9b1] bg-white text-[#1c4f3f] font-black text-xs uppercase tracking-wider hover:bg-[#eef7f1] transition-colors"
                    >
                        <RefreshCw size={16} /> Actualizar
                    </button>
                </div>
            </header>
        );
    };

    const renderFiltrosGlobal = () => (
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-center">
                <label className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 flex items-center gap-2 xl:col-span-7">
                    <Search size={15} className="text-slate-400" />
                    <input
                        type="text"
                        value={filtros.q}
                        onChange={(e) => setFiltros((prev) => ({ ...prev, q: e.target.value }))}
                        placeholder="Buscar por nombre o identificación del docente..."
                        className="w-full bg-transparent text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    />
                </label>

                <div className="xl:col-span-5 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-2 flex flex-wrap items-center justify-end gap-2">

                    <button
                        type="button"
                        onClick={limpiarFiltros}
                        className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-black text-xs uppercase tracking-widest inline-flex items-center justify-center gap-2"
                    >
                        <X size={15} /> Limpiar
                    </button>

                    <div className="h-10 w-px bg-slate-200 mx-1" />

                    <button
                        type="button"
                        onClick={() => setVistaGlobal('cards')}
                        className={`h-10 px-3 rounded-xl border text-xs font-black uppercase tracking-wider inline-flex items-center gap-1 ${vistaGlobal === 'cards'
                            ? 'bg-institutional-green text-white border-institutional-green'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        <LayoutGrid size={14} /> Cards
                    </button>
                    <button
                        type="button"
                        onClick={() => setVistaGlobal('table')}
                        className={`h-10 px-3 rounded-xl border text-xs font-black uppercase tracking-wider inline-flex items-center gap-1 ${vistaGlobal === 'table'
                            ? 'bg-institutional-green text-white border-institutional-green'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        <List size={14} /> Tabla
                    </button>
                    <button
                        type="button"
                        onClick={() => setVistaGlobal('hierarchy')}
                        className={`h-10 px-3 rounded-xl border text-xs font-black uppercase tracking-wider inline-flex items-center gap-1 ${vistaGlobal === 'hierarchy'
                            ? 'bg-institutional-green text-white border-institutional-green'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        <ChevronDown size={14} /> Jerarquía
                    </button>
                </div>
            </div>
        </section>
    );

    const renderCardsGlobal = () => (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {docentesGlobal.map((fila) => (
                <article key={fila.id_docente} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-lg transition-all duration-200">
                    <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Docente</p>
                            <h3 className="text-lg font-black text-[#0f2923] leading-tight">{fila.docente}</h3>
                            <p className="text-xs font-semibold text-slate-500 mt-1">{fila.identificacion || 'Sin identificación'}</p>
                        </div>
                        <span className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${badgeNivelAvance(fila.nivel_avance).className}`}>
                            {badgeNivelAvance(fila.nivel_avance).label}
                        </span>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 mb-3">
                        <p className="text-xs font-semibold text-slate-700">{fila.facultad || 'Sin facultad'}</p>
                        <p className="text-xs text-slate-500">{fila.programa || 'Sin programa'}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="rounded-lg bg-slate-50 border border-slate-200 px-2 py-2 text-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Planeadas</p>
                            <p className="text-sm font-black text-slate-900 mt-1">{fmt(fila.horas_planeadas || 0)} h</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 border border-slate-200 px-2 py-2 text-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ejecutadas</p>
                            <p className="text-sm font-black text-slate-900 mt-1">{fmt(fila.horas_ejecutadas || 0)} h</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 border border-slate-200 px-2 py-2 text-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Avance general</p>
                            <p className="text-sm font-black text-slate-900 mt-1">{fmt(fila.porcentaje_avance)}%</p>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 px-3 py-2 mb-3">
                        <p className="text-xs text-slate-600 font-semibold">Periodo {fila.periodo_label || `${periodoSeleccionado?.anio}-${periodoSeleccionado?.periodo}`}</p>
                        <p className="text-xs text-slate-500 mt-1">Fecha de agenda: {formatearFecha(fila.fecha_agenda)}</p>
                    </div>

                    <div className="mb-3">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                            <span>Avance general</span>
                            <span>{fmt(fila.porcentaje_avance)}%</span>
                        </div>
                        <ProgressBar porcentaje={fila.porcentaje_avance} nivel={fila.nivel_avance} />
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                            <p className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">Corte actual: <span className="font-black">{fmt(fila?.corte_actual?.porcentaje_avance || 0)}%</span></p>
                            <p className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">Semana actual: <span className="font-black">{fmt(fila?.semana_actual?.porcentaje_avance || 0)}%</span></p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => abrirDrawerDocente(fila)}
                            className="flex-1 h-10 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-black text-[11px] uppercase tracking-wide inline-flex items-center justify-center gap-2"
                        >
                            <Eye size={14} /> Ver detalle
                        </button>
                        <button
                            type="button"
                            onClick={() => irAReportarSemanaDocente(fila)}
                            className="flex-1 h-10 rounded-xl bg-institutional-green text-white hover:bg-institutional-green/90 font-black text-[11px] uppercase tracking-wide inline-flex items-center justify-center gap-2"
                        >
                            <Plus size={14} /> Reportar
                        </button>
                    </div>
                </article>
            ))}
        </section>
    );

    const renderTablaGlobal = () => (
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[1520px] text-sm">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-600 cursor-pointer" onClick={() => toggleOrden('docente')}>Docente</th>
                            <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-600 cursor-pointer" onClick={() => toggleOrden('programa')}>Programa</th>
                            <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-600">Actividades</th>
                            <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-600">Horas/semana</th>
                            <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-600">Periodo</th>
                            <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-600">Fecha agenda</th>
                            <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-600 cursor-pointer" onClick={() => toggleOrden('horas_planeadas')}>Planeadas</th>
                            <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-600 cursor-pointer" onClick={() => toggleOrden('horas_ejecutadas')}>Ejecutadas</th>
                            <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-600 cursor-pointer" onClick={() => toggleOrden('horas_pendientes')}>Pendientes</th>
                            <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-600 cursor-pointer" onClick={() => toggleOrden('porcentaje_avance')}>% avance</th>
                            <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-600">Avance corte actual</th>
                            <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-600">Avance semana actual</th>
                            <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-600">Estado</th>
                            <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-widest text-slate-600">Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {docentesGlobal.map((fila) => (
                            <tr key={fila.id_docente} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                                <td className="px-4 py-3">
                                    <p className="font-bold text-slate-900">{fila.docente}</p>
                                    <p className="text-xs text-slate-500">{fila.identificacion}</p>
                                </td>
                                <td className="px-4 py-3 text-slate-700">{fila.programa}</td>
                                <td className="px-4 py-3 font-semibold text-slate-700">{Number(fila.actividades_count || 0)}</td>
                                <td className="px-4 py-3 font-semibold text-slate-700">{fmt(fila.horas_semana || 0)} h</td>
                                <td className="px-4 py-3 text-slate-700">{fila.periodo_label || `${periodoSeleccionado?.anio}-${periodoSeleccionado?.periodo}`}</td>
                                <td className="px-4 py-3 text-slate-700">{formatearFecha(fila.fecha_agenda)}</td>
                                <td className="px-4 py-3 font-semibold text-slate-700">{fmt(fila.horas_planeadas)} h</td>
                                <td className="px-4 py-3 font-semibold text-slate-700">{fmt(fila.horas_ejecutadas)} h</td>
                                <td className="px-4 py-3 font-semibold text-slate-700">{fmt(fila.horas_pendientes)} h</td>
                                <td className="px-4 py-3">
                                    <div className="min-w-[140px]">
                                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                                            <span>{fmt(fila.porcentaje_avance)}%</span>
                                            <span className={`px-2 py-0.5 rounded-full border text-[10px] uppercase ${nivelClass(fila.nivel_avance)}`}>{fila.nivel_avance}</span>
                                        </div>
                                        <ProgressBar porcentaje={fila.porcentaje_avance} nivel={fila.nivel_avance} />
                                    </div>
                                </td>
                                <td className="px-4 py-3 font-semibold text-slate-700">{fmt(fila?.corte_actual?.porcentaje_avance || 0)}%</td>
                                <td className="px-4 py-3 font-semibold text-slate-700">{fmt(fila?.semana_actual?.porcentaje_avance || 0)}%</td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${nivelClass(fila.nivel_avance)}`}>{fila.nivel_avance}</span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => abrirDrawerDocente(fila)}
                                            className="h-8 px-3 rounded-lg border border-[#1F9D78] text-[#1F9D78] hover:bg-[#EEF9F5] font-black text-[11px] uppercase tracking-wide inline-flex items-center gap-1"
                                        >
                                            <Eye size={13} /> Ver detalle
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => irAReportarSemanaDocente(fila)}
                                            className="h-8 px-3 rounded-lg bg-institutional-green text-white hover:bg-institutional-green/90 font-black text-[11px] uppercase tracking-wide inline-flex items-center gap-1"
                                        >
                                            <Plus size={13} /> Reportar
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );

    const renderJerarquiaGlobal = () => (
        <section className="space-y-3">
            {gruposJerarquicos.map((fac) => (
                <article key={`fac-${fac.id_facultad}-${fac.facultad}`} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Facultad</p>
                        <h3 className="text-lg font-black text-slate-900">{fac.facultad}</h3>
                    </div>
                    <div className="p-4 space-y-3">
                        {fac.programas.map((prog) => (
                            <div key={`prog-${prog.id_programa}-${prog.programa}`} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                                <div className="px-4 py-2 bg-[#f7fbf8] border-b border-slate-200">
                                    <p className="text-xs font-black uppercase tracking-widest text-[#1f9d78]">Programa</p>
                                    <p className="text-sm font-bold text-slate-800">{prog.programa}</p>
                                </div>
                                <div className="p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                                    {prog.docentes.map((fila) => (
                                        <div key={`doc-${fila.id_docente}`} className="rounded-lg border border-slate-200 p-3 bg-slate-50/70">
                                            <p className="font-bold text-slate-900 text-sm">{fila.docente}</p>
                                            <p className="text-xs text-slate-500 mb-2">{fila.identificacion}</p>
                                            <p className="text-[11px] text-slate-600 mb-1">Actividades: <span className="font-black">{Number(fila.actividades_count || 0)}</span> · Horas/semana: <span className="font-black">{fmt(fila.horas_semana || 0)} h</span></p>
                                            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                                                <span>{fmt(fila.porcentaje_avance)}%</span>
                                                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-black uppercase ${nivelClass(fila.nivel_avance)}`}>{fila.nivel_avance}</span>
                                            </div>
                                            <ProgressBar porcentaje={fila.porcentaje_avance} nivel={fila.nivel_avance} />
                                            <p className="text-[11px] text-slate-600 mt-2">
                                                Corte: <span className="font-black">{fmt(fila?.corte_actual?.porcentaje_avance || 0)}%</span> · Semana: <span className="font-black">{fmt(fila?.semana_actual?.porcentaje_avance || 0)}%</span>
                                            </p>
                                            <div className="mt-2 flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => abrirDrawerDocente(fila)}
                                                    className="h-8 flex-1 rounded-lg border border-[#1F9D78] text-[#1F9D78] hover:bg-[#EEF9F5] font-black text-[11px] uppercase tracking-wide inline-flex items-center justify-center gap-1"
                                                >
                                                    <Eye size={12} /> Ver detalle
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => irAReportarSemanaDocente(fila)}
                                                    className="h-8 flex-1 rounded-lg bg-institutional-green text-white hover:bg-institutional-green/90 font-black text-[11px] uppercase tracking-wide inline-flex items-center justify-center gap-1"
                                                >
                                                    <Plus size={12} /> Reportar
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </article>
            ))}
        </section>
    );

    const renderDrawerDocente = () => {
        if (!drawer.open) return null;

        const detalle = drawer.detalle || {};
        const tipos = Array.isArray(detalle?.tipos) ? detalle.tipos : [];
        const historial = Array.isArray(drawer?.historial?.historial_semanal) ? drawer.historial.historial_semanal : [];

        return (
            <>
                <div className="fixed inset-0 z-[70] bg-slate-900/45 backdrop-blur-[2px]" onClick={cerrarDrawer} />
                <aside className="fixed inset-y-0 right-0 z-[75] w-full md:w-[760px] bg-white border-l border-slate-200 shadow-2xl overflow-y-auto">
                    <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-[#f1f8f4] to-white flex items-center justify-between gap-2">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1f9d78]">Seguimiento detallado</p>
                            <h3 className="text-lg font-black text-slate-900">{drawer?.docente?.docente || 'Docente'}</h3>
                            <p className="text-xs text-slate-500 font-semibold">{drawer?.docente?.facultad || '--'} · {drawer?.docente?.programa || '--'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => irAReportarSemanaDocente(drawer?.docente)}
                                className="h-9 px-3 rounded-xl bg-institutional-green text-white hover:bg-institutional-green/90 font-black text-[11px] uppercase tracking-wide inline-flex items-center gap-1"
                            >
                                <Plus size={13} /> Reportar semana
                            </button>
                            <button
                                type="button"
                                onClick={cerrarDrawer}
                                className="h-9 w-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 grid place-items-center"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="p-5 space-y-4">
                        {drawer.loading ? (
                            <div className="py-10 text-center text-slate-500 font-semibold">Cargando detalle del docente...</div>
                        ) : (
                            <>
                                <SectionResumenTemporal
                                    titulo="Semestre actual"
                                    descripcion="Resumen acumulado del periodo"
                                    porcentaje={detalle?.semestre?.porcentaje || 0}
                                >
                                    <HeaderMetricCard title="Planeadas" value={`${fmt(detalle?.semestre?.planeadas || 0)} h`} icon={Target} tone="planeadas" />
                                    <HeaderMetricCard title="Ejecutadas" value={`${fmt(detalle?.semestre?.ejecutadas || 0)} h`} icon={CheckCircle2} tone="ejecutadas" />
                                    <HeaderMetricCard title="Pendientes" value={`${fmt(detalle?.semestre?.pendientes || 0)} h`} icon={AlertCircle} tone="pendientes" />
                                    <HeaderMetricCard title="Avance semestre" value={`${fmt(detalle?.semestre?.porcentaje || 0)}%`} icon={BarChart3} tone="avance" />
                                </SectionResumenTemporal>

                                <SectionResumenTemporal
                                    titulo="Corte actual"
                                    descripcion={detalle?.corte_actual?.nombre || 'Sin corte vigente'}
                                    porcentaje={detalle?.corte_actual?.porcentaje || 0}
                                >
                                    <HeaderMetricCard title="Planeadas" value={`${fmt(detalle?.corte_actual?.planeadas || 0)} h`} icon={Target} tone="planeadas" />
                                    <HeaderMetricCard title="Ejecutadas" value={`${fmt(detalle?.corte_actual?.ejecutadas || 0)} h`} icon={CheckCircle2} tone="ejecutadas" />
                                    <HeaderMetricCard title="Pendientes" value={`${fmt(detalle?.corte_actual?.pendientes || 0)} h`} icon={AlertCircle} tone="pendientes" />
                                    <HeaderMetricCard title="Avance corte actual" value={`${fmt(detalle?.corte_actual?.porcentaje || 0)}%`} icon={BarChart3} tone="avance" />
                                </SectionResumenTemporal>

                                <SectionResumenTemporal
                                    titulo="Semana actual"
                                    descripcion={`Semana ${detalle?.semana_actual?.numero || 0}`}
                                    porcentaje={detalle?.semana_actual?.porcentaje || 0}
                                >
                                    <HeaderMetricCard title="Programadas" value={`${fmt(detalle?.semana_actual?.programadas || 0)} h`} icon={Calendar} tone="planeadas" />
                                    <HeaderMetricCard title="Ejecutadas" value={`${fmt(detalle?.semana_actual?.ejecutadas || 0)} h`} icon={CheckCircle2} tone="ejecutadas" />
                                    <HeaderMetricCard title="Faltantes" value={`${fmt(detalle?.semana_actual?.faltantes || 0)} h`} icon={AlertCircle} tone="pendientes" />
                                    <HeaderMetricCard title="Avance semana actual" value={`${fmt(detalle?.semana_actual?.porcentaje || 0)}%`} icon={BarChart3} tone="avance" />
                                </SectionResumenTemporal>

                                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#1F9D78] mb-3">Detalle por tipo de actividad</p>
                                    {!tipos.length ? (
                                        <p className="text-sm font-semibold text-slate-500">No hay detalle por tipo para este docente en el periodo seleccionado.</p>
                                    ) : (
                                        <div className="overflow-auto">
                                            <table className="min-w-full text-sm">
                                                <thead>
                                                    <tr className="text-left text-slate-500 border-b border-slate-200">
                                                        <th className="py-2 pr-3 font-semibold">Tipo</th>
                                                        <th className="py-2 px-3 font-semibold">Prog</th>
                                                        <th className="py-2 px-3 font-semibold">Ejec</th>
                                                        <th className="py-2 px-3 font-semibold">%</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {tipos.map((tipo) => {
                                                        const nivel = nivelPorcentaje(tipo?.semana?.porcentaje || 0);
                                                        return (
                                                            <tr key={tipo.id_tipo} className="border-b border-slate-100 last:border-0">
                                                                <td className="py-2 pr-3 font-semibold text-slate-900">{tipo.nombre}</td>
                                                                <td className="py-2 px-3">{fmt(tipo?.semana?.programadas || 0)} h</td>
                                                                <td className="py-2 px-3">{fmt(tipo?.semana?.ejecutadas || 0)} h</td>
                                                                <td className="py-2 px-3">
                                                                    <span className={`px-2 py-0.5 text-[10px] rounded-full border font-bold ${nivelClass(nivel)}`}>{fmt(tipo?.semana?.porcentaje || 0)}%</span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </section>

                                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#1F9D78] mb-3">Historial semanal</p>
                                    {!historial.length ? (
                                        <p className="text-sm font-semibold text-slate-500">No hay historial semanal registrado para este docente en el periodo.</p>
                                    ) : (
                                        <div className="overflow-auto">
                                            <table className="min-w-full text-sm">
                                                <thead>
                                                    <tr className="text-left text-slate-500 border-b border-slate-200">
                                                        <th className="py-2 pr-3 font-semibold">Semana</th>
                                                        <th className="py-2 px-3 font-semibold">Corte</th>
                                                        <th className="py-2 px-3 font-semibold">Planeadas</th>
                                                        <th className="py-2 px-3 font-semibold">Ejecutadas</th>
                                                        <th className="py-2 px-3 font-semibold">Pendientes</th>
                                                        <th className="py-2 px-3 font-semibold">%</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {historial.map((fila, idx) => (
                                                        <tr key={`${fila.semana}-${fila.numero_corte}-${idx}`} className="border-b border-slate-100 last:border-0">
                                                            <td className="py-2 pr-3 font-semibold text-slate-900">{fila.semana}</td>
                                                            <td className="py-2 px-3">Corte {fila.numero_corte}</td>
                                                            <td className="py-2 px-3">{fmt(fila.horas_planeadas_semana)} h</td>
                                                            <td className="py-2 px-3">{fmt(fila.horas_ejecutadas)} h</td>
                                                            <td className="py-2 px-3">{fmt(fila.horas_pendientes)} h</td>
                                                            <td className="py-2 px-3">
                                                                <span className={`px-2 py-0.5 text-[10px] rounded-full border font-bold ${nivelClass(fila.nivel_avance)}`}>
                                                                    {fmt(fila.porcentaje_avance)}%
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </section>
                            </>
                        )}
                    </div>
                </aside>
            </>
        );
    };

    const renderDocente = () => {
        const tipos = Array.isArray(dashboardDocente?.tipos) ? dashboardDocente.tipos : [];
        const totalProgramado = tipos.reduce((acc, tipo) => acc + Number(tipo?.semana?.programadas || 0), 0);
        const totalEjecutado = tipos.reduce((acc, tipo) => acc + Number(tipo?.semana?.ejecutadas || 0), 0);
        const avanceTotal = totalProgramado > 0 ? (totalEjecutado / totalProgramado) * 100 : 0;

        if (cargandoDocente) {
            return (
                <div className="flex items-center justify-center min-h-[55vh]">
                    <div className="flex flex-col items-center space-y-4">
                        <div className="w-12 h-12 border-4 border-institutional-green border-t-transparent rounded-full animate-spin" />
                        <p className="text-gray-500 font-medium text-sm">Cargando dashboard...</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                <header className="rounded-3xl border border-[#d3e3d9] bg-gradient-to-r from-[#f6fbf8] to-white p-6 shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#006431]">Dashboard de seguimiento</p>
                            <h1 className="text-3xl font-black text-[#0f2923] tracking-tight">Avance individual</h1>
                            <p className="text-sm text-slate-600 font-medium mt-1">{nombreUsuario} · Periodo {periodoSeleccionado?.anio}-{periodoSeleccionado?.periodo}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={cargarDashboardDocente}
                                className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-2xl border border-[#9fc9b1] bg-white text-[#1c4f3f] font-black text-xs uppercase tracking-wider hover:bg-[#eef7f1] transition-colors"
                            >
                                <RefreshCw size={16} /> Actualizar
                            </button>
                            <button
                                onClick={() => navigate('/seguimiento/nuevo', { state: { modo: 'crear', origen: 'dashboard_docente' } })}
                                className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-2xl bg-institutional-green text-white font-black text-xs uppercase tracking-wider hover:bg-institutional-green/90 transition-colors"
                            >
                                <Plus size={16} /> Reportar semana
                            </button>
                        </div>
                    </div>
                </header>

                <SectionResumenTemporal
                    titulo="Semestre actual"
                    descripcion="Resumen acumulado del periodo"
                    porcentaje={dashboardDocente?.semestre?.porcentaje || 0}
                >
                    <HeaderMetricCard title="Planeadas" value={`${fmt(dashboardDocente?.semestre?.planeadas || 0)} h`} icon={Target} tone="planeadas" />
                    <HeaderMetricCard title="Ejecutadas" value={`${fmt(dashboardDocente?.semestre?.ejecutadas || 0)} h`} icon={CheckCircle2} tone="ejecutadas" />
                    <HeaderMetricCard title="Pendientes" value={`${fmt(dashboardDocente?.semestre?.pendientes || 0)} h`} icon={AlertCircle} tone="pendientes" />
                    <HeaderMetricCard title="Avance semestre" value={`${fmt(dashboardDocente?.semestre?.porcentaje || 0)}%`} icon={BarChart3} tone="avance" />
                </SectionResumenTemporal>

                <SectionResumenTemporal
                    titulo="Corte actual"
                    descripcion={dashboardDocente?.corte_actual?.nombre || 'Sin corte vigente'}
                    porcentaje={dashboardDocente?.corte_actual?.porcentaje || 0}
                >
                    <HeaderMetricCard title="Planeadas" value={`${fmt(dashboardDocente?.corte_actual?.planeadas || 0)} h`} icon={Target} tone="planeadas" />
                    <HeaderMetricCard title="Ejecutadas" value={`${fmt(dashboardDocente?.corte_actual?.ejecutadas || 0)} h`} icon={CheckCircle2} tone="ejecutadas" />
                    <HeaderMetricCard title="Pendientes" value={`${fmt(dashboardDocente?.corte_actual?.pendientes || 0)} h`} icon={AlertCircle} tone="pendientes" />
                    <HeaderMetricCard title="Avance corte actual" value={`${fmt(dashboardDocente?.corte_actual?.porcentaje || 0)}%`} icon={BarChart3} tone="avance" />
                </SectionResumenTemporal>

                <SectionResumenTemporal
                    titulo="Semana actual"
                    descripcion={`Semana ${dashboardDocente?.semana_actual?.numero || 0}`}
                    porcentaje={dashboardDocente?.semana_actual?.porcentaje || 0}
                >
                    <HeaderMetricCard title="Programadas" value={`${fmt(dashboardDocente?.semana_actual?.programadas || 0)} h`} icon={Calendar} tone="planeadas" />
                    <HeaderMetricCard title="Ejecutadas" value={`${fmt(dashboardDocente?.semana_actual?.ejecutadas || 0)} h`} icon={CheckCircle2} tone="ejecutadas" />
                    <HeaderMetricCard title="Faltantes" value={`${fmt(dashboardDocente?.semana_actual?.faltantes || 0)} h`} icon={AlertCircle} tone="pendientes" />
                    <HeaderMetricCard title="Avance semana actual" value={`${fmt(dashboardDocente?.semana_actual?.porcentaje || 0)}%`} icon={BarChart3} tone="avance" />
                </SectionResumenTemporal>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-xl bg-[#EEF9F5] border border-[#D7F0E8]">
                            <BarChart3 size={18} className="text-[#1F9D78]" />
                        </div>
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#1F9D78]">Detalle por tipo</p>
                            <h2 className="text-lg font-black text-slate-900">Detalle del avance semanal</h2>
                        </div>
                    </div>

                    {tipos.length === 0 ? (
                        <div className="py-12 text-center">
                            <Target size={40} className="text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 font-semibold">Sin datos por tipo para este periodo.</p>
                        </div>
                    ) : (
                        <div className="overflow-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="text-left text-slate-500 border-b border-slate-200">
                                        <th className="py-2 pr-3 font-semibold">Tipo de actividad</th>
                                        <th className="py-2 px-3 font-semibold">Semana (Prog)</th>
                                        <th className="py-2 px-3 font-semibold">Semana (Ejec)</th>
                                        <th className="py-2 px-3 font-semibold">Avance semanal</th>
                                        <th className="py-2 pl-3 font-semibold text-right">Accion</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tipos.map((tipo) => {
                                        const nivel = nivelPorcentaje(Number(tipo?.semana?.porcentaje || 0));
                                        return (
                                            <tr key={tipo.id_tipo} className="border-b border-slate-100 last:border-0">
                                                <td className="py-3 pr-3 font-semibold text-slate-900">{tipo.nombre}</td>
                                                <td className="py-3 px-3">{fmt(tipo?.semana?.programadas || 0)} h</td>
                                                <td className="py-3 px-3">{fmt(tipo?.semana?.ejecutadas || 0)} h</td>
                                                <td className="py-3 px-3">
                                                    <div className="min-w-[150px]">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="font-bold text-slate-900">{fmt(tipo?.semana?.porcentaje || 0)}%</span>
                                                            <span className={`px-2 py-0.5 text-[10px] rounded-full border font-bold ${nivelClass(nivel)}`}>{nivel}</span>
                                                        </div>
                                                        <ProgressBar porcentaje={tipo?.semana?.porcentaje || 0} nivel={nivel} />
                                                    </div>
                                                </td>
                                                <td className="py-3 pl-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate('/seguimiento/nuevo', { state: { modo: 'editar', origen: 'dashboard_docente_tipo' } })}
                                                        className="inline-flex items-center justify-center h-8 px-3 rounded-lg border border-[#1F9D78] text-[#1F9D78] font-black text-[11px] uppercase tracking-wide hover:bg-[#EEF9F5] transition-colors"
                                                    >
                                                        Actualizar
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                                        <td className="py-3 pr-3 font-black text-slate-900">Totales</td>
                                        <td className="py-3 px-3 font-black text-slate-900">{fmt(totalProgramado)} h</td>
                                        <td className="py-3 px-3 font-black text-slate-900">{fmt(totalEjecutado)} h</td>
                                        <td className="py-3 px-3">
                                            <div className="min-w-[150px]">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-black text-slate-900">{fmt(avanceTotal)}%</span>
                                                    <span className={`px-2 py-0.5 text-[10px] rounded-full border font-bold ${nivelClass(nivelPorcentaje(avanceTotal))}`}>
                                                        {nivelPorcentaje(avanceTotal)}
                                                    </span>
                                                </div>
                                                <ProgressBar porcentaje={avanceTotal} nivel={nivelPorcentaje(avanceTotal)} />
                                            </div>
                                        </td>
                                        <td className="py-3 pl-3 text-right text-[11px] font-black text-slate-500 uppercase tracking-wide">Resumen</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        );
    };

    if (!periodoSeleccionado) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center max-w-sm">
                        <Info size={48} className="text-gray-300 mx-auto mb-4" />
                        <h2 className="text-xl font-black text-gray-500 mb-2">Sin periodo seleccionado</h2>
                        <p className="text-gray-400 text-sm">Selecciona un periodo academico para habilitar el seguimiento.</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-7xl mx-auto space-y-5">
                {esVistaGlobal ? (
                    <>
                        {renderHeaderGlobal()}
                        {!!warningAgendas && (
                            <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                                <p className="text-sm font-semibold text-amber-800">{warningAgendas}</p>
                            </section>
                        )}
                        {renderFiltrosGlobal()}

                        {cargandoGlobal ? (
                            renderSkeletonGlobal()
                        ) : !docentesGlobal.length ? (
                            <section className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                                <AlertCircle size={42} className="mx-auto text-slate-300 mb-3" />
                                <h3 className="text-2xl font-black text-slate-800 mb-2">No hay docentes con seguimiento registrado en esta facultad para el periodo seleccionado.</h3>
                                <p className="text-sm text-slate-500 font-medium mb-3">Revisa filtros activos o limpia filtros para ampliar la consulta.</p>
                                <button
                                    type="button"
                                    onClick={limpiarFiltros}
                                    className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-black text-xs uppercase tracking-widest"
                                >
                                    Limpiar filtros
                                </button>
                            </section>
                        ) : vistaGlobal === 'cards' ? (
                            renderCardsGlobal()
                        ) : vistaGlobal === 'table' ? (
                            renderTablaGlobal()
                        ) : (
                            renderJerarquiaGlobal()
                        )}
                    </>
                ) : (
                    renderDocente()
                )}
            </div>

            {renderDrawerDocente()}
        </Layout>
    );
};

export default Seguimiento;
