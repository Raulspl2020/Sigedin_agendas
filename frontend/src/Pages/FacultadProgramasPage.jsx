import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../Components/Layout';
import api from '../services/api';
import ProgramaForm from '../Components/ProgramaForm';
import TableActionButtons from '../Components/TableActionButtons';
import { ArrowLeft, Building2, Eye, GraduationCap, Layers, Plus, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import FormErrorBanner from '../Components/FormErrorBanner';
import { extraerMensajeError } from '../services/apiErrors';

const FacultadProgramasPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    const [facultad, setFacultad] = useState(null);
    const [programas, setProgramas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [programaSeleccionado, setProgramaSeleccionado] = useState(null);
    const [programaVista, setProgramaVista] = useState(null);
    const [filtro, setFiltro] = useState('');
    const [errorApi, setErrorApi] = useState(null);

    const idFacultad = Number(id || 0);

    const cargarDatos = useCallback(async () => {
        if (!idFacultad) {
            setCargando(false);
            return;
        }

        setCargando(true);
        try {
            const [facultadRes, programasRes] = await Promise.all([
                api.get(`/admin-docente/facultades/${idFacultad}`),
                api.get(`/admin-docente/programas?id_facultad=${idFacultad}`),
            ]);
            setFacultad(facultadRes.data || null);
            setProgramas(Array.isArray(programasRes.data) ? programasRes.data : []);
        } catch {
            toast.error('No se pudo cargar el detalle de la facultad');
            setFacultad(null);
            setProgramas([]);
        } finally {
            setCargando(false);
        }
    }, [idFacultad]);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    const programasFiltrados = useMemo(() => {
        const texto = String(filtro || '').trim().toLowerCase();
        if (!texto) return programas;
        return programas.filter((p) => String(p?.nombre || '').toLowerCase().includes(texto));
    }, [filtro, programas]);

    const abrirNuevoPrograma = () => {
        setProgramaSeleccionado(null);
        setIsModalOpen(true);
    };

    const abrirEditarPrograma = (programa) => {
        setProgramaSeleccionado(programa);
        setIsModalOpen(true);
    };

    const guardarPrograma = async (formData) => {
        setGuardando(true);
        setErrorApi(null);
        try {
            const payload = {
                ...formData,
                id_facultad: Number(idFacultad),
            };

            if (programaSeleccionado) {
                await api.put(`/admin-docente/programas/${programaSeleccionado.id_programa}`, payload);
                toast.success('Programa actualizado');
            } else {
                await api.post('/admin-docente/programas', payload);
                toast.success('Programa creado');
            }

            setIsModalOpen(false);
            setProgramaSeleccionado(null);
            await cargarDatos();
        } catch (error) {
            if (!error.response) toast.error('Error de conexión. Verifica tu red.');
            setErrorApi(extraerMensajeError(error));
            throw error;
        } finally {
            setGuardando(false);
        }
    };

    if (cargando) {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center h-64">
                    <div className="w-10 h-10 border-4 border-institutional-green/20 border-t-institutional-green rounded-full animate-spin mb-4" />
                    <span className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Cargando programas...</span>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center space-x-2 mb-1">
                            <div className="w-8 h-1 bg-institutional-green rounded-full" />
                            <span className="text-[10px] font-black text-institutional-green uppercase tracking-[0.3em]">
                                Administración · Facultades
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-institutional-dark uppercase tracking-tight">
                            {facultad?.nombre || 'Detalle de Facultad'}
                        </h1>
                        <p className="text-gray-500 mt-1 font-medium text-sm">
                            Gestión de programas asociados a la facultad seleccionada.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/admin/facultades')}
                            className="flex items-center space-x-2 px-4 py-3 rounded-2xl border border-gray-200 text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all"
                        >
                            <ArrowLeft size={16} />
                            <span>Volver</span>
                        </button>
                        <button
                            type="button"
                            onClick={abrirNuevoPrograma}
                            className="flex items-center justify-center space-x-2 bg-institutional-blue text-white px-6 py-3 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl hover:scale-105 transition-all"
                        >
                            <Plus size={20} />
                            <span>Nuevo Programa</span>
                        </button>
                    </div>
                </div>

                <FormErrorBanner mensaje={errorApi} onDismiss={() => setErrorApi(null)} />

                <section className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                            <div className="flex items-center space-x-2 mb-2 text-gray-400">
                                <Building2 size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Facultad</span>
                            </div>
                            <p className="font-black text-institutional-dark uppercase tracking-tight">{facultad?.nombre || '-'}</p>
                        </div>
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                            <div className="flex items-center space-x-2 mb-2 text-gray-400">
                                <Layers size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Programas asociados</span>
                            </div>
                            <p className="text-2xl font-black text-institutional-dark">{programas.length}</p>
                        </div>
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    value={filtro}
                                    onChange={(e) => setFiltro(e.target.value)}
                                    placeholder="Buscar programa..."
                                    className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm font-medium focus:ring-4 focus:ring-institutional-blue/5 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-100/80">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-600 uppercase tracking-widest">Programa</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-600 uppercase tracking-widest">Facultad</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-600 uppercase tracking-widest">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {programasFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="px-6 py-12 text-center text-sm font-bold text-gray-400 uppercase tracking-widest">
                                        No hay programas asociados para mostrar
                                    </td>
                                </tr>
                            ) : (
                                programasFiltrados.map((programa) => (
                                    <tr key={programa.id_programa} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <GraduationCap size={15} className="text-gray-400" />
                                                <span className="font-black text-institutional-dark uppercase tracking-tight">{programa.nombre}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-500">
                                            {facultad?.nombre || programa?.facultad?.nombre || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="inline-flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setProgramaVista(programa)}
                                                    title="Ver programa"
                                                    className="p-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all shadow-sm active:scale-95"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <TableActionButtons
                                                    onEdit={() => abrirEditarPrograma(programa)}
                                                    editTitle="Editar programa"
                                                    className="inline-flex items-center"
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </section>
            </div>

            <ProgramaForm
                isOpen={isModalOpen}
                programa={programaSeleccionado}
                onClose={() => {
                    if (!guardando) {
                        setIsModalOpen(false);
                        setProgramaSeleccionado(null);
                    }
                }}
                onSave={guardarPrograma}
                isSaving={guardando}
                fixedFacultadId={idFacultad}
                fixedFacultadNombre={facultad?.nombre}
            />

            {programaVista && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-institutional-dark/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-[2rem] border border-gray-100 shadow-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-black text-institutional-dark uppercase tracking-tight">Detalle del programa</h3>
                            <button
                                type="button"
                                onClick={() => setProgramaVista(null)}
                                className="px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-100"
                            >
                                Cerrar
                            </button>
                        </div>
                        <div className="space-y-3 text-sm">
                            <p><span className="font-black text-gray-500 uppercase tracking-widest text-[10px]">Programa:</span> <span className="font-bold text-institutional-dark ml-2">{programaVista.nombre}</span></p>
                            <p><span className="font-black text-gray-500 uppercase tracking-widest text-[10px]">Facultad:</span> <span className="font-bold text-institutional-dark ml-2">{facultad?.nombre || '-'}</span></p>
                            <p><span className="font-black text-gray-500 uppercase tracking-widest text-[10px]">ID:</span> <span className="font-bold text-institutional-dark ml-2">{programaVista.id_programa}</span></p>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default FacultadProgramasPage;
