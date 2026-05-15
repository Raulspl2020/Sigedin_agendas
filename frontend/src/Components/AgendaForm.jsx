import React, { useState, useEffect } from 'react';
import { X, Calendar, Save, UserCircle, Clock, ClipboardList, CalendarRange } from 'lucide-react';
import api from '../services/api';
import FormErrorBanner from './FormErrorBanner';
import { extraerMensajeError } from '../services/apiErrors';

/**
 * Formulario modal para crear o editar registros en la tabla agenda_docente.
 *
 * @param {Object}      props
 * @param {Object|null} props.agenda    - Agenda a editar, null para crear.
 * @param {boolean}     props.isOpen
 * @param {Function}    props.onClose
 * @param {Function}    props.onSave    - Función async que persiste los datos.
 * @param {boolean}     props.isSaving
 */
const AgendaForm = ({ agenda, isOpen, onClose, onSave, isSaving }) => {
    const [formData, setFormData] = useState({
        id_docente: '',
        id_periodo: '',
        fecha_diligenciamiento: new Date().toISOString().split('T')[0],
        total_horas_planeadas: 0,
        estado: 'Borrador',
        observaciones_docente: '',
        observaciones_decano: '',
        inicio_semestre: '',
        fin_semestre: '',
        fecha_inicio_corte_uno: '',
        fecha_fin_corte_uno: '',
        Fecha_inicio_corte_dos: '',
        Fecha_fin_corte_dos: '',
        Fecha_inicio_corte_tres: '',
        Fecha_fin_corte_tres: ''
    });

    const [docentes, setDocentes] = useState([]);
    const [periodos, setPeriodos] = useState([]);

    /** @type {[string|string[]|null, Function]} */
    const [errorApi, setErrorApi] = useState(null);
    const [tocados, setTocados] = useState({});

    useEffect(() => {
        const fetchCombos = async () => {
            try {
                const [resDocentes, resPeriodos] = await Promise.all([
                    api.get('/admin-docente/docentes'),
                    api.get('/agendas/periodos')
                ]);
                setDocentes(resDocentes.data);
                setPeriodos(resPeriodos.data);
            } catch (error) {
                console.error('Error al cargar datos para el formulario', error);
            }
        };
        fetchCombos();
    }, []);

    useEffect(() => {
        if (agenda) {
            setFormData({
                id_docente: agenda.id_docente,
                id_periodo: agenda.id_periodo,
                fecha_diligenciamiento: agenda.fecha_diligenciamiento ? agenda.fecha_diligenciamiento.split('T')[0] : '',
                total_horas_planeadas: agenda.total_horas_planeadas || 0,
                estado: agenda.estado || 'Borrador',
                observaciones_docente: agenda.observaciones_docente || '',
                observaciones_decano: agenda.observaciones_decano || '',
                inicio_semestre: agenda.inicio_semestre ? agenda.inicio_semestre.split('T')[0] : '',
                fin_semestre: agenda.fin_semestre ? agenda.fin_semestre.split('T')[0] : '',
                fecha_inicio_corte_uno: agenda.fecha_inicio_corte_uno ? agenda.fecha_inicio_corte_uno.split('T')[0] : '',
                fecha_fin_corte_uno: agenda.fecha_fin_corte_uno ? agenda.fecha_fin_corte_uno.split('T')[0] : '',
                Fecha_inicio_corte_dos: agenda.Fecha_inicio_corte_dos ? agenda.Fecha_inicio_corte_dos.split('T')[0] : '',
                Fecha_fin_corte_dos: agenda.Fecha_fin_corte_dos ? agenda.Fecha_fin_corte_dos.split('T')[0] : '',
                Fecha_inicio_corte_tres: agenda.Fecha_inicio_corte_tres ? agenda.Fecha_inicio_corte_tres.split('T')[0] : '',
                Fecha_fin_corte_tres: agenda.Fecha_fin_corte_tres ? agenda.Fecha_fin_corte_tres.split('T')[0] : ''
            });
        } else {
            setFormData({
                id_docente: '', id_periodo: '',
                fecha_diligenciamiento: new Date().toISOString().split('T')[0],
                total_horas_planeadas: 0, estado: 'Borrador',
                observaciones_docente: '', observaciones_decano: '',
                inicio_semestre: '', fin_semestre: '',
                fecha_inicio_corte_uno: '', fecha_fin_corte_uno: '',
                Fecha_inicio_corte_dos: '', Fecha_fin_corte_dos: '',
                Fecha_inicio_corte_tres: '', Fecha_fin_corte_tres: ''
            });
        }
        setErrorApi(null);
        setTocados({});
    }, [agenda, isOpen]);

    if (!isOpen) return null;

    /**
     * Valida campos obligatorios y envía al API.
     * @param {React.FormEvent} e
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorApi(null);

        const camposObligatorios = {
            id_docente: true,
            id_periodo: true,
            fecha_diligenciamiento: true,
            inicio_semestre: true,
            fin_semestre: true,
            fecha_inicio_corte_uno: true,
            fecha_fin_corte_uno: true,
            Fecha_inicio_corte_dos: true,
            Fecha_fin_corte_dos: true,
            Fecha_inicio_corte_tres: true,
            Fecha_fin_corte_tres: true
        };
        setTocados(camposObligatorios);

        if (
            !formData.id_docente ||
            !formData.id_periodo ||
            !formData.fecha_diligenciamiento ||
            !formData.inicio_semestre ||
            !formData.fin_semestre ||
            !formData.fecha_inicio_corte_uno ||
            !formData.fecha_fin_corte_uno ||
            !formData.Fecha_inicio_corte_dos ||
            !formData.Fecha_fin_corte_dos ||
            !formData.Fecha_inicio_corte_tres ||
            !formData.Fecha_fin_corte_tres
        ) return;

        try {
            await onSave(formData);
        } catch (err) {
            setErrorApi(extraerMensajeError(err));
        }
    };

    /** Clases de input según validación */
    const inputClase = (campo) =>
        `w-full bg-gray-50 border rounded-2xl px-6 py-4 text-sm font-bold text-institutional-dark
         focus:ring-4 focus:ring-institutional-green/10 outline-none transition-all
         ${tocados[campo] && !formData[campo]?.toString().trim()
            ? 'border-red-400 bg-red-50'
            : 'border-gray-200'}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-institutional-dark/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="bg-gradient-to-r from-institutional-dark to-institutional-blue p-8 text-white relative">
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                            <ClipboardList className="text-institutional-green" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight">
                                {agenda ? 'Editar Agenda' : 'Nueva Agenda'}
                            </h2>
                            <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-1">
                                Gestión Académica
                            </p>
                        </div>
                    </div>
                </div>

                {/* Banner de error API */}
                <FormErrorBanner mensaje={errorApi} onDismiss={() => setErrorApi(null)} />

                <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto custom-scrollbar" noValidate>
                    {/* Docente */}
                    <div className="space-y-2 col-span-1 md:col-span-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                            Docente <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <select
                                disabled={!!agenda}
                                className={`${inputClase('id_docente')} pl-12 appearance-none disabled:opacity-50`}
                                value={formData.id_docente}
                                onBlur={() => setTocados(t => ({ ...t, id_docente: true }))}
                                onChange={(e) => setFormData({ ...formData, id_docente: e.target.value })}
                            >
                                <option value="">Seleccione docente...</option>
                                {docentes.map(d => (
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
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <select
                                disabled={!!agenda}
                                className={`${inputClase('id_periodo')} pl-12 appearance-none disabled:opacity-50`}
                                value={formData.id_periodo}
                                onBlur={() => setTocados(t => ({ ...t, id_periodo: true }))}
                                onChange={(e) => setFormData({ ...formData, id_periodo: e.target.value })}
                            >
                                <option value="">Seleccione periodo...</option>
                                {periodos.map(p => (
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

                    {/* Fecha */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                            Fecha de Diligenciamiento <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            className={inputClase('fecha_diligenciamiento')}
                            value={formData.fecha_diligenciamiento}
                            onBlur={() => setTocados(t => ({ ...t, fecha_diligenciamiento: true }))}
                            onChange={(e) => setFormData({ ...formData, fecha_diligenciamiento: e.target.value })}
                        />
                        {tocados.fecha_diligenciamiento && !formData.fecha_diligenciamiento && (
                            <p className="text-xs text-red-500 font-bold px-1">Este campo es obligatorio</p>
                        )}
                    </div>

                    {/* Inicio y fin del semestre */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                            Inicio de Semestre <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <CalendarRange className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="date"
                                className={`${inputClase('inicio_semestre')} pl-12`}
                                value={formData.inicio_semestre}
                                onBlur={() => setTocados(t => ({ ...t, inicio_semestre: true }))}
                                onChange={(e) => setFormData({ ...formData, inicio_semestre: e.target.value })}
                            />
                        </div>
                        {tocados.inicio_semestre && !formData.inicio_semestre && (
                            <p className="text-xs text-red-500 font-bold px-1">Este campo es obligatorio</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                            Fin de Semestre <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <CalendarRange className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="date"
                                className={`${inputClase('fin_semestre')} pl-12`}
                                value={formData.fin_semestre}
                                onBlur={() => setTocados(t => ({ ...t, fin_semestre: true }))}
                                onChange={(e) => setFormData({ ...formData, fin_semestre: e.target.value })}
                            />
                        </div>
                        {tocados.fin_semestre && !formData.fin_semestre && (
                            <p className="text-xs text-red-500 font-bold px-1">Este campo es obligatorio</p>
                        )}
                    </div>

                    {/* Cortes Académicos */}
                    <div className="col-span-1 md:col-span-2 pt-4">
                        <div className="flex items-center space-x-2 mb-4">
                            <div className="h-px flex-1 bg-gray-100"></div>
                            <span className="text-[10px] font-black text-institutional-blue uppercase tracking-[0.2em]">Cortes Académicos</span>
                            <div className="h-px flex-1 bg-gray-100"></div>
                        </div>
                    </div>

                    {/* Corte 1 */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                            Inicio Corte 1 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            className={inputClase('fecha_inicio_corte_uno')}
                            value={formData.fecha_inicio_corte_uno}
                            onBlur={() => setTocados(t => ({ ...t, fecha_inicio_corte_uno: true }))}
                            onChange={(e) => setFormData({ ...formData, fecha_inicio_corte_uno: e.target.value })}
                        />
                        {tocados.fecha_inicio_corte_uno && !formData.fecha_inicio_corte_uno && (
                            <p className="text-xs text-red-500 font-bold px-1">Campo obligatorio</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                            Fin Corte 1 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            className={inputClase('fecha_fin_corte_uno')}
                            value={formData.fecha_fin_corte_uno}
                            onBlur={() => setTocados(t => ({ ...t, fecha_fin_corte_uno: true }))}
                            onChange={(e) => setFormData({ ...formData, fecha_fin_corte_uno: e.target.value })}
                        />
                        {tocados.fecha_fin_corte_uno && !formData.fecha_fin_corte_uno && (
                            <p className="text-xs text-red-500 font-bold px-1">Campo obligatorio</p>
                        )}
                    </div>

                    {/* Corte 2 */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                            Inicio Corte 2 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            className={inputClase('Fecha_inicio_corte_dos')}
                            value={formData.Fecha_inicio_corte_dos}
                            onBlur={() => setTocados(t => ({ ...t, Fecha_inicio_corte_dos: true }))}
                            onChange={(e) => setFormData({ ...formData, Fecha_inicio_corte_dos: e.target.value })}
                        />
                        {tocados.Fecha_inicio_corte_dos && !formData.Fecha_inicio_corte_dos && (
                            <p className="text-xs text-red-500 font-bold px-1">Campo obligatorio</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                            Fin Corte 2 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            className={inputClase('Fecha_fin_corte_dos')}
                            value={formData.Fecha_fin_corte_dos}
                            onBlur={() => setTocados(t => ({ ...t, Fecha_fin_corte_dos: true }))}
                            onChange={(e) => setFormData({ ...formData, Fecha_fin_corte_dos: e.target.value })}
                        />
                        {tocados.Fecha_fin_corte_dos && !formData.Fecha_fin_corte_dos && (
                            <p className="text-xs text-red-500 font-bold px-1">Campo obligatorio</p>
                        )}
                    </div>

                    {/* Corte 3 */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                            Inicio Corte 3 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            className={inputClase('Fecha_inicio_corte_tres')}
                            value={formData.Fecha_inicio_corte_tres}
                            onBlur={() => setTocados(t => ({ ...t, Fecha_inicio_corte_tres: true }))}
                            onChange={(e) => setFormData({ ...formData, Fecha_inicio_corte_tres: e.target.value })}
                        />
                        {tocados.Fecha_inicio_corte_tres && !formData.Fecha_inicio_corte_tres && (
                            <p className="text-xs text-red-500 font-bold px-1">Campo obligatorio</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">
                            Fin Corte 3 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            className={inputClase('Fecha_fin_corte_tres')}
                            value={formData.Fecha_fin_corte_tres}
                            onBlur={() => setTocados(t => ({ ...t, Fecha_fin_corte_tres: true }))}
                            onChange={(e) => setFormData({ ...formData, Fecha_fin_corte_tres: e.target.value })}
                        />
                        {tocados.Fecha_fin_corte_tres && !formData.Fecha_fin_corte_tres && (
                            <p className="text-xs text-red-500 font-bold px-1">Campo obligatorio</p>
                        )}
                    </div>

                    {/* Total Horas */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Total Horas Planeadas</label>
                        <div className="relative">
                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="number"
                                min="0"
                                className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold"
                                value={formData.total_horas_planeadas}
                                onChange={(e) => setFormData({ ...formData, total_horas_planeadas: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Estado */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Estado Agenda</label>
                        <select
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold"
                            value={formData.estado}
                            onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                        >
                            {['Borrador', 'Enviada', 'Aprobada', 'Rechazada'].map(est => (
                                <option key={est} value={est}>{est}</option>
                            ))}
                        </select>
                    </div>

                    {/* Obs Docente */}
                    <div className="space-y-2 col-span-1 md:col-span-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Observaciones Docente</label>
                        <textarea
                            rows="2"
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold resize-none"
                            placeholder="Notas del docente..."
                            value={formData.observaciones_docente}
                            onChange={(e) => setFormData({ ...formData, observaciones_docente: e.target.value })}
                        />
                    </div>

                    {/* Obs Decano */}
                    <div className="space-y-2 col-span-1 md:col-span-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Observaciones Decano / Coordinador</label>
                        <textarea
                            rows="2"
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold resize-none"
                            placeholder="Comentarios de revisión..."
                            value={formData.observaciones_decano}
                            onChange={(e) => setFormData({ ...formData, observaciones_decano: e.target.value })}
                        />
                    </div>

                    {/* Botones */}
                    <div className="col-span-1 md:col-span-2 flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 rounded-2xl text-xs font-black uppercase text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="bg-institutional-green text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-institutional-green/90 transition-all flex items-center space-x-2 shadow-lg shadow-institutional-green/20"
                        >
                            {isSaving ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save size={16} />
                            )}
                            <span>{agenda ? 'Actualizar Agenda' : 'Crear Agenda'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AgendaForm;
