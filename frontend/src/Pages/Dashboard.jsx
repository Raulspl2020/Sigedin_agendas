import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../Components/Layout';
import SeleccionPeriodo from '../components/SeleccionPeriodo';
import api from '../services/api';
import {
    BarChart,
    Clock,
    CheckCircle2,
    AlertTriangle,
    ArrowUpRight,
    Plus
} from 'lucide-react';

const Dashboard = () => {
    const { usuario, periodoSeleccionado } = useAuth();
    const [stats, setStats] = useState(null);
    const [cargando, setCargando] = useState(false);

    // Determinar nombre a mostrar
    const nombreUsuario = usuario?.docente?.nombres || usuario?.username || 'Usuario';
    const primerNombre = nombreUsuario.split(' ')[0];

    useEffect(() => {
        const fetchData = async () => {
            if (!periodoSeleccionado) return;

            setCargando(true);
            try {
                const { data: agendaData } = await api.get(`/agendas/mi-agenda?id_periodo=${periodoSeleccionado.id_periodo}`);

                if (agendaData) {
                    const { data: statsData } = await api.get(`/agendas/estadisticas/${agendaData.id_agenda}`);
                    setStats(statsData);
                } else {
                    setStats(null);
                }
            } catch (err) {
                console.error('Error al cargar estadísticas', err);
                setStats(null);
            } finally {
                setCargando(false);
            }
        };

        fetchData();
    }, [periodoSeleccionado]);

    if (!periodoSeleccionado) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900/50 backdrop-blur-sm fixed inset-0 z-50">
                <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-300">
                    <SeleccionPeriodo />
                </div>
            </div>
        );
    }

    return (
        <Layout>
            <div className="max-w-7xl mx-auto">
                {/* Encabezado: apilado en móvil, fila en sm+ */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                    <div>
                        <div className="flex items-center space-x-2 mb-1">
                            <div className="w-8 h-1 bg-institutional-green rounded-full" />
                            <span className="text-[10px] font-black text-institutional-green uppercase tracking-[0.3em]">Panel de Control</span>
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-black text-institutional-dark uppercase tracking-tight">¡Hola, {primerNombre}!</h1>
                        <p className="text-sm text-gray-600 mt-1 font-medium">
                            Resumen de cumplimiento —{' '}
                            <span className="text-institutional-blue font-bold">{periodoSeleccionado?.anio}-{periodoSeleccionado?.periodo}</span>
                        </p>
                    </div>
                    <button className="flex items-center justify-center space-x-2 bg-institutional-green text-white px-5 py-2.5 rounded-xl font-bold hover:bg-institutional-green/90 transition-all shadow-lg shadow-institutional-green/20 w-full sm:w-auto">
                        <Plus size={20} />
                        <span>NUEVA ACTIVIDAD</span>
                    </button>
                </div>

                {/* Tarjetas de Resumen */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                    <StatCard
                        title="Horas Planeadas"
                        value={stats ? `${stats.totalHorasPlaneadas}h` : '0h'}
                        sub="Semanas del periodo"
                        icon={<Clock className="text-blue-500" />}
                        color="blue"
                    />
                    <StatCard
                        title="Semanas Reportadas"
                        value={stats ? "8 / 16" : "0 / 16"}
                        sub="Progreso temporal"
                        icon={<BarChart className="text-institutional-green" />}
                        color="green"
                    />
                    <StatCard
                        title="Cumplimiento Global"
                        value={stats ? `${stats.porcentajeGlobal}%` : '0%'}
                        sub="Basado en ejecución"
                        icon={<CheckCircle2 className={`text-institutional-gold ${stats?.semaforo === 'ROJO' ? 'text-red-500' : ''}`} />}
                        color="gold"
                    />
                    <StatCard
                        title="Estado Agenda"
                        value={stats ? stats.estadoAgenda : 'No iniciada'}
                        sub="Estado actual"
                        icon={<AlertTriangle className="text-orange-500" />}
                        color="orange"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Gráfico de Cumplimiento (Placeholder visual) */}
                    <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-institutional-dark mb-6">Cumplimiento por Semanas</h3>
                        <div className="h-64 flex items-end justify-between space-x-2 px-4">
                            {[40, 60, 45, 80, 75, 90, 100, 50].map((h, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center group">
                                    <div
                                        className="w-full bg-institutional-green/10 rounded-t-md transition-all group-hover:bg-institutional-green relative"
                                        style={{ height: `${h}%` }}
                                    >
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-institutional-dark text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                            {h}%
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-gray-400 mt-2 font-bold">S{i + 1}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Estado de Actividades */}
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-institutional-dark mb-6">Próximos Vencimientos</h3>
                        <div className="space-y-6">
                            <NextTask title="Informe de Investigación" days="2 días" color="red" />
                            <NextTask title="Seguimiento Tutorías" days="5 días" color="orange" />
                            <NextTask title="Evidencias Extensión" days="1 semana" color="institutional-green" />
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

const StatCard = ({ title, value, sub, icon, color }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between">
        <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{title}</p>
            <h4 className="text-2xl font-black text-institutional-dark">{value}</h4>
            <p className="text-xs text-gray-500 mt-1">{sub}</p>
        </div>
        <div className={`p-3 rounded-xl bg-gray-50`}>
            {icon}
        </div>
    </div>
);

const NextTask = ({ title, days, color }) => (
    <div className="flex items-center justify-between group cursor-pointer">
        <div className="flex items-center space-x-3">
            <div className={`w-2 h-2 rounded-full bg-${color}-500 group-hover:scale-150 transition-transform`}></div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-institutional-green transition-colors">{title}</span>
        </div>
        <div className="bg-gray-50 px-2 py-1 rounded text-[10px] font-bold text-gray-500">{days}</div>
    </div>
);

export default Dashboard;
