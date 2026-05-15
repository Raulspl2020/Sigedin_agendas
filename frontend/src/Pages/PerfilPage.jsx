import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, LockKeyhole, Save, UserRound } from 'lucide-react';
import { toast } from 'react-toastify';
import Layout from '../Components/Layout';
import api from '../services/api';
import { extraerMensajeError } from '../services/apiErrors';
import { useAuth } from '../context/AuthContext';

const VINCULACIONES = ['Carrera', 'Ocasional', 'Provisional', 'Planta'];
const DEDICACIONES = ['Tiempo Completo', 'Medio Tiempo', 'Hora Catedra'];
const ESCALAFONES = ['Auxiliar', 'Asistente', 'Asociado', 'Titular'];
const FRANJAS = ['Diurna', 'Nocturna', 'Mixta'];

const PERFIL_INICIAL = {
    identificacion: '',
    nombres: '',
    mail: '',
    sede: '',
    tipo_vinculacion: 'Carrera',
    tipo_dedicacion: 'Tiempo Completo',
    escalafon: 'Auxiliar',
    franja: 'Diurna',
    id_programa: '',
    programa_nombre: '',
};

const PASSWORD_INICIAL = {
    password_actual: '',
    password_nueva: '',
    password_confirmacion: '',
};

const emailValido = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

