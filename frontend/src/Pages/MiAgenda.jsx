import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../Components/Layout';
import api from '../services/api';
import {
    Plus,
    FileText,
    Calendar,
    Clock,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    Info
} from 'lucide-react';
import { toast } from 'react-toastify';

const MiAgenda = () => {
    const { periodoSeleccionado } = useAuth();
    const [agenda, setAgenda] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAgenda = async () => {
            if (!periodoSeleccionado) return;

            setCargando(true);
            setError(null);
            try {
                const { data } = await api.get(`/agendas/mi-agenda?id_periodo=${periodoSeleccionado.id_periodo}`);
                setAgenda(data);
            } catch (err) {
                if (err.response?.status === 404) {
                    setAgenda(null);
                } else {
                    setError('Error al cargar la agenda');
                }
            } finally {
                setCargando(false);
            }
        };

        fetchAgenda();
    }, [periodoSeleccionado]);

    const handleCrearAgenda = async () => {
        try {
            const { data } = await api.post('/agendas', {
                id_periodo: periodoSeleccionado.id_periodo,
                fecha_diligenciamiento: new Date().toISOString().split('T')[0],
                inicio_semestre: periodoSeleccionado.fecha_inicio,
                fin_semestre: periodoSeleccionado.fecha_fin,
            });
            setAgenda(data);
            toast.success('Agenda creada exitosamente');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error al crear agenda');
        }
    };

    if (cargando) return <Layout><div className="flex items-center justify-center h-64"><p>Cargando información...</p></div></Layout>;

    return (
        <Layout>
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-institutional-dark">Mi Agenda Académica</h1>
                        <p className="text-gray-500 text-sm">Gestión de actividades para el periodo actual.</p>
                    </div>

                    {!agenda && (
                        <button
                            onClick={handleCrearAgenda}
                            className="flex items-center justify-center space-x-2 bg-institutional-green text-white px-6 py-3 rounded-xl font-bold hover:bg-institutional-green/90 transition-all shadow-lg shadow-institutional-green/20 w-full sm:w-auto"
                        >
                            <Plus size={20} />
                            <span>INICIAR AGENDA</span>
                        </button>
                    )}
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-8 flex items-center">
                        <AlertCircle className="text-red-500 mr-3" />
                        <p className="text-red-700 font-medium">{error}</p>
                    </div>
                )}

                {agenda ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Detalles de la Agenda */}
                        <div className="md:col-span-2 space-y-6">
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-12 h-12 bg-institutional-green/10 rounded-xl flex items-center justify-center text-institutional-green">
                                            <FileText size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-institutional-dark">Resumen de Agenda</h3>
                                            <p className="text-xs text-gray-400 font-medium tracking-tight">ID: {agenda.id_agenda}</p>
                                        </div>
                                    </div>
                                    <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${agenda.estado === 'Borrador' ? 'bg-yellow-100 text-yellow-700' :
                                        agenda.estado === 'Aprobada' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                        }`}>
                                        {agenda.estado}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-8 mb-8">
                                    <InfoItem icon={<Calendar size={18} />} label="Fecha Apertura" value={new Date(agenda.fecha_diligenciamiento).toLocaleDateString()} />
                                    <InfoItem icon={<Clock size={18} />} label="Horas Planeadas" value={`${agenda.total_horas_planeadas}h / 40h`} />
                                </div>

                                <div className="bg-institutional-light/50 p-6 rounded-2xl border border-institutional-green/5">
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-3">Observaciones del Docente</p>
                                    <p className="text-sm text-gray-600 italic">
                                        {agenda.observaciones_docente || 'Sin observaciones registradas.'}
                                    </p>
                                </div>
                            </div>

                            {/* Acciones Rápidas */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <ActionCard
                                    title="Gestionar Actividades"
                                    desc="Agrega o modifica actividades académicas."
                                    icon={<Plus className="text-white" />}
                                    color="bg-institutional-green"
                                    onClick={() => { }}
                                />
                                <ActionCard
                                    title="Ver Seguimiento"
                                    desc="Registra el avance de tus actividades."
                                    icon={<ChevronRight className="text-white" />}
                                    color="bg-institutional-blue"
                                    onClick={() => { }}
                                />
                            </div>
                        </div>

                        {/* Ayuda / Requisitos */}
                        <div className="space-y-6">
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                                <div className="flex items-center space-x-3 mb-6">
                                    <Info className="text-institutional-gold" size={24} />
                                    <h4 className="font-bold text-institutional-dark">Importante</h4>
                                </div>
                                <ul className="space-y-4">
                                    <RequirementItem text="El total de horas debe ser exactamente según tu vinculación." />
                                    <RequirementItem text="Recuerda adjuntar las evidencias para cada seguimiento." />
                                    <RequirementItem text="La agenda debe ser enviada a revisión antes de fin de mes." />
                                </ul>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white p-16 rounded-3xl shadow-sm border border-dashed border-gray-300 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-gray-300">
                            <FileText size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-institutional-dark mb-2">No tienes una agenda activa</h3>
                        <p className="text-gray-500 max-w-sm">
                            Debes crear una agenda para el periodo <strong>{periodoSeleccionado?.anio} - {periodoSeleccionado?.periodo}</strong> para comenzar a reportar tus actividades.
                        </p>
                    </div>
                )}
            </div>
        </Layout>
    );
};

const InfoItem = ({ icon, label, value }) => (
    <div className="flex items-start space-x-3">
        <div className="text-gray-400 mt-0.5">{icon}</div>
        <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
            <p className="text-sm font-bold text-institutional-dark">{value}</p>
        </div>
    </div>
);

const RequirementItem = ({ text }) => (
    <li className="flex items-start space-x-3">
        <CheckCircle2 size={16} className="text-institutional-green mt-0.5 shrink-0" />
        <span className="text-sm text-gray-600 italic">{text}</span>
    </li>
);

const ActionCard = ({ title, desc, icon, color, onClick }) => (
    <button
        onClick={onClick}
        className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4 hover:border-institutional-green transition-all group text-left"
    >
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform`}>
            {icon}
        </div>
        <div>
            <h4 className="font-bold text-institutional-dark">{title}</h4>
            <p className="text-xs text-gray-400">{desc}</p>
        </div>
    </button>
);

export default MiAgenda;
