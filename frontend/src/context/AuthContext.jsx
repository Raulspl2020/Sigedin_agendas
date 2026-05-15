import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext({});
const STORAGE_KEYS = {
    token: 'token_sigedin',
    usuario: 'usuario_sigedin',
    periodo: 'periodo_sigedin',
};

const limpiarSesionPersistida = () => {
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.usuario);
    localStorage.removeItem(STORAGE_KEYS.periodo);
};

const parseJsonSeguro = (value) => {
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
};

const decodificarPayloadJwt = (token) => {
    try {
        const partes = String(token || '').split('.');
        if (partes.length !== 3) return null;

        const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
        const padding = '='.repeat((4 - (base64.length % 4)) % 4);
        const json = atob(base64 + padding);
        return JSON.parse(json);
    } catch {
        return null;
    }
};

const tokenEsValido = (token) => {
    const payload = decodificarPayloadJwt(token);
    if (!payload || typeof payload.exp !== 'number') return false;

    const ahoraEnSegundos = Math.floor(Date.now() / 1000);
    return payload.exp > ahoraEnSegundos;
};

export const AuthProvider = ({ children }) => {
    const [usuario, setUsuario] = useState(null);
    const [periodoSeleccionado, setPeriodoSeleccionado] = useState(null);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const inicializarAuth = () => {
            const storedUser = localStorage.getItem(STORAGE_KEYS.usuario);
            const storedToken = localStorage.getItem(STORAGE_KEYS.token);
            const storedPeriod = localStorage.getItem(STORAGE_KEYS.periodo);

            if (!storedUser || !storedToken || !tokenEsValido(storedToken)) {
                limpiarSesionPersistida();
                setUsuario(null);
                setPeriodoSeleccionado(null);
                setCargando(false);
                return;
            }

            const usuarioParseado = parseJsonSeguro(storedUser);
            if (!usuarioParseado) {
                limpiarSesionPersistida();
                setUsuario(null);
                setPeriodoSeleccionado(null);
                setCargando(false);
                return;
            }

            setUsuario(usuarioParseado);

            if (storedPeriod) {
                const periodoParseado = parseJsonSeguro(storedPeriod);
                setPeriodoSeleccionado(periodoParseado);
            }

            setCargando(false);
        };

        inicializarAuth();
    }, []);

    const login = async (username, password, periodo) => {
        try {
            const { data } = await api.post('/auth/login', { usuario: username, clave: password });

            localStorage.setItem(STORAGE_KEYS.token, data.token_acceso);
            localStorage.setItem(STORAGE_KEYS.usuario, JSON.stringify(data.usuario));

            if (periodo) {
                localStorage.setItem(STORAGE_KEYS.periodo, JSON.stringify(periodo));
                setPeriodoSeleccionado(periodo);
            }

            setUsuario(data.usuario);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Error al iniciar sesión'
            };
        }
    };

    const logout = () => {
        limpiarSesionPersistida();
        setUsuario(null);
        setPeriodoSeleccionado(null);
    };

    const actualizarUsuario = useCallback((updater) => {
        setUsuario((prev) => {
            if (!prev) return prev;

            const siguiente = typeof updater === 'function'
                ? updater(prev)
                : { ...prev, ...updater };

            localStorage.setItem(STORAGE_KEYS.usuario, JSON.stringify(siguiente));
            return siguiente;
        });
    }, []);

    const seleccionarPeriodo = (periodo) => {
        localStorage.setItem(STORAGE_KEYS.periodo, JSON.stringify(periodo));
        setPeriodoSeleccionado(periodo);
    };

    const autenticado = Boolean(usuario);

    return (
        <AuthContext.Provider value={{
            usuario,
            autenticado,
            login,
            logout,
            actualizarUsuario,
            periodoSeleccionado,
            seleccionarPeriodo,
            cargando
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
