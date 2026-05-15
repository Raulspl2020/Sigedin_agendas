import React, { useState, useEffect } from 'react';
import { X, GraduationCap, Save } from 'lucide-react';
import api from '../services/api';
import FormErrorBanner from './FormErrorBanner';
import { extraerMensajeError } from '../services/apiErrors';

/**
 * Formulario modal para crear o editar un Programa académico.
 *
 * @param {Object}      props
 * @param {Object|null} props.programa  - Programa a editar, null para crear.
 * @param {boolean}     props.isOpen
 * @param {Function}    props.onClose
 * @param {Function}    props.onSave    - Función async que persiste los datos.
 * @param {boolean}     props.isSaving
 */
const ProgramaForm = ({
    programa,
    isOpen,
    onClose,
    onSave,
    isSaving,
    fixedFacultadId,
    fixedFacultadNombre,
}) => {
    const [formData, setFormData] = useState({
        nombre: '',
        id_facultad: fixedFacultadId ? String(fixedFacultadId) : '',
    });
    const [facultades, setFacultades] = useState([]);

    /** @type {[string|string[]|null, Function]} */
    const [errorApi, setErrorApi] = useState(null);
    const [tocados, setTocados] = useState({});

    useEffect(() => {
        fetchFacultades();
    }, []);

    useEffect(() => {
        if (programa) {
            setFormData({
                nombre: programa.nombre,
                id_facultad: fixedFacultadId ? String(fixedFacultadId) : String(programa.id_facultad || ''),
            });
        } else {
            setFormData({ nombre: '', id_facultad: fixedFacultadId ? String(fixedFacultadId) : '' });
        }
        setErrorApi(null);
        setTocados({});
    }, [programa, isOpen, fixedFacultadId]);

    /** Obtiene el listado de facultades disponibles para el selector */
    const fetchFacultades = async () => {
        try {
            const { data } = await api.get('/admin-docente/facultades');
            setFacultades(data);
        } catch {
            // Silencioso: si falla el combo, el select estará vacío
        }
    };

    if (!isOpen) return null;

    /**
     * Valida campos obligatorios y envía el formulario.
     * @param {React.FormEvent} e
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorApi(null);

        const nuevasTocadas = { nombre: true, id_facultad: true };
        setTocados(nuevasTocadas);

        if (!formData.nombre.trim() || (!fixedFacultadId && !formData.id_facultad)) return;

        try {
            const payload = {
                ...formData,
                id_facultad: fixedFacultadId ? String(fixedFacultadId) : formData.id_facultad,
            };
            await onSave(payload);
        } catch (err) {
            setErrorApi(extraerMensajeError(err));
        }
    };

    /** Clases de input según validación */
    const inputClase = (campo) =>
        `w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold text-institutional-dark
         focus:ring-4 focus:ring-institutional-green/10 focus:border-institutional-green outline-none transition-all
         ${tocados[campo] && !formData[campo]?.toString().trim()
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
                            <GraduationCap className="text-institutional-green" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight">{programa ? 'Editar Programa' : 'Nuevo Programa'}</h2>
                            <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-1">Oferta Académica</p>
                        </div>
                    </div>
                </div>

                {/* Banner de error API */}
                <FormErrorBanner mensaje={errorApi} onDismiss={() => setErrorApi(null)} />

                <form onSubmit={handleSubmit} className="p-8 space-y-6" noValidate>
                    {/* Facultad */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                            Facultad <span className="text-red-500">*</span>
                        </label>

                        {fixedFacultadId ? (
                            <div className="w-full bg-gray-100 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-black text-institutional-dark">
                                {fixedFacultadNombre || 'Facultad activa'}
                            </div>
                        ) : (
                            <select
                                className={inputClase('id_facultad')}
                                value={formData.id_facultad}
                                onBlur={() => setTocados(t => ({ ...t, id_facultad: true }))}
                                onChange={(e) => setFormData({ ...formData, id_facultad: e.target.value })}
                            >
                                <option value="">Seleccione una facultad...</option>
                                {facultades.map(f => (
                                    <option key={f.id_facultad} value={f.id_facultad}>{f.nombre}</option>
                                ))}
                            </select>
                        )}

                        {tocados.id_facultad && !formData.id_facultad && !fixedFacultadId && (
                            <p className="text-xs text-red-500 font-bold px-1">Selecciona una facultad</p>
                        )}
                    </div>

                    {/* Nombre */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                            Nombre del Programa <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Ej: Ingeniería de Sistemas"
                            className={inputClase('nombre')}
                            value={formData.nombre}
                            onBlur={() => setTocados(t => ({ ...t, nombre: true }))}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        />
                        {tocados.nombre && !formData.nombre.trim() && (
                            <p className="text-xs text-red-500 font-bold px-1">Este campo es obligatorio</p>
                        )}
                    </div>

                    <div className="flex justify-end space-x-3">
                        <button type="button" onClick={onClose} disabled={isSaving} className="px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-all">
                            Cancelar
                        </button>
                        <button type="submit" disabled={isSaving} className="bg-institutional-green text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-institutional-green/90 transition-all flex items-center space-x-2">
                            {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
                            <span>{programa ? 'Actualizar' : 'Guardar'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProgramaForm;
