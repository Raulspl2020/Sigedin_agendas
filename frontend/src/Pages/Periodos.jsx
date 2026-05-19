import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../Components/Layout';
import api from '../services/api';
import { extraerMensajeError } from '../services/apiErrors';
import {
    Plus,
    Calendar,
    CalendarRange,
    ArrowRight,
    Search,
    Filter,
    Loader2,
    ChevronDown,
} from 'lucide-react';
import { toast } from 'react-toastify';
import TableActionButtons from '../Components/TableActionButtons';

const REGISTROS_POR_PAGINA = 5;

/**
 * Página de gestión de periodos académicos.
 * Implementa listado con filtro, y navega a una página completa
 * para crear o editar (sin modal).
 *
 * @returns {JSX.Element} Componente de página de periodos.
 */
const Periodos = () => {
    const navigate = useNavigate();
    const [periodos, setPeriodos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [filtro, setFiltro] = useState('');
    const [paginaActual, setPaginaActual] = useState(1);
    const [expandidos, setExpandidos] = useState({});
    const [cortesPorPeriodo, setCortesPorPeriodo] = useState({});
    const [cargandoCortes, setCargandoCortes] = useState({});

    useEffect(() => {
        fetchPeriodos();
    }, []);

    /**
     * Obtiene la lista de periodos académicos desde la API.
     */
    const fetchPeriodos = async () => {
        try {
            setCargando(true);
            const { data } = await api.get('/agendas/periodos');
            setPeriodos(data);
        } catch (error) {
            toast.error('Error al cargar periodos académicos');
        } finally {
            setCargando(false);
        }
    };

    /**
     * Elimina un periodo académico tras confirmación del usuario.
     * @param {number} id - ID del periodo a eliminar.
     */
    const handleDelete = async (id) => {
        if (!window.confirm('¿Está seguro de eliminar este periodo? No podrá deshacerse si tiene datos asociados.')) return;

        try {
            await api.delete(`/agendas/periodos/${id}`);
            toast.success('Periodo eliminado correctamente');
            fetchPeriodos();
        } catch (error) {
            const mensaje = extraerMensajeError(error, 'No se puede eliminar el periodo');
            toast.error(mensaje);
        }
    };

    /** Periodos filtrados según el texto ingresado por el usuario. */
    const periodosFiltrados = periodos.filter((p) =>
        p.anio.toString().includes(filtro) ||
        p.periodo.toLowerCase().includes(filtro.toLowerCase()) ||
        `${p.anio}-${p.periodo}`.toLowerCase().includes(filtro.toLowerCase()),
    );

    const periodosOrdenados = [...periodosFiltrados].sort((a, b) => {
        if (b.anio !== a.anio) return b.anio - a.anio;
        if (b.periodo !== a.periodo) return b.periodo.localeCompare(a.periodo);
        const inicioA = a.fecha_inicio ? new Date(a.fecha_inicio).getTime() : 0;
        const inicioB = b.fecha_inicio ? new Date(b.fecha_inicio).getTime() : 0;
        return inicioB - inicioA;
    });

    useEffect(() => {
        setPaginaActual(1);
    }, [filtro]);

    const totalPaginas = Math.max(1, Math.ceil(periodosOrdenados.length / REGISTROS_POR_PAGINA));
    const inicio = (paginaActual - 1) * REGISTROS_POR_PAGINA;
    const periodosPaginados = periodosOrdenados.slice(inicio, inicio + REGISTROS_POR_PAGINA);

    const toggleExpandir = async (idPeriodo) => {
        const estaAbierto = !!expandidos[idPeriodo];
        setExpandidos((prev) => ({ ...prev, [idPeriodo]: !estaAbierto }));

        if (estaAbierto || cortesPorPeriodo[idPeriodo] !== undefined) return;

        try {
            setCargandoCortes((prev) => ({ ...prev, [idPeriodo]: true }));
            const { data } = await api.get(`/agendas/cortes?id_periodo=${idPeriodo}`);
            setCortesPorPeriodo((prev) => ({ ...prev, [idPeriodo]: data }));
        } catch {
            toast.error('Error al cargar cortes del periodo');
            setCortesPorPeriodo((prev) => ({ ...prev, [idPeriodo]: [] }));
        } finally {
            setCargandoCortes((prev) => ({ ...prev, [idPeriodo]: false }));
        }
    };

    const handleDeleteCorte = async (idCorte, idPeriodo) => {
        if (!window.confirm('¿Eliminar este corte académico?')) return;
        try {
            await api.delete(`/agendas/cortes/${idCorte}`);
            toast.success('Corte eliminado correctamente');
            setCortesPorPeriodo((prev) => ({
                ...prev,
                [idPeriodo]: (prev[idPeriodo] || []).filter((c) => c.id_corte !== idCorte),
            }));
        } catch (error) {
            toast.error(extraerMensajeError(error, 'No se pudo eliminar el corte'));
        }
    };

    return (
        <Layout>
            <div className="max-w-7xl mx-auto">
                {/* Header de la Página */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="p-2 bg-institutional-green/10 rounded-lg">
                                <Calendar className="text-institutional-green" size={20} />
                            </div>
                            <span className="text-[10px] font-black text-institutional-green uppercase tracking-[0.3em]">
                                Configuración del Sistema
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-black text-institutional-dark tracking-tight uppercase">
                            Periodos Académicos
                        </h1>
                        <p className="text-gray-500 mt-2 font-medium text-sm">
                            Gestione las vigencias y calendarios para el registro de agendas docentes.
                        </p>
                    </div>

                    <button
                        onClick={() => navigate('/admin/periodos/nuevo')}
                        className="flex items-center justify-center space-x-3 bg-institutional-green text-white px-6 py-4 rounded-[1.5rem] font-black text-sm uppercase tracking-widest hover:bg-institutional-green/90 shadow-xl shadow-institutional-green/20 transition-all active:scale-95 group w-full md:w-auto"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span>Nuevo Periodo</span>
                    </button>
                </div>

                {/* Filtros y Controles */}
                <div className="mb-8 flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-institutional-green transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por año o periodo (e.g. 2025-A)..."
                            className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:ring-4 focus:ring-institutional-green/5 focus:border-institutional-green outline-none transition-all"
                            value={filtro}
                            onChange={(e) => setFiltro(e.target.value)}
                        />
                    </div>
                </div>

                {/* Tabla/Grid de Contenido */}
                {cargando ? (
                    <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border border-gray-100 shadow-sm">
                        <Loader2 className="animate-spin text-institutional-green mb-4" size={48} />
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Cargando información...</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-100/80 border-b border-gray-100">
                                        <th className="px-6 py-6 text-[10px] font-black text-gray-600 uppercase tracking-widest text-center">Detalle</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-600 uppercase tracking-widest">Vigencia</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-600 uppercase tracking-widest">Semestre</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-600 uppercase tracking-widest">Rango de Fechas</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-600 uppercase tracking-widest text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {periodosPaginados.length > 0 ? periodosPaginados.map((periodo) => (
                                        <React.Fragment key={periodo.id_periodo}>
                                            <tr className="group hover:bg-gray-50/50 transition-all">
                                            <td className="px-6 py-6 text-center">
                                                <button
                                                    onClick={() => toggleExpandir(periodo.id_periodo)}
                                                    className="w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:text-institutional-green hover:border-institutional-green/40 hover:bg-institutional-green/5 transition-all inline-flex items-center justify-center"
                                                    title={expandidos[periodo.id_periodo] ? 'Colapsar cortes' : 'Expandir cortes'}
                                                >
                                                    <ChevronDown size={16} className={`transition-transform ${expandidos[periodo.id_periodo] ? 'rotate-180' : ''}`} />
                                                </button>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 bg-institutional-blue/5 rounded-xl flex items-center justify-center text-institutional-blue group-hover:bg-institutional-blue group-hover:text-white transition-all duration-300">
                                                        <Calendar size={18} />
                                                    </div>
                                                    <span className="font-black text-institutional-dark text-lg group-hover:translate-x-1 transition-transform">
                                                        {periodo.anio}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${periodo.periodo === 'A'
                                                    ? 'bg-amber-100 text-amber-600'
                                                    : 'bg-indigo-100 text-indigo-600'
                                                    }`}>
                                                    Periodo {periodo.periodo}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center space-x-2 text-sm font-bold text-gray-700">
                                                    <span>{periodo.fecha_inicio || '--'}</span>
                                                    <ArrowRight size={14} className="text-gray-400" />
                                                    <span>{periodo.fecha_fin || '--'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <TableActionButtons
                                                    onEdit={() => navigate(`/admin/periodos/editar/${periodo.id_periodo}`)}
                                                    onDelete={() => handleDelete(periodo.id_periodo)}
                                                    editTitle="Editar periodo"
                                                    deleteTitle="Eliminar periodo"
                                                />
                                            </td>
                                        </tr>

                                        {expandidos[periodo.id_periodo] && (
                                            <tr>
                                                <td colSpan="5" className="px-8 pb-6 pt-0">
                                                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 ml-12">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="flex items-center space-x-2">
                                                                <CalendarRange size={16} className="text-institutional-blue" />
                                                                <span className="text-[10px] font-black text-institutional-blue uppercase tracking-[0.2em]">Cortes del periodo</span>
                                                            </div>
                                                            <button
                                                                onClick={() => navigate('/admin/periodos/cortes/nuevo', { state: { id_periodo: periodo.id_periodo } })}
                                                                className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg bg-institutional-green text-white hover:bg-institutional-green/90 transition-all"
                                                            >
                                                                + Nuevo Corte
                                                            </button>
                                                        </div>

                                                        {cargandoCortes[periodo.id_periodo] ? (
                                                            <div className="flex items-center space-x-2 text-gray-500 text-xs font-bold py-3">
                                                                <Loader2 size={14} className="animate-spin" />
                                                                <span>Cargando cortes...</span>
                                                            </div>
                                                        ) : (cortesPorPeriodo[periodo.id_periodo] || []).length === 0 ? (
                                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest py-2">
                                                                Este periodo no tiene cortes registrados.
                                                            </p>
                                                        ) : (
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-left">
                                                                    <thead>
                                                                        <tr className="border-b border-gray-200">
                                                                            <th className="py-2 pr-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Corte</th>
                                                                            <th className="py-2 pr-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Nombre</th>
                                                                            <th className="py-2 pr-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Rango de fechas</th>
                                                                            <th className="py-2 pr-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">% Evaluación</th>
                                                                            <th className="py-2 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Acciones</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {(cortesPorPeriodo[periodo.id_periodo] || [])
                                                                            .sort((a, b) => a.numero_corte - b.numero_corte)
                                                                            .map((corte) => (
                                                                                <tr key={corte.id_corte} className="border-b border-gray-100">
                                                                                    <td className="py-3 pr-4 text-xs font-black text-institutional-dark">Corte {corte.numero_corte}</td>
                                                                                    <td className="py-3 pr-4 text-xs font-bold text-gray-700">{corte.nombre || `Corte ${corte.numero_corte}`}</td>
                                                                                    <td className="py-3 pr-4 text-xs font-bold text-gray-700">{corte.fecha_inicio} <ArrowRight size={12} className="inline text-gray-400 mx-1" /> {corte.fecha_fin}</td>
                                                                                    <td className="py-3 pr-4 text-xs font-black text-institutional-blue">{corte.porcentaje_evaluacion ?? '--'}%</td>
                                                                                    <td className="py-3 text-right">
                                                                                        <TableActionButtons
                                                                                            onEdit={() => navigate(`/admin/periodos/cortes/editar/${corte.id_corte}`)}
                                                                                            onDelete={() => handleDeleteCorte(corte.id_corte, periodo.id_periodo)}
                                                                                            editTitle="Editar corte"
                                                                                            deleteTitle="Eliminar corte"
                                                                                            className="inline-flex items-center space-x-2"
                                                                                        />
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        </React.Fragment>
                                    )) : (
                                        <tr>
                                            <td colSpan="5" className="px-8 py-20 text-center">
                                                <div className="flex flex-col items-center">
                                                    <Filter className="text-gray-200 mb-4" size={48} />
                                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">
                                                        No se encontraron periodos académicos
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {periodosOrdenados.length > 0 && (
                            <div className="px-8 py-5 border-t border-gray-100 flex items-center justify-between">
                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                                    Mostrando {inicio + 1}-{Math.min(inicio + REGISTROS_POR_PAGINA, periodosOrdenados.length)} de {periodosOrdenados.length} registros
                                </p>
                                <div className="flex items-center space-x-2">
                                    <button
                                        disabled={paginaActual === 1}
                                        onClick={() => setPaginaActual((p) => p - 1)}
                                        className="px-3 py-2 rounded-lg border border-gray-200 text-xs font-black text-gray-500 disabled:opacity-40 hover:bg-gray-50"
                                    >
                                        Anterior
                                    </button>
                                    <span className="text-xs font-black text-institutional-dark px-3">{paginaActual} / {totalPaginas}</span>
                                    <button
                                        disabled={paginaActual === totalPaginas}
                                        onClick={() => setPaginaActual((p) => p + 1)}
                                        className="px-3 py-2 rounded-lg border border-gray-200 text-xs font-black text-gray-500 disabled:opacity-40 hover:bg-gray-50"
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer Informativo */}
                <div className="mt-8 p-6 bg-institutional-dark rounded-[2rem] text-white/50 text-[10px] font-bold uppercase tracking-widest flex items-center justify-between">
                    <span>UniPutumayo &copy; 2026 - Gestión de Agendas</span>
                    <div className="flex items-center space-x-4">
                        <span className="flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-institutional-green" />
                            <span>Servidor Online</span>
                        </span>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Periodos;
