export const ROLES = {
    ADMIN: 'ADMIN',
    DECANO: 'DECANO',
    DOCENTE: 'DOCENTE',
};

const MENU_ACCESS = {
    administracion: [ROLES.ADMIN],
    supervision: [ROLES.ADMIN, ROLES.DECANO],
    actividades: [ROLES.ADMIN, ROLES.DECANO, ROLES.DOCENTE],
    seguimiento: [ROLES.ADMIN, ROLES.DECANO, ROLES.DOCENTE],
    informes: [ROLES.ADMIN, ROLES.DECANO, ROLES.DOCENTE],
};

const ROUTE_ACCESS = {
    admin: [ROLES.ADMIN],
    supervision: [ROLES.ADMIN, ROLES.DECANO],
    actividades: [ROLES.ADMIN, ROLES.DECANO, ROLES.DOCENTE],
    seguimiento: [ROLES.ADMIN, ROLES.DECANO, ROLES.DOCENTE],
    informes: [ROLES.ADMIN, ROLES.DECANO, ROLES.DOCENTE],
};

export const normalizarRol = (rol) => String(rol || '').trim().toUpperCase();

export const tieneAccesoMenu = (rol, menuKey) => {
    const rolNormalizado = normalizarRol(rol);
    const allowedRoles = MENU_ACCESS[menuKey] || [];
    return allowedRoles.includes(rolNormalizado);
};

export const tieneAccesoRuta = (rol, routeKey) => {
    const rolNormalizado = normalizarRol(rol);
    const allowedRoles = ROUTE_ACCESS[routeKey] || [];
    return allowedRoles.includes(rolNormalizado);
};
