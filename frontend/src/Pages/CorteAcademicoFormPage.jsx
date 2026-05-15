import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, CalendarRange, Layers, Percent } from 'lucide-react';
import api from '../services/api';
import Layout from '../components/Layout';
import FormErrorBanner from '../Components/FormErrorBanner';
import { extraerMensajeError } from '../services/apiErrors';
import { toast } from 'react-toastify';

const ESTADO_INICIAL = {
    id_periodo: '',
    numero_corte: 1,
    nombre: '',
    fecha_inicio: '',
    fecha_fin: '',
    porcentaje_evaluacion: '',
};

const CorteAcademicoFormPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const esEdicion = Boolean(id);

    const [formData, setFormData] = useState(ESTADO_INICIAL);
    const [periodos, setPeriodos] = useState([]);
    const [cargando, setCargando] = useState(esEdicion);
    const [guardando, setGuardando] = useState(false);
    const [errorApi, setErrorApi] = useState(null);
    const [tocados, setTocados] = useState({});

    useEffect(() => {
        const cargar = async () => {
            try {
                const { data: periodosData } = await api.get('/agendas/periodos');
                setPeriodos(periodosData);

                if (esEdicion) {
                    const { data } = await api.get(`/agendas/cortes/${id}`);
                    setFormData({
                        id_periodo: data.id_periodo ?? '',
                        numero_corte: data.numero_corte ?? 1,
                        nombre: data.nombre ?? '',
                        fecha_inicio: data.fecha_inicio ? data.fecha_inicio.split('T')[0] : '',
                        fecha_fin: data.fecha_fin ? data.fecha_fin.split('T')[0] : '',
                        porcentaje_evaluacion: data.porcentaje_evaluacion ?? '',
                    });
                }
            } catch {
                toast.error('Error al cargar datos del corte académico');
            } finally {
                setCargando(false);
            }
        };

        cargar();
    }, [esEdicion, id]);

    const handleChange = (campo, valor) => {
        setFormData((prev) => ({ ...prev, [campo]: valor }));
    };

    const inputClase = (campo) =>
        `w-full bg-gray-50 border rounded-2xl px-5 py-4 text-sm font-bold text-institutional-dark
         focus:ring-4 focus:ring-institutional-green/10 outline-none transition-all
         ${tocados[campo] && !formData[campo]?.toString().trim() ? 'border-red-400 bg-red-50' : 'border-gray-200'}`;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorApi(null);
        setTocados({ id_periodo: true, numero_corte: true, fecha_inicio: true, fecha_fin: true });

        if (!formData.id_periodo || !formData.numero_corte || !formData.fecha_inicio || !formData.fecha_fin) return;

        setGuardando(true);
        try {
            const payload = {
                id_periodo: Number(formData.id_periodo),
                numero_corte: Number(formData.numero_corte),
                nombre: formData.nombre.trim() || null,
                fecha_inicio: formData.fecha_inicio,
                fecha_fin: formData.fecha_fin,
                porcentaje_evaluacion: formData.porcentaje_evaluacion === '' ? null : Number(formData.porcentaje_evaluacion),
            };

            if (esEdicion) {
                await api.put(`/agendas/cortes/${id}`, payload);
                toast.success('Corte académico actualizado correctamente');
            } else {
                await api.post('/agendas/cortes', payload);
                toast.success('Corte académico creado exitosamente');
            }

            navigate('/admin/periodos');
        } catch (err) {
            if (!err.response) toast.error('Error de conexión. Verifica tu red.');
            setErrorApi(extraerMensajeError(err));
        } finally {
            setGuardando(false);
        }
    };

    if (cargando) {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center h-64">
                    <div className="w-10 h-10 border-4 border-institutional-green/20 border-t-institutional-green rounded-full animate-spin mb-4" />
                    <span className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Cargando corte...</span>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-3xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                    <div>
                        <div className="flex items-center space-x-2 mb-1">
                            <div className="w-8 h-1 bg-institutional-green rounded-full" />
                            <span className="text-[10px] font-black text-institutional-green uppercase tracking-[0.3em]">Administración · Periodos</span>
                        </div>
                        <h1 className="text-3xl font-black text-institutional-dark uppercase tracking-tight">{esEdicion ? 'Editar Corte' : 'Nuevo Corte'}</h1>
                        <p className="text-gray-500 mt-1 font-medium text-sm">Gestión de fechas y porcentajes de evaluación por periodo.</p>
                    </div>

                    <button
                        type="button"
                        onClick={() => navigate('/admin/periodos')}
                        className="flex items-center space-x-2 px-5 py-3 rounded-2xl border border-gray-200 text-gray-500 font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all"
                    >
                        <ArrowLeft size={16} />
                        <span>Volver a periodos</span>
                    </button>
                </div>

                <FormErrorBanner mensaje={errorApi} onDismiss={() => setErrorApi(null)} />

                <form onSubmit={handleSubmit} noValidate>
                    <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 mb-6">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2.5 bg-institutional-dark/5 rounded-xl">
                                <Layers size={20} className="text-institutional-dark" />
                            </div>
                            <div>
                                <h2 className="text-xs font-black text-institutional-dark uppercase tracking-widest">Identificación del Corte</h2>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Periodo y número de corte</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Periodo <span className="text-red-500">*</span></label>
                                <select className={inputClase('id_periodo')} value={formData.id_periodo} onBlur={() => setTocados((t) => ({ ...t, id_periodo: true }))} onChange={(e) => handleChange('id_periodo', e.target.value)}>
                                    <option value="">Seleccione periodo...</option>
                                    {periodos.map((p) => (<option key={p.id_periodo} value={p.id_periodo}>{p.anio} - {p.periodo}</option>))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Número de Corte <span className="text-red-500">*</span></label>
                                <select className={inputClase('numero_corte')} value={formData.numero_corte} onBlur={() => setTocados((t) => ({ ...t, numero_corte: true }))} onChange={(e) => handleChange('numero_corte', e.target.value)}>
                                    <option value={1}>Corte 1</option>
                                    <option value={2}>Corte 2</option>
                                    <option value={3}>Corte 3</option>
                                </select>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Nombre</label>
                                <input type="text" placeholder="Ej: Primer corte" className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm font-bold text-institutional-dark focus:ring-4 focus:ring-institutional-green/10 outline-none transition-all" value={formData.nombre} onChange={(e) => handleChange('nombre', e.target.value)} />
                            </div>
                        </div>
                    </section>

                    <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 mb-8">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2.5 bg-institutional-dark/5 rounded-xl">
                                <CalendarRange size={20} className="text-institutional-dark" />
                            </div>
                            <div>
                                <h2 className="text-xs font-black text-institutional-dark uppercase tracking-widest">Fechas y Evaluación</h2>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Rango del corte y porcentaje evaluativo</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Fecha Inicio <span className="text-red-500">*</span></label>
                                <input type="date" className={inputClase('fecha_inicio')} value={formData.fecha_inicio} onBlur={() => setTocados((t) => ({ ...t, fecha_inicio: true }))} onChange={(e) => handleChange('fecha_inicio', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Fecha Fin <span className="text-red-500">*</span></label>
                                <input type="date" className={inputClase('fecha_fin')} value={formData.fecha_fin} onBlur={() => setTocados((t) => ({ ...t, fecha_fin: true }))} onChange={(e) => handleChange('fecha_fin', e.target.value)} />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">Porcentaje Evaluación</label>
                                <div className="relative">
                                    <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input type="number" min="0" max="100" step="0.01" className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold text-institutional-dark focus:ring-4 focus:ring-institutional-green/10 outline-none transition-all" value={formData.porcentaje_evaluacion} onChange={(e) => handleChange('porcentaje_evaluacion', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="sticky bottom-6 flex justify-end gap-3">
                        <button type="button" onClick={() => navigate('/admin/periodos')} className="px-6 py-3.5 rounded-2xl border border-gray-200 text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all">Cancelar</button>
                        <button type="submit" disabled={guardando} className="bg-institutional-green text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-institutional-green/90 transition-all flex items-center space-x-2 shadow-lg shadow-institutional-green/20 disabled:opacity-60">
                            {guardando ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
                            <span>{esEdicion ? 'Actualizar Corte' : 'Guardar Corte'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    );
};

export default CorteAcademicoFormPage;