const PerfilPage = () => {
    const navigate = useNavigate();
    const { actualizarUsuario } = useAuth();

    const [perfil, setPerfil] = useState(PERFIL_INICIAL);
    const [password, setPassword] = useState(PASSWORD_INICIAL);
    const [usuarioActivo, setUsuarioActivo] = useState(false);
    const [sinDocente, setSinDocente] = useState(false);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    const cambioPasswordSolicitado = useMemo(() => {
        return Boolean(password.password_actual || password.password_nueva || password.password_confirmacion);
    }, [password]);

    useEffect(() => {
        const cargarPerfil = async () => {
            setCargando(true);
            setError('');
            setSinDocente(false);

            try {
                const { data } = await api.get('/perfil');
                const docente = data?.docente;
                const activo = Number(data?.usuario?.activo) === 1;

                setUsuarioActivo(activo);

                if (!docente) {
                    setSinDocente(true);
                    setPerfil(PERFIL_INICIAL);
                    return;
                }

                setPerfil({
                    identificacion: docente.identificacion || '',
                    nombres: docente.nombres || '',
                    mail: docente.mail || '',
                    sede: docente.sede || '',
                    tipo_vinculacion: docente.tipo_vinculacion || 'Carrera',
                    tipo_dedicacion: docente.tipo_dedicacion || 'Tiempo Completo',
                    escalafon: docente.escalafon || 'Auxiliar',
                    franja: docente.franja || 'Diurna',
                    id_programa: docente.id_programa || '',
                    programa_nombre: docente?.programa?.nombre || '',
                });
            } catch (err) {
                setError(extraerMensajeError(err));
            } finally {
                setCargando(false);
            }
        };

        cargarPerfil();
    }, []);

    const valueSanitizer = (campo, valor) => {
        if (campo === 'password_actual' || campo === 'password_nueva' || campo === 'password_confirmacion') {
            return String(valor || '');
        }
        return valor;
    };

    const actualizarCampoPerfil = (campo, valor) => {
        setPerfil((prev) => ({ ...prev, [campo]: valor }));
    };

    const actualizarCampoPassword = (campo, valor) => {
        setPassword((prev) => ({ ...prev, [campo]: valueSanitizer(campo, valor) }));
    };

    const validarFormulario = () => {
        if (sinDocente) {
            setError('No existe docente asociado para este usuario.');
            return false;
        }

        if (!perfil.nombres.trim() || !perfil.mail.trim() || !perfil.sede.trim()) {
            setError('Nombres, correo y sede son obligatorios.');
            return false;
        }

        if (!emailValido(perfil.mail)) {
            setError('El formato del correo no es válido.');
            return false;
        }

        if (cambioPasswordSolicitado) {
            if (!usuarioActivo) {
                setError('Usuario inactivo. No puede cambiar la contraseña.');
                return false;
            }

            if (!password.password_actual || !password.password_nueva || !password.password_confirmacion) {
                setError('Para cambiar contraseña debe completar los 3 campos de seguridad.');
                return false;
            }

            if (password.password_nueva.length < 6) {
                setError('La nueva contraseña debe tener al menos 6 caracteres.');
                return false;
            }

            if (password.password_nueva !== password.password_confirmacion) {
                setError('La confirmación de contraseña no coincide.');
                return false;
            }
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!validarFormulario()) {
            return;
        }

        const payload = {
            nombres: perfil.nombres.trim(),
            mail: perfil.mail.trim(),
            sede: perfil.sede.trim(),
            tipo_vinculacion: perfil.tipo_vinculacion,
            tipo_dedicacion: perfil.tipo_dedicacion,
            escalafon: perfil.escalafon,
            franja: perfil.franja,
        };

        if (cambioPasswordSolicitado && usuarioActivo) {
            payload.password_actual = password.password_actual;
            payload.password_nueva = password.password_nueva;
        }

        setGuardando(true);
        try {
            const { data } = await api.patch('/perfil', payload);
            setPassword(PASSWORD_INICIAL);

            if (actualizarUsuario) {
                actualizarUsuario((prev) => ({
                    ...prev,
                    username: data?.usuario?.username || prev?.username,
                    rol: data?.usuario?.rol || prev?.rol,
                    docente: data?.docente || prev?.docente,
                }));
            }

            toast.success('Perfil actualizado correctamente.');
        } catch (err) {
            setError(extraerMensajeError(err));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Layout>
            <div className="max-w-5xl mx-auto space-y-6">
                <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-institutional-green/10 text-institutional-green text-[10px] font-black uppercase tracking-widest">
                                <UserRound size={14} />
                                Mi perfil
                            </div>
                            <h1 className="mt-3 text-2xl md:text-3xl font-black uppercase tracking-tight text-institutional-dark">Perfil del docente</h1>
                            <p className="text-sm text-gray-500 font-medium mt-1">Actualiza tus datos personales y académicos autorizados.</p>
                        </div>
                    </div>
                </section>

                {cargando ? (
                    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center text-gray-500">
                        <Loader2 className="animate-spin mb-2" size={26} />
                        <p className="text-xs font-black uppercase tracking-widest">Cargando perfil...</p>
                    </section>
                ) : (
                    <form onSubmit={handleSubmit} noValidate className="space-y-6">
                        {error && (
                            <section className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm font-semibold flex items-start gap-2">
                                <AlertCircle size={16} className="mt-0.5" />
                                <span>{error}</span>
                            </section>
                        )}

                        {sinDocente ? (
                            <section className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-5 text-amber-800 text-sm font-medium">
                                El usuario autenticado no tiene docente asociado. Solicita al administrador la vinculación para habilitar la edición del perfil.
                            </section>
                        ) : (
                            <>
                                <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
                                    <h2 className="text-sm font-black uppercase tracking-widest text-institutional-green mb-4">Datos personales y académicos</h2>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <label className="space-y-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Identificación</span>
                                            <input type="text" value={perfil.identificacion} disabled className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-500 cursor-not-allowed" />
                                        </label>

                                        <label className="space-y-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Programa</span>
                                            <input
                                                type="text"
                                                value={perfil.programa_nombre || (perfil.id_programa ? `ID ${perfil.id_programa}` : 'Sin programa')}
                                                disabled
                                                className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-500 cursor-not-allowed"
                                            />
                                        </label>

                                        <label className="space-y-1 md:col-span-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Nombres</span>
                                            <input type="text" value={perfil.nombres} onChange={(e) => actualizarCampoPerfil('nombres', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-institutional-dark outline-none" />
                                        </label>

                                        <label className="space-y-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Correo</span>
                                            <input type="email" value={perfil.mail} onChange={(e) => actualizarCampoPerfil('mail', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-institutional-dark outline-none" />
                                        </label>

                                        <label className="space-y-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Sede</span>
                                            <input type="text" value={perfil.sede} onChange={(e) => actualizarCampoPerfil('sede', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-institutional-dark outline-none" />
                                        </label>

                                        <label className="space-y-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Tipo vinculación</span>
                                            <select value={perfil.tipo_vinculacion} onChange={(e) => actualizarCampoPerfil('tipo_vinculacion', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-institutional-dark outline-none">
                                                {VINCULACIONES.map((item) => <option key={item} value={item}>{item}</option>)}
                                            </select>
                                        </label>

                                        <label className="space-y-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Tipo dedicación</span>
                                            <select value={perfil.tipo_dedicacion} onChange={(e) => actualizarCampoPerfil('tipo_dedicacion', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-institutional-dark outline-none">
                                                {DEDICACIONES.map((item) => <option key={item} value={item}>{item}</option>)}
                                            </select>
                                        </label>

                                        <label className="space-y-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Escalafón</span>
                                            <select value={perfil.escalafon} onChange={(e) => actualizarCampoPerfil('escalafon', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-institutional-dark outline-none">
                                                {ESCALAFONES.map((item) => <option key={item} value={item}>{item}</option>)}
                                            </select>
                                        </label>

                                        <label className="space-y-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Franja</span>
                                            <select value={perfil.franja} onChange={(e) => actualizarCampoPerfil('franja', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-institutional-dark outline-none">
                                                {FRANJAS.map((item) => <option key={item} value={item}>{item}</option>)}
                                            </select>
                                        </label>
                                    </div>
                                </section>

                                <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
                                    <div className="flex items-center gap-2 mb-4">
                                        <LockKeyhole size={16} className="text-institutional-green" />
                                        <h2 className="text-sm font-black uppercase tracking-widest text-institutional-green">Cambio de contraseña</h2>
                                    </div>

                                    {!usuarioActivo && (
                                        <p className="mb-4 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium">
                                            Usuario inactivo. No puede cambiar la contraseña.
                                        </p>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <label className="space-y-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Contraseña actual</span>
                                            <input type="password" disabled={!usuarioActivo} value={password.password_actual} onChange={(e) => actualizarCampoPassword('password_actual', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-institutional-dark disabled:opacity-60 disabled:cursor-not-allowed outline-none" />
                                        </label>

                                        <label className="space-y-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Nueva contraseña</span>
                                            <input type="password" disabled={!usuarioActivo} value={password.password_nueva} onChange={(e) => actualizarCampoPassword('password_nueva', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-institutional-dark disabled:opacity-60 disabled:cursor-not-allowed outline-none" />
                                        </label>

                                        <label className="space-y-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Confirmar contraseña</span>
                                            <input type="password" disabled={!usuarioActivo} value={password.password_confirmacion} onChange={(e) => actualizarCampoPassword('password_confirmacion', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-institutional-dark disabled:opacity-60 disabled:cursor-not-allowed outline-none" />
                                        </label>
                                    </div>
                                </section>

                                <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5">
                                    <div className="flex items-center justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() => navigate(-1)}
                                            className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                                        >
                                            Cancelar
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={guardando}
                                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-institutional-green text-white hover:bg-institutional-green/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {guardando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                                            Guardar cambios
                                        </button>
                                    </div>
                                </section>
                            </>
                        )}
                    </form>
                )}
            </div>
        </Layout>
    );
};

export default PerfilPage;
