import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';
import { extraerMensajeError } from '../services/apiErrors';
import { Plus, CalendarRange, Search, Loader2, Filter } from 'lucide-react';
import { toast } from 'react-toastify';
import TableActionButtons from '../Components/TableActionButtons';

const CortesAcademicos = () => {
    const navigate = useNavigate();
    const [cortes, setCortes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [filtro, setFiltro] = useState('');

    useEffect(() => {
        fetchCortes();
    }, []);

    const fetchCortes = async () => {
        try {
            setCargando(true);
            const { data } = await api.get('/agendas/cortes');
            setCortes(data);
        } catch {
            toast.error('Error al cargar cortes académicos');
        } finally {
            setCargando(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar este corte académico?')) return;
        try {
            await api.delete(`/agendas/cortes/${id}`);
            toast.success('Corte eliminado correctamente');
            fetchCortes();
        } catch (error) {
            toast.error(extraerMensajeError(error, 'No se pudo eliminar el corte'));
        }
    };

    const filtrados = cortes.filter((c) => {
        const periodoLabel = `${c.periodo?.anio || ''}-${c.periodo?.periodo || ''}`;
        return (
            String(c.numero_corte).includes(filtro) ||
            (c.nombre || '').toLowerCase().includes(filtro.toLowerCase()) ||
            periodoLabel.toLowerCase().includes(filtro.toLowerCase())
        );
    });

    return (
        <Layout>
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="p-2 bg-institutional-green/10 rounded-lg">
                                <CalendarRange className="text-institutional-green" size={20} />
                            </div>
                            <span className="text-[10px] font-black text-institutional-green uppercase tracking-[0.3em]">
                                Configuración del Sistema
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-black text-institutional-dark tracking-tight uppercase">
                            Cortes Académicos
                        </h1>
                        <p className="text-gray-500 mt-2 font-medium text-sm">
                            Configure los cortes por periodo para el seguimiento académico.
                        </p>
                    </div>

                    <button
                        onClick={() => navigate('/admin/cortes/nuevo')}
                        className="flex items-center justify-center space-x-3 bg-institutional-green text-white px-6 py-4 rounded-[1.5rem] font-black text-sm uppercase tracking-widest hover:bg-institutional-green/90 shadow-xl shadow-institutional-green/20 transition-all active:scale-95 group w-full md:w-auto"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span>Nuevo Corte</span>
                    </button>
                </div>

                <div className="mb-8 flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-institutional-green transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por número, nombre o periodo..."
                            className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:ring-4 focus:ring-institutional-green/5 focus:border-institutional-green outline-none transition-all"
                            value={filtro}
                            onChange={(e) => setFiltro(e.target.value)}
                        />
                    </div>
                </div>

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
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-600 uppercase tracking-widest">Periodo</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-600 uppercase tracking-widest">Corte</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-600 uppercase tracking-widest">Nombre</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-600 uppercase tracking-widest">Rango de Fechas</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-600 uppercase tracking-widest">% Evaluación</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-gray-600 uppercase tracking-widest text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtrados.length > 0 ? filtrados.map((corte) => (
                                        <tr key={corte.id_corte} className="group hover:bg-gray-50/50 transition-all">
                                            <td className="px-8 py-6 font-black text-institutional-dark">{corte.periodo?.anio} - {corte.periodo?.periodo}</td>
                                            <td className="px-8 py-6">
                                                <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700">
                                                    Corte {corte.numero_corte}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 font-bold text-gray-700">{corte.nombre || `Corte ${corte.numero_corte}`}</td>
                                            <td className="px-8 py-6 text-sm font-bold text-gray-700">{corte.fecha_inicio} - {corte.fecha_fin}</td>
                                            <td className="px-8 py-6 text-sm font-black text-institutional-blue">{corte.porcentaje_evaluacion ?? '--'}%</td>
                                            <td className="px-8 py-6 text-right">
                                                <TableActionButtons
                                                    onEdit={() => navigate(`/admin/cortes/editar/${corte.id_corte}`)}
                                                    onDelete={() => handleDelete(corte.id_corte)}
                                                    editTitle="Editar corte"
                                                    deleteTitle="Eliminar corte"
                                                />
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="6" className="px-8 py-20 text-center">
                                                <div className="flex flex-col items-center">
                                                    <Filter className="text-gray-200 mb-4" size={48} />
                                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">
                                                        No se encontraron cortes académicos
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default CortesAcademicos;
