import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, ShieldCheck, User, Key } from 'lucide-react';
import api from '../services/api';
import Layout from '../components/Layout';
import FormErrorBanner from '../Components/FormErrorBanner';
import { extraerMensajeError } from '../services/apiErrors';
import { toast } from 'react-toastify';

const ESTADO_INICIAL = {
    username: '',
    password: '',
    rol: 'DOCENTE',
    id_docente: '',
    activo: 1,
};

const requiereDocente = (rol) => rol === 'DOCENTE' || rol === 'DECANO';

const normalizarUsernameDocente = (identificacion) => String(identificacion || '').trim();

const UsuarioFormPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const esEdicion = Boolean(id);
    const idDocentePrefill = useMemo(() => {
        const query = new URLSearchParams(location.search);
        const valor = Number(query.get('id_docente') || 0);
        return valor > 0 ? valor : null;
    }, [location.search]);
    const rolPrefill = useMemo(() => {
        const query = new URLSearchParams(location.search);
        const valor = String(query.get('rol') || '').trim().toUpperCase();
        return ['ADMIN', 'DECANO', 'DOCENTE'].includes(valor) ? valor : null;
    }, [location.search]);
    const retornoDesde = useMemo(() => {
        const query = new URLSearchParams(location.search);
        return String(query.get('from') || '').trim().toLowerCase();
    }, [location.search]);
    const retornoFacultadId = useMemo(() => {
        const query = new URLSearchParams(location.search);
        const valor = Number(query.get('facultad_id') || 0);
        return valor > 0 ? valor : null;
    }, [location.search]);
    const retornoBusqueda = useMemo(() => {
        const query = new URLSearchParams(location.search);
        return String(query.get('q') || '').trim();
    }, [location.search]);
    const bloqueoEdicionDesdeDocentes = esEdicion && retornoDesde === 'docentes';

    const [formData, setFormData] = useState(ESTADO_INICIAL);
    const [docentes, setDocentes] = useState([]);
    const [cargando, setCargando] = useState(esEdicion);
    const [guardando, setGuardando] = useState(false);
    const [errorApi, setErrorApi] = useState(null);
    const [tocados, setTocados] = useState({});
    const [usernameBloqueado, setUsernameBloqueado] = useState('');
    const [idDocenteBloqueado, setIdDocenteBloqueado] = useState('');

    const navegarCancelar = () => {
        if (retornoDesde === 'docentes') {
            const params = new URLSearchParams();
            if (retornoFacultadId) params.set('facultad_id', String(retornoFacultadId));
            if (retornoBusqueda) params.set('q', retornoBusqueda);
            navigate(`/admin/docentes${params.toString() ? `?${params.toString()}` : ''}`);
            return;
        }

        navigate('/admin/usuarios');
    };

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const { data: docentesData } = await api.get('/admin-docente/docentes');
                setDocentes(docentesData);

                if (esEdicion) {
                    const { data } = await api.get(`/admin-usuario/${id}`);
                    const usernameInicial = data.username ?? '';
                    const docenteInicial = data.id_docente ?? '';

                    setUsernameBloqueado(usernameInicial);
                    setIdDocenteBloqueado(docenteInicial);

                    setFormData({
                        username: usernameInicial,
                        password: '',
                        rol: data.rol ?? 'DOCENTE',
                        id_docente: docenteInicial,
                        activo: data.activo ?? 1,
                    });
                } else {
                    const docentePrefill = docentesData.find(
                        (docente) => Number(docente?.id_docente) === Number(idDocentePrefill),
                    );
                    const usernameDocente = normalizarUsernameDocente(docentePrefill?.identificacion);

                    setFormData((prev) => ({
                        ...prev,
                        username:
                            retornoDesde === 'docentes' && idDocentePrefill && usernameDocente
                                ? usernameDocente
                                : prev.username,
                        password: '',
                        rol: rolPrefill || prev.rol,
                        id_docente: idDocentePrefill || prev.id_docente,
                    }));
                }
            } catch {
                toast.error('Error al cargar datos del formulario');
            } finally {
                setCargando(false);
            }
        };

        cargarDatos();
    }, [esEdicion, id, idDocentePrefill, rolPrefill, retornoDesde]);

    const inputClase = (campo, condicion = true) =>
        `w-full bg-gray-50 border rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold text-institutional-dark
         focus:ring-4 focus:ring-institutional-blue/10 outline-none transition-all
         ${tocados[campo] && condicion && !formData[campo]?.toString().trim()
            ? 'border-red-400 bg-red-50'
            : 'border-gray-200'}`;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorApi(null);

        const nuevosTocados = {
            username: true,
            password: !esEdicion,
            rol: true,
            activo: true,
            id_docente: requiereDocente(formData.rol),
        };
        setTocados(nuevosTocados);

        const faltaUsername = !formData.username.trim();
        const faltaPassword = !esEdicion && !formData.password.trim();
        const faltaRol = !String(formData.rol || '').trim();
        const faltaEstado = formData.activo !== 0 && formData.activo !== 1;
        const faltaDocente = requiereDocente(formData.rol) && !formData.id_docente;

        if (faltaUsername || faltaPassword || faltaRol || faltaEstado || faltaDocente) {
            setErrorApi('Completa los campos obligatorios para continuar.');
            return;
        }

        setGuardando(true);
        try {
            const dataToSave = { ...formData };
            if (!dataToSave.password) delete dataToSave.password;

            if (bloqueoEdicionDesdeDocentes) {
                dataToSave.username = usernameBloqueado;
                dataToSave.id_docente = requiereDocente(dataToSave.rol)
                    ? Number(idDocenteBloqueado || 0) || null
                    : null;
            }

            dataToSave.id_docente = dataToSave.id_docente && dataToSave.id_docente !== ''
                ? Number(dataToSave.id_docente)
                : null;

            if (esEdicion) {
                await api.put(`/admin-usuario/${id}`, dataToSave);
                toast.success('Usuario actualizado');
            } else {
                await api.post('/admin-usuario', dataToSave);
                toast.success('Usuario creado');
            }

            if (retornoDesde === 'docentes') {
                const params = new URLSearchParams();
                if (retornoFacultadId) params.set('facultad_id', String(retornoFacultadId));
                if (retornoBusqueda) params.set('q', retornoBusqueda);
                navigate(`/admin/docentes${params.toString() ? `?${params.toString()}` : ''}`);
            } else {
                navigate('/admin/usuarios');
            }
        } catch (err) {
            if (!err.response) toast.error('Error de conexión. Verifica tu red.');
            setErrorApi(extraerMensajeError(err));
        } finally {
            setGuardando(false);
        }
    };

    if (cargando) {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center h-64">
                    <div className="w-10 h-10 border-4 border-institutional-green/20 border-t-institutional-green rounded-full animate-spin mb-4" />
                    <span className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Cargando usuario...</span>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-3xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                    <div>
                        <div className="flex items-center space-x-2 mb-1">
                            <div className="w-8 h-1 bg-institutional-green rounded-full" />
                            <span className="text-[10px] font-black text-institutional-green uppercase tracking-[0.3em]">Administración · Usuarios</span>
                        </div>
                        <h1 className="text-3xl font-black text-institutional-dark uppercase tracking-tight">{esEdicion ? 'Editar Usuario' : 'Nuevo Usuario'}</h1>
                        <p className="text-gray-500 mt-1 font-medium text-sm">Gestión de credenciales y permisos de acceso.</p>
                    </div>

                    <button
                        type="button"
                        onClick={navegarCancelar}
                        className="flex items-center space-x-2 px-5 py-3 rounded-2xl border border-gray-200 text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all"
                    >
                        <ArrowLeft size={16} />
                        <span>Volver al listado</span>
                    </button>
                </div>

                <FormErrorBanner mensaje={errorApi} onDismiss={() => setErrorApi(null)} />

                <form onSubmit={handleSubmit} noValidate className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 space-y-5">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2.5 bg-institutional-dark/5 rounded-xl">
                            <ShieldCheck size={20} className="text-institutional-dark" />
                        </div>
                        <div>
                            <h2 className="text-xs font-black text-institutional-dark uppercase tracking-widest">Control de Accesos</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Configuración de usuario y rol</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Username <span className="text-red-500">*</span></label>
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-institutional-blue transition-colors" size={18} />
                            <input
                                type="text"
                                autoComplete="off"
                                className={`${inputClase('username')} ${bloqueoEdicionDesdeDocentes ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                value={formData.username}
                                readOnly={bloqueoEdicionDesdeDocentes}
                                onBlur={() => setTocados((t) => ({ ...t, username: true }))}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            />
                        </div>
                        {bloqueoEdicionDesdeDocentes && (
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
                                Username bloqueado al editar desde Gestión de Docentes
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                            {esEdicion ? 'Nueva Contraseña (opcional)' : <>Contraseña <span className="text-red-500">*</span></>}
                        </label>
                        <div className="relative group">
                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-institutional-blue transition-colors" size={18} />
                            <input
                                type="password"
                                placeholder="••••••••"
                                autoComplete="new-password"
                                className={`w-full bg-gray-50 border rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold text-institutional-dark
                                    focus:ring-4 focus:ring-institutional-blue/10 outline-none transition-all
                                    ${tocados.password && !esEdicion && !formData.password.trim() ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                                value={formData.password}
                                onBlur={() => setTocados((t) => ({ ...t, password: true }))}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Rol</label>
                            <select
                                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-institutional-dark outline-none"
                                value={formData.rol}
                                onChange={(e) => {
                                    const nuevoRol = e.target.value;
                                    setFormData({
                                        ...formData,
                                        rol: nuevoRol,
                                        id_docente: requiereDocente(nuevoRol)
                                            ? (bloqueoEdicionDesdeDocentes ? (idDocenteBloqueado || formData.id_docente) : formData.id_docente)
                                            : '',
                                    });
                                }}
                            >
                                <option value="ADMIN">ADMIN</option>
                                <option value="DECANO">DECANO</option>
                                <option value="DOCENTE">DOCENTE</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Estado</label>
                            <select className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-institutional-dark outline-none" value={formData.activo} onChange={(e) => setFormData({ ...formData, activo: parseInt(e.target.value, 10) })}>
                                <option value={1}>ACTIVO</option>
                                <option value={0}>INACTIVO</option>
                            </select>
                        </div>
                    </div>

                    {requiereDocente(formData.rol) && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Docente Asociado <span className="text-red-500">*</span></label>
                            <select
                                className={`w-full bg-gray-50 border rounded-2xl px-6 py-3.5 text-sm font-bold text-institutional-dark outline-none transition-all
                                    ${tocados.id_docente && !formData.id_docente ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                                value={formData.id_docente}
                                disabled={bloqueoEdicionDesdeDocentes || (!esEdicion && Boolean(idDocentePrefill))}
                                onBlur={() => setTocados((t) => ({ ...t, id_docente: true }))}
                                onChange={(e) => setFormData({ ...formData, id_docente: e.target.value })}
                            >
                                <option value="">Seleccione docente...</option>
                                {docentes.map((d) => (
                                    <option key={d.id_docente} value={d.id_docente}>{d.nombres}</option>
                                ))}
                            </select>
                            {!esEdicion && Boolean(idDocentePrefill) && (
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
                                    Docente preasociado desde Gestión de Docentes
                                </p>
                            )}
                            {bloqueoEdicionDesdeDocentes && (
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
                                    Docente asociado bloqueado al editar desde Gestión de Docentes
                                </p>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={navegarCancelar} disabled={guardando} className="px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-all">Cancelar</button>
                        <button
                            type="submit"
                            disabled={guardando}
                            className="bg-institutional-green text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-institutional-green/90 transition-all flex items-center space-x-2 shadow-lg shadow-institutional-green/20"
                        >
                            {guardando ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
                            <span>{esEdicion ? 'Actualizar Usuario' : 'Guardar Usuario'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    );
};

export default UsuarioFormPage;
