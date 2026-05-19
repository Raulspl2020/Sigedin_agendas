import React, { useState, useEffect } from 'react';
import Layout from '../Components/Layout';
import api from '../services/api';
import ProgramaForm from '../Components/ProgramaForm';
import { Plus, GraduationCap, Search, Loader2, Building2 } from 'lucide-react';
import { toast } from 'react-toastify';
import TableActionButtons from '../Components/TableActionButtons';

const Programas = () => {
    const [programas, setProgramas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [seleccionado, setSeleccionado] = useState(null);
    const [filtro, setFiltro] = useState('');

    useEffect(() => { fetchProgramas(); }, []);

    const fetchProgramas = async () => {
        try {
            setCargando(true);
            const { data } = await api.get('/admin-docente/programas');
            setProgramas(data);
        } catch (error) {
            toast.error('Error al cargar programas');
        } finally {
            setCargando(false);
        }
    };

    /**
     * Persiste un programa académico (crear o editar).
     * Re-lanza el error para que el formulario hijo lo muestre en el banner.
     * @param {Object} formData
     */
    const handleSave = async (formData) => {
        setGuardando(true);
        try {
            const dataToSave = { ...formData, id_facultad: Number(formData.id_facultad) };
            if (seleccionado) {
                await api.put(`/admin-docente/programas/${seleccionado.id_programa}`, dataToSave);
                toast.success('Programa actualizado');
            } else {
                await api.post('/admin-docente/programas', dataToSave);
                toast.success('Programa creado');
            }
            setIsModalOpen(false);
            fetchProgramas();
        } catch (error) {
            if (!error.response) toast.error('Error de conexión. Verifica tu red.');
            throw error;
        } finally {
            setGuardando(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar este programa?')) return;
        try {
            await api.delete(`/admin-docente/programas/${id}`);
            toast.success('Programa eliminado');
            fetchProgramas();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al eliminar');
        }
    };

    const filtrados = programas.filter(p => p.nombre.toLowerCase().includes(filtro.toLowerCase()) || p.facultad?.nombre.toLowerCase().includes(filtro.toLowerCase()));

    return (
        <Layout>
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-black text-institutional-dark uppercase tracking-tight">Programas Académicos</h1>
                        <p className="text-gray-500 font-medium text-sm">Gestión de la oferta académica por facultad.</p>
                    </div>
                    <button
                        onClick={() => { setSeleccionado(null); setIsModalOpen(true); }}
                        className="flex items-center justify-center space-x-2 bg-institutional-blue text-white px-6 py-3 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl hover:scale-105 transition-all w-full sm:w-auto outline-none"
                    >
                        <Plus size={20} /> <span>Nuevo Programa</span>
                    </button>
                </div>

                <div className="mb-8 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text" placeholder="Buscar por programa o facultad..." className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-4 focus:ring-4 focus:ring-institutional-blue/5 outline-none transition-all" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
                </div>

                {cargando ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-institutional-blue" size={48} /></div>
                ) : (
                    <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-100/80">
                                <tr>
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-600 uppercase tracking-widest">Programa</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-600 uppercase tracking-widest">Facultad</th>
                                    <th className="px-8 py-6 text-right text-[10px] font-black text-gray-600 uppercase tracking-widest">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtrados.map(p => (
                                    <tr key={p.id_programa} className="group hover:bg-gray-50/50 transition-all">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center space-x-4">
                                                <div className="p-2 bg-institutional-blue/5 rounded-xl text-institutional-blue"><GraduationCap size={20} /></div>
                                                <span className="font-black text-institutional-dark uppercase tracking-tight">{p.nombre}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center space-x-2 text-gray-700 font-bold uppercase text-xs tracking-widest">
                                                <Building2 size={14} className="text-gray-400" />
                                                <span>{p.facultad?.nombre}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <TableActionButtons
                                                onEdit={() => { setSeleccionado(p); setIsModalOpen(true); }}
                                                onDelete={() => handleDelete(p.id_programa)}
                                                editTitle="Editar programa"
                                                deleteTitle="Eliminar programa"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <ProgramaForm isOpen={isModalOpen} programa={seleccionado} onClose={() => setIsModalOpen(false)} onSave={handleSave} isSaving={guardando} />
        </Layout>
    );
};

export default Programas;
