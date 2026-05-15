import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import TipoActividadForm from '../Components/TipoActividadForm';
import {
    Plus,
    Layers,
    Search,
    Filter,
    Loader2,
    Clock
} from 'lucide-react';
import { toast } from 'react-toastify';
import TableActionButtons from '../Components/TableActionButtons';

/**
 * Página de gestión de tipos de actividades.
 */
const TiposActividad = () => {
    const [tipos, setTipos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [tipoSeleccionado, setTipoSeleccionado] = useState(null);
    const [filtro, setFiltro] = useState('');

    useEffect(() => {
        fetchTipos();
    }, []);

    const fetchTipos = async () => {
        try {
            setCargando(true);
            const { data } = await api.get('/actividades/tipos');
            setTipos(data);
        } catch (error) {
            toast.error('Error al cargar tipos de actividades');
        } finally {
            setCargando(false);
        }
    };

    /**
     * Persiste un tipo de actividad (crear o editar).
     * Lanza el error para que el formulario hijo lo capture y lo muestre en el banner.
     * Solo muestra toast en errores de red sin respuesta del servidor.
     * @param {Object} formData - Datos del formulario
     */
    const handleSave = async (formData) => {
        setGuardando(true);
        try {
            if (tipoSeleccionado) {
                await api.put(`/actividades/tipos/${tipoSeleccionado.id_tipo}`, formData);
                toast.success('Tipo de actividad actualizado');
            } else {
                await api.post('/actividades/tipos', formData);
                toast.success('Tipo de actividad creado');
            }
            setIsModalOpen(false);
            fetchTipos();
        } catch (error) {
            if (!error.response) {
                // Error de red (sin respuesta del servidor)
                toast.error('Error de conexión. Verifica tu red.');
            }
            // Re-lanzar para que el formulario muestre el mensaje
            throw error;
        } finally {
            setGuardando(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Está seguro de eliminar este tipo? Solo podrá hacerlo si no tiene actividades relacionadas.')) return;

        try {
            await api.delete(`/actividades/tipos/${id}`);
            toast.success('Tipo eliminado correctamente');
            fetchTipos();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al eliminar el tipo');
        }
    };

    const tiposFiltrados = tipos.filter(t =>
        t.nombre.toLowerCase().includes(filtro.toLowerCase())
    );

    return (
        <Layout>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="p-2 bg-institutional-blue/10 rounded-lg">
                                <Layers className="text-institutional-blue" size={20} />
                            </div>
                            <span className="text-[10px] font-black text-institutional-blue uppercase tracking-[0.3em]">
                                Configuración Maestro
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-black text-institutional-dark tracking-tight uppercase">
                            Tipos de Actividad
                        </h1>
                        <p className="text-gray-500 mt-2 font-medium text-sm">
                            Defina las categorías de actividades docentes y sus límites de horas.
                        </p>
                    </div>

                    <button
                        onClick={() => {
                            setTipoSeleccionado(null);
                            setIsModalOpen(true);
                        }}
                        className="flex items-center justify-center space-x-3 bg-institutional-blue text-white px-6 py-4 rounded-[1.5rem] font-black text-sm uppercase tracking-widest hover:bg-institutional-blue/90 shadow-xl shadow-institutional-blue/20 transition-all active:scale-95 group w-full md:w-auto"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                        <span>Nuevo Tipo</span>
                    </button>
                </div>

                {/* Buscador */}
                <div className="mb-8 relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-institutional-blue transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre..."
                        className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:ring-4 focus:ring-institutional-blue/5 focus:border-institutional-blue outline-none transition-all"
                        value={filtro}
                        onChange={(e) => setFiltro(e.target.value)}
                    />
                </div>

                {/* Contenido */}
                {cargando ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <Loader2 className="animate-spin text-institutional-blue mb-4" size={48} />
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Cargando...</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-100/80 border-b border-gray-100">
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-600 uppercase tracking-widest">ID</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-600 uppercase tracking-widest">Nombre</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-600 uppercase tracking-widest">Máx. Horas Semanales</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-600 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {tiposFiltrados.length > 0 ? tiposFiltrados.map((tipo) => (
                                    <tr key={tipo.id_tipo} className="group hover:bg-gray-50/50 transition-all">
                                        <td className="px-8 py-6 font-bold text-gray-400 text-xs">#{tipo.id_tipo}</td>
                                        <td className="px-8 py-6">
                                            <span className="font-black text-institutional-dark uppercase tracking-tight">
                                                {tipo.nombre}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center space-x-2 text-sm font-bold text-gray-500">
                                                <Clock size={16} className="text-gray-300" />
                                                <span>{tipo.max_horas_semana ? `${tipo.max_horas_semana} Horas` : 'Sin límite'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <TableActionButtons
                                                onEdit={() => {
                                                    setTipoSeleccionado(tipo);
                                                    setIsModalOpen(true);
                                                }}
                                                onDelete={() => handleDelete(tipo.id_tipo)}
                                                editTitle="Editar tipo"
                                                deleteTitle="Eliminar tipo"
                                            />
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" className="px-8 py-20 text-center">
                                            <Filter className="text-gray-200 mx-auto mb-4" size={48} />
                                            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No hay resultados</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <TipoActividadForm
                isOpen={isModalOpen}
                tipo={tipoSeleccionado}
                onClose={() => !guardando && setIsModalOpen(false)}
                onSave={handleSave}
                isSaving={guardando}
            />
        </Layout>
    );
};

export default TiposActividad;
