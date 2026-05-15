import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para incluir el token JWT en las peticiones
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token_sigedin');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;

        if (status === 401) {
            localStorage.removeItem('token_sigedin');
            localStorage.removeItem('usuario_sigedin');
            localStorage.removeItem('periodo_sigedin');

            if (window.location.pathname !== '/login') {
                window.location.replace('/login');
            }
        }

        return Promise.reject(error);
    }
);

export default api;
