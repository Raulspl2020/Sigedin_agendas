import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../Components/Layout';
import api from '../services/api';
import { Plus, Search, Loader2, ShieldCheck, UserCircle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import TableActionButtons from '../Components/TableActionButtons';

const Usuarios = () => {
    const navigate = useNavigate();
    const [usuarios, setUsuarios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [filtro, setFiltro] = useState('');

    useEffect(() => { fetchUsuarios(); }, []);

    const fetchUsuarios = async () => {
        try {
            setCargando(true);
            const { data } = await api.get('/admin-usuario');
            setUsuarios(data);
        } catch (error) {
            toast.error('Error al cargar usuarios');
        } finally {
            setCargando(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar este usuario definitivamente?')) return;
        try {
            await api.delete(`/admin-usuario/${id}`);
            toast.success('Usuario eliminado');
            fetchUsuarios();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al eliminar');
        }
    };

    const filtrados = usuarios.filter(u =>
        u.username.toLowerCase().includes(filtro.toLowerCase()) ||
        u.rol.toLowerCase().includes(filtro.toLowerCase()) ||
        (u.docente && u.docente.nombres.toLowerCase().includes(filtro.toLowerCase()))
    );

    return (
        <Layout>
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-black text-institutional-dark uppercase tracking-tight">Control de Usuarios</h1>
                        <p className="text-gray-500 font-medium text-sm">Gestión de accesos y roles del sistema SIGEDIN.</p>
                    </div>
                    <button
                        onClick={() => navigate('/admin/usuarios/nuevo')}
                        className="flex items-center justify-center space-x-2 bg-institutional-dark text-white px-6 py-3 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl hover:scale-105 transition-all w-full sm:w-auto"
                    >
                        <Plus size={20} /> <span>Nuevo Usuario</span>
                    </button>
                </div>

                <div className="mb-8 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text" placeholder="Buscar por username, rol o docente..." className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-4 focus:ring-4 focus:ring-institutional-dark/5 outline-none transition-all font-medium" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
                </div>

                {cargando ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-institutional-dark" size={48} /></div>
                ) : (
                    <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-100/80">
                                <tr>
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-600 uppercase tracking-widest">Usuario</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-600 uppercase tracking-widest">Rol</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-600 uppercase tracking-widest">Asociado a</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-gray-600 uppercase tracking-widest">Estado</th>
                                    <th className="px-8 py-6 text-right text-[10px] font-black text-gray-600 uppercase tracking-widest">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtrados.map(u => (
                                    <tr key={u.id_usuario} className="group hover:bg-gray-50/50 transition-all">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-institutional-dark/10 rounded-full flex items-center justify-center text-institutional-dark font-black"><UserCircle size={24} /></div>
                                                <span className="font-black text-institutional-dark tracking-tight">{u.username}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-xs font-black uppercase tracking-widest">
                                            <span className={`px-3 py-1 rounded-full ${u.rol === 'ADMIN'
                                                ? 'bg-amber-100 text-amber-700'
                                                : u.rol === 'DECANO'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-blue-100 text-blue-700'}`}>{u.rol}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-gray-700 font-bold text-xs uppercase tracking-tight">{u.docente?.nombres || '-'}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            {u.activo === 1 ? (
                                                <div className="flex items-center space-x-2 text-green-500 font-bold uppercase text-[9px] tracking-widest"><CheckCircle size={14} /> <span>Activo</span></div>
                                            ) : (
                                                <div className="flex items-center space-x-2 text-red-500 font-bold uppercase text-[9px] tracking-widest"><XCircle size={14} /> <span>Inactivo</span></div>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <TableActionButtons
                                                onEdit={() => navigate(`/admin/usuarios/editar/${u.id_usuario}`)}
                                                onDelete={() => handleDelete(u.id_usuario)}
                                                editTitle="Editar usuario"
                                                deleteTitle="Eliminar usuario"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Usuarios;
