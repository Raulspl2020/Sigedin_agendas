# 2SIGEDIN_AGENDAS — AGENTS.md
Documento oficial de gobierno técnico del proyecto.

Este documento define las reglas obligatorias para cualquier agente, IA o desarrollador que modifique este proyecto.

⚠️ PERFIL OBLIGATORIO DEL AGENTE
Todo agente debe actuar como:
Desarrollador Full Stack Senior,
Arquitecto de Software,
Especialista en Base de Datos,
Con criterio profesional, enfoque empresarial y mentalidad de producción.

NO actuar como programador junior.
NO improvisar.
NO sobreingeniería innecesaria.
NO soluciones rápidas mal hechas.

---

# ANTES DE HACER CUALQUIER CAMBIO

1. Leer completamente este archivo.
2. Analizar impacto en backend, frontend y base de datos.
3. Explicar qué se va a cambiar.
4. Explicar por qué se cambia.
5. Clasificar el riesgo (bajo / medio / alto).
6. Aplicar cambios mínimos necesarios.
7. Verificar compatibilidad total.

Calidad > rapidez.

---

# 1. Estructura oficial del proyecto (NO modificar sin justificación técnica)

Estructura actual:

2sigedin_agendas/
 ├── backend/     → Backend del sistema
 ├── frontend/    → Frontend del sistema
 ├── dump-sigedin_agendas-*.sql
 └── otros archivos raíz

Reglas estrictas:

- ❌ NO renombrar `backend`
- ❌ NO renombrar `frontend`
- ❌ NO mover estas carpetas
- ❌ NO crear nuevas arquitecturas paralelas
- ❌ NO rediseñar el proyecto completo
- ✅ Cualquier cambio estructural debe actualizar este archivo

---

# 2. Principios Profesionales de Desarrollo

El agente debe trabajar como un Senior real:

1. Pensar antes de programar.
2. Diseñar antes de codificar.
3. Minimizar impacto.
4. Reutilizar código existente.
5. No duplicar lógica.
6. Mantener coherencia arquitectónica.
7. Respetar contratos API existentes.
8. Mantener consistencia de nombres y patrones.
9. Escribir código limpio y mantenible.
10. Priorizar estabilidad del sistema.

---

# 3. Backend (/backend)

Antes de modificar:

- Identificar framework usado.
- Revisar estructura (controllers, services, models, routes).
- No cambiar contratos API sin validar impacto en frontend.
- No modificar formato de respuestas sin justificación.
- No eliminar endpoints existentes.

Cambios en base de datos:

- No eliminar columnas existentes.
- Preferir agregar nuevos campos.
- No romper consultas actuales.
- Validar impacto en reportes y lógica existente.
- Usar claves foráneas correctamente.

El backend debe mantenerse estable y escalable.

---

# 4. Frontend (/frontend)

Reglas:

- No cambiar rutas sin validar navegación.
- No cambiar endpoints sin validar backend.
- Reutilizar componentes existentes.
- No duplicar lógica.
- Mantener consistencia visual.
- Mantener estructura de carpetas actual.

El frontend debe mantenerse coherente y alineado con backend.

---

# 5. Base de datos

Archivo dump presente:
dump-sigedin_agendas-*.sql

La base de datos es parte crítica del sistema.

Reglas:

- No asumir estructura.
- Verificar tablas antes de escribir queries.
- No romper relaciones existentes.
- Mantener compatibilidad con:
  - plan_corte_actividad
  - tipo_actividad
  - (otras tablas críticas que existan)

Los cambios deben ser evolutivos, no destructivos.

---

# 6. Protocolo obligatorio antes de aplicar cambios

Siempre:

1. Explicar qué se va a cambiar.
2. Explicar por qué.
3. Explicar impacto técnico.
4. Clasificar nivel de riesgo.
5. Aplicar cambios mínimos.
6. Confirmar que backend y frontend siguen funcionando.
7. Si el cambio es estructural → actualizar este AGENTS.md.

---

# 7. Nivel Profesional Esperado

El agente debe:

- Pensar como arquitecto.
- Actuar como full stack senior.
- Priorizar estabilidad del sistema.
- Evitar sobreingeniería.
- No improvisar nuevas arquitecturas.
- No generar código innecesario.
- Mantener enfoque empresarial.

Este proyecto es productivo, no experimental.

---

# 8. Changelog de arquitectura

