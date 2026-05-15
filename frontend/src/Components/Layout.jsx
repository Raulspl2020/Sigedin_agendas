import React, { useCallback, useEffect, useRef, useState } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Bell, CalendarDays, ChevronDown, LogOut, Menu, User } from 'lucide-react';
import api from '../services/api';

/**
 * Layout principal de la aplicación.
 *
 * Gestiona la apertura/cierre del Sidebar en dispositivos móviles y tablet
 * mediante un botón hamburguesa en el header. En escritorio el Sidebar
 * siempre permanece visible.
 *
 * @param {{ children: React.ReactNode }} props
 * @returns {JSX.Element}
 */
const Layout = ({ children }) => {
    const { periodoSeleccionado, usuario, logout, actualizarUsuario } = useAuth();
    const navigate = useNavigate();
    const [perfilDocente, setPerfilDocente] = useState(usuario?.docente || null);
    const nombreUsuario =
        perfilDocente?.nombres ||
        usuario?.docente?.nombres ||
        usuario?.nombres ||
        usuario?.username ||
        'Usuario';
    const cedulaUsuario =
        perfilDocente?.identificacion ||
        usuario?.docente?.identificacion ||
        usuario?.identificacion ||
        '';
    const rolUsuario = usuario?.rol || 'SIN ROL';

    /** @type {[boolean, Function]} Estado de apertura del menú en móvil */
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef(null);

    const esMismoDocente = useCallback((a, b) => {
        if (!a && !b) return true;
        if (!a || !b) return false;

        return (
            Number(a.id_docente || 0) === Number(b.id_docente || 0)
            && String(a.nombres || '') === String(b.nombres || '')
            && String(a.identificacion || '') === String(b.identificacion || '')
            && String(a.mail || '') === String(b.mail || '')
            && String(a.sede || '') === String(b.sede || '')
        );
    }, []);

    const sincronizarPerfilEnSesion = useCallback((docente) => {
        const siguienteDocente = docente || null;
        setPerfilDocente((prev) => (esMismoDocente(prev, siguienteDocente) ? prev : siguienteDocente));
        if (actualizarUsuario) {
            actualizarUsuario((prev) => {
                if (!prev) return prev;
                if (esMismoDocente(prev?.docente || null, siguienteDocente)) return prev;
                return {
                    ...prev,
                    docente: siguienteDocente,
                };
            });
        }
    }, [actualizarUsuario, esMismoDocente]);

    const cargarPerfil = useCallback(async () => {
        try {
            const { data } = await api.get('/perfil');
            sincronizarPerfilEnSesion(data?.docente || null);
        } catch {
            sincronizarPerfilEnSesion(usuario?.docente || null);
        }
    }, [sincronizarPerfilEnSesion]);

    useEffect(() => {
        if (!userMenuOpen) return;

        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setUserMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [userMenuOpen]);

    useEffect(() => {
        cargarPerfil();
    }, [cargarPerfil]);

    return (
        <div className="sigedin-form-theme flex h-screen bg-institutional-light overflow-hidden">
            {/* Sidebar recibe control de apertura */}
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            {/* Área de contenido principal */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                {/* ── Header / Navbar ── */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-8 shrink-0 z-30">

                    {/* Lado izquierdo: hamburguesa (móvil) + badge de periodo */}
                    <div className="flex items-center space-x-3">
                        {/* Botón hamburguesa — solo visible en pantallas pequeñas */}
                        <button
                            id="menu-hamburguesa"
                            onClick={() => setSidebarOpen(true)}
                            aria-label="Abrir menú de navegación"
                            className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-institutional-green hover:bg-institutional-green/10 transition-colors"
                        >
                            <Menu size={22} />
                        </button>

                        {/* Badge del periodo seleccionado */}
                        {periodoSeleccionado && (
                            <div className="flex items-center space-x-2 px-3 py-1 bg-institutional-green/10 text-institutional-green rounded-full">
                                <CalendarDays size={16} />
                                <span className="text-xs sm:text-sm font-bold whitespace-nowrap">
                                    <span className="hidden sm:inline">Periodo: </span>
                                    {periodoSeleccionado.anio} - {periodoSeleccionado.periodo}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Lado derecho: notificaciones + perfil */}
                    <div className="flex items-center space-x-2 sm:space-x-3">
                        <button
                            id="btn-notificaciones"
                            aria-label="Notificaciones"
                            className="p-2 text-gray-400 hover:text-institutional-green transition-colors relative"
                        >
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                        </button>

                        <div className="h-4 w-px bg-gray-200 mx-1 hidden sm:block" />

                        <div ref={userMenuRef} className="relative">
                            <button
                                type="button"
                                onClick={() => setUserMenuOpen((prev) => !prev)}
                                className="max-w-[68vw] sm:max-w-none flex items-center gap-2 sm:gap-3 bg-institutional-dark/5 border border-institutional-dark/10 rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 hover:bg-institutional-dark/10 transition-colors"
                                aria-haspopup="menu"
                                aria-expanded={userMenuOpen}
                                aria-label="Abrir menú de usuario"
                            >
                                <img
                                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(nombreUsuario)}&background=006431&color=fff`}
                                    alt="Avatar de usuario"
                                    className="w-8 h-8 rounded-full border border-institutional-green/20 shrink-0"
                                />

                                <div className="min-w-0 text-left">
                                    <p
                                        className="text-[11px] sm:text-xs font-black text-institutional-dark truncate"
                                        title={nombreUsuario}
                                    >
                                        {nombreUsuario}
                                    </p>
                                <p className="text-[10px] text-gray-500 font-semibold truncate" title={cedulaUsuario ? `CC ${cedulaUsuario}` : 'CC no registrada'}>
                                    {cedulaUsuario ? `CC ${cedulaUsuario}` : 'CC no registrada'}
                                </p>
                                </div>

                                <span className="shrink-0 inline-flex items-center px-2 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest bg-institutional-green/15 text-institutional-green border border-institutional-green/25">
                                    {rolUsuario}
                                </span>

                                <ChevronDown size={16} className={`text-gray-500 shrink-0 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {userMenuOpen && (
                                <div className="absolute right-0 top-[calc(100%+0.5rem)] w-44 bg-white border border-gray-200 rounded-xl shadow-xl shadow-black/10 p-1.5 z-50">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setUserMenuOpen(false);
                                            navigate('/perfil');
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold text-gray-700 hover:bg-institutional-green/10 hover:text-institutional-green transition-colors"
                                    >
                                        <User size={14} />
                                        <span>Perfil</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setUserMenuOpen(false);
                                            logout();
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        <LogOut size={14} />
                                        <span>Cerrar sesión</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* ── Contenido de la página ── */}
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
