import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Activity,
    AlertCircle,
    Calendar,
    CalendarRange,
    ChevronLeft,
    ChevronRight,
    Clock,
    Eye,
    Filter,
    LayoutGrid,
    List,
    Plus,
    Search,
    Users,
    X,
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../services/api';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import TableActionButtons from '../Components/TableActionButtons';

const REGISTROS_POR_PAGINA = 5;

const normalizarTexto = (valor) => String(valor || '').trim().toLowerCase();

const capitalizarPrimera = (texto) => {
    const valor = normalizarTexto(texto);
    if (!valor) return '';
    return valor.charAt(0).toUpperCase() + valor.slice(1);
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

const badgeEstadoAgenda = (estado) => {
    if (estado === 'activo') {
        return {
            label: 'Activo',
            className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        };
    }
    if (estado === 'pendiente') {
        return {
            label: 'Pendiente',
            className: 'bg-amber-100 text-amber-800 border-amber-200',
        };
    }
    if (estado === 'sin_actividades') {
        return {
            label: 'Sin actividades',
            className: 'bg-slate-100 text-slate-700 border-slate-200',
        };
    }
    return {
        label: 'Sin agenda',
        className: 'bg-red-100 text-red-800 border-red-200',
    };
};

const Actividades = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { usuario, periodoSeleccionado, cargando: cargandoAuth } = useAuth();

    const rol = String(usuario?.rol || '').toUpperCase();
    const esVistaGlobal = rol === 'ADMIN' || rol === 'DECANO';

    const [agendas, setAgendas] = useState([]);
    const [agendaSeleccionada, setAgendaSeleccionada] = useState(null);
    const [sinAgendaDocente, setSinAgendaDocente] = useState(false);

    const [actividades, setActividades] = useState([]);
    const [resumenCortes, setResumenCortes] = useState([]);
    const [tipoActivo, setTipoActivo] = useState('');
    const [busquedaActividad, setBusquedaActividad] = useState('');
    const [errorListado, setErrorListado] = useState('');
    const [paginaActual, setPaginaActual] = useState(1);

    const [cargandoInicial, setCargandoInicial] = useState(true);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);

    const [vistaGlobal, setVistaGlobal] = useState('grid');
    const [buscarDocente, setBuscarDocente] = useState('');
    const [estadoFiltro, setEstadoFiltro] = useState('todos');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [drawerAbierto, setDrawerAbierto] = useState(false);

    const periodoActivoId = Number(periodoSeleccionado?.id_periodo || 0);

    useEffect(() => {
        if (cargandoAuth) return;

        const cargarInicial = async () => {
            setCargandoInicial(true);
            setSinAgendaDocente(false);
            setErrorListado('');

            try {
                if (esVistaGlobal) {
                    const { data } = await api.get('/agendas');
                    setAgendas(Array.isArray(data) ? data : []);

                    const idAgendaParam = Number(searchParams.get('id_agenda') || 0);
                    if (idAgendaParam > 0) {
                        const agendaParam = (Array.isArray(data) ? data : []).find((item) => Number(item?.id_agenda) === idAgendaParam);
                        if (agendaParam) {
                            setAgendaSeleccionada(agendaParam);
                            setDrawerAbierto(true);
                        }
                    }
                } else {
                    if (!periodoActivoId) {
                        setSinAgendaDocente(true);
                        setAgendaSeleccionada(null);
                        return;
                    }

                    try {
                        const { data } = await api.get(`/agendas/mi-agenda?id_periodo=${periodoActivoId}`);
                        setAgendaSeleccionada(data || null);
                    } catch (error) {
                        if (error?.response?.status === 404) {
                            setSinAgendaDocente(true);
                            setAgendaSeleccionada(null);
                        } else {
                            toast.error('No fue posible cargar tu agenda del periodo activo');
                        }
                    }
                }
            } catch {
                toast.error('No fue posible cargar los datos del modulo de actividades');
            } finally {
                setCargandoInicial(false);
            }
        };

        cargarInicial();
    }, [cargandoAuth, esVistaGlobal, periodoActivoId, searchParams]);

    useEffect(() => {
        if (!agendaSeleccionada?.id_agenda) {
            setActividades([]);
            setResumenCortes([]);
            setTipoActivo('');
            setPaginaActual(1);
            setBusquedaActividad('');
            return;
        }

        const cargarDetalleAgenda = async () => {
            setCargandoDetalle(true);
            setErrorListado('');
            try {
                const [resActividades, resResumen] = await Promise.all([
                    api.get(`/actividades?id_agenda=${agendaSeleccionada.id_agenda}`),
                    api.get(`/actividades/resumen-cortes?id_agenda=${agendaSeleccionada.id_agenda}`),
                ]);

                const listaActividades = Array.isArray(resActividades?.data) ? resActividades.data : [];
                const listaResumen = Array.isArray(resResumen?.data) ? resResumen.data : [];

                setActividades(listaActividades);
                setResumenCortes(listaResumen);
                setPaginaActual(1);
            } catch {
                setErrorListado('No fue posible cargar las actividades de la agenda seleccionada.');
                setActividades([]);
                setResumenCortes([]);
            } finally {
                setCargandoDetalle(false);
            }
        };

        cargarDetalleAgenda();
    }, [agendaSeleccionada]);

    useEffect(() => {
        setPaginaActual(1);
    }, [busquedaActividad, tipoActivo]);

    const agendasPeriodo = useMemo(() => {
        if (!esVistaGlobal) return [];
        const base = Array.isArray(agendas) ? agendas : [];
        if (!periodoActivoId) return base;
        return base.filter((agenda) => Number(agenda?.id_periodo) === periodoActivoId);
    }, [agendas, esVistaGlobal, periodoActivoId]);

    const agendasFiltradas = useMemo(() => {
        const texto = normalizarTexto(buscarDocente);
        const fechaDesdeObj = fechaDesde ? new Date(`${fechaDesde}T00:00:00`) : null;
        const fechaHastaObj = fechaHasta ? new Date(`${fechaHasta}T23:59:59`) : null;

        return agendasPeriodo.filter((agenda) => {
            const nombreDocente = normalizarTexto(agenda?.docente?.nombres);
            const estadoCalculado = obtenerEstadoAgenda(agenda);
            const fechaReferencia = new Date(agenda?.fecha_diligenciamiento || agenda?.inicio_semestre || agenda?.created_at || 0);

            const coincideTexto = !texto || nombreDocente.includes(texto);
            const coincideEstado = estadoFiltro === 'todos' || estadoCalculado === estadoFiltro;

            let coincideFecha = true;
            if (fechaDesdeObj && !Number.isNaN(fechaReferencia.getTime())) {
                coincideFecha = coincideFecha && fechaReferencia >= fechaDesdeObj;
            }
            if (fechaHastaObj && !Number.isNaN(fechaReferencia.getTime())) {
                coincideFecha = coincideFecha && fechaReferencia <= fechaHastaObj;
            }

            return coincideTexto && coincideEstado && coincideFecha;
        });
    }, [agendasPeriodo, buscarDocente, estadoFiltro, fechaDesde, fechaHasta]);

    const metricasGlobales = useMemo(() => {
        const totalAgendas = agendasPeriodo.length;
        const totalDocentes = new Set(agendasPeriodo.map((agenda) => Number(agenda?.id_docente || 0)).filter(Boolean)).size;
        const totalActividades = agendasPeriodo.reduce((acc, agenda) => acc + Number(agenda?.actividades?.length || 0), 0);
        const agendasActivas = agendasPeriodo.filter((agenda) => obtenerEstadoAgenda(agenda) === 'activo').length;

        return {
            totalDocentes,
            totalAgendas,
            totalActividades,
            agendasActivas,
        };
    }, [agendasPeriodo]);

    const actividadesOrdenadas = useMemo(() => {
        return [...actividades].sort((a, b) => Number(a?.id_actividad || 0) - Number(b?.id_actividad || 0));
    }, [actividades]);

    const tiposDinamicos = useMemo(() => {
        return actividadesOrdenadas.reduce((acc, actividad) => {
            const nombreTipo = actividad?.tipoActividad?.nombre?.trim();
            if (nombreTipo && !acc.includes(nombreTipo)) acc.push(nombreTipo);
            return acc;
        }, []);
    }, [actividadesOrdenadas]);

    useEffect(() => {
        if (!tiposDinamicos.length) {
            setTipoActivo('');
            return;
        }
        setTipoActivo((prev) => (prev && tiposDinamicos.includes(prev) ? prev : tiposDinamicos[0]));
    }, [tiposDinamicos]);

    const actividadesFiltradas = useMemo(() => {
        const texto = normalizarTexto(busquedaActividad);
        return actividadesOrdenadas.filter((actividad) => {
            const coincideTipo = tipoActivo ? actividad?.tipoActividad?.nombre === tipoActivo : true;
            const coincideTexto =
                normalizarTexto(actividad?.nombre).includes(texto)
                || normalizarTexto(actividad?.fuente_verificacion).includes(texto)
                || normalizarTexto(actividad?.descripcion).includes(texto);
            return coincideTipo && coincideTexto;
        });
    }, [actividadesOrdenadas, tipoActivo, busquedaActividad]);

    const totalPaginas = useMemo(() => {
        return Math.max(1, Math.ceil(actividadesFiltradas.length / REGISTROS_POR_PAGINA));
    }, [actividadesFiltradas]);

    const inicio = (paginaActual - 1) * REGISTROS_POR_PAGINA;
    const actividadesPaginadas = actividadesFiltradas.slice(inicio, inicio + REGISTROS_POR_PAGINA);

    const totalesPorTipo = useMemo(() => {
        return tiposDinamicos.reduce((acc, tipo) => {
            acc[tipo] = actividadesOrdenadas
                .filter((actividad) => actividad?.tipoActividad?.nombre === tipo)
                .reduce((sum, actividad) => sum + Number(actividad?.horas_semanales || 0), 0);
            return acc;
        }, {});
    }, [tiposDinamicos, actividadesOrdenadas]);

    const totalHorasAgenda = useMemo(() => {
        return actividadesOrdenadas.reduce((sum, actividad) => sum + Number(actividad?.horas_semanales || 0), 0);
    }, [actividadesOrdenadas]);

    const totalGeneralHorasTipos = useMemo(() => {
        return Object.values(totalesPorTipo).reduce((sum, valor) => sum + Number(valor || 0), 0);
    }, [totalesPorTipo]);

    const resumenSemanasPorCorte = { 1: 0, 2: 0, 3: 0 };
    const resumenHorasPorCorte = { 1: 0, 2: 0, 3: 0 };

    [...resumenCortes]
        .sort((a, b) => Number(a?.numero_corte || 0) - Number(b?.numero_corte || 0))
        .forEach((corte) => {
            const numeroCorte = Number(corte?.numero_corte || 0);
            if (![1, 2, 3].includes(numeroCorte)) return;

            const semanasBackend = Number(corte?.semanas || 0);
            resumenSemanasPorCorte[numeroCorte] = Number.isFinite(semanasBackend) && semanasBackend > 0 ? semanasBackend : 0;
            resumenHorasPorCorte[numeroCorte] = Number(corte?.horas_planeadas_total || 0);
        });

    const totalSemanasPeriodo = Number(resumenSemanasPorCorte[1] || 0) + Number(resumenSemanasPorCorte[2] || 0) + Number(resumenSemanasPorCorte[3] || 0);
    const totalHorasPeriodo = Number(resumenHorasPorCorte[1] || 0) + Number(resumenHorasPorCorte[2] || 0) + Number(resumenHorasPorCorte[3] || 0);

    const abrirDetalleAgenda = (agenda) => {
        setAgendaSeleccionada(agenda);
        if (esVistaGlobal) {
            setDrawerAbierto(true);
        }
    };

    const cerrarDrawer = () => {
        setDrawerAbierto(false);
        if (esVistaGlobal) {
            setAgendaSeleccionada(null);
            setActividades([]);
            setResumenCortes([]);
            setBusquedaActividad('');
            setTipoActivo('');
        }
    };

    const handleDelete = async (idActividad) => {
        if (!window.confirm('Eliminar esta actividad? Se descontaran sus horas de la agenda.')) return;
        try {
            await api.delete(`/actividades/${idActividad}`);
            toast.success('Actividad eliminada');

            if (agendaSeleccionada?.id_agenda) {
                const { data } = await api.get(`/actividades?id_agenda=${agendaSeleccionada.id_agenda}`);
                setActividades(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || 'No se pudo eliminar la actividad');
        }
    };

    const renderSkeletonGlobal = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
                <div key={`skeleton-card-${index}`} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse">
                    <div className="h-4 w-24 bg-slate-200 rounded mb-3" />
                    <div className="h-6 w-52 bg-slate-200 rounded mb-4" />
                    <div className="h-10 w-full bg-slate-100 rounded-2xl mb-3" />
                    <div className="h-10 w-full bg-slate-100 rounded-2xl" />
                </div>
            ))}
        </div>
    );

    const renderPanelDetalle = () => {
        const contenedorClass = esVistaGlobal
            ? 'fixed inset-y-0 right-0 z-[70] w-full md:w-[760px] bg-white border-l border-slate-200 shadow-2xl overflow-y-auto'
            : 'bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden';

        const cabecera = (
            <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-[#f1f8f4] to-white flex items-center justify-between gap-3">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#1f9d78]">Detalle de actividades</p>
                    <h3 className="text-xl font-black text-[#0f2923] tracking-tight">
                        {agendaSeleccionada?.docente?.nombres || 'Agenda seleccionada'}
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-1">
                        Periodo {agendaSeleccionada?.periodo?.anio}-{agendaSeleccionada?.periodo?.periodo}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => navigate(`/actividades/nueva?id_agenda=${agendaSeleccionada?.id_agenda}`)}
                        className="h-10 px-4 rounded-xl bg-institutional-green text-white hover:bg-institutional-green/90 text-xs font-black uppercase tracking-widest inline-flex items-center gap-2"
                    >
                        <Plus size={15} /> Nueva actividad
                    </button>
                    {esVistaGlobal && (
                        <button
                            type="button"
                            onClick={cerrarDrawer}
                            className="h-10 w-10 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 grid place-items-center"
                            title="Cerrar detalle"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>
        );

        return (
            <div className={contenedorClass}>
                {cabecera}

                <div className="p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <article className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-700">Actividades</p>
                            <p className="text-2xl font-black text-sky-900 mt-1">{actividades.length}</p>
                        </article>
                        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Horas/semana</p>
                            <p className="text-2xl font-black text-emerald-900 mt-1">{Number(totalHorasAgenda || 0).toFixed(2)} h</p>
                        </article>
                        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">Estado agenda</p>
                            <p className="text-sm font-black text-slate-900 mt-2">{agendaSeleccionada?.estado || 'Sin estado'}</p>
                        </article>
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-3 bg-slate-50/70 flex items-center gap-3">
                        <Search size={17} className="text-slate-400" />
                        <input
                            type="text"
                            value={busquedaActividad}
                            onChange={(e) => setBusquedaActividad(e.target.value)}
                            className="w-full bg-transparent text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none"
                            placeholder="Buscar actividad por nombre, descripcion o fuente de verificacion..."
                        />
                    </div>

                    {!!tiposDinamicos.length && (
                        <div className="flex flex-wrap gap-2">
                            {tiposDinamicos.map((tipo) => {
                                const activo = tipoActivo === tipo;
                                const cantidad = actividades.filter((item) => item?.tipoActividad?.nombre === tipo).length;
                                return (
                                    <button
                                        key={tipo}
                                        type="button"
                                        onClick={() => setTipoActivo(tipo)}
                                        className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all ${activo
                                            ? 'bg-institutional-green text-white border-institutional-green'
                                            : 'bg-[#235347] text-white border-[#173831] hover:bg-[#1f4a3e]'
                                            }`}
                                    >
                                        {tipo} ({cantidad})
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div className="rounded-3xl border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-600">#</th>
                                        <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-600">Actividad</th>
                                        <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-600">Horas/Sem</th>
                                        <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-600">Fuente</th>
                                        <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-widest text-slate-600">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cargandoDetalle ? (
                                        <tr>
                                            <td colSpan="5" className="px-4 py-16 text-center text-slate-500 font-semibold">Cargando actividades...</td>
                                        </tr>
                                    ) : errorListado ? (
                                        <tr>
                                            <td colSpan="5" className="px-4 py-16 text-center text-amber-700 font-semibold">{errorListado}</td>
                                        </tr>
                                    ) : !actividadesPaginadas.length ? (
                                        <tr>
                                            <td colSpan="5" className="px-4 py-16 text-center text-slate-500 font-semibold">No hay actividades para el filtro aplicado.</td>
                                        </tr>
                                    ) : actividadesPaginadas.map((actividad, index) => (
                                        <tr key={actividad.id_actividad} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                                            <td className="px-4 py-3 text-xs font-black text-slate-500">{inicio + index + 1}</td>
                                            <td className="px-4 py-3">
                                                <p className="font-bold text-slate-900">{capitalizarPrimera(actividad?.nombre)}</p>
                                                {actividad?.descripcion && (
                                                    <p className="text-xs text-slate-500 truncate max-w-[280px]">{actividad.descripcion}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-slate-700">{Number(actividad?.horas_semanales || 0).toFixed(2)} h</td>
                                            <td className="px-4 py-3 text-xs text-slate-600">{actividad?.fuente_verificacion || '—'}</td>
                                            <td className="px-4 py-3 text-right">
                                                <TableActionButtons
                                                    onEdit={() => navigate(`/actividades/editar/${actividad.id_actividad}?id_agenda=${agendaSeleccionada?.id_agenda}`)}
                                                    onDelete={() => handleDelete(actividad.id_actividad)}
                                                    editTitle="Editar actividad"
                                                    deleteTitle="Eliminar actividad"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {!cargandoDetalle && totalPaginas > 1 && (
                            <div className="px-4 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                                <p className="text-xs font-semibold text-slate-500">
                                    Mostrando {actividadesPaginadas.length} de {actividadesFiltradas.length} actividades
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={paginaActual <= 1}
                                        onClick={() => setPaginaActual((prev) => Math.max(1, prev - 1))}
                                        className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                                    >
                                        <ChevronLeft size={14} className="mx-auto" />
                                    </button>
                                    <span className="text-xs font-black text-slate-700 px-2">{paginaActual} / {totalPaginas}</span>
                                    <button
                                        type="button"
                                        disabled={paginaActual >= totalPaginas}
                                        onClick={() => setPaginaActual((prev) => Math.min(totalPaginas, prev + 1))}
                                        className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                                    >
                                        <ChevronRight size={14} className="mx-auto" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {!!tiposDinamicos.length && (
                        <div className="rounded-2xl border border-slate-200 p-4 bg-white">
                            <div className="flex flex-wrap gap-2">
                                {tiposDinamicos.map((tipo) => (
                                    <div
                                        key={`total-${tipo}`}
                                        className="h-8 px-3 rounded-lg bg-[#8CB79B] border border-[#235347] text-[10px] font-black uppercase tracking-wider text-black inline-flex items-center"
                                    >
                                        {tipo}: {Number(totalesPorTipo[tipo] || 0).toFixed(2)} h
                                    </div>
                                ))}
                                <div className="h-8 px-3 rounded-lg bg-[#8CB79B] border border-[#235347] text-[10px] font-black uppercase tracking-wider text-black inline-flex items-center">
                                    Total general: {Number(totalGeneralHorasTipos || 0).toFixed(2)} h
                                </div>
                            </div>
                        </div>
                    )}

                    {!!resumenCortes.length && (
                        <div className="rounded-3xl border border-[#8CB79B]/35 overflow-hidden shadow-sm bg-gradient-to-br from-white via-[#F7FBF8] to-[#EEF7F1]">
                            <div className="px-5 py-4 border-b border-[#8CB79B]/30 bg-[#235347] text-white flex items-center justify-between gap-3 flex-wrap">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#CFE5D6]">Resumen del periodo</p>
                                    <p className="text-sm md:text-base font-black uppercase tracking-wider">
                                        Periodo: {agendaSeleccionada?.periodo?.anio}-{agendaSeleccionada?.periodo?.periodo}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#CFE5D6]">Horas / semana del docente</p>
                                    <p className="text-lg font-black text-white">{Number(totalGeneralHorasTipos || 0).toFixed(2)} h</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[580px]">
                                    <thead>
                                        <tr className="bg-[#E6F2EA] text-[#0F2F26]">
                                            <th className="px-5 py-3 text-left text-[11px] font-black uppercase tracking-widest">Indicador</th>
                                            <th className="px-5 py-3 text-center text-[11px] font-black uppercase tracking-widest">Corte 1</th>
                                            <th className="px-5 py-3 text-center text-[11px] font-black uppercase tracking-widest">Corte 2</th>
                                            <th className="px-5 py-3 text-center text-[11px] font-black uppercase tracking-widest">Corte 3</th>
                                            <th className="px-5 py-3 text-center text-[11px] font-black uppercase tracking-widest bg-[#D4E9DA]">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-t border-[#8CB79B]/20">
                                            <td className="px-5 py-3 text-sm font-black text-[#173831]">Semanas</td>
                                            <td className="px-5 py-3 text-center text-sm font-semibold text-[#173831]">{resumenSemanasPorCorte[1]}</td>
                                            <td className="px-5 py-3 text-center text-sm font-semibold text-[#173831]">{resumenSemanasPorCorte[2]}</td>
                                            <td className="px-5 py-3 text-center text-sm font-semibold text-[#173831]">{resumenSemanasPorCorte[3]}</td>
                                            <td className="px-5 py-3 text-center text-sm font-black text-[#0D271F] bg-[#F0F8F3]">{totalSemanasPeriodo}</td>
                                        </tr>
                                        <tr className="border-t border-[#8CB79B]/20">
                                            <td className="px-5 py-3 text-sm font-black text-[#173831]">Horas</td>
                                            <td className="px-5 py-3 text-center text-sm font-semibold text-[#173831]">{Number(resumenHorasPorCorte[1] || 0).toFixed(2)} h</td>
                                            <td className="px-5 py-3 text-center text-sm font-semibold text-[#173831]">{Number(resumenHorasPorCorte[2] || 0).toFixed(2)} h</td>
                                            <td className="px-5 py-3 text-center text-sm font-semibold text-[#173831]">{Number(resumenHorasPorCorte[3] || 0).toFixed(2)} h</td>
                                            <td className="px-5 py-3 text-center text-sm font-black text-[#0D271F] bg-[#F0F8F3]">{Number(totalHorasPeriodo || 0).toFixed(2)} h</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderVistaGlobal = () => {
        if (cargandoInicial) return renderSkeletonGlobal();

        if (!agendasPeriodo.length) {
            return (
                <section className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                    <AlertCircle size={42} className="mx-auto text-slate-300 mb-3" />
                    <h3 className="text-2xl font-black text-slate-800 mb-2">Sin agendas para el periodo activo</h3>
                    <p className="text-sm text-slate-500 font-medium">No hay agendas registradas para el periodo seleccionado. Ajusta el periodo o crea agendas nuevas.</p>
                </section>
            );
        }

        if (!agendasFiltradas.length) {
            return (
                <section className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                    <Filter size={42} className="mx-auto text-slate-300 mb-3" />
                    <h3 className="text-2xl font-black text-slate-800 mb-2">Sin resultados para el filtro actual</h3>
                    <p className="text-sm text-slate-500 font-medium">Prueba limpiando filtros o ajustando el rango de fechas.</p>
                </section>
            );
        }

        if (vistaGlobal === 'table') {
            return (
                <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px] text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-600">Docente</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-600">Periodo</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-600">Estado</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-600">Actividades</th>
                                    <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-slate-600">Fecha</th>
                                    <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-widest text-slate-600">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {agendasFiltradas.map((agenda) => {
                                    const estado = obtenerEstadoAgenda(agenda);
                                    const badge = badgeEstadoAgenda(estado);
                                    const totalActividades = Number(agenda?.actividades?.length || 0);
                                    return (
                                        <tr key={agenda.id_agenda} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                                            <td className="px-4 py-3 font-bold text-slate-900">{agenda?.docente?.nombres || 'Docente'}</td>
                                            <td className="px-4 py-3 text-slate-700">{agenda?.periodo?.anio}-{agenda?.periodo?.periodo}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${badge.className}`}>{badge.label}</span>
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-slate-700">{totalActividades}</td>
                                            <td className="px-4 py-3 text-slate-600">{formatearFecha(agenda?.fecha_diligenciamiento || agenda?.inicio_semestre)}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => abrirDetalleAgenda(agenda)}
                                                        className="h-8 px-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-black text-[11px] uppercase tracking-wide inline-flex items-center gap-1"
                                                    >
                                                        <Eye size={13} /> Ver actividades
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/actividades/nueva?id_agenda=${agenda.id_agenda}`)}
                                                        className="h-8 px-3 rounded-lg bg-institutional-green text-white hover:bg-institutional-green/90 font-black text-[11px] uppercase tracking-wide inline-flex items-center gap-1"
                                                    >
                                                        <Plus size={13} /> Nueva
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            );
        }

        return (
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {agendasFiltradas.map((agenda) => {
                    const estado = obtenerEstadoAgenda(agenda);
                    const badge = badgeEstadoAgenda(estado);
                    const totalActividades = Number(agenda?.actividades?.length || 0);
                    const totalHoras = Number((agenda?.actividades || []).reduce((sum, item) => sum + Number(item?.horas_semanales || 0), 0));

                    return (
                        <article
                            key={agenda.id_agenda}
                            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-lg transition-all duration-200"
                        >
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Docente</p>
                                    <h3 className="text-lg font-black text-[#0f2923] leading-tight">{agenda?.docente?.nombres || 'Docente'}</h3>
                                </div>
                                <span className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${badge.className}`}>
                                    {badge.label}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Actividades</p>
                                    <p className="text-xl font-black text-slate-900 mt-1">{totalActividades}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Horas / semana</p>
                                    <p className="text-xl font-black text-slate-900 mt-1">{totalHoras.toFixed(2)} h</p>
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 px-3 py-2 mb-4">
                                <p className="text-xs text-slate-600 font-semibold">
                                    Periodo {agenda?.periodo?.anio}-{agenda?.periodo?.periodo}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">Fecha de agenda: {formatearFecha(agenda?.fecha_diligenciamiento || agenda?.inicio_semestre)}</p>
                                {totalActividades <= 0 && (
                                    <p className="text-xs font-bold text-amber-700 mt-1">Alerta: esta agenda no tiene actividades registradas.</p>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => abrirDetalleAgenda(agenda)}
                                    className="flex-1 h-10 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-black text-[11px] uppercase tracking-wide inline-flex items-center justify-center gap-1"
                                >
                                    <Eye size={14} /> Ver actividades
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate(`/actividades/nueva?id_agenda=${agenda.id_agenda}`)}
                                    className="flex-1 h-10 rounded-xl bg-institutional-green text-white hover:bg-institutional-green/90 font-black text-[11px] uppercase tracking-wide inline-flex items-center justify-center gap-1"
                                >
                                    <Plus size={14} /> Nueva
                                </button>
                            </div>
                        </article>
                    );
                })}
            </section>
        );
    };

    const renderVistaDocente = () => {
        if (cargandoInicial) {
            return (
                <section className="rounded-3xl border border-slate-200 bg-white p-14 shadow-sm flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-institutional-green/20 border-t-institutional-green rounded-full animate-spin" />
                    <p className="text-sm text-slate-500 font-semibold">Cargando agenda del docente...</p>
                </section>
            );
        }

        if (sinAgendaDocente || !agendaSeleccionada) {
            return (
                <section className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                    <AlertCircle size={42} className="mx-auto text-amber-400 mb-3" />
                    <h3 className="text-2xl font-black text-slate-800 mb-2">Sin agenda activa</h3>
                    <p className="text-sm text-slate-500 font-medium max-w-lg mx-auto">
                        No tienes una agenda registrada para el periodo {periodoSeleccionado?.anio}-{periodoSeleccionado?.periodo}. Contacta administracion para la apertura.
                    </p>
                </section>
            );
        }

        return (
            <div className="space-y-4">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl border border-emerald-200 bg-emerald-50 grid place-items-center">
                            <Calendar size={22} className="text-emerald-700" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Agenda activa</p>
                            <h3 className="text-xl font-black text-slate-900">Periodo {agendaSeleccionada?.periodo?.anio}-{agendaSeleccionada?.periodo?.periodo}</h3>
                            <p className="text-xs text-slate-500 font-semibold mt-1">Estado: {agendaSeleccionada?.estado || 'Sin estado'}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate(`/actividades/nueva?id_agenda=${agendaSeleccionada?.id_agenda}`)}
                        className="h-11 px-5 rounded-xl bg-institutional-green text-white hover:bg-institutional-green/90 font-black text-xs uppercase tracking-widest inline-flex items-center justify-center gap-2"
                    >
                        <Plus size={16} /> Nueva actividad
                    </button>
                </section>

                {renderPanelDetalle()}
            </div>
        );
    };

    return (
        <Layout>
            <div className="max-w-7xl mx-auto space-y-5">
                <header className="rounded-3xl border border-[#d3e3d9] bg-gradient-to-r from-[#f6fbf8] to-white p-6 shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#006431]">Modulo SIGEDIN</p>
                            <h1 className="text-3xl font-black text-[#0f2923] tracking-tight">Actividades</h1>
                            <p className="text-sm text-slate-600 font-medium mt-1">
                                {esVistaGlobal
                                    ? 'Vision consolidada de agendas y actividades por docente en el periodo seleccionado.'
                                    : 'Gestiona unicamente tus actividades del periodo activo.'}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 min-w-[280px]">
                            <article className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-sky-700">Docentes</p>
                                <p className="text-xl font-black text-sky-900 mt-1">{esVistaGlobal ? metricasGlobales.totalDocentes : 1}</p>
                            </article>
                            <article className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Agendas activas</p>
                                <p className="text-xl font-black text-emerald-900 mt-1">{esVistaGlobal ? metricasGlobales.agendasActivas : (agendaSeleccionada ? 1 : 0)}</p>
                            </article>
                            <article className="rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Agendas periodo</p>
                                <p className="text-xl font-black text-indigo-900 mt-1">{esVistaGlobal ? metricasGlobales.totalAgendas : (agendaSeleccionada ? 1 : 0)}</p>
                            </article>
                            <article className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Actividades</p>
                                <p className="text-xl font-black text-amber-900 mt-1">{esVistaGlobal ? metricasGlobales.totalActividades : actividades.length}</p>
                            </article>
                        </div>
                    </div>
                </header>

                {esVistaGlobal ? (
                    <>
                        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                                <div className="lg:col-span-4 rounded-2xl border border-slate-200 px-3 py-2 bg-slate-50 flex items-center gap-2">
                                    <Search size={16} className="text-slate-400" />
                                    <input
                                        type="text"
                                        value={buscarDocente}
                                        onChange={(e) => setBuscarDocente(e.target.value)}
                                        placeholder="Buscar docente en tiempo real..."
                                        className="w-full bg-transparent text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none"
                                    />
                                </div>

                                <div className="lg:col-span-2 rounded-2xl border border-slate-200 px-3 py-2 bg-slate-50 flex items-center gap-2">
                                    <Filter size={16} className="text-slate-400" />
                                    <select
                                        value={estadoFiltro}
                                        onChange={(e) => setEstadoFiltro(e.target.value)}
                                        className="w-full bg-transparent text-sm font-semibold text-slate-800 focus:outline-none"
                                    >
                                        <option value="todos">Todos</option>
                                        <option value="activo">Activo</option>
                                        <option value="sin_actividades">Sin actividades</option>
                                        <option value="pendiente">Pendiente</option>
                                    </select>
                                </div>

                                <div className="lg:col-span-2 rounded-2xl border border-slate-200 px-3 py-2 bg-slate-50 flex items-center gap-2">
                                    <CalendarRange size={16} className="text-slate-400" />
                                    <input
                                        type="date"
                                        value={fechaDesde}
                                        onChange={(e) => setFechaDesde(e.target.value)}
                                        className="w-full bg-transparent text-sm font-semibold text-slate-800 focus:outline-none"
                                    />
                                </div>

                                <div className="lg:col-span-2 rounded-2xl border border-slate-200 px-3 py-2 bg-slate-50 flex items-center gap-2">
                                    <CalendarRange size={16} className="text-slate-400" />
                                    <input
                                        type="date"
                                        value={fechaHasta}
                                        onChange={(e) => setFechaHasta(e.target.value)}
                                        className="w-full bg-transparent text-sm font-semibold text-slate-800 focus:outline-none"
                                    />
                                </div>

                                <div className="lg:col-span-2 flex items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setVistaGlobal('grid')}
                                        className={`h-10 px-3 rounded-xl border text-xs font-black uppercase tracking-wider inline-flex items-center gap-1 ${vistaGlobal === 'grid'
                                            ? 'bg-institutional-green text-white border-institutional-green'
                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                            }`}
                                    >
                                        <LayoutGrid size={14} /> Grid
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
                                </div>
                            </div>
                        </section>

                        {renderVistaGlobal()}
                    </>
                ) : renderVistaDocente()}
            </div>

            {esVistaGlobal && drawerAbierto && (
                <div className="fixed inset-0 z-[65] bg-slate-900/45 backdrop-blur-[2px]" onClick={cerrarDrawer} />
            )}

            {esVistaGlobal && drawerAbierto && agendaSeleccionada && renderPanelDetalle()}

            {esVistaGlobal && drawerAbierto && (
                <button
                    type="button"
                    onClick={cerrarDrawer}
                    className="fixed top-5 right-5 z-[80] h-10 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-sm hover:bg-slate-100 text-xs font-black uppercase tracking-wider"
                >
                    Cerrar
                </button>
            )}
        </Layout>
    );
};

export default Actividades;