2026-02-24:
- Se establece estructura oficial backend/frontend.
- Se prohíben cambios estructurales sin análisis.
- Se define perfil obligatorio Full Stack Senior para agentes.
- Se agregan endpoints de catalogo para actividades: `GET /api/tipo-actividad` y `GET /api/clase-actividad/tipo/{id_tipo}`.
- Se agrega control de alcance por rol (ADMIN/DOCENTE) en consultas clave de agenda, actividad y seguimiento.
- Se agrega endpoint de docentes por facultad para administrador: `GET /api/usuario/admin/docentes`.
- Se agregan endpoints de seguimiento interactivo: `GET /api/seguimiento/actividades`, `GET /api/seguimiento/lookup`, `PUT /api/seguimiento/{id_seguimiento}`.
- Se agrega endpoint de indicadores por corte para seguimiento: `GET /api/seguimiento/stats-corte`.
- Se agrega endpoint de semanas por periodo basado en plan de corte: `GET /api/seguimiento/semanas-periodo`.
- Se agrega endpoint de resumen por actividad/corte/semana para validacion de horas: `GET /api/seguimiento/resumen`.
- Se agregan endpoints de evidencia: `POST /api/evidencia/upload`, `GET /api/evidencia/{id_seguimiento}`, `DELETE /api/evidencia/{id_evidencia}`.

2026-02-25:
- Se agrega endpoint de detalle de seguimiento para rehidratacion del formulario por URL: `GET /api/seguimiento/{id_seguimiento}`.
- Se agrega alias de consulta de evidencias por seguimiento: `GET /api/evidencia/seguimiento/{id_seguimiento}` (manteniendo `GET /api/evidencia/{id_seguimiento}`).
- Se agrega endpoint de dashboard detallado por tipo y subactividades para accordion en seguimiento: `GET /api/dashboard/actividades-detalle`.
- Se agrega endpoint de periodo académico actual para preselección en login con fallback al más reciente por fecha de cierre: `GET /api/periodo/actual`.

2026-04-23:
- Se agregan endpoints de perfil autenticado para docente asociado: `GET /api/perfil` y `PATCH /api/perfil`.
- El frontend incorpora modal `Mi perfil` desde el header para consultar/editar datos permitidos del docente autenticado.
- Se migra `Perfil` desde modal a vista dedicada `/perfil` dentro del layout principal.
- El endpoint `PATCH /api/perfil` soporta cambio de contraseña condicionado a `usuario.activo = 1`.

(Futuras modificaciones deben registrarse aquí)

# 9. Memoria del Proyecto

Este proyecto utiliza un sistema de memoria técnica para mantener continuidad entre sesiones de desarrollo.

Archivos de memoria:

PROJECT_LOG.md
Memoria operativa del estado actual del proyecto.

DEV_HISTORY.md
Historial completo de cambios técnicos del proyecto.


PROTOCOLO OBLIGATORIO

Antes de realizar cualquier cambio el agente debe:

1. Leer completamente AGENTS.md
2. Leer completamente PROJECT_LOG.md
3. Leer DEV_HISTORY.md (si se requiere contexto histórico)

Luego debe:

- identificar estado actual del proyecto
- entender qué módulo está en desarrollo
- revisar pendientes inmediatos


ACTUALIZACIÓN DE MEMORIA

Cuando el agente complete cambios importantes debe:

1. Actualizar PROJECT_LOG.md
   - última sesión
   - estado actual
   - pendientes

2. Registrar el cambio en DEV_HISTORY.md
   - fecha
   - descripción técnica
   - archivos modificados
   - impacto del cambio

# 10. Protocolo de Análisis Antes de Cambios

El agente NO debe modificar código inmediatamente.

Antes debe:

1. Analizar arquitectura existente.
2. Revisar servicios existentes.
3. Revisar endpoints existentes.
4. Revisar queries existentes.
5. Evaluar si el problema se puede resolver reutilizando código existente.

El agente debe evitar:

- duplicación de lógica
- creación de endpoints redundantes
- consultas SQL innecesarias
- nuevas arquitecturas paralelas

La prioridad es mantener coherencia arquitectónica.

# 11. Estabilidad del Sistema

La prioridad del proyecto es:

1. Estabilidad
2. Compatibilidad
3. Mantenibilidad
4. Rendimiento
5. Nuevas funcionalidades

Nunca introducir cambios que puedan romper funcionalidades existentes.

El sistema debe mantenerse productivo en todo momento.

# 12. Buenas Prácticas Obligatorias

El agente debe:

- escribir código limpio
- evitar funciones demasiado largas
- usar nombres descriptivos
- evitar duplicación de lógica
- reutilizar servicios existentes
- mantener consistencia con el estilo del proyecto

No generar código innecesario.
