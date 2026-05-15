import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn, Lock, User, Mail, AlertCircle, CalendarDays } from 'lucide-react';
import api from '../services/api';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [periodoId, setPeriodoId] = useState('');
    const [periodos, setPeriodos] = useState([]);
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);
    const [cargandoPeriodos, setCargandoPeriodos] = useState(true);

    const { login } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPeriodos = async () => {
            try {
                const { data } = await api.get('/agendas/periodos');
                setPeriodos(data);

                let idPeriodoInicial = '';

                try {
                    const { data: periodoActual } = await api.get('/periodo/actual');
                    if (periodoActual?.id_periodo) {
                        idPeriodoInicial = String(periodoActual.id_periodo);
                    }
                } catch (_) {
                    if (data.length > 0) {
                        const periodosPorFechaFin = [...data].sort((a, b) =>
                            new Date(b.fecha_fin || 0).getTime() - new Date(a.fecha_fin || 0).getTime(),
                        );
                        idPeriodoInicial = String(periodosPorFechaFin[0].id_periodo);
                    }
                }

                if (!idPeriodoInicial && data.length > 0) {
                    idPeriodoInicial = String(data[0].id_periodo);
                }

                setPeriodoId(idPeriodoInicial);
            } catch (err) {
                console.error('Error al cargar periodos');
            } finally {
                setCargandoPeriodos(false);
            }
        };
        fetchPeriodos();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!periodoId) {
            setError('Por favor seleccione un periodo académico');
            return;
        }

        setCargando(true);

        const periodoSeleccionado = periodos.find(p => p.id_periodo === +periodoId);
        const result = await login(username, password, periodoSeleccionado);

        if (result.success) {
            navigate('/');
        } else {
            setError(result.message);
            setCargando(false);
        }
    };

    return (
        <div className="sigedin-form-theme min-h-screen flex items-center justify-center bg-institutional-light py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-institutional-light to-institutional-green/10">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-institutional-green/10">
                <div className="text-center">
                    <div className="flex justify-center mb-4">
                        <img src="/logo-color.png" alt="UniPutumayo" className="h-24 w-auto object-contain" />
                    </div>
                    <h2 className="text-2xl font-black text-institutional-dark uppercase tracking-tight">
                        Sigedin Agendas
                    </h2>
                    <p className="text-xs text-institutional-green font-bold uppercase tracking-widest mt-1">
                        Gestión de Cumplimiento Académico
                    </p>
                </div>

                <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-start animate-in fade-in duration-300">
                            <AlertCircle className="text-red-500 mr-3 shrink-0" size={20} />
                            <p className="text-xs font-bold text-red-700">{error}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">
                                Vigencia Académica
                            </label>
                            <div className="relative">
                                <select
                                    required
                                    disabled={cargandoPeriodos}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-institutional-green outline-none appearance-none font-bold text-institutional-dark"
                                    value={periodoId}
                                    onChange={(e) => setPeriodoId(e.target.value)}
                                >
                                    <option value="">{cargandoPeriodos ? 'Cargando periodos...' : 'Seleccione Periodo...'}</option>
                                    {periodos.map(p => (
                                        <option key={p.id_periodo} value={p.id_periodo}>
                                            {p.anio} - {p.periodo}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <CalendarDays size={18} />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">
                                Usuario
                            </label>
                            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-institutional-green transition-all">
                                <span className="px-4 text-gray-400">
                                    <User size={18} />
                                </span>
                                <input
                                    type="text"
                                    required
                                    className="w-full py-3 text-sm bg-transparent outline-none font-medium"
                                    placeholder="Nombre de usuario"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">
                                Contraseña
                            </label>
                            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-institutional-green transition-all">
                                <span className="px-4 text-gray-400">
                                    <Lock size={18} />
                                </span>
                                <input
                                    type="password"
                                    required
                                    className="w-full py-3 text-sm bg-transparent outline-none font-medium"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={cargando || cargandoPeriodos}
                        className={`w-full py-4 bg-institutional-green text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-institutional-green/90 shadow-xl shadow-institutional-green/20 transition-all transform active:scale-95 flex items-center justify-center space-x-2 ${cargando || cargandoPeriodos ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {cargando ? (
                            <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                VALIDANDO...
                            </span>
                        ) : (
                            <>
                                <LogIn size={20} />
                                <span>INGRESAR AL SISTEMA</span>
                            </>
                        )}
                    </button>
                </form>

                <div className="pt-6 text-center">
                    <div className="h-px w-full bg-gray-200/80" />

                    <p className="mt-5 text-[11px] text-gray-500 font-semibold uppercase tracking-wide">
                        © 20 26 INSTITUCIÓN UNIVERSITARIA DEL PUTUMAYO
                    </p>

                    <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-gray-500 font-medium">
                        <span className="inline-flex items-center gap-1 uppercase tracking-tight">
                            <User size={13} className="text-gray-400" />
                            <span>INGENIERO RAÚL RODRÍGUEZ</span>
                        </span>

                        <span className="h-3.5 w-px bg-gray-300" />

                        <span className="inline-flex items-center gap-1 tracking-tight">
                            <Mail size={13} className="text-gray-400" />
                            <span>rarodriguez@itp.edu.co</span>
                        </span>
                    </div>

                    <p className="mt-3 text-[10px] text-gray-300 font-medium">
                        Todos los derechos reservados.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
