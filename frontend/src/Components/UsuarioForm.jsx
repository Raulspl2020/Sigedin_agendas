import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Save, User, Key } from 'lucide-react';
import api from '../services/api';
import FormErrorBanner from './FormErrorBanner';
import { extraerMensajeError } from '../services/apiErrors';

/**
 * Formulario modal para crear o editar un Usuario del sistema.
 *
 * @param {Object}      props
 * @param {Object|null} props.usuario   - Usuario a editar, null para crear.
 * @param {boolean}     props.isOpen
 * @param {Function}    props.onClose
 * @param {Function}    props.onSave    - Función async que persiste los datos.
 * @param {boolean}     props.isSaving
 */
const UsuarioForm = ({ usuario, isOpen, onClose, onSave, isSaving }) => {
    const requiereDocente = (rol) => rol === 'DOCENTE' || rol === 'DECANO';
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        rol: 'DOCENTE',
        id_docente: '',
        activo: 1
    });
    const [docentes, setDocentes] = useState([]);

    /** @type {[string|string[]|null, Function]} */
    const [errorApi, setErrorApi] = useState(null);
    const [tocados, setTocados] = useState({});

    useEffect(() => { fetchDocentes(); }, []);

    useEffect(() => {
        if (usuario) {
            setFormData({
                username: usuario.username,
                password: '',
                rol: usuario.rol,
                id_docente: usuario.id_docente || '',
                activo: usuario.activo
            });
        } else {
            setFormData({ username: '', password: '', rol: 'DOCENTE', id_docente: '', activo: 1 });
        }
        setErrorApi(null);
        setTocados({});
    }, [usuario, isOpen]);

    /** Carga la lista de docentes disponibles */
    const fetchDocentes = async () => {
        try {
            const { data } = await api.get('/admin-docente/docentes');
            setDocentes(data);
        } catch {
            // Silencioso
        }
    };

    if (!isOpen) return null;

    /**
     * Valida campos obligatorios y envía al API.
     * @param {React.FormEvent} e
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorApi(null);

        const nuevosTocados = {
            username: true,
            password: !usuario, // La contraseña solo es obligatoria al crear
            rol: true,
            activo: true,
            id_docente: requiereDocente(formData.rol)
        };
        setTocados(nuevosTocados);

        const faltaUsername = !formData.username.trim();
        const faltaPassword = !usuario && !formData.password.trim();
        const faltaRol = !String(formData.rol || '').trim();
        const faltaEstado = formData.activo !== 0 && formData.activo !== 1;
        const faltaDocente = requiereDocente(formData.rol) && !formData.id_docente;

        if (faltaUsername || faltaPassword || faltaRol || faltaEstado || faltaDocente) return;

        try {
            await onSave(formData);
        } catch (err) {
            setErrorApi(extraerMensajeError(err));
        }
    };

    /** Clases de input según validación */
    const inputClase = (campo, condicion = true) =>
        `w-full bg-gray-50 border rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold text-institutional-dark
         focus:ring-4 focus:ring-institutional-blue/10 outline-none transition-all
         ${tocados[campo] && condicion && !formData[campo]?.toString().trim()
            ? 'border-red-400 bg-red-50'
            : 'border-gray-200'}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-institutional-dark/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-300">
                <div className="bg-gradient-to-r from-institutional-dark to-institutional-blue p-8 text-white relative">
                    <button onClick={onClose} disabled={isSaving} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 transition-colors">
                        <X size={20} />
                    </button>
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                            <ShieldCheck className="text-institutional-green" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight">{usuario ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
                            <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-1">Control de Accesos</p>
                        </div>
                    </div>
                </div>

                {/* Banner de error API */}
                <FormErrorBanner mensaje={errorApi} onDismiss={() => setErrorApi(null)} />

                <form onSubmit={handleSubmit} className="p-8 space-y-5" noValidate>
                    {/* Username */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                            Username <span className="text-red-500">*</span>
                        </label>
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-institutional-blue transition-colors" size={18} />
                            <input
                                type="text"
                                className={inputClase('username')}
                                value={formData.username}
                                onBlur={() => setTocados(t => ({ ...t, username: true }))}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            />
                        </div>
                        {tocados.username && !formData.username.trim() && (
                            <p className="text-xs text-red-500 font-bold px-1">El username es obligatorio</p>
                        )}
                    </div>

                    {/* Contraseña */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                            {usuario ? 'Nueva Contraseña (dejar vacío para no cambiar)' : <>Contraseña <span className="text-red-500">*</span></>}
                        </label>
                        <div className="relative group">
                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-institutional-blue transition-colors" size={18} />
                            <input
                                type="password"
                                placeholder="••••••••"
                                className={`w-full bg-gray-50 border rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold text-institutional-dark
                                    focus:ring-4 focus:ring-institutional-blue/10 outline-none transition-all
                                    ${tocados.password && !usuario && !formData.password.trim()
                                        ? 'border-red-400 bg-red-50'
                                        : 'border-gray-200'}`}
                                value={formData.password}
                                onBlur={() => setTocados(t => ({ ...t, password: true }))}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                        {tocados.password && !usuario && !formData.password.trim() && (
                            <p className="text-xs text-red-500 font-bold px-1">La contraseña es obligatoria</p>
                        )}
                    </div>

                    {/* Rol y Estado */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Rol</label>
                            <select className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-institutional-dark outline-none" value={formData.rol} onChange={(e) => setFormData({ ...formData, rol: e.target.value, id_docente: requiereDocente(e.target.value) ? formData.id_docente : '' })}>
                                <option value="ADMIN">ADMIN</option>
                                <option value="DECANO">DECANO</option>
                                <option value="DOCENTE">DOCENTE</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Estado</label>
                            <select className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-institutional-dark outline-none" value={formData.activo} onChange={(e) => setFormData({ ...formData, activo: parseInt(e.target.value) })}>
                                <option value={1}>ACTIVO</option>
                                <option value={0}>INACTIVO</option>
                            </select>
                        </div>
                    </div>

                    {/* Docente Asociado (solo rol DOCENTE) */}
                    {requiereDocente(formData.rol) && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                                Docente Asociado <span className="text-red-500">*</span>
                            </label>
                            <select
                                className={`w-full bg-gray-50 border rounded-2xl px-6 py-3.5 text-sm font-bold text-institutional-dark outline-none transition-all
                                    ${tocados.id_docente && !formData.id_docente ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                                value={formData.id_docente}
                                onBlur={() => setTocados(t => ({ ...t, id_docente: true }))}
                                onChange={(e) => setFormData({ ...formData, id_docente: e.target.value })}
                            >
                                <option value="">Seleccione docente...</option>
                                {docentes.map(d => (
                                    <option key={d.id_docente} value={d.id_docente}>{d.nombres}</option>
                                ))}
                            </select>
                            {tocados.id_docente && !formData.id_docente && (
                                <p className="text-xs text-red-500 font-bold px-1">Selecciona un docente</p>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={onClose} disabled={isSaving} className="px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-all">Cancelar</button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="bg-institutional-green text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-institutional-green/90 transition-all flex items-center space-x-2 shadow-lg shadow-institutional-green/20"
                        >
                            {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
                            <span>{usuario ? 'Actualizar' : 'Guardar Usuario'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UsuarioForm;
