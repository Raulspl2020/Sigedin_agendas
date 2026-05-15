import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Save,
    Calendar,
    Layers,
    CalendarRange,
    AlertCircle,
    Percent,
    Trash2,
} from 'lucide-react';
import api from '../services/api';
import Layout from '../components/Layout';
import FormErrorBanner from '../Components/FormErrorBanner';
import { extraerMensajeError } from '../services/apiErrors';
import { toast } from 'react-toastify';

/**
 * Estado inicial vacío del formulario de periodo académico.
 * @type {{ anio: number, periodo: string, fecha_inicio: string, fecha_fin: string }}
 */
const ESTADO_INICIAL = {
    anio: new Date().getFullYear(),
    periodo: 'A',
    fecha_inicio: '',
    fecha_fin: '',
    cortes: [
        { numero_corte: 1, nombre: 'Primer corte', fecha_inicio: '', fecha_fin: '', porcentaje_evaluacion: '' },
        { numero_corte: 2, nombre: 'Segundo corte', fecha_inicio: '', fecha_fin: '', porcentaje_evaluacion: '' },
        { numero_corte: 3, nombre: 'Tercer corte', fecha_inicio: '', fecha_fin: '', porcentaje_evaluacion: '' },
    ],
};

/**
 * Página completa para crear o editar un Periodo Académico.
 * Sustituye al modal `PeriodoForm` para ofrecer mayor comodidad visual.
 *
 * Rutas:
 *  - /admin/periodos/nuevo          → Crear
 *  - /admin/periodos/editar/:id     → Editar
 *
 * @returns {JSX.Element} Componente de página de formulario.
 */
const PeriodoFormPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const esEdicion = Boolean(id);

    const [formData, setFormData] = useState(ESTADO_INICIAL);
    const [cargando, setCargando] = useState(esEdicion);
    const [guardando, setGuardando] = useState(false);

    /** @type {[string|string[]|null, Function]} */
    const [errorApi, setErrorApi] = useState(null);
    const [tocados, setTocados] = useState({});

    // ───── Cargar datos del periodo si es edición ─────
    useEffect(() => {
        const cargarDatos = async () => {
            try {
                if (esEdicion) {
                    const { data } = await api.get(`/agendas/periodos/${id}`);
                    setFormData({
                        anio: data.anio ?? new Date().getFullYear(),
                        periodo: data.periodo ?? 'A',
                        fecha_inicio: data.fecha_inicio
                            ? data.fecha_inicio.split('T')[0]
                            : '',
                        fecha_fin: data.fecha_fin
                            ? data.fecha_fin.split('T')[0]
                            : '',
                        cortes: ESTADO_INICIAL.cortes,
                    });
                }
            } catch (error) {
                toast.error('Error al cargar datos del periodo');
            } finally {
                setCargando(false);
            }
        };

        cargarDatos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // ───── Helpers ─────

    /**
     * Actualiza un campo del formulario de forma genérica.
     * @param {string} campo - Nombre del campo a actualizar.
     * @param {*}      valor - Nuevo valor.
     */
    const handleChange = (campo, valor) => {
        setFormData((prev) => ({ ...prev, [campo]: valor }));
    };

    /**
     * Marca un campo como «tocado» para activar la validación visual.
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
    const inputClase = (campo) =>
        `w-full bg-gray-50 border rounded-2xl px-5 py-4 text-sm font-bold text-institutional-dark
         focus:ring-4 focus:ring-institutional-green/10 outline-none transition-all
         ${tocados[campo] && !formData[campo]?.toString().trim()
            ? 'border-red-400 bg-red-50'
            : 'border-gray-200'}`;

    /**
     * Valida y envía el formulario al backend.
     * @param {React.FormEvent} e
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorApi(null);

        // Marcar los campos obligatorios como tocados
        setTocados({ anio: true, periodo: true });

        if (!formData.anio) return;

        if (formData.fecha_inicio && formData.fecha_fin && new Date(formData.fecha_inicio) > new Date(formData.fecha_fin)) {
            setErrorApi('La fecha de inicio del periodo no puede ser mayor que la fecha de finalización.');
            return;
        }

        if (!esEdicion) {
            const numeros = new Set();
            let suma = 0;
            for (const corte of formData.cortes) {
                if (!corte.numero_corte || !corte.fecha_inicio || !corte.fecha_fin) {
                    setErrorApi('Cada corte debe tener número, fecha inicio y fecha fin.');
                    return;
                }
                if (numeros.has(Number(corte.numero_corte))) {
                    setErrorApi('No se permiten números de corte duplicados.');
                    return;
                }
                numeros.add(Number(corte.numero_corte));

                if (new Date(corte.fecha_inicio) > new Date(corte.fecha_fin)) {
                    setErrorApi(`La fecha inicio del corte ${corte.numero_corte} no puede ser mayor a su fecha fin.`);
                    return;
                }

                if (formData.fecha_inicio && formData.fecha_fin) {
                    if (new Date(corte.fecha_inicio) < new Date(formData.fecha_inicio) || new Date(corte.fecha_fin) > new Date(formData.fecha_fin)) {
                        setErrorApi(`El corte ${corte.numero_corte} debe estar dentro del rango del periodo.`);
                        return;
                    }
                }

                const porcentaje = corte.porcentaje_evaluacion === '' ? null : Number(corte.porcentaje_evaluacion);
                if (porcentaje !== null && (porcentaje < 0 || porcentaje > 100)) {
                    setErrorApi(`El porcentaje del corte ${corte.numero_corte} debe estar entre 0 y 100.`);
                    return;
                }
                if (porcentaje !== null) suma += porcentaje;
            }

            if (Number(suma.toFixed(2)) !== 100) {
                setErrorApi('La suma de porcentajes de evaluación de los cortes debe ser 100.');
                return;
            }
        }

        setGuardando(true);
        try {
            const datosLimpios = {
                ...formData,
                anio: Number(formData.anio),
                fecha_inicio: formData.fecha_inicio === '' ? null : formData.fecha_inicio,
                fecha_fin: formData.fecha_fin === '' ? null : formData.fecha_fin,
                cortes: !esEdicion
                    ? formData.cortes.map((c) => ({
                        numero_corte: Number(c.numero_corte),
                        nombre: c.nombre?.trim() || null,
                        fecha_inicio: c.fecha_inicio,
                        fecha_fin: c.fecha_fin,
                        porcentaje_evaluacion: c.porcentaje_evaluacion === '' ? null : Number(c.porcentaje_evaluacion),
                    }))
                    : undefined,
            };

            if (esEdicion) {
                await api.put(`/agendas/periodos/${id}`, datosLimpios);
                toast.success('Periodo actualizado correctamente');
            } else {
                await api.post('/agendas/periodos', datosLimpios);
                toast.success('Periodo creado exitosamente');
            }

            navigate('/admin/periodos');
        } catch (err) {
            if (!err.response) toast.error('Error de conexión. Verifica tu red.');
            setErrorApi(extraerMensajeError(err));
        } finally {
            setGuardando(false);
        }
    };

    // ───── Render: estado de carga ─────
    if (cargando) {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center h-64">
                    <div className="w-10 h-10 border-4 border-institutional-green/20 border-t-institutional-green rounded-full animate-spin mb-4" />
                    <span className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
                        Cargando periodo...
                    </span>
                </div>
            </Layout>
        );
    }

    // ───── Render: formulario ─────
    const actualizarCorte = (index, campo, valor) => {
        setFormData((prev) => ({
            ...prev,
            cortes: prev.cortes.map((c, i) => (i === index ? { ...c, [campo]: valor } : c)),
        }));
    };

    const agregarCorte = () => {
        setFormData((prev) => ({
            ...prev,
            cortes: [
                ...prev.cortes,
                {
                    numero_corte: prev.cortes.length + 1,
                    nombre: `Corte ${prev.cortes.length + 1}`,
                    fecha_inicio: '',
                    fecha_fin: '',
                    porcentaje_evaluacion: '',
                },
            ],
        }));
    };

    const eliminarCorte = (index) => {
        setFormData((prev) => ({
            ...prev,
            cortes: prev.cortes.filter((_, i) => i !== index),
        }));
    };

    return (
        <Layout>
            <div className="max-w-3xl mx-auto">

                {/* ── Breadcrumb / Encabezado ── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                    <div>
                        <div className="flex items-center space-x-2 mb-1">
                            <div className="w-8 h-1 bg-institutional-green rounded-full" />
                            <span className="text-[10px] font-black text-institutional-green uppercase tracking-[0.3em]">
                                Administración · Periodos
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-institutional-dark uppercase tracking-tight">
                            {esEdicion ? 'Editar Periodo' : 'Nuevo Periodo'}
                        </h1>
                        <p className="text-gray-500 mt-1 font-medium text-sm">
                            {esEdicion
                                ? 'Modifica los datos del periodo académico seleccionado'
                                : 'Completa los campos para registrar un nuevo periodo académico'}
                        </p>
                    </div>

                    {/* Botón Volver */}
                    <button
                        type="button"
                        onClick={() => navigate('/admin/periodos')}
                        className="flex items-center space-x-2 px-5 py-3 rounded-2xl border border-gray-200 text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all"
                    >
                        <ArrowLeft size={16} />
                        <span>Volver al listado</span>
                    </button>
                </div>

                {/* ── Banner de errores API ── */}
                <FormErrorBanner mensaje={errorApi} onDismiss={() => setErrorApi(null)} />

                {/* ── Formulario ── */}
                <form onSubmit={handleSubmit} noValidate>

                    {/* Card: Identificación del Periodo */}
                    <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 mb-6">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2.5 bg-institutional-dark/5 rounded-xl">
                                <Layers size={20} className="text-institutional-dark" />
                            </div>
                            <div>
                                <h2 className="text-xs font-black text-institutional-dark uppercase tracking-widest">
                                    Identificación
                                </h2>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                    Año y semestre del periodo académico
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Año Académico */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                                    Año Académico <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Calendar
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                        size={18}
                                    />
                                    <input
                                        id="campo-anio"
                                        type="number"
                                        min="2000"
                                        max="2100"
                                        placeholder="2026"
                                        className={`${inputClase('anio')} pl-12`}
                                        value={formData.anio}
                                        onBlur={() => handleBlur('anio')}
                                        onChange={(e) => handleChange('anio', parseInt(e.target.value))}
                                    />
                                </div>
                                {tocados.anio && !formData.anio && (
                                    <p className="text-xs text-red-500 font-bold px-1">El año es obligatorio</p>
                                )}
                            </div>

                            {/* Semestre */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                                    Semestre <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="campo-periodo"
                                    className={inputClase('periodo')}
                                    value={formData.periodo}
                                    onChange={(e) => handleChange('periodo', e.target.value)}
                                >
                                    <option value="A">Periodo A (Primer Semestre)</option>
                                    <option value="B">Periodo B (Segundo Semestre)</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    {!esEdicion && (
                        <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 mb-8">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xs font-black text-institutional-dark uppercase tracking-widest">Cortes Académicos</h2>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Define cortes asociados al nuevo periodo</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={agregarCorte}
                                    className="px-4 py-2 rounded-xl bg-institutional-green text-white text-[10px] font-black uppercase tracking-widest hover:bg-institutional-green/90 transition-all"
                                >
                                    + Agregar Corte
                                </button>
                            </div>

                            <div className="space-y-4">
                                {formData.cortes.map((corte, index) => (
                                    <div key={`${corte.numero_corte}-${index}`} className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Corte</label>
                                                <input type="number" min="1" max="10" className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold" value={corte.numero_corte} onChange={(e) => actualizarCorte(index, 'numero_corte', e.target.value)} />
                                            </div>

                                            <div className="space-y-1 md:col-span-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Nombre</label>
                                                <input type="text" className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold" value={corte.nombre} onChange={(e) => actualizarCorte(index, 'nombre', e.target.value)} />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Fecha inicio</label>
                                                <input type="date" className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold" value={corte.fecha_inicio} onChange={(e) => actualizarCorte(index, 'fecha_inicio', e.target.value)} />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Fecha fin</label>
                                                <input type="date" className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold" value={corte.fecha_fin} onChange={(e) => actualizarCorte(index, 'fecha_fin', e.target.value)} />
                                            </div>

                                            <div className="space-y-1 md:col-span-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">% Evaluación</label>
                                                <div className="relative">
                                                    <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input type="number" min="0" max="100" step="0.01" className="w-full bg-white border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-xs font-bold" value={corte.porcentaje_evaluacion} onChange={(e) => actualizarCorte(index, 'porcentaje_evaluacion', e.target.value)} />
                                                </div>
                                            </div>

                                            <div className="md:col-span-3 flex justify-end items-end">
                                                <button
                                                    type="button"
                                                    onClick={() => eliminarCorte(index)}
                                                    className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                                                    title="Eliminar corte"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Card: Rango de Fechas */}
                    <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 mb-8">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2.5 bg-institutional-dark/5 rounded-xl">
                                <CalendarRange size={20} className="text-institutional-dark" />
                            </div>
                            <div>
                                <h2 className="text-xs font-black text-institutional-dark uppercase tracking-widest">
                                    Rango de Fechas
                                </h2>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                    Fechas de inicio y finalización del periodo
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Fecha de Inicio */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                                    Fecha de Inicio
                                </label>
                                <div className="relative">
                                    <CalendarRange
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                        size={18}
                                    />
                                    <input
                                        id="campo-fecha_inicio"
                                        type="date"
                                        className={`${inputClase('fecha_inicio')} pl-12`}
                                        value={formData.fecha_inicio}
                                        onChange={(e) => handleChange('fecha_inicio', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Fecha de Finalización */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                                    Fecha de Finalización
                                </label>
                                <div className="relative">
                                    <CalendarRange
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                        size={18}
                                    />
                                    <input
                                        id="campo-fecha_fin"
                                        type="date"
                                        className={`${inputClase('fecha_fin')} pl-12`}
                                        value={formData.fecha_fin}
                                        onChange={(e) => handleChange('fecha_fin', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Nota informativa */}
                        <div className="mt-6 flex items-center space-x-2 text-amber-500">
                            <AlertCircle size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                                Las fechas son opcionales pero recomendadas para el calendario académico
                            </span>
                        </div>
                    </section>

                    {/* ── Barra de acciones sticky ── */}
                    <div className="sticky bottom-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/admin/periodos')}
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
                            <span>{esEdicion ? 'Actualizar Periodo' : 'Guardar Periodo'}</span>
                        </button>
                    </div>

                </form>
            </div>
        </Layout>
    );
};

export default PeriodoFormPage;
