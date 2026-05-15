import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Calendar, ChevronRight, Loader2 } from 'lucide-react';

const SeleccionPeriodo = () => {
    const [periodos, setPeriodos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const { seleccionarPeriodo } = useAuth();

    useEffect(() => {
        const fetchPeriodos = async () => {
            try {
                const { data } = await api.get('/agendas/periodos');
                setPeriodos(data);
            } catch (error) {
                console.error('Error al cargar periodos', error);
            } finally {
                setCargando(false);
            }
        };
        fetchPeriodos();
    }, []);

    if (cargando) {
        return (
            <div className="flex flex-col items-center justify-center p-10">
                <Loader2 className="animate-spin text-institutional-green mb-4" size={40} />
                <p className="text-institutional-dark font-medium">Cargando periodos académicos...</p>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-institutional-dark">Seleccionar Periodo Académico</h3>
                <p className="text-gray-500 text-sm">Para continuar, por favor selecciona la vigencia en la que vas a trabajar.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {periodos.map((periodo) => (
                    <button
                        key={periodo.id_periodo}
                        onClick={() => seleccionarPeriodo(periodo)}
                        className="flex items-center justify-between p-4 bg-gray-50 hover:bg-institutional-green/5 border border-gray-200 hover:border-institutional-green rounded-xl transition-all group"
                    >
                        <div className="flex items-center">
                            <div className="w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center mr-4 group-hover:text-institutional-green transition-colors">
                                <Calendar size={24} />
                            </div>
                            <div className="text-left">
                                <span className="block font-bold text-institutional-dark">
                                    {periodo.anio} - {periodo.periodo}
                                </span>
                                <span className="text-xs text-gray-400">
                                    {periodo.fecha_inicio} a {periodo.fecha_fin}
                                </span>
                            </div>
                        </div>
                        <ChevronRight className="text-gray-300 group-hover:text-institutional-green transition-colors" />
                    </button>
                ))}
            </div>
        </div>
    );
};

export default SeleccionPeriodo;
