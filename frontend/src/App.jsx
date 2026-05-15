import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './Pages/Login';
import MiAgenda from './Pages/MiAgenda';
import Actividades from './Pages/Actividades';
import Seguimiento from './Pages/Seguimiento';
import './index.css';

import Periodos from './Pages/Periodos';
import TiposActividad from './Pages/TiposActividad';
import Facultades from './Pages/Facultades';
import FacultadProgramasPage from './Pages/FacultadProgramasPage';
import Programas from './Pages/Programas';
import Docentes from './Pages/Docentes';
import DocenteFormPage from './Pages/DocenteFormPage';
import Usuarios from './Pages/Usuarios';
import UsuarioFormPage from './Pages/UsuarioFormPage';
import Agendas from './Pages/Agendas';
import AgendaFormPage from './Pages/AgendaFormPage';
import ActividadFormPage from './Pages/ActividadFormPage';
import SeguimientoNuevo from './Pages/SeguimientoNuevo';
import PeriodoFormPage from './Pages/PeriodoFormPage';
import CorteAcademicoFormPage from './Pages/CorteAcademicoFormPage';
import Informes from './Pages/Informes';
import InformeEjecutivo from './Pages/InformeEjecutivo';
import Supervision from './Pages/Supervision';
import PerfilPage from './Pages/PerfilPage';
import { normalizarRol, tieneAccesoRuta } from './config/roleAccess';

const obtenerRutaInicialPorRol = (rol) => {
  const rolNormalizado = normalizarRol(rol);

  if (rolNormalizado === 'DECANO') return '/supervision';
  if (rolNormalizado === 'DOCENTE') return '/seguimiento';
  if (rolNormalizado === 'ADMIN' || rolNormalizado === 'ADMINISTRADOR') return '/admin/agendas';

  return '/seguimiento';
};

const PrivateRoute = ({ children }) => {
  const { autenticado, cargando } = useAuth();

  if (cargando) return <div className="flex items-center justify-center h-screen">Cargando...</div>;

  return autenticado ? children : <Navigate to="/login" replace />;
};

const PublicOnlyRoute = ({ children }) => {
  const { autenticado, cargando } = useAuth();

  if (cargando) return <div className="flex items-center justify-center h-screen">Cargando...</div>;

  return autenticado ? <Navigate to="/" replace /> : children;
};

const RoleRoute = ({ routeKey, children }) => {
  const { usuario, cargando } = useAuth();
  const location = useLocation();

  if (cargando) return <div className="flex items-center justify-center h-screen">Cargando...</div>;

  const autorizado = tieneAccesoRuta(usuario?.rol, routeKey);
  if (!autorizado) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return children;
};

const HomeByRoleRoute = () => {
  const { usuario, cargando } = useAuth();

  if (cargando) return <div className="flex items-center justify-center h-screen">Cargando...</div>;

  return <Navigate to={obtenerRutaInicialPorRol(usuario?.rol)} replace />;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <Routes>
              <Route path="/" element={<HomeByRoleRoute />} />
              <Route path="/agenda" element={<MiAgenda />} />
              <Route path="/actividades" element={<RoleRoute routeKey="actividades"><Actividades /></RoleRoute>} />
              <Route path="/supervision" element={<RoleRoute routeKey="supervision"><Supervision /></RoleRoute>} />
              <Route path="/actividades/nueva" element={<RoleRoute routeKey="actividades"><ActividadFormPage /></RoleRoute>} />
              <Route path="/actividades/editar/:id" element={<RoleRoute routeKey="actividades"><ActividadFormPage /></RoleRoute>} />
              <Route path="/seguimiento" element={<RoleRoute routeKey="seguimiento"><Seguimiento /></RoleRoute>} />
              <Route path="/seguimiento/nuevo" element={<RoleRoute routeKey="seguimiento"><SeguimientoNuevo /></RoleRoute>} />
              <Route path="/informes" element={<RoleRoute routeKey="informes"><Navigate to="/informes/consolidado" replace /></RoleRoute>} />
              <Route path="/informes/consolidado" element={<RoleRoute routeKey="informes"><Informes /></RoleRoute>} />
              <Route path="/informes/ejecutivo" element={<RoleRoute routeKey="informes"><InformeEjecutivo /></RoleRoute>} />
              <Route path="/perfil" element={<PerfilPage />} />

              {/* Rutas Administrativas */}
              <Route path="/admin/periodos" element={<RoleRoute routeKey="admin"><Periodos /></RoleRoute>} />
              <Route path="/admin/periodos/nuevo" element={<RoleRoute routeKey="admin"><PeriodoFormPage /></RoleRoute>} />
              <Route path="/admin/periodos/editar/:id" element={<RoleRoute routeKey="admin"><PeriodoFormPage /></RoleRoute>} />
              <Route path="/admin/periodos/cortes/nuevo" element={<RoleRoute routeKey="admin"><CorteAcademicoFormPage /></RoleRoute>} />
              <Route path="/admin/periodos/cortes/editar/:id" element={<RoleRoute routeKey="admin"><CorteAcademicoFormPage /></RoleRoute>} />
              <Route path="/admin/actividades" element={<RoleRoute routeKey="admin"><TiposActividad /></RoleRoute>} />
              <Route path="/admin/facultades" element={<RoleRoute routeKey="admin"><Facultades /></RoleRoute>} />
              <Route path="/admin/facultades/:id/programas" element={<RoleRoute routeKey="admin"><FacultadProgramasPage /></RoleRoute>} />
              <Route path="/admin/programas" element={<RoleRoute routeKey="admin"><Programas /></RoleRoute>} />
              <Route path="/admin/docentes" element={<RoleRoute routeKey="admin"><Docentes /></RoleRoute>} />
              <Route path="/admin/docentes/nuevo" element={<RoleRoute routeKey="admin"><DocenteFormPage /></RoleRoute>} />
              <Route path="/admin/docentes/editar/:id" element={<RoleRoute routeKey="admin"><DocenteFormPage /></RoleRoute>} />
              <Route path="/admin/usuarios" element={<RoleRoute routeKey="admin"><Usuarios /></RoleRoute>} />
              <Route path="/admin/usuarios/nuevo" element={<RoleRoute routeKey="admin"><UsuarioFormPage /></RoleRoute>} />
              <Route path="/admin/usuarios/editar/:id" element={<RoleRoute routeKey="admin"><UsuarioFormPage /></RoleRoute>} />
              <Route path="/admin/agendas" element={<RoleRoute routeKey="admin"><Agendas /></RoleRoute>} />
              <Route path="/admin/agendas/nueva" element={<RoleRoute routeKey="admin"><AgendaFormPage /></RoleRoute>} />
              <Route path="/admin/agendas/editar/:id" element={<RoleRoute routeKey="admin"><AgendaFormPage /></RoleRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </PrivateRoute>
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
