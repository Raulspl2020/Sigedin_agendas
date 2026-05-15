/**
 * @file apiErrors.js
 * @description Utilidades para extraer mensajes legibles de errores de API (NestJS + Axios).
 */

/**
 * Extrae el mensaje de error de una respuesta Axios/NestJS.
 *
 * NestJS puede devolver:
 *  - { message: "string", statusCode, error }
 *  - { message: ["string1", "string2"], statusCode, error }  ← class-validator
 *
 * @param {any} err - Error capturado en catch (Axios error)
 * @param {string} [fallback='Error al guardar. Inténtalo de nuevo.']
 * @returns {string|string[]} Mensaje(s) de error listos para mostrar
 */
export const extraerMensajeError = (err, fallback = 'Error al guardar. Inténtalo de nuevo.') => {
    const data = err?.response?.data;
    if (!data) return fallback;

    const { message } = data;

    if (Array.isArray(message) && message.length > 0) return message;
    if (typeof message === 'string' && message.trim()) return message;

    return fallback;
};
