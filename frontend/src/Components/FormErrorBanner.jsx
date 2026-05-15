import React from 'react';
import { AlertCircle, X } from 'lucide-react';

/**
 * Banner de error reutilizable para formularios modales.
 * Muestra el mensaje de error retornado por el API (Axios / NestJS).
 *
 * @param {Object}   props
 * @param {string|string[]|null} props.mensaje - Mensaje(s) de error a mostrar.
 *        Puede ser un string simple, un array de strings (class-validator) o null.
 * @param {Function} props.onDismiss          - Callback para cerrar el banner.
 * @returns {JSX.Element|null}
 */
const FormErrorBanner = ({ mensaje, onDismiss }) => {
    if (!mensaje) return null;

    /** Normalizar el mensaje a un array de strings */
    const lineas = Array.isArray(mensaje) ? mensaje : [mensaje];

    return (
        <div
            role="alert"
            className="mx-8 mb-2 flex items-start space-x-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 animate-in slide-in-from-top-2 duration-300"
        >
            {/* Ícono */}
            <div className="shrink-0 mt-0.5">
                <AlertCircle size={18} className="text-red-500" />
            </div>

            {/* Contenido */}
            <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black text-red-700 uppercase tracking-widest mb-1">
                    No se pudo guardar
                </p>
                <ul className="space-y-0.5">
                    {lineas.map((linea, idx) => (
                        <li key={idx} className="text-sm text-red-600 font-medium leading-snug">
                            {linea}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Botón cerrar */}
            <button
                type="button"
                onClick={onDismiss}
                aria-label="Cerrar mensaje de error"
                className="shrink-0 p-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors"
            >
                <X size={14} />
            </button>
        </div>
    );
};

export default FormErrorBanner;
