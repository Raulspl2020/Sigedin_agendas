import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tieneAccesoMenu } from '../config/roleAccess';
import {
    BookOpen,
    CheckSquare,
    Eye,
    LogOut,
    FileText,
    ChevronDown,
    ShieldCheck,
    Calendar,
    Layers,
    Building2,
    Users,
    Activity,
    X
} from 'lucide-react';

/**
 * @typedef {Object} SidebarProps
 * @property {boolean} isOpen - Indica si el sidebar está abierto en móvil.
 * @property {Function} onClose - Función para cerrar el sidebar en móvil.
 */

/**
 * Componente Sidebar de navegación principal.
 * - En pantallas grandes (lg+) siempre visible como panel lateral fijo.
 * - En pantallas pequeñas (< lg) se muestra como drawer deslizable con overlay.
 *
 * @param {SidebarProps} props
 * @returns {JSX.Element}
 */
const Sidebar = ({ isOpen, onClose }) => {
    const { logout, usuario } = useAuth();
    const rolUsuario = usuario?.rol;
    const [adminOpen, setAdminOpen] = useState(false);
    const [informesOpen, setInformesOpen] = useState(false);
    const location = useLocation();

    // Cierra el sidebar en móvil al cambiar de ruta
    useEffect(() => {
        if (onClose) onClose();
    }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (location.pathname.startsWith('/informes')) {
            setInformesOpen(true);
        }
    }, [location.pathname]);

    /** @type {Array<{name: string, icon: JSX.Element, path: string}>} */
    const menuItems = [
        { key: 'supervision', name: 'Supervisión', icon: <Eye size={20} />, path: '/supervision' },
        { key: 'actividades', name: 'Actividades', icon: <Activity size={20} />, path: '/actividades' },
        { key: 'seguimiento', name: 'Seguimiento', icon: <CheckSquare size={20} />, path: '/seguimiento' },
    ].filter((item) => tieneAccesoMenu(rolUsuario, item.key));

    const informesSubItems = [
        { name: 'Informe ejecutivo', icon: <BookOpen size={18} />, path: '/informes/ejecutivo' },
        { name: 'Consolidado general', icon: <Layers size={18} />, path: '/informes/consolidado' },
    ];

    const informesActivo = location.pathname.startsWith('/informes');

    /** @type {Array<{name: string, icon: JSX.Element, path: string}>} */
    const adminSubItems = [
        { name: 'Periodos', icon: <Calendar size={18} />, path: '/admin/periodos' },
        { name: 'Facultad', icon: <Building2 size={18} />, path: '/admin/facultades' },
        { name: 'Docentes', icon: <Users size={18} />, path: '/admin/docentes' },
        { name: 'Agendas', icon: <FileText size={18} />, path: '/admin/agendas' },
    ];

    /** Contenido del sidebar (compartido entre desktop y móvil) */
    const sidebarContent = (
        <aside className="w-64 bg-institutional-dark text-white flex flex-col h-full border-r border-white/5 shadow-2xl">
            {/* Cabecera del sidebar */}
            <div className="p-6 border-b border-white/10">
                <div className="flex flex-col items-center mb-4 text-center relative">
                    {/* Botón de cierre solo visible en móvil */}
                    <button
                        onClick={onClose}
                        aria-label="Cerrar menú"
                        className="lg:hidden absolute top-0 right-0 p-1 text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <img src="/logo-blanco.png" alt="UniPutumayo" className="h-16 w-auto object-contain mb-3" />
                    <span className="font-black text-2xl tracking-tighter uppercase text-white/90">Sigedin</span>
                    <p className="text-[10px] text-institutional-green font-black uppercase tracking-[0.25em] mt-1">
                        SISTEMA DE AGENDAS
                    </p>
                </div>
            </div>

            {/* Navegación */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                {/* Módulo de Administración (Solo para ADMIN) */}
                {tieneAccesoMenu(rolUsuario, 'administracion') && (
                    <div className="mb-4">
                        <button
                            onClick={() => setAdminOpen(!adminOpen)}
                            className="w-full flex items-center justify-between px-4 py-3 text-gray-200 hover:text-white transition-colors group"
                            aria-expanded={adminOpen}
                        >
                            <div className="flex items-center space-x-3">
                                <ShieldCheck size={20} className="group-hover:text-institutional-green transition-colors" />
                                <span className="text-xs font-black uppercase tracking-widest">Administración</span>
                            </div>
                            <ChevronDown
                                size={16}
                                className={`transition-transform duration-300 ${adminOpen ? 'rotate-180' : ''}`}
                            />
                        </button>

                        <div
                            className={`mt-1 space-y-1 transition-all duration-300 overflow-hidden ${adminOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                        >
                            {adminSubItems.map((sub) => (
                                <NavLink
                                    key={sub.path}
                                    to={sub.path}
                                    className={({ isActive }) =>
                                        `flex items-center space-x-3 px-10 py-2.5 rounded-lg text-sm transition-all ${isActive
                                            ? 'bg-institutional-green/20 text-institutional-green font-bold border-r-4 border-institutional-green'
                                            : 'text-gray-200 hover:bg-white/5 hover:text-white'
                                        }`
                                    }
                                >
                                    {sub.icon}
                                    <span>{sub.name}</span>
                                </NavLink>
                            ))}
                        </div>
                    </div>
                )}

                <div className="pt-2 border-t border-white/5 mt-2">
                    <p className="px-4 py-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">General</p>
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/'}
                            className={({ isActive }) =>
                                `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${isActive
                                    ? 'bg-institutional-green text-white shadow-xl shadow-institutional-green/30 font-bold scale-[1.02]'
                                    : 'text-gray-200 hover:bg-white/5 hover:text-white'
                                }`
                            }
                        >
                            {item.icon}
                            <span className="font-medium">{item.name}</span>
                        </NavLink>
                    ))}

                    {tieneAccesoMenu(rolUsuario, 'informes') && (
                    <div className="mt-1">
                        <button
                            onClick={() => setInformesOpen((prev) => !prev)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${informesActivo
                                ? 'bg-institutional-green text-white shadow-xl shadow-institutional-green/30'
                                : 'text-gray-200 hover:bg-white/5 hover:text-white'
                                }`}
                            aria-expanded={informesOpen}
                        >
                            <div className="flex items-center space-x-3">
                                <FileText size={20} />
                                <span className="font-medium">Informes</span>
                            </div>
                            <ChevronDown size={16} className={`transition-transform duration-300 ${informesOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <div className={`mt-1 ml-6 pl-3 border-l border-white/10 space-y-1 transition-all duration-300 overflow-hidden ${informesOpen ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
                            {informesSubItems.map((sub) => (
                                <NavLink
                                    key={sub.path}
                                    to={sub.path}
                                    className={({ isActive }) =>
                                        `flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-all ${isActive
                                            ? 'bg-institutional-green/20 text-institutional-green font-bold'
                                            : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                        }`
                                    }
                                >
                                    {sub.icon}
                                    <span>{sub.name}</span>
                                </NavLink>
                            ))}
                        </div>
                    </div>
                    )}
                </div>
            </nav>

            {/* Cerrar sesión */}
            <div className="p-4 border-t border-white/10 bg-black/20">
                <button
                    onClick={logout}
                    className="w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all font-black text-xs uppercase tracking-widest border border-red-500/20"
                >
                    <LogOut size={18} />
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        </aside>
    );

    return (
        <>
            {/*
             * DESKTOP: sidebar siempre visible, posición sticky.
             * Oculto en pantallas menores a lg.
             */}
            <div className="hidden lg:flex lg:h-screen lg:sticky lg:top-0 shrink-0">
                {sidebarContent}
            </div>

            {/*
             * MÓVIL / TABLET: drawer deslizable con overlay oscuro.
             * Solo visible cuando isOpen === true.
             */}
            {/* Overlay */}
            <div
                className={`lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
                aria-hidden="true"
            />
            {/* Drawer */}
            <div
                className={`lg:hidden fixed inset-y-0 left-0 z-50 h-full transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                {sidebarContent}
            </div>
        </>
    );
};

export default Sidebar;
