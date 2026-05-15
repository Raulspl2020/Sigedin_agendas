import React, { useState, useEffect } from 'react';
import { X, Building2, Save } from 'lucide-react';
import FormErrorBanner from './FormErrorBanner';
import { extraerMensajeError } from '../services/apiErrors';

/**
 * Formulario modal para crear o editar una Facultad.
 *
 * @param {Object}   props
 * @param {Object|null} props.facultad  - Facultad a editar, null para crear.
 * @param {boolean}  props.isOpen       - Controla la visibilidad del modal.
 * @param {Function} props.onClose      - Cierra el modal.
 * @param {Function} props.onSave       - Función async que persiste los datos.
 * @param {boolean}  props.isSaving     - Indica que la petición está en curso.
 */
const FacultadForm = ({ facultad, isOpen, onClose, onSave, isSaving }) => {
    const [formData, setFormData] = useState({ nombre: '' });

    /** @type {[string|string[]|null, Function]} */
    const [errorApi, setErrorApi] = useState(null);

    /** @type {[Object, Function]} Estado de validación de campos obligatorios */
    const [tocados, setTocados] = useState({});

    useEffect(() => {
        if (facultad) setFormData({ nombre: facultad.nombre });
        else setFormData({ nombre: '' });
        setErrorApi(null);
        setTocados({});
    }, [facultad, isOpen]);

    if (!isOpen) return null;

    /**
     * Envía el formulario. Captura errores del API y los muestra en el banner.
     * @param {React.FormEvent} e
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorApi(null);
        try {
            await onSave(formData);
        } catch (err) {
            setErrorApi(extraerMensajeError(err));
        }
    };

    /** Clases de borde para campos con error de validación HTML */
    const inputClase = (campo) =>
        `w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold text-institutional-dark
         focus:ring-4 focus:ring-institutional-green/10 focus:border-institutional-green outline-none transition-all
         ${tocados[campo] && !formData[campo]
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
                            <Building2 className="text-institutional-green" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight">{facultad ? 'Editar Facultad' : 'Nueva Facultad'}</h2>
                            <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-1">Estructura Organizacional</p>
                        </div>
                    </div>
                </div>

                {/* Banner de error API */}
                <FormErrorBanner mensaje={errorApi} onDismiss={() => setErrorApi(null)} />

                <form onSubmit={handleSubmit} className="p-8 space-y-6" noValidate>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                            Nombre de la Facultad <span className="text-red-500">*</span>
                        </label>
                        <input
                            required
                            type="text"
                            placeholder="Ej: Facultad de Ingeniería"
                            className={inputClase('nombre')}
                            value={formData.nombre}
                            onBlur={() => setTocados(t => ({ ...t, nombre: true }))}
                            onChange={(e) => setFormData({ nombre: e.target.value })}
                        />
                        {tocados.nombre && !formData.nombre && (
                            <p className="text-xs text-red-500 font-bold px-1">Este campo es obligatorio</p>
                        )}
                    </div>
                    <div className="flex justify-end space-x-3">
                        <button type="button" onClick={onClose} disabled={isSaving} className="px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-all">Cancelar</button>
                        <button type="submit" disabled={isSaving} className="bg-institutional-green text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-institutional-green/90 transition-all flex items-center space-x-2">
                            {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
                            <span>{facultad ? 'Actualizar' : 'Guardar'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FacultadForm;
