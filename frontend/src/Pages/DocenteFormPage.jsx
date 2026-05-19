import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Save,
    UserCircle,
} from 'lucide-react';
import api from '../services/api';
import Layout from '../Components/Layout';
import FormErrorBanner from '../Components/FormErrorBanner';
import { extraerMensajeError } from '../services/apiErrors';
import { toast } from 'react-toastify';

const ESCALAFON_POR_DEFECTO = 'Titular';
const FRANJA_POR_DEFECTO = 'Diurna';
const SEDES_PERMITIDAS = ['Mocoa', 'Sibundoy'];

const ESTADO_INICIAL = {
    identificacion: '',
    nombres: '',
    mail: '',
    sede: '',
    tipo_vinculacion: 'Carrera',
    tipo_dedicacion: 'Tiempo Completo',
    escalafon: ESCALAFON_POR_DEFECTO,
    franja: FRANJA_POR_DEFECTO,
    id_programa: '',
};

const emailValido = (valor) => {
    const email = String(valor || '').trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const identificacionValida = (valor) => /^\d+$/.test(String(valor || '').trim());

const DocenteFormPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const esEdicion = Boolean(id);
    const idFacultadFija = useMemo(() => {
        const query = new URLSearchParams(location.search);
        const valor = Number(query.get('id_facultad') || query.get('facultad_id') || 0);
        return valor > 0 ? valor : null;
    }, [location.search]);

    const volverAlListado = useCallback(() => {
        const params = new URLSearchParams();
        if (idFacultadFija) params.set('id_facultad', String(idFacultadFija));
        navigate(`/admin/docentes${params.toString() ? `?${params.toString()}` : ''}`);
    }, [idFacultadFija, navigate]);

    const [formData, setFormData] = useState(ESTADO_INICIAL);
    const [programas, setProgramas] = useState([]);
    const [facultadFijaNombre, setFacultadFijaNombre] = useState('');
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [errorApi, setErrorApi] = useState(null);
    const [tocados, setTocados] = useState({});

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const programasEndpoint = idFacultadFija
                    ? `/admin-docente/programas?id_facultad=${idFacultadFija}`
                    : '/admin-docente/programas';
                const { data: programasData } = await api.get(programasEndpoint);
                setProgramas(programasData);

                if (!esEdicion && idFacultadFija) {
                    try {
                        const { data: facultadData } = await api.get(`/admin-docente/facultades/${idFacultadFija}`);
                        setFacultadFijaNombre(facultadData?.nombre || 'Facultad activa');
                    } catch {
                        setFacultadFijaNombre('Facultad activa');
                    }
                }

                if (esEdicion) {
                    const { data } = await api.get(`/admin-docente/docentes/${id}`);
                    setFormData({
                        identificacion: data.identificacion ?? '',
                        nombres: data.nombres ?? '',
                        mail: data.mail ?? '',
                        sede: data.sede ?? '',
                        tipo_vinculacion: data.tipo_vinculacion ?? 'Carrera',
                        tipo_dedicacion: data.tipo_dedicacion ?? 'Tiempo Completo',
                        escalafon: data.escalafon ?? ESCALAFON_POR_DEFECTO,
                        franja: data.franja ?? FRANJA_POR_DEFECTO,
                        id_programa: data.id_programa ?? '',
                    });
                } else if (idFacultadFija && Array.isArray(programasData) && programasData.length === 1) {
                    setFormData((prev) => ({
                        ...prev,
                        id_programa: programasData[0].id_programa,
                    }));
                }
            } catch (error) {
                toast.error('Error al cargar datos del formulario');
            } finally {
                setCargando(false);
            }
        };

        cargarDatos();
    }, [esEdicion, id, idFacultadFija]);

    const handleChange = (campo, valor) => {
        if (campo === 'identificacion') {
            const soloNumeros = String(valor || '').replace(/\D+/g, '');
            setFormData((prev) => ({ ...prev, [campo]: soloNumeros }));
            return;
        }

        setFormData((prev) => ({ ...prev, [campo]: valor }));
    };

    const handleBlur = (campo) => {
        setTocados((prev) => ({ ...prev, [campo]: true }));
    };

    const inputClase = (campo) =>
        `w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold text-institutional-dark
         focus:ring-4 focus:ring-institutional-green/10 focus:border-institutional-green outline-none transition-all
         ${tocados[campo] && !formData[campo]?.toString().trim() ? 'border-red-400 bg-red-50' : 'border-gray-200'}`;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorApi(null);

        setTocados({ nombres: true, identificacion: true, mail: true, sede: true, id_programa: true });
        const mailActual = String(formData.mail || '').trim();
        const sedeActual = String(formData.sede || '').trim();

        if (!formData.nombres.trim() || !formData.identificacion.trim() || !formData.id_programa || !sedeActual || !mailActual) return;
        if (!identificacionValida(formData.identificacion)) return;
        if (!emailValido(mailActual)) return;
        if (!SEDES_PERMITIDAS.includes(sedeActual)) return;

        setGuardando(true);
        try {
            const payloadBase = {
                ...formData,
                mail: mailActual,
                sede: sedeActual,
                escalafon: ESCALAFON_POR_DEFECTO,
                franja: FRANJA_POR_DEFECTO,
                id_programa: Number(formData.id_programa),
            };

            const payload = esEdicion
                ? {
                    ...payloadBase,
                    identificacion: undefined,
                }
                : payloadBase;

            if (esEdicion) {
                await api.put(`/admin-docente/docentes/${id}`, payload);
                toast.success('Docente actualizado');
            } else {
                await api.post('/admin-docente/docentes', payload);
                toast.success('Docente creado');
            }

            volverAlListado();
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
                    <span className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Cargando docente...</span>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                    <div>
                        <div className="flex items-center space-x-2 mb-1">
                            <div className="w-8 h-1 bg-institutional-green rounded-full" />
                            <span className="text-[10px] font-black text-institutional-green uppercase tracking-[0.3em]">
                                Administración · Docentes
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-institutional-dark uppercase tracking-tight">
                            {esEdicion ? 'Editar Docente' : 'Nuevo Docente'}
                        </h1>
                        <p className="text-gray-500 mt-1 font-medium text-sm">
                            {esEdicion
                                ? 'Modifica la información del docente seleccionado'
                                : 'Completa los campos para registrar un nuevo docente'}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={volverAlListado}
                        className="flex items-center space-x-2 px-5 py-3 rounded-2xl border border-gray-200 text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all"
                    >
                        <ArrowLeft size={16} />
                        <span>Volver al listado</span>
                    </button>
                </div>

                <FormErrorBanner mensaje={errorApi} onDismiss={() => setErrorApi(null)} />

                <form onSubmit={handleSubmit} noValidate>
                    <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 mb-8">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2.5 bg-institutional-dark/5 rounded-xl">
                                <UserCircle size={20} className="text-institutional-dark" />
                            </div>
                            <div>
                                <h2 className="text-xs font-black text-institutional-dark uppercase tracking-widest">Información del Docente</h2>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Datos personales y académicos</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                                    Nombres Completos <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    className={inputClase('nombres')}
                                    value={formData.nombres}
                                    onBlur={() => handleBlur('nombres')}
                                    onChange={(e) => handleChange('nombres', e.target.value)}
                                />
                                {tocados.nombres && !formData.nombres.trim() && (
                                    <p className="text-xs text-red-500 font-bold px-1">Este campo es obligatorio</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                                    Identificación <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    disabled={esEdicion}
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={20}
                                    className={`${inputClase('identificacion')} disabled:opacity-50`}
                                    value={formData.identificacion}
                                    onBlur={() => handleBlur('identificacion')}
                                    onChange={(e) => handleChange('identificacion', e.target.value)}
                                />
                                {tocados.identificacion && !formData.identificacion.trim() && (
                                    <p className="text-xs text-red-500 font-bold px-1">Este campo es obligatorio</p>
                                )}
                                {tocados.identificacion && String(formData.identificacion || '').trim() && !identificacionValida(formData.identificacion) && (
                                    <p className="text-xs text-red-500 font-bold px-1">La identificación debe contener solo números</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                {idFacultadFija && !esEdicion && (
                                    <>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                                            Facultad seleccionada
                                        </label>
                                        <div className="w-full bg-gray-100 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-black text-institutional-dark mb-4">
                                            {facultadFijaNombre || 'Facultad activa'}
                                        </div>
                                    </>
                                )}

                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                                    Programa <span className="text-red-500">*</span>
                                </label>
                                <select
                                    className={inputClase('id_programa')}
                                    value={formData.id_programa}
                                    onBlur={() => handleBlur('id_programa')}
                                    onChange={(e) => handleChange('id_programa', e.target.value)}
                                >
                                    <option value="">Seleccione programa...</option>
                                    {programas.map((p) => (
                                        <option key={p.id_programa} value={p.id_programa}>{p.nombre}</option>
                                    ))}
                                </select>
                                {tocados.id_programa && !formData.id_programa && (
                                    <p className="text-xs text-red-500 font-bold px-1">Selecciona un programa</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                                    Correo electronico <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    className={inputClase('mail')}
                                    value={formData.mail}
                                    onBlur={() => handleBlur('mail')}
                                    onChange={(e) => handleChange('mail', e.target.value)}
                                />
                                {tocados.mail && !String(formData.mail || '').trim() && (
                                    <p className="text-xs text-red-500 font-bold px-1">Este campo es obligatorio</p>
                                )}
                                {tocados.mail && String(formData.mail || '').trim() && !emailValido(formData.mail) && (
                                    <p className="text-xs text-red-500 font-bold px-1">Ingresa un correo valido</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                                    Sede <span className="text-red-500">*</span>
                                </label>
                                <select
                                    className={inputClase('sede')}
                                    value={formData.sede}
                                    onBlur={() => handleBlur('sede')}
                                    onChange={(e) => handleChange('sede', e.target.value)}
                                >
                                    <option value="">Seleccione sede...</option>
                                    {SEDES_PERMITIDAS.map((sede) => (
                                        <option key={sede} value={sede}>{sede}</option>
                                    ))}
                                </select>
                                {tocados.sede && !String(formData.sede || '').trim() && (
                                    <p className="text-xs text-red-500 font-bold px-1">Este campo es obligatorio</p>
                                )}
                                {tocados.sede && String(formData.sede || '').trim() && !SEDES_PERMITIDAS.includes(String(formData.sede || '').trim()) && (
                                    <p className="text-xs text-red-500 font-bold px-1">Selecciona una sede válida (Mocoa o Sibundoy)</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Vinculación</label>
                                <select className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold" value={formData.tipo_vinculacion} onChange={(e) => handleChange('tipo_vinculacion', e.target.value)}>
                                    {['Carrera', 'Ocasional', 'Provisional', 'Planta'].map((v) => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Dedicación</label>
                                <select className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold" value={formData.tipo_dedicacion} onChange={(e) => handleChange('tipo_dedicacion', e.target.value)}>
                                    {['Tiempo Completo', 'Medio Tiempo', 'Hora Catedra'].map((d) => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>

                        </div>
                    </section>

                    <div className="sticky bottom-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={volverAlListado}
                            className="px-6 py-3.5 rounded-2xl border border-gray-200 text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={guardando}
                            className="bg-institutional-green text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-institutional-green/90 transition-all flex items-center space-x-2 shadow-lg shadow-institutional-green/20 disabled:opacity-60"
                        >
                            {guardando ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save size={16} />
                            )}
                            <span>{esEdicion ? 'Actualizar Docente' : 'Guardar Docente'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    );
};

export default DocenteFormPage;
