import React, { useState, useEffect } from 'react';
import { X, Layers, Save, AlertCircle, Clock } from 'lucide-react';
import FormErrorBanner from './FormErrorBanner';
import { extraerMensajeError } from '../services/apiErrors';

/**
 * Formulario modal para creación y edición de tipos de actividades.
 *
 * @param {Object}      props
 * @param {Object|null} props.tipo    - Tipo a editar, null para crear.
 * @param {boolean}     props.isOpen
 * @param {Function}    props.onClose
 * @param {Function}    props.onSave  - Función async que persiste los datos.
 * @param {boolean}     props.isSaving
 */
const TipoActividadForm = ({ tipo, isOpen, onClose, onSave, isSaving }) => {
    const [formData, setFormData] = useState({ nombre: '', max_horas_semana: '' });

    /** @type {[string|string[]|null, Function]} */
    const [errorApi, setErrorApi] = useState(null);
    const [tocados, setTocados] = useState({});

    useEffect(() => {
        if (tipo) {
            setFormData({ nombre: tipo.nombre, max_horas_semana: tipo.max_horas_semana || '' });
        } else {
            setFormData({ nombre: '', max_horas_semana: '' });
        }
        setErrorApi(null);
        setTocados({});
    }, [tipo, isOpen]);

    if (!isOpen) return null;

    /**
     * Envía el formulario capturando errores del API.
     * @param {React.FormEvent} e
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorApi(null);

        // Marcar todos los campos como tocados para mostrar validaciones
        setTocados({ nombre: true });
        if (!formData.nombre.trim()) return;

        const data = {
            ...formData,
            max_horas_semana: formData.max_horas_semana === '' ? null : parseInt(formData.max_horas_semana),
        };
        try {
            await onSave(data);
        } catch (err) {
            setErrorApi(extraerMensajeError(err));
        }
    };

    /** Clases de input según si el campo es requerido y está vacío */
    const inputClase = (campo) =>
        `w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold text-institutional-dark
         focus:ring-4 focus:ring-institutional-green/10 focus:border-institutional-green outline-none transition-all
         ${tocados[campo] && !formData[campo]?.toString().trim()
            ? 'border-red-400 bg-red-50'
            : 'border-gray-200'}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-institutional-dark/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="bg-gradient-to-r from-institutional-dark to-institutional-blue p-8 text-white relative">
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-30"
                    >
                        <X size={20} />
                    </button>
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                            <Layers className="text-institutional-green" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight">
                                {tipo ? 'Editar Tipo' : 'Nuevo Tipo'}
                            </h2>
                            <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-1">
                                Maestro de Actividades
                            </p>
                        </div>
                    </div>
                </div>

                {/* Banner de error API */}
                <FormErrorBanner mensaje={errorApi} onDismiss={() => setErrorApi(null)} />

                <form onSubmit={handleSubmit} className="p-8 space-y-6" noValidate>
                    {/* Nombre */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                            Nombre del Tipo de Actividad <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Ej: Docencia Directa"
                            className={inputClase('nombre')}
                            value={formData.nombre}
                            onBlur={() => setTocados(t => ({ ...t, nombre: true }))}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        />
                        {tocados.nombre && !formData.nombre.trim() && (
                            <p className="text-xs text-red-500 font-bold px-1">Este campo es obligatorio</p>
                        )}
                    </div>

                    {/* Max Horas */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                            Máximo de Horas Semanales <span className="text-gray-300">(Opcional)</span>
                        </label>
                        <div className="relative group">
                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-institutional-green transition-colors" size={18} />
                            <input
                                type="number"
                                min="1"
                                max="40"
                                placeholder="Ej: 16"
                                className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold text-institutional-dark focus:ring-4 focus:ring-institutional-green/10 focus:border-institutional-green outline-none transition-all"
                                value={formData.max_horas_semana}
                                onChange={(e) => setFormData({ ...formData, max_horas_semana: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-amber-500">
                            <AlertCircle size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Límites académicos</span>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSaving}
                                className="px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-30"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="bg-institutional-green text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-[0.15em] hover:bg-institutional-green/90 shadow-lg shadow-institutional-green/20 active:scale-95 transition-all flex items-center space-x-2 disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <div className="flex items-center space-x-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Cargando...</span>
                                    </div>
                                ) : (
                                    <>
                                        <Save size={16} />
                                        <span>{tipo ? 'Actualizar' : 'Guardar Tipo'}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TipoActividadForm;
