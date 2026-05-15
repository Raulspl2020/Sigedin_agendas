import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Save,
    UserCircle,
    Calendar,
    CalendarRange,
    ClipboardList,
} from 'lucide-react';
import api from '../services/api';
import Layout from '../Components/Layout';
import FormErrorBanner from '../Components/FormErrorBanner';
import { extraerMensajeError } from '../services/apiErrors';
import { toast } from 'react-toastify';

/** Estado inicial vacío del formulario */
const ESTADO_INICIAL = {
    id_docente: '',
    id_periodo: '',
    fecha_diligenciamiento: new Date().toISOString().split('T')[0],
    estado: 'En_Elaboracion',
    inicio_semestre: '',
    fin_semestre: '',
};

/**
 * Página completa para crear o editar una Agenda Docente.
 * Sustituye al modal `AgendaForm` para ofrecer mayor comodidad visual.
 *
 * Rutas:
 *  - /admin/agendas/nueva          → Crear
 *  - /admin/agendas/editar/:id     → Editar
 */
const AgendaFormPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const esEdicion = Boolean(id);

    const [formData, setFormData] = useState(ESTADO_INICIAL);
    const [docentes, setDocentes] = useState([]);
    const [periodos, setPeriodos] = useState([]);
    const [cargandoAgenda, setCargandoAgenda] = useState(esEdicion);
    const [guardando, setGuardando] = useState(false);

    /** @type {[string|string[]|null, Function]} */
    const [errorApi, setErrorApi] = useState(null);
    const [tocados, setTocados] = useState({});

    // ───── Cargar combos y, si es edición, la agenda actual ─────
    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const [resDocentes, resPeriodos] = await Promise.all([
                    api.get('/admin-docente/docentes'),
                    api.get('/agendas/periodos'),
                ]);
                const docentesOrdenados = Array.isArray(resDocentes.data)
                    ? [...resDocentes.data].sort((a, b) => Number(b?.id_docente || 0) - Number(a?.id_docente || 0))
                    : [];
                setDocentes(docentesOrdenados);
                setPeriodos(resPeriodos.data);

                if (esEdicion) {
                    const { data } = await api.get(`/agendas/${id}`);
                    setFormData({
                        id_docente: data.id_docente ?? '',
                        id_periodo: data.id_periodo ?? '',
                        fecha_diligenciamiento: data.fecha_diligenciamiento
                            ? data.fecha_diligenciamiento.split('T')[0]
                            : '',
                        estado: data.estado ?? 'En_Elaboracion',
                        inicio_semestre: data.inicio_semestre
                            ? data.inicio_semestre.split('T')[0]
                            : '',
                        fin_semestre: data.fin_semestre
                            ? data.fin_semestre.split('T')[0]
                            : '',
                    });
                }
            } catch (error) {
                toast.error('Error al cargar datos del formulario');
            } finally {
                setCargandoAgenda(false);
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
    const handleChange = async (campo, valor) => {
        setFormData((prev) => ({ ...prev, [campo]: valor }));

        if (campo === 'id_periodo' && !esEdicion && valor) {
            try {
                const { data } = await api.get(`/agendas/periodos/${valor}`);
                setFormData((prev) => ({
                    ...prev,
                    id_periodo: valor,
                    inicio_semestre: data.fecha_inicio ? data.fecha_inicio.split('T')[0] : '',
                    fin_semestre: data.fecha_fin ? data.fecha_fin.split('T')[0] : '',
                }));
            } catch {
                toast.error('No fue posible cargar las fechas del periodo seleccionado');
            }
        }
    };

    /**
     * Marca un campo como "tocado" para activar la validación visual.
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

        // Marcar todos los campos obligatorios como tocados
        const obligatorios = {
            id_docente: true,
            id_periodo: true,
            fecha_diligenciamiento: true,
            inicio_semestre: true,
            fin_semestre: true,
        };
        setTocados(obligatorios);

        if (
            !formData.id_docente ||
            !formData.id_periodo ||
            !formData.fecha_diligenciamiento ||
            !formData.inicio_semestre ||
            !formData.fin_semestre
        ) return;

        setGuardando(true);
        try {
            const payload = {
                ...formData,
                id_docente: Number(formData.id_docente),
                id_periodo: Number(formData.id_periodo),
            };

            if (esEdicion) {
                await api.put(`/agendas/${id}`, payload);
                toast.success('Agenda actualizada correctamente');
            } else {
                await api.post('/agendas', {
                    ...payload,
                    estado: 'En_Elaboracion',
                });
                toast.success('Agenda creada exitosamente');
            }

            navigate('/admin/agendas');
        } catch (err) {
            if (!err.response) toast.error('Error de conexión. Verifica tu red.');
            setErrorApi(extraerMensajeError(err));
        } finally {
            setGuardando(false);
        }
    };

    // ───── Render ─────
    if (cargandoAgenda) {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center h-64">
                    <div className="w-10 h-10 border-4 border-institutional-green/20 border-t-institutional-green rounded-full animate-spin mb-4" />
                    <span className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
                        Cargando agenda...
                    </span>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-5xl mx-auto">

                {/* ── Breadcrumb / Encabezado ── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                    <div>
                        <div className="flex items-center space-x-2 mb-1">
                            <div className="w-8 h-1 bg-institutional-green rounded-full" />
                            <span className="text-[10px] font-black text-institutional-green uppercase tracking-[0.3em]">
                                Administración · Agendas
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-institutional-dark uppercase tracking-tight">
                            {esEdicion ? 'Editar Agenda' : 'Nueva Agenda'}
                        </h1>
                        <p className="text-gray-500 mt-1 font-medium text-sm">
                            {esEdicion
                                ? 'Modifica los datos de la agenda seleccionada'
                                : 'Completa los campos para registrar una nueva agenda docente'}
                        </p>
                    </div>

                    {/* Botón Volver */}
                    <button
                        type="button"
                        onClick={() => navigate('/admin/agendas')}
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

                    {/* Card 1: Identificación */}
                    <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 mb-6">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2.5 bg-institutional-dark/5 rounded-xl">
                                <ClipboardList size={20} className="text-institutional-dark" />
                            </div>
                            <div>
                                <h2 className="text-xs font-black text-institutional-dark uppercase tracking-widest">
                                    Identificación
                                </h2>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                    Docente y periodo académico
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Docente */}
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                                    Docente <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <UserCircle
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                        size={18}
                                    />
                                    <select
                                        id="campo-id_docente"
                                        disabled={esEdicion}
                                        className={`${inputClase('id_docente')} pl-12 appearance-none disabled:opacity-50`}
                                        value={formData.id_docente}
                                        onBlur={() => handleBlur('id_docente')}
                                        onChange={(e) => handleChange('id_docente', e.target.value)}
                                    >
                                        <option value="">Seleccione docente...</option>
                                        {docentes.map((d) => (
                                            <option key={d.id_docente} value={d.id_docente}>
                                                {d.nombres} ({d.identificacion})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {tocados.id_docente && !formData.id_docente && (
                                    <p className="text-xs text-red-500 font-bold px-1">Selecciona un docente</p>
                                )}
                            </div>

                            {/* Periodo */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                                    Periodo Académico <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Calendar
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                        size={18}
                                    />
                                    <select
                                        id="campo-id_periodo"
                                        disabled={esEdicion}
                                        className={`${inputClase('id_periodo')} pl-12 appearance-none disabled:opacity-50`}
                                        value={formData.id_periodo}
                                        onBlur={() => handleBlur('id_periodo')}
                                        onChange={(e) => handleChange('id_periodo', e.target.value)}
                                    >
                                        <option value="">Seleccione periodo...</option>
                                        {periodos.map((p) => (
                                            <option key={p.id_periodo} value={p.id_periodo}>
                                                {p.anio} - {p.periodo}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {tocados.id_periodo && !formData.id_periodo && (
                                    <p className="text-xs text-red-500 font-bold px-1">Selecciona un periodo</p>
                                )}
                            </div>

                            {/* Fecha diligenciamiento */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                                    Fecha de Diligenciamiento <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="campo-fecha_diligenciamiento"
                                    type="date"
                                    className={inputClase('fecha_diligenciamiento')}
                                    value={formData.fecha_diligenciamiento}
                                    onBlur={() => handleBlur('fecha_diligenciamiento')}
                                    onChange={(e) => handleChange('fecha_diligenciamiento', e.target.value)}
                                />
                                {tocados.fecha_diligenciamiento && !formData.fecha_diligenciamiento && (
                                    <p className="text-xs text-red-500 font-bold px-1">Este campo es obligatorio</p>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Card 2: Fechas del semestre */}
                    <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 mb-6">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2.5 bg-institutional-dark/5 rounded-xl">
                                <CalendarRange size={20} className="text-institutional-dark" />
                            </div>
                            <div>
                                <h2 className="text-xs font-black text-institutional-dark uppercase tracking-widest">
                                    Vigencia del Semestre
                                </h2>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                    Fechas de inicio y cierre del semestre académico
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Inicio semestre */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                                    Inicio de Semestre <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <CalendarRange
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                        size={18}
                                    />
                                    <input
                                        id="campo-inicio_semestre"
                                        type="date"
                                        className={`${inputClase('inicio_semestre')} pl-12`}
                                        value={formData.inicio_semestre}
                                        onBlur={() => handleBlur('inicio_semestre')}
                                        onChange={(e) => handleChange('inicio_semestre', e.target.value)}
                                    />
                                </div>
                                {tocados.inicio_semestre && !formData.inicio_semestre && (
                                    <p className="text-xs text-red-500 font-bold px-1">Este campo es obligatorio</p>
                                )}
                            </div>

                            {/* Fin semestre */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                                    Fin de Semestre <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <CalendarRange
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                        size={18}
                                    />
                                    <input
                                        id="campo-fin_semestre"
                                        type="date"
                                        className={`${inputClase('fin_semestre')} pl-12`}
                                        value={formData.fin_semestre}
                                        onBlur={() => handleBlur('fin_semestre')}
                                        onChange={(e) => handleChange('fin_semestre', e.target.value)}
                                    />
                                </div>
                                {tocados.fin_semestre && !formData.fin_semestre && (
                                    <p className="text-xs text-red-500 font-bold px-1">Este campo es obligatorio</p>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* ── Barra de acciones fija ── */}
                    <div className="sticky bottom-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/admin/agendas')}
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
                            <span>{esEdicion ? 'Actualizar Agenda' : 'Crear Agenda'}</span>
                        </button>
                    </div>

                </form>
            </div>
        </Layout>
    );
};

export default AgendaFormPage;
