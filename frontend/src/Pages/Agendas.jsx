import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ClipboardList,
    Plus,
    Search,
    Calendar,
    User,
    Filter,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import api from '../services/api';
import Layout from '../components/Layout';
import { toast } from 'react-toastify';
import TableActionButtons from '../Components/TableActionButtons';

/** Número de registros por página */
const REGISTROS_POR_PAGINA = 5;

/**
 * Página de administración de Agendas Docentes.
 * Muestra paginación de 5 en 5, ordenadas del registro más reciente al más antiguo.
 */
const Agendas = () => {
    const navigate = useNavigate();
    const [agendas, setAgendas] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [cargando, setCargando] = useState(true);
    const [paginaActual, setPaginaActual] = useState(1);
    const [anioActivo, setAnioActivo] = useState(null);
    const [buscarTodosLosAnios, setBuscarTodosLosAnios] = useState(false);
    const [errorCarga, setErrorCarga] = useState('');

    useEffect(() => {
        fetchAgendas();
    }, []);

    // Reiniciar a página 1 cada vez que cambia la búsqueda
    useEffect(() => {
        setPaginaActual(1);
    }, [busqueda]);

    const fetchAgendas = async () => {
        try {
            setCargando(true);
            setErrorCarga('');
            const { data } = await api.get('/agendas');
            setAgendas(Array.isArray(data) ? data : []);
        } catch (error) {
            const mensaje = error?.response?.data?.message || 'No fue posible cargar las agendas';
            setErrorCarga(String(mensaje));
            toast.error(String(mensaje));
            setAgendas([]);
        } finally {
            setCargando(false);
        }
    };

    /**
     * Elimina una agenda del sistema.
     * @param {number} id - ID de la agenda a eliminar.
     */
    const handleDelete = async (id) => {
        if (!window.confirm('¿Deseas eliminar permanentemente esta agenda? Se perderán todas las actividades asociadas.')) return;
        try {
            await api.delete(`/agendas/${id}`);
            toast.success('Agenda eliminada');
            fetchAgendas();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo eliminar la agenda');
        }
    };

    // Se respeta el orden recibido desde backend (agenda.id_agenda DESC)
    const ordenados = Array.isArray(agendas) ? agendas : [];

    // Agrupar todas las agendas por año para construir tabs dinámicas
    const agendasPorAnio = ordenados.reduce((acc, agenda) => {
        const anio = Number(agenda.periodo?.anio) || 0;
        if (!acc[anio]) acc[anio] = [];
        acc[anio].push(agenda);
        return acc;
    }, {});

    const aniosDisponibles = Object.keys(agendasPorAnio)
        .map(Number)
        .filter((anio) => anio > 0)
        .sort((a, b) => b - a);

    // Selección automática de año activo al cargar datos
    useEffect(() => {
        if (!aniosDisponibles.length) {
            setAnioActivo(null);
            return;
        }

        const anioActual = new Date().getFullYear();
        const anioSugerido = aniosDisponibles.includes(anioActual)
            ? anioActual
            : aniosDisponibles[0];

        setAnioActivo((prev) => (prev && aniosDisponibles.includes(prev) ? prev : anioSugerido));
    }, [agendas.length]);

    // Filtrar por búsqueda
    const filtrados = ordenados.filter(a =>
        a.docente?.nombres?.toLowerCase().includes(busqueda.toLowerCase()) ||
        a.docente?.identificacion?.toString().includes(busqueda) ||
        a.periodo?.anio?.toString().includes(busqueda) ||
        a.periodo?.periodo?.toLowerCase().includes(busqueda.toLowerCase()) ||
        a.estado?.toLowerCase().includes(busqueda.toLowerCase())
    );

    const filtradosPorAnioActivo = buscarTodosLosAnios
        ? filtrados
        : filtrados.filter((a) => Number(a.periodo?.anio) === anioActivo);

    // Paginación única por año activo
    const totalPaginas = Math.ceil(filtradosPorAnioActivo.length / REGISTROS_POR_PAGINA);
    const inicio = (paginaActual - 1) * REGISTROS_POR_PAGINA;
    const paginados = filtradosPorAnioActivo.slice(inicio, inicio + REGISTROS_POR_PAGINA);

    // Agrupar el resultado paginado por periodo A/B
    const agrupadosPorPeriodo = {
        A: paginados.filter((a) => a.periodo?.periodo === 'A'),
        B: paginados.filter((a) => a.periodo?.periodo === 'B'),
    };

    const getEstadoClass = (estado) => {
        switch (estado) {
            case 'En_Elaboracion':
                return 'bg-gray-100 text-gray-700 border-gray-200';
            case 'En_Revision':
                return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Con_Observaciones':
                return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'Aprobada':
                return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getEstadoLabel = (estado) => {
        switch (estado) {
            case 'En_Elaboracion':
                return 'En elaboracion';
            case 'En_Revision':
                return 'En revision';
            case 'Con_Observaciones':
                return 'Con observaciones';
            case 'Aprobada':
                return 'Aprobada';
            default:
                return estado ? String(estado).replaceAll('_', ' ') : 'Sin estado';
        }
    };

    const getEstadoBadge = (estado) => {
        const estadoClass = getEstadoClass(estado);
        const estadoLabel = getEstadoLabel(estado);

        return (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${estadoClass}`}>
                {estadoLabel}
            </span>
        );
    };

    return (
        <Layout>
            <div className="max-w-6xl mx-auto">

                {/* Header Seccional */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <div className="flex items-center space-x-2 mb-1">
                            <div className="w-8 h-1 bg-institutional-green rounded-full"></div>
                            <span className="text-[10px] font-black text-institutional-green uppercase tracking-[0.3em]">Administración</span>
                        </div>
                        <h1 className="text-3xl font-black text-institutional-dark uppercase tracking-tight">Agendas Docentes</h1>
                        <p className="text-gray-500 mt-1 font-medium">Control y seguimiento de la carga académica institucional</p>
                    </div>
                    <button
                        onClick={() => navigate('/admin/agendas/nueva')}
                        className="flex items-center space-x-2 bg-institutional-dark text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-institutional-blue transition-all shadow-xl shadow-institutional-dark/10"
                    >
                        <Plus size={18} />
                        <span>Aperturar Agenda</span>
                    </button>
                </div>

                {/* Barra de Búsqueda */}
                <div className="bg-white p-3 rounded-[1.75rem] border border-gray-100 shadow-sm mb-6 flex flex-col md:flex-row gap-3 items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por docente, periodo o estado..."
                            className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-6 py-3.5 text-sm font-bold focus:ring-2 focus:ring-institutional-green/20 transition-all"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center space-x-2 text-gray-400 px-4">
                        <Filter size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            {buscarTodosLosAnios
                                ? `${filtrados.length} registros`
                                : `${filtradosPorAnioActivo.length} registros`}
                        </span>
                    </div>
                </div>

                {/* Tabs por año */}
                <div className="mb-6 flex flex-wrap items-center gap-2">
                    {aniosDisponibles.map((anio) => (
                        <button
                            key={anio}
                            type="button"
                            onClick={() => {
                                setAnioActivo(anio);
                                setBuscarTodosLosAnios(false);
                                setPaginaActual(1);
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${anioActivo === anio && !buscarTodosLosAnios
                                ? 'bg-institutional-green/15 text-institutional-green border-institutional-green/30'
                                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            {anio} ({agendasPorAnio[anio]?.length || 0})
                        </button>
                    ))}

                    <label className="ml-auto inline-flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-gray-500 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={buscarTodosLosAnios}
                            onChange={(e) => {
                                setBuscarTodosLosAnios(e.target.checked);
                                setPaginaActual(1);
                            }}
                            className="rounded border-gray-300 text-institutional-green focus:ring-institutional-green/20"
                        />
                        <span>Buscar en todos los años</span>
                    </label>
                </div>

                {/* Secciones por periodo */}
                <div className="bg-white rounded-[2.25rem] border border-gray-100 shadow-sm overflow-hidden">
                    {cargando ? (
                        <div className="px-8 py-20 text-center">
                            <div className="flex flex-col items-center">
                                <div className="w-10 h-10 border-4 border-institutional-green/20 border-t-institutional-green rounded-full animate-spin mb-4"></div>
                                <span className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Cargando Agendas...</span>
                            </div>
                        </div>
                    ) : errorCarga ? (
                        <div className="px-8 py-20 text-center">
                            <div className="flex flex-col items-center">
                                <ClipboardList size={48} className="mb-4 text-red-300" />
                                <span className="text-sm font-black uppercase tracking-widest text-red-600">No fue posible cargar las agendas</span>
                                <p className="text-xs text-gray-500 mt-2 font-medium">{errorCarga}</p>
                                <button
                                    type="button"
                                    onClick={fetchAgendas}
                                    className="mt-5 inline-flex items-center space-x-2 bg-institutional-blue text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-institutional-blue/90 transition-all"
                                >
                                    <span>Reintentar</span>
                                </button>
                            </div>
                        </div>
                    ) : paginados.length === 0 ? (
                        <div className="px-8 py-20 text-center">
                            <div className="flex flex-col items-center opacity-20">
                                <ClipboardList size={48} className="mb-4" />
                                <span className="text-sm font-bold uppercase tracking-widest">No se encontraron agendas</span>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {(['A', 'B']).map((periodo) => {
                                const registrosPeriodo = agrupadosPorPeriodo[periodo];
                                if (!registrosPeriodo?.length) return null;

                                return (
                                    <div key={periodo} className="transition-all duration-300">
                                        <div className="w-full px-6 py-4 bg-gray-100/70 flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <Calendar size={16} className="text-gray-500" />
                                                <span className="text-sm font-black text-institutional-dark uppercase tracking-wider">
                                                    Periodo {periodo}
                                                </span>
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-institutional-blue/10 text-institutional-blue">
                                                    {registrosPeriodo.length} agendas
                                                </span>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead className="bg-gray-50/80 border-y border-gray-100">
                                                    <tr>
                                                        <th className="px-6 py-3 text-[10px] font-black text-gray-600 uppercase tracking-widest">Docente</th>
                                                        <th className="px-6 py-3 text-[10px] font-black text-gray-600 uppercase tracking-widest">Fecha Diligenciamiento</th>
                                                        <th className="px-6 py-3 text-[10px] font-black text-gray-600 uppercase tracking-widest">Vigencia Semestre</th>
                                                        <th className="px-6 py-3 text-[10px] font-black text-gray-600 uppercase tracking-widest">Estado</th>
                                                        <th className="px-6 py-3 text-[10px] font-black text-gray-600 uppercase tracking-widest text-right">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {registrosPeriodo.map((a) => (
                                                        <tr key={a.id_agenda} className="hover:bg-gray-50/50 transition-colors group">
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center space-x-4">
                                                                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-institutional-green group-hover:text-white transition-all duration-300">
                                                                        <User size={18} />
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-bold text-gray-900 text-sm uppercase tracking-tight">{a.docente?.nombres}</p>
                                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">ID: {a.docente?.identificacion}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center space-x-2 text-gray-700 font-black text-xs">
                                                                    <Calendar size={14} className="text-gray-400" />
                                                                    <span>{a.fecha_diligenciamiento ? new Date(a.fecha_diligenciamiento).toLocaleDateString() : '-'}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="text-[11px] font-black text-institutional-dark uppercase tracking-widest">
                                                                    {(a.inicio_semestre && a.fin_semestre)
                                                                        ? `${new Date(a.inicio_semestre).toLocaleDateString()} - ${new Date(a.fin_semestre).toLocaleDateString()}`
                                                                        : '-'}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                {getEstadoBadge(a.estado)}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <TableActionButtons
                                                                    onEdit={() => navigate(`/admin/agendas/editar/${a.id_agenda}`)}
                                                                    onDelete={() => handleDelete(a.id_agenda)}
                                                                    editTitle="Editar agenda"
                                                                    deleteTitle="Eliminar agenda"
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Paginación */}
                    {!cargando && totalPaginas > 1 && (
                        <div className="px-8 py-5 border-t border-gray-100 flex items-center justify-between">
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                                Mostrando {inicio + 1}–{Math.min(inicio + REGISTROS_POR_PAGINA, filtradosPorAnioActivo.length)} de {filtradosPorAnioActivo.length} registros
                            </p>
                            <div className="flex items-center space-x-2">
                                <button
                                    disabled={paginaActual === 1}
                                    onClick={() => setPaginaActual(p => p - 1)}
                                    className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-institutional-green hover:text-white hover:border-institutional-green disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronLeft size={16} />
                                </button>

                                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(num => (
                                    <button
                                        key={num}
                                        onClick={() => setPaginaActual(num)}
                                        className={`w-9 h-9 rounded-xl text-[11px] font-black transition-all ${num === paginaActual
                                            ? 'bg-institutional-green text-white shadow-lg shadow-institutional-green/30'
                                            : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                                            }`}
                                    >
                                        {num}
                                    </button>
                                ))}

                                <button
                                    disabled={paginaActual === totalPaginas}
                                    onClick={() => setPaginaActual(p => p + 1)}
                                    className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-institutional-green hover:text-white hover:border-institutional-green disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default Agendas;
