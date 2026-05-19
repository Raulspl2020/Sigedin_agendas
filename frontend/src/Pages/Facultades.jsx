import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '../Components/Layout';
import api from '../services/api';
import FacultadForm from '../Components/FacultadForm';
import ProgramaForm from '../Components/ProgramaForm';
import { Plus, Building2, Search, Loader2, GraduationCap, Layers } from 'lucide-react';
import { toast } from 'react-toastify';
import TableActionButtons from '../Components/TableActionButtons';

const Facultades = () => {
    const [facultades, setFacultades] = useState([]);
    const [facultadActivaId, setFacultadActivaId] = useState(null);
    const [programasActivos, setProgramasActivos] = useState([]);

    const [cargando, setCargando] = useState(true);
    const [cargandoProgramas, setCargandoProgramas] = useState(false);

    const [guardandoFacultad, setGuardandoFacultad] = useState(false);
    const [guardandoPrograma, setGuardandoPrograma] = useState(false);

    const [isFacultadModalOpen, setIsFacultadModalOpen] = useState(false);
    const [facultadSeleccionada, setFacultadSeleccionada] = useState(null);

    const [isProgramaModalOpen, setIsProgramaModalOpen] = useState(false);
    const [programaSeleccionado, setProgramaSeleccionado] = useState(null);

    const [busquedaProgramas, setBusquedaProgramas] = useState('');

    const fetchFacultades = useCallback(async () => {
        try {
            setCargando(true);
            const { data } = await api.get('/admin-docente/facultades');
            const lista = Array.isArray(data) ? data : [];
            setFacultades(lista);

            if (!lista.length) {
                setFacultadActivaId(null);
                return;
            }

            setFacultadActivaId((prev) => {
                const existe = lista.some((f) => Number(f.id_facultad) === Number(prev));
                return existe ? prev : Number(lista[0].id_facultad);
            });
        } catch {
            toast.error('Error al cargar facultades');
            setFacultades([]);
            setFacultadActivaId(null);
        } finally {
            setCargando(false);
        }
    }, []);

    const fetchProgramasActivos = useCallback(async (idFacultad) => {
        if (!idFacultad) {
            setProgramasActivos([]);
            return;
        }

        try {
            setCargandoProgramas(true);
            const { data } = await api.get(`/admin-docente/programas?id_facultad=${idFacultad}`);
            setProgramasActivos(Array.isArray(data) ? data : []);
        } catch {
            toast.error('Error al cargar programas asociados');
            setProgramasActivos([]);
        } finally {
            setCargandoProgramas(false);
        }
    }, []);

    useEffect(() => {
        fetchFacultades();
    }, [fetchFacultades]);

    useEffect(() => {
        fetchProgramasActivos(facultadActivaId);
    }, [facultadActivaId, fetchProgramasActivos]);

    const facultadActiva = useMemo(
        () => facultades.find((f) => Number(f.id_facultad) === Number(facultadActivaId)) || null,
        [facultades, facultadActivaId],
    );

    const programasFiltrados = useMemo(() => {
        const texto = String(busquedaProgramas || '').trim().toLowerCase();
        if (!texto) return programasActivos;
        return programasActivos.filter((programa) => String(programa.nombre || '').toLowerCase().includes(texto));
    }, [programasActivos, busquedaProgramas]);

    const handleSaveFacultad = async (formData) => {
        setGuardandoFacultad(true);
        try {
            if (facultadSeleccionada) {
                await api.put(`/admin-docente/facultades/${facultadSeleccionada.id_facultad}`, formData);
                toast.success('Facultad actualizada');
            } else {
                await api.post('/admin-docente/facultades', formData);
                toast.success('Facultad creada');
            }
            setIsFacultadModalOpen(false);
            setFacultadSeleccionada(null);
            await fetchFacultades();
        } catch (error) {
            if (!error.response) toast.error('Error de conexión. Verifica tu red.');
            throw error;
        } finally {
            setGuardandoFacultad(false);
        }
    };

    const handleDeleteFacultad = async (idFacultad) => {
        if (!window.confirm('¿Eliminar esta facultad?')) return;
        try {
            await api.delete(`/admin-docente/facultades/${idFacultad}`);
            toast.success('Facultad eliminada');
            await fetchFacultades();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al eliminar facultad');
        }
    };

    const abrirNuevoPrograma = () => {
        setProgramaSeleccionado(null);
        setIsProgramaModalOpen(true);
    };

    const abrirEditarPrograma = (programa) => {
        setProgramaSeleccionado(programa);
        setIsProgramaModalOpen(true);
    };

    const handleSavePrograma = async (formData) => {
        if (!facultadActivaId) return;

        setGuardandoPrograma(true);
        try {
            const payload = {
                ...formData,
                id_facultad: Number(facultadActivaId),
            };

            if (programaSeleccionado) {
                await api.put(`/admin-docente/programas/${programaSeleccionado.id_programa}`, payload);
                toast.success('Programa actualizado');
            } else {
                await api.post('/admin-docente/programas', payload);
                toast.success('Programa creado');
            }

            setIsProgramaModalOpen(false);
            setProgramaSeleccionado(null);
            await fetchProgramasActivos(facultadActivaId);
            await fetchFacultades();
        } catch (error) {
            if (!error.response) toast.error('Error de conexión. Verifica tu red.');
            throw error;
        } finally {
            setGuardandoPrograma(false);
        }
    };

    const handleDeletePrograma = async (idPrograma) => {
        if (!window.confirm('¿Eliminar este programa?')) return;
        try {
            await api.delete(`/admin-docente/programas/${idPrograma}`);
            toast.success('Programa eliminado');
            await fetchProgramasActivos(facultadActivaId);
            await fetchFacultades();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al eliminar programa');
        }
    };

    return (
        <Layout>
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-black text-institutional-dark uppercase">Facultades</h1>
                        <p className="text-gray-500 font-medium text-sm">Gestión institucional por facultad y sus programas asociados.</p>
                    </div>
                    <button
                        onClick={() => { setFacultadSeleccionada(null); setIsFacultadModalOpen(true); }}
                        className="flex items-center justify-center space-x-2 bg-institutional-blue text-white px-6 py-3 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl hover:scale-105 transition-all w-full sm:w-auto"
                    >
                        <Plus size={20} /> <span>Nueva Facultad</span>
                    </button>
                </div>

                {cargando ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-institutional-blue" size={48} /></div>
                ) : !facultades.length ? (
                    <section className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-12 text-center">
                        <Building2 className="mx-auto mb-4 text-gray-300" size={40} />
                        <p className="text-sm font-black text-gray-500 uppercase tracking-widest">No hay facultades registradas</p>
                        <button
                            type="button"
                            onClick={() => { setFacultadSeleccionada(null); setIsFacultadModalOpen(true); }}
                            className="mt-6 inline-flex items-center space-x-2 bg-institutional-green text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-institutional-green/90 transition-all"
                        >
                            <Plus size={16} />
                            <span>Crear primera facultad</span>
                        </button>
                    </section>
                ) : (
                    <>
                        <section className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-4 md:p-5 mb-6">
                            <div className="flex flex-wrap gap-2">
                                {facultades.map((facultad) => {
                                    const activa = Number(facultad.id_facultad) === Number(facultadActivaId);
                                    return (
                                        <button
                                            key={facultad.id_facultad}
                                            type="button"
                                            onClick={() => {
                                                setFacultadActivaId(Number(facultad.id_facultad));
                                                setBusquedaProgramas('');
                                            }}
                                            className={`px-4 py-2.5 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${activa
                                                ? 'bg-institutional-green text-white border-institutional-green shadow-lg shadow-institutional-green/20'
                                                : 'bg-white border-gray-200 text-gray-500 hover:text-institutional-green hover:border-institutional-green/40'
                                                }`}
                                        >
                                            {facultad.nombre}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        <section className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 mb-6">
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
                                <div>
                                    <div className="flex items-center gap-2 mb-1 text-institutional-blue">
                                        <Building2 size={16} />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Facultad activa</span>
                                    </div>
                                    <h2 className="text-xl md:text-2xl font-black text-institutional-dark uppercase tracking-tight">
                                        {facultadActiva?.nombre || 'Facultad'}
                                    </h2>
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-2">
                                        {programasActivos.length} programas asociados
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                                    <div className="relative min-w-[260px]">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Buscar programa en esta facultad..."
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm font-medium focus:ring-4 focus:ring-institutional-blue/5 outline-none transition-all"
                                            value={busquedaProgramas}
                                            onChange={(e) => setBusquedaProgramas(e.target.value)}
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={abrirNuevoPrograma}
                                        disabled={!facultadActivaId}
                                        className="inline-flex items-center justify-center space-x-2 bg-institutional-blue text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-institutional-blue/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Plus size={16} />
                                        <span>Nuevo Programa</span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 text-gray-500">
                                    <Layers size={15} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Programas asociados</span>
                                </div>
                                {facultadActiva && (
                                    <TableActionButtons
                                        onEdit={() => {
                                            setFacultadSeleccionada(facultadActiva);
                                            setIsFacultadModalOpen(true);
                                        }}
                                        onDelete={() => handleDeleteFacultad(facultadActiva.id_facultad)}
                                        editTitle="Editar facultad"
                                        deleteTitle="Eliminar facultad"
                                        className="inline-flex items-center"
                                    />
                                )}
                            </div>

                            {cargandoProgramas ? (
                                <div className="flex justify-center py-14">
                                    <Loader2 className="animate-spin text-institutional-blue" size={30} />
                                </div>
                            ) : !programasFiltrados.length ? (
                                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-12 text-center">
                                    <GraduationCap className="mx-auto mb-3 text-gray-300" size={32} />
                                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest">No hay programas asociados</p>
                                    <p className="text-xs text-gray-400 mt-2 font-medium">Agrega un nuevo programa para esta facultad.</p>
                                    <button
                                        type="button"
                                        onClick={abrirNuevoPrograma}
                                        className="mt-5 inline-flex items-center space-x-2 bg-institutional-green text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-institutional-green/90 transition-all"
                                    >
                                        <Plus size={16} />
                                        <span>Agregar programa</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {programasFiltrados.map((programa) => (
                                        <article
                                            key={programa.id_programa}
                                            className="bg-gray-50 border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all"
                                        >
                                            <div className="flex items-start justify-between gap-3 mb-4">
                                                <div className="p-2.5 bg-institutional-blue/10 rounded-xl text-institutional-blue">
                                                    <GraduationCap size={18} />
                                                </div>
                                                <TableActionButtons
                                                    onEdit={() => abrirEditarPrograma(programa)}
                                                    onDelete={() => handleDeletePrograma(programa.id_programa)}
                                                    editTitle="Editar programa"
                                                    deleteTitle="Eliminar programa"
                                                    className="inline-flex items-center"
                                                />
                                            </div>
                                            <h3 className="font-black text-institutional-dark uppercase tracking-tight text-sm min-h-[40px]">
                                                {programa.nombre}
                                            </h3>
                                            <p className="mt-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                {facultadActiva?.nombre || 'Facultad activa'}
                                            </p>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>
                    </>
                )}
            </div>

            <FacultadForm
                isOpen={isFacultadModalOpen}
                facultad={facultadSeleccionada}
                onClose={() => {
                    if (!guardandoFacultad) {
                        setIsFacultadModalOpen(false);
                        setFacultadSeleccionada(null);
                    }
                }}
                onSave={handleSaveFacultad}
                isSaving={guardandoFacultad}
            />

            <ProgramaForm
                isOpen={isProgramaModalOpen}
                programa={programaSeleccionado}
                onClose={() => {
                    if (!guardandoPrograma) {
                        setIsProgramaModalOpen(false);
                        setProgramaSeleccionado(null);
                    }
                }}
                onSave={handleSavePrograma}
                isSaving={guardandoPrograma}
                fixedFacultadId={facultadActivaId}
                fixedFacultadNombre={facultadActiva?.nombre}
            />
        </Layout>
    );
};

export default Facultades;
