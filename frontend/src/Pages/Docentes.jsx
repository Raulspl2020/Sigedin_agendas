import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '../Components/Layout';
import api from '../services/api';
import {
    Plus,
    Search,
    Loader2,
    GraduationCap,
    IdCard,
    MapPin,
    Building2,
    CheckCircle2,
    XCircle,
    ShieldCheck,
    UserCog,
    UserPlus,
} from 'lucide-react';
import { toast } from 'react-toastify';
import TableActionButtons from '../Components/TableActionButtons';

const Docentes = () => {
    const REGISTROS_POR_PAGINA = 5;
    const navigate = useNavigate();
    const location = useLocation();

    const queryInicial = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const facultadInicial = Number(queryInicial.get('id_facultad') || queryInicial.get('facultad_id') || 0);
    const busquedaInicial = String(queryInicial.get('q') || '');

    const [facultades, setFacultades] = useState([]);
    const [docentes, setDocentes] = useState([]);
    const [facultadActivaId, setFacultadActivaId] = useState(facultadInicial > 0 ? facultadInicial : null);
    const [busqueda, setBusqueda] = useState(busquedaInicial);
    const [paginaActual, setPaginaActual] = useState(1);
    const [cargando, setCargando] = useState(true);
    const [errorFacultades, setErrorFacultades] = useState('');
    const [errorDocentes, setErrorDocentes] = useState('');

    const construirRetornoDocentesParams = useCallback(() => {
        const retorno = new URLSearchParams();
        retorno.set('from', 'docentes');
        if (facultadActivaId) retorno.set('facultad_id', String(facultadActivaId));
        if (busqueda.trim()) retorno.set('q', busqueda.trim());
        return retorno;
    }, [facultadActivaId, busqueda]);

    const fetchData = useCallback(async () => {
        const MENSAJE_ERROR_FACULTADES = 'No fue posible cargar las facultades desde el backend.';
        const MENSAJE_ERROR_DOCENTES = 'No fue posible cargar los docentes para las facultades disponibles.';

        try {
            setCargando(true);
            setErrorFacultades('');
            setErrorDocentes('');

            const [facultadesRes, docentesRes] = await Promise.allSettled([
                api.get('/admin-docente/facultades'),
                api.get('/admin-docente/docentes'),
            ]);

            const listaFacultades =
                facultadesRes.status === 'fulfilled' && Array.isArray(facultadesRes.value?.data)
                    ? facultadesRes.value.data
                    : [];

            const listaDocentes =
                docentesRes.status === 'fulfilled' && Array.isArray(docentesRes.value?.data)
                    ? docentesRes.value.data
                    : [];

            if (facultadesRes.status === 'rejected') {
                setErrorFacultades(MENSAJE_ERROR_FACULTADES);
                toast.error(MENSAJE_ERROR_FACULTADES);
            }

            if (docentesRes.status === 'rejected') {
                setErrorDocentes(MENSAJE_ERROR_DOCENTES);
                toast.error(MENSAJE_ERROR_DOCENTES);
            }

            setFacultades(listaFacultades);
            setDocentes(listaDocentes);

            if (!listaFacultades.length) {
                setFacultadActivaId(null);
                return;
            }

            setFacultadActivaId((prev) => {
                if (facultadInicial > 0 && listaFacultades.some((f) => Number(f.id_facultad) === facultadInicial)) {
                    return facultadInicial;
                }
                const existe = listaFacultades.some((f) => Number(f.id_facultad) === Number(prev));
                return existe ? prev : Number(listaFacultades[0].id_facultad);
            });
        } catch {
            toast.error('Error al cargar docentes');
            setErrorFacultades(MENSAJE_ERROR_FACULTADES);
            setErrorDocentes(MENSAJE_ERROR_DOCENTES);
            setFacultades([]);
            setDocentes([]);
            setFacultadActivaId(null);
        } finally {
            setCargando(false);
        }
    }, [facultadInicial]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const params = new URLSearchParams();
        if (facultadActivaId) params.set('id_facultad', String(facultadActivaId));
        if (busqueda.trim()) params.set('q', busqueda.trim());

        const nextSearch = params.toString();
        const currentSearch = location.search.startsWith('?') ? location.search.slice(1) : location.search;
        if (nextSearch !== currentSearch) {
            navigate(`/admin/docentes${nextSearch ? `?${nextSearch}` : ''}`, { replace: true });
        }
    }, [facultadActivaId, busqueda, navigate, location.search]);

    const docentesPorFacultad = useMemo(() => {
        return docentes.reduce((acc, docente) => {
            const idFacultad = Number(docente?.programa?.facultad?.id_facultad || docente?.programa?.id_facultad || 0);
            if (!idFacultad) return acc;
            if (!acc[idFacultad]) acc[idFacultad] = [];
            acc[idFacultad].push(docente);
            return acc;
        }, {});
    }, [docentes]);

    const facultadActiva = useMemo(
        () => facultades.find((f) => Number(f.id_facultad) === Number(facultadActivaId)) || null,
        [facultades, facultadActivaId],
    );

    const docentesActivosFiltrados = useMemo(() => {
        const base = docentesPorFacultad[Number(facultadActivaId)] || [];
        const filtro = String(busqueda || '').trim().toLowerCase();
        const filtrados = !filtro
            ? base
            : base.filter((docente) => {
            return (
                String(docente?.nombres || '').toLowerCase().includes(filtro) ||
                String(docente?.identificacion || '').toLowerCase().includes(filtro) ||
                String(docente?.mail || '').toLowerCase().includes(filtro) ||
                String(docente?.sede || '').toLowerCase().includes(filtro) ||
                String(docente?.programa?.nombre || '').toLowerCase().includes(filtro)
            );
        });

        return [...filtrados].sort((a, b) => {
            const fechaA = new Date(a?.created_at || '').getTime();
            const fechaB = new Date(b?.created_at || '').getTime();
            const fechaAValida = Number.isFinite(fechaA) && fechaA > 0;
            const fechaBValida = Number.isFinite(fechaB) && fechaB > 0;

            if (fechaAValida && fechaBValida && fechaA !== fechaB) {
                return fechaB - fechaA;
            }

            return Number(b?.id_docente || 0) - Number(a?.id_docente || 0);
        });
    }, [docentesPorFacultad, facultadActivaId, busqueda]);

    const totalPaginas = useMemo(() => {
        const total = Math.ceil(docentesActivosFiltrados.length / REGISTROS_POR_PAGINA);
        return Math.max(total, 1);
    }, [docentesActivosFiltrados.length]);

    useEffect(() => {
        setPaginaActual(1);
    }, [facultadActivaId, busqueda]);

    useEffect(() => {
        if (paginaActual > totalPaginas) {
            setPaginaActual(totalPaginas);
        }
    }, [paginaActual, totalPaginas]);

    const docentesPaginados = useMemo(() => {
        const inicio = (paginaActual - 1) * REGISTROS_POR_PAGINA;
        const fin = inicio + REGISTROS_POR_PAGINA;
        return docentesActivosFiltrados.slice(inicio, fin);
    }, [docentesActivosFiltrados, paginaActual]);

    const estaActivo = (docente) => {
        const usuarios = Array.isArray(docente?.usuarios) ? docente.usuarios : [];
        return usuarios.some((u) => Number(u?.activo) === 1);
    };

    const obtenerUsuarioPrincipal = (docente) => {
        const usuarios = Array.isArray(docente?.usuarios) ? docente.usuarios : [];
        if (!usuarios.length) return null;

        const ordenados = [...usuarios].sort((a, b) => {
            const activoA = Number(a?.activo) === 1 ? 1 : 0;
            const activoB = Number(b?.activo) === 1 ? 1 : 0;
            if (activoB !== activoA) return activoB - activoA;

            const esDocenteA = a?.rol === 'DOCENTE' ? 1 : 0;
            const esDocenteB = b?.rol === 'DOCENTE' ? 1 : 0;
            if (esDocenteB !== esDocenteA) return esDocenteB - esDocenteA;

            return Number(a?.id_usuario || 0) - Number(b?.id_usuario || 0);
        });

        return ordenados[0];
    };

    const handleDelete = async (idDocente) => {
        if (!window.confirm('¿Eliminar este docente?')) return;
        try {
            await api.delete(`/admin-docente/docentes/${idDocente}`);
            toast.success('Docente eliminado');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al eliminar docente');
        }
    };

    if (cargando) {
        return (
            <Layout>
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-institutional-blue" size={48} /></div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-black text-institutional-dark uppercase">Gestión de Docentes</h1>
                        <p className="text-gray-500 font-medium text-sm">Organización de docentes por facultad con estado operativo.</p>
                    </div>
                </div>

                {!facultades.length ? (
                    <section className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-12 text-center">
                        <Building2 className="mx-auto mb-4 text-gray-300" size={40} />
                        <p className="text-sm font-black text-gray-500 uppercase tracking-widest">
                            {errorFacultades ? 'No fue posible cargar facultades' : 'No hay facultades registradas'}
                        </p>
                        <p className="text-xs text-gray-400 mt-2 font-medium">
                            {errorFacultades
                                ? 'Verifica el endpoint /api/admin-docente/facultades y el token del usuario autenticado.'
                                : 'No existen registros en la tabla de facultades.'}
                        </p>
                    </section>
                ) : (
                    <>
                        <section className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-4 md:p-5 mb-6">
                            <div className="flex flex-wrap gap-2">
                                {facultades.map((facultad) => {
                                    const activa = Number(facultad.id_facultad) === Number(facultadActivaId);
                                    const total = (docentesPorFacultad[Number(facultad.id_facultad)] || []).length;
                                    return (
                                        <button
                                            key={facultad.id_facultad}
                                            type="button"
                                            onClick={() => {
                                                setFacultadActivaId(Number(facultad.id_facultad));
                                                setBusqueda('');
                                            }}
                                            className={`px-4 py-2.5 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${activa
                                                ? 'bg-institutional-green text-white border-institutional-green shadow-lg shadow-institutional-green/20'
                                                : 'bg-white border-gray-200 text-gray-500 hover:text-institutional-green hover:border-institutional-green/40'
                                                }`}
                                        >
                                            {facultad.nombre} ({total})
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
                                        {docentesActivosFiltrados.length} docentes
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                                    <div className="relative min-w-[280px]">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Buscar docente en esta facultad..."
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm font-medium focus:ring-4 focus:ring-institutional-blue/5 outline-none transition-all"
                                            value={busqueda}
                                            onChange={(e) => setBusqueda(e.target.value)}
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => navigate(`/admin/docentes/nuevo?id_facultad=${facultadActivaId}`)}
                                        disabled={!facultadActivaId}
                                        className="inline-flex items-center justify-center space-x-2 bg-institutional-blue text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-institutional-blue/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Plus size={16} />
                                        <span>Nuevo Docente</span>
                                    </button>
                                </div>
                            </div>

                            {!docentesActivosFiltrados.length ? (
                                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-12 text-center">
                                    <GraduationCap className="mx-auto mb-3 text-gray-300" size={32} />
                                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest">
                                        {errorDocentes ? 'No fue posible cargar docentes' : 'No hay docentes en esta facultad'}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-2 font-medium">
                                        {errorDocentes
                                            ? 'Valida el endpoint /api/admin-docente/docentes y la configuracion de scope del usuario.'
                                            : 'Crea el primer docente de esta facultad.'}
                                    </p>
                                    {errorDocentes ? (
                                        <button
                                            type="button"
                                            onClick={fetchData}
                                            className="mt-5 inline-flex items-center space-x-2 bg-institutional-blue text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-institutional-blue/90 transition-all"
                                        >
                                            <Loader2 size={16} />
                                            <span>Reintentar carga</span>
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/admin/docentes/nuevo?id_facultad=${facultadActivaId}`)}
                                            className="mt-5 inline-flex items-center space-x-2 bg-institutional-green text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-institutional-green/90 transition-all"
                                        >
                                            <Plus size={16} />
                                            <span>Agregar docente</span>
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <>
                                <div className="overflow-x-auto rounded-2xl border border-gray-100">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-100/80">
                                            <tr>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-600 uppercase tracking-widest">Docente</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-600 uppercase tracking-widest">Estado</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-600 uppercase tracking-widest">Identificación</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-600 uppercase tracking-widest">Sede</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-600 uppercase tracking-widest">Rol</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-600 uppercase tracking-widest">Acceso / Usuario</th>
                                                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-600 uppercase tracking-widest">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {docentesPaginados.map((docente) => {
                                                const activo = estaActivo(docente);
                                                const usuarioPrincipal = obtenerUsuarioPrincipal(docente);
                                                const rolUsuario = usuarioPrincipal?.rol || null;
                                                return (
                                                    <tr key={docente.id_docente} className="hover:bg-gray-50/50 transition-all">
                                                        <td className="px-6 py-5">
                                                            <div className="flex items-center space-x-3">
                                                                <div className="w-9 h-9 bg-institutional-green/10 rounded-full flex items-center justify-center text-institutional-green font-black">
                                                                    {String(docente.nombres || '?').charAt(0)}
                                                                </div>
                                                                <span className="font-black text-institutional-dark uppercase tracking-tight text-xs">{docente.nombres}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${activo
                                                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                                : 'bg-slate-100 text-slate-600 border-slate-200'
                                                                }`}>
                                                                {activo ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                                                {activo ? 'Activo' : 'Inactivo'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <div className="flex items-center space-x-2 text-gray-600 font-bold text-[11px]">
                                                                <IdCard size={14} className="text-gray-400" />
                                                                <span>{docente.identificacion}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <div className="flex items-center space-x-2 text-gray-700 font-bold text-[11px]">
                                                                <MapPin size={14} className="text-gray-400" />
                                                                <span>{docente.sede || '-'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            {rolUsuario ? (
                                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${rolUsuario === 'ADMIN'
                                                                    ? 'bg-amber-100 text-amber-700 border-amber-200'
                                                                    : rolUsuario === 'DECANO'
                                                                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                                        : 'bg-blue-100 text-blue-700 border-blue-200'
                                                                    }`}>
                                                                    <ShieldCheck size={12} />
                                                                    {rolUsuario}
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-slate-100 text-slate-600 border-slate-200">
                                                                    Sin acceso
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (usuarioPrincipal?.id_usuario) {
                                                                            toast.info('Este docente ya tiene usuario creado. Usa editar usuario.');
                                                                            return;
                                                                        }

                                                                        const retorno = construirRetornoDocentesParams();
                                                                        retorno.set('id_docente', String(docente.id_docente));
                                                                        retorno.set('rol', 'DOCENTE');
                                                                        navigate(`/admin/usuarios/nuevo?${retorno.toString()}`);
                                                                    }}
                                                                    disabled={Boolean(usuarioPrincipal?.id_usuario)}
                                                                    title={usuarioPrincipal ? 'Ya existe usuario para este docente' : 'Crear usuario asociado'}
                                                                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-institutional-green text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-institutional-green/90 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                                                                >
                                                                    <UserPlus size={14} />
                                                                    <span className="hidden md:inline">Crear</span>
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (!usuarioPrincipal?.id_usuario) {
                                                                            toast.info('Primero crea el usuario de acceso para este docente.');
                                                                            return;
                                                                        }

                                                                        const retorno = construirRetornoDocentesParams();
                                                                        navigate(`/admin/usuarios/editar/${usuarioPrincipal.id_usuario}?${retorno.toString()}`);
                                                                    }}
                                                                    disabled={!usuarioPrincipal?.id_usuario}
                                                                    title={usuarioPrincipal ? `Editar usuario ${usuarioPrincipal.username || ''}` : 'Sin usuario para editar'}
                                                                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-institutional-dark/10 text-institutional-dark rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-institutional-dark hover:text-white disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                                                                >
                                                                    <UserCog size={14} />
                                                                    <span className="hidden md:inline">Editar</span>
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5 text-right">
                                                            <TableActionButtons
                                                                onEdit={() => navigate(`/admin/docentes/editar/${docente.id_docente}?id_facultad=${facultadActivaId}`)}
                                                                onDelete={() => handleDelete(docente.id_docente)}
                                                                editTitle="Editar docente"
                                                                deleteTitle="Eliminar docente"
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {docentesActivosFiltrados.length > 0 && (
                                    <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            Pagina {paginaActual} de {totalPaginas} · {docentesActivosFiltrados.length} docentes
                                        </p>

                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
                                                disabled={paginaActual === 1}
                                                className="px-3 py-2 rounded-xl border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-all"
                                            >
                                                Anterior
                                            </button>

                                            <div className="hidden md:flex items-center gap-1">
                                                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((pagina) => (
                                                    <button
                                                        key={pagina}
                                                        type="button"
                                                        onClick={() => setPaginaActual(pagina)}
                                                        className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${
                                                            pagina === paginaActual
                                                                ? 'bg-institutional-green text-white'
                                                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        {pagina}
                                                    </button>
                                                ))}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))}
                                                disabled={paginaActual === totalPaginas}
                                                className="px-3 py-2 rounded-xl border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-all"
                                            >
                                                Siguiente
                                            </button>
                                        </div>
                                    </div>
                                )}
                                </>
                            )}
                        </section>
                    </>
                )}
            </div>
        </Layout>
    );
};

export default Docentes;
