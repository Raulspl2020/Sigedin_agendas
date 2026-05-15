import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    Save,
    Activity,
    Tag,
    BookOpen,
    Clock,
    Link,
    ClipboardCheck,
    FileText,
    AlertCircle,
    X,
} from 'lucide-react';
import api from '../services/api';
import Layout from '../components/Layout';
import { toast } from 'react-toastify';

/** Estado vacío del formulario */
const ESTADO_INICIAL = {
    id_tipo: '',
    nombre: '',
    descripcion: '',
    horas_semanales: '',
    fuente_verificacion: '',
    evidencia_esperada: '',
};

/**
 * Página completa para crear o editar una Actividad Académica.
 * Sustituye al modal `ActividadModal` definido en `Actividades.jsx`.
 *
 * Rutas:
 *  - /actividades/nueva?id_agenda=X           → Crear
 *  - /actividades/editar/:id?id_agenda=X      → Editar
 */
const ActividadFormPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const idAgenda = searchParams.get('id_agenda');
    const esEdicion = Boolean(id);

    const [formData, setFormData] = useState(ESTADO_INICIAL);
    const [tipos, setTipos] = useState([]);
    const [clasesActividad, setClasesActividad] = useState([]);
    const [cargandoClases, setCargandoClases] = useState(false);
    const [errorClases, setErrorClases] = useState(false);
    const [cargando, setCargando] = useState(esEdicion);
    const [guardando, setGuardando] = useState(false);

    /** @type {[string[]|null, Function]} */
    const [errorApi, setErrorApi] = useState(null);
    const [tocados, setTocados] = useState({});

    const tipoSeleccionado = tipos.find((t) => Number(t.id_tipo) === Number(formData.id_tipo));

    // ───── Carga inicial: tipos y actividad actual si es edición ─────
    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const resTipos = await api.get('/tipo-actividad');
                setTipos(resTipos.data);

                if (esEdicion) {
                    const { data } = await api.get(`/actividades/${id}`);
                    setFormData({
                        id_tipo: data.id_tipo ?? '',
                        nombre: data.nombre ?? '',
                        descripcion: data.descripcion ?? '',
                        horas_semanales: data.horas_semanales ?? '',
                        fuente_verificacion: data.fuente_verificacion ?? '',
                        evidencia_esperada: data.evidencia_esperada ?? '',
                    });
                }
            } catch (error) {
                toast.error('Error al cargar los datos del formulario');
            } finally {
                setCargando(false);
            }
        };

        cargarDatos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        const idTipo = Number(formData.id_tipo);

        if (!idTipo) {
            setClasesActividad([]);
            setCargandoClases(false);
            setErrorClases(false);
            return;
        }

        let activo = true;

        const cargarClases = async () => {
            setCargandoClases(true);
            setErrorClases(false);
            setClasesActividad([]);
            try {
                const { data } = await api.get(`/clase-actividad/tipo/${idTipo}`);
                if (!activo) return;
                setClasesActividad(data);
            } catch (error) {
                if (!activo) return;
                setClasesActividad([]);
                setErrorClases(true);
            } finally {
                if (!activo) return;
                setCargandoClases(false);
            }
        };

        cargarClases();

        return () => {
            activo = false;
        };
    }, [formData.id_tipo]);

    // ───── Helpers ─────

    /**
     * Actualiza un campo del formulario.
     * @param {string} campo
     * @param {*}      valor
     */
    const handleChange = (campo, valor) => {
        setFormData((prev) => ({ ...prev, [campo]: valor }));
    };

    const handleTipoChange = (valor) => {
        setFormData((prev) => ({
            ...prev,
            id_tipo: valor,
            nombre: '',
        }));
        setTocados((prev) => ({ ...prev, nombre: false }));
    };

    /**
     * Marca el campo como "tocado" para activar la validación visual.
     * @param {string} campo
     */
    const handleBlur = (campo) => {
        setTocados((prev) => ({ ...prev, [campo]: true }));
    };

    /**
     * Devuelve las clases CSS del input según su estado de validación.
     * @param {string} campo
     * @returns {string}
     */
    const inputClase = (campo) => {
        const hayError = tocados[campo] && !formData[campo]?.toString().trim();
        return `w-full bg-gray-50 border rounded-2xl pl-12 pr-6 py-4 text-sm font-bold
                text-institutional-dark focus:ring-4 focus:ring-institutional-green/10
                outline-none transition-all
                ${hayError ? 'border-red-400 bg-red-50' : 'border-gray-200'}`;
    };

    /**
     * Valida y envía el formulario al backend.
     * @param {React.FormEvent} e
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorApi(null);

        // Marcar obligatorios como tocados
        setTocados({ id_tipo: true, nombre: true, horas_semanales: true });

        if (!formData.id_tipo || !formData.nombre.trim() || !formData.horas_semanales) return;

        setGuardando(true);
        try {
            const payload = {
                ...formData,
                id_agenda: Number(idAgenda),
                id_tipo: Number(formData.id_tipo),
                horas_semanales: parseFloat(formData.horas_semanales),
            };

            if (esEdicion) {
                await api.put(`/actividades/${id}`, payload);
                toast.success('Actividad actualizada correctamente');
            } else {
                await api.post('/actividades', payload);
                toast.success('Actividad creada exitosamente');
            }

            // Volver al listado manteniendo la agenda seleccionada en query
            navigate(`/actividades?id_agenda=${idAgenda}`);
        } catch (err) {
            if (!err.response) toast.error('Error de conexión. Verifica tu red.');
            const data = err?.response?.data;
            const mensaje = data?.message
                ? (Array.isArray(data.message) ? data.message : [data.message])
                : ['Error al guardar la actividad. Inténtalo de nuevo.'];
            setErrorApi(mensaje);
        } finally {
            setGuardando(false);
        }
    };

    /** URL de retorno al listado */
    const urlVolver = idAgenda ? `/actividades?id_agenda=${idAgenda}` : '/actividades';

    // ───── Render ─────
    if (cargando) {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center h-64">
                    <div className="w-10 h-10 border-4 border-institutional-green/20 border-t-institutional-green rounded-full animate-spin mb-4" />
                    <span className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
                        Cargando actividad...
                    </span>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-5xl mx-auto">

                {/* ── Encabezado ── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                    <div>
                        <div className="flex items-center space-x-2 mb-1">
                            <div className="w-8 h-1 bg-institutional-green rounded-full" />
                            <span className="text-[10px] font-black text-institutional-green uppercase tracking-[0.3em]">
                                Gestión · Actividades
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-institutional-dark uppercase tracking-tight">
                            {esEdicion ? 'Editar Actividad' : 'Nueva Actividad'}
                        </h1>
                        <p className="text-gray-500 mt-1 font-medium text-sm">
                            {esEdicion
                                ? 'Modifica los datos de la actividad académica seleccionada'
                                : 'Registra una nueva actividad en la agenda docente'}
                        </p>
                    </div>

                    {/* Botón volver */}
                    <button
                        type="button"
                        onClick={() => navigate(urlVolver)}
                        className="flex items-center space-x-2 px-5 py-3 rounded-2xl border border-gray-200 text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all"
                    >
                        <ArrowLeft size={16} />
                        <span>Volver al listado</span>
                    </button>
                </div>

                {/* ── Banner de errores API ── */}
                {errorApi && (
                    <div
                        role="alert"
                        className="mb-6 flex items-start space-x-3 bg-red-50 border border-red-200 rounded-2xl p-5"
                    >
                        <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={18} />
                        <ul className="flex-1 space-y-1">
                            {errorApi.map((linea, idx) => (
                                <li key={idx} className="text-sm text-red-600 font-semibold leading-snug">
                                    {linea}
                                </li>
                            ))}
                        </ul>
                        <button
                            type="button"
                            onClick={() => setErrorApi(null)}
                            className="p-1 rounded-lg hover:bg-red-100 text-red-400 transition-colors shrink-0"
                            aria-label="Cerrar alerta"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}

                {/* ── Formulario ── */}
                <form onSubmit={handleSubmit} noValidate>

                    {/* Card 1: Clasificación */}
                    <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 mb-6">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2.5 bg-institutional-dark/5 rounded-xl">
                                <Activity size={20} className="text-institutional-dark" />
                            </div>
                            <div>
                                <h2 className="text-xs font-black text-institutional-dark uppercase tracking-widest">
                                    Clasificación
                                </h2>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                    Tipo y nombre de la actividad
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {/* Tipo de actividad */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                                    Tipo de Actividad <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Tag
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                        size={18}
                                    />
                                    <select
                                        id="campo-id_tipo"
                                        className={inputClase('id_tipo')}
                                        value={formData.id_tipo}
                                        onBlur={() => handleBlur('id_tipo')}
                                        onChange={(e) => handleTipoChange(e.target.value)}
                                    >
                                        <option value="">Seleccione un tipo...</option>
                                        {tipos.map((t) => (
                                            <option key={t.id_tipo} value={t.id_tipo}>
                                                {t.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {tocados.id_tipo && !formData.id_tipo && (
                                    <p className="text-xs text-red-500 font-bold px-1">
                                        Selecciona un tipo de actividad
                                    </p>
                                )}

                                {tipoSeleccionado?.max_horas_semana !== null && tipoSeleccionado?.max_horas_semana !== undefined && (
                                    <p className="text-[11px] font-black text-institutional-blue uppercase tracking-widest px-1">
                                        Máximo semanal para {tipoSeleccionado.nombre}: {tipoSeleccionado.max_horas_semana} horas
                                    </p>
                                )}
                            </div>

                            {/* Nombre de la actividad */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                                    Nombre de la Actividad <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <BookOpen
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                        size={18}
                                    />
                                    <select
                                        id="campo-nombre"
                                        className={inputClase('nombre')}
                                        value={formData.nombre}
                                        onBlur={() => handleBlur('nombre')}
                                        onChange={(e) => handleChange('nombre', e.target.value)}
                                        disabled={!formData.id_tipo || cargandoClases || errorClases}
                                    >
                                        <option value="">Seleccione una actividad...</option>
                                        {clasesActividad.map((clase) => (
                                            <option key={clase.id_clase} value={clase.nombre}>
                                                {clase.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {cargandoClases && (
                                    <p className="text-xs text-gray-500 font-bold px-1">Cargando...</p>
                                )}
                                {errorClases && (
                                    <p className="text-xs text-red-500 font-bold px-1">Error al cargar</p>
                                )}
                                {tocados.nombre && !formData.nombre.trim() && (
                                    <p className="text-xs text-red-500 font-bold px-1">
                                        El nombre es obligatorio
                                    </p>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Card 2: Planificación */}
                    <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 mb-6">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2.5 bg-institutional-dark/5 rounded-xl">
                                <Clock size={20} className="text-institutional-dark" />
                            </div>
                            <div>
                                <h2 className="text-xs font-black text-institutional-dark uppercase tracking-widest">
                                    Planificación
                                </h2>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                    Carga horaria y fuente de verificación
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Horas semanales */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                                    Horas Semanales <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Clock
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                        size={18}
                                    />
                                    <input
                                        id="campo-horas_semanales"
                                        type="number"
                                        min="0.5"
                                        max={tipoSeleccionado?.max_horas_semana || 40}
                                        step="0.5"
                                        placeholder="Ej: 4"
                                        className={`w-full bg-gray-50 border rounded-2xl pl-12 pr-6 py-4 text-sm font-bold
                                            text-institutional-dark focus:ring-4 focus:ring-institutional-green/10
                                            outline-none transition-all
                                            ${tocados.horas_semanales && !formData.horas_semanales
                                                ? 'border-red-400 bg-red-50'
                                                : 'border-gray-200'}`}
                                        value={formData.horas_semanales}
                                        onBlur={() => handleBlur('horas_semanales')}
                                        onChange={(e) => handleChange('horas_semanales', e.target.value)}
                                    />
                                </div>
                                {tocados.horas_semanales && !formData.horas_semanales && (
                                    <p className="text-xs text-red-500 font-bold px-1">
                                        Las horas son obligatorias
                                    </p>
                                )}
                            </div>

                            {/* Fuente de verificación */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                                    Fuente de Verificación
                                </label>
                                <div className="relative">
                                    <Link
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                        size={18}
                                    />
                                    <input
                                        id="campo-fuente_verificacion"
                                        type="text"
                                        placeholder="Ej: Plataforma Virtual, Acta"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-institutional-dark focus:ring-4 focus:ring-institutional-green/10 outline-none transition-all"
                                        value={formData.fuente_verificacion}
                                        onChange={(e) => handleChange('fuente_verificacion', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Card 3: Documentación */}
                    <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 mb-8">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2.5 bg-institutional-dark/5 rounded-xl">
                                <FileText size={20} className="text-institutional-dark" />
                            </div>
                            <div>
                                <h2 className="text-xs font-black text-institutional-dark uppercase tracking-widest">
                                    Documentación
                                </h2>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                    Descripción y evidencias esperadas
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Descripción */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                                    Descripción
                                </label>
                                <textarea
                                    id="campo-descripcion"
                                    rows="5"
                                    placeholder="Descripción general de la actividad..."
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm font-bold text-institutional-dark focus:ring-4 focus:ring-institutional-green/10 outline-none transition-all resize-none"
                                    value={formData.descripcion}
                                    onChange={(e) => handleChange('descripcion', e.target.value)}
                                />
                            </div>

                            {/* Evidencia esperada */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                                    <ClipboardCheck size={12} className="inline mr-1" />
                                    Evidencias y productos esperados
                                </label>
                                <div className="relative">
                                    <ClipboardCheck
                                        className="absolute left-4 top-4 text-gray-400"
                                        size={18}
                                    />
                                    <textarea
                                        id="campo-evidencia_esperada"
                                        rows="5"
                                        placeholder="Producto o documento que se entregará..."
                                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold text-institutional-dark focus:ring-4 focus:ring-institutional-green/10 outline-none transition-all resize-none"
                                        value={formData.evidencia_esperada}
                                        onChange={(e) => handleChange('evidencia_esperada', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ── Barra de acciones sticky ── */}
                    <div className="sticky bottom-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => navigate(urlVolver)}
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
                            <span>{esEdicion ? 'Actualizar Actividad' : 'Guardar Actividad'}</span>
                        </button>
                    </div>

                </form>
            </div>
        </Layout>
    );
};

export default ActividadFormPage;
