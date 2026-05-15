--------------------------------
GESTIÓN DEL HISTORIAL DEL PROYECTO
--------------------------------

El proyecto utiliza dos niveles de memoria:

1) Memoria operativa corta
Archivo:
PROJECT_LOG.md

Contiene:
- estado actual del proyecto
- última sesión de trabajo
- trabajo en curso
- pendientes inmediatos
- decisiones técnicas recientes


2) Historial completo de desarrollo
Archivo:
DEV_HISTORY.md

Este archivo registra el historial técnico del proyecto a largo plazo.

Cada vez que OpenCode complete una tarea importante debe:

1) Actualizar PROJECT_LOG.md con el estado actual del proyecto.

2) Registrar una nueva entrada en DEV_HISTORY.md con:

- fecha
- descripción del cambio
- módulos afectados
- archivos modificados
- endpoints o lógica impactada
- resultado del cambio


--------------------------------
FORMATO PARA DEV_HISTORY.md
--------------------------------

OpenCode debe registrar las entradas usando este formato:

FECHA
YYYY-MM-DD

DESCRIPCIÓN
Breve explicación del cambio realizado.

MÓDULOS AFECTADOS
backend / frontend / ambos

ARCHIVOS MODIFICADOS
ruta de archivos modificados

DETALLES TÉCNICOS
explicación técnica del cambio

RESULTADO
qué se logró con el cambio

------------------------------------------------
IMPORTANTE
------------------------------------------------

OpenCode NO debe sobrescribir DEV_HISTORY.md.

Debe:

- agregar nuevas entradas al final del archivo
- mantener el historial completo
- no borrar registros anteriores

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-03-13

Modulo trabajado:
Formulario Unico de Seguimiento - pestana Evidencias (frontend + backend evidencia).

Estado actual:
- Se completo la integracion de carga de evidencias PDF hacia Google Drive institucional desde `POST /api/evidencia/upload`.
- El backend ahora crea automaticamente la estructura:
  `SIGEDIN_EVIDENCIAS/{periodo}/docente_{id_docente}/seguimiento_{id_seguimiento}`.
- La tabla `evidencia` se mantiene compatible y guarda metadata con `ruta_archivo` apuntando a URL de Drive.
- Se agrego rollback: si falla el guardado en BD despues de subir a Drive, se elimina el archivo en Drive para evitar huerfanos.
- En frontend (pestana Evidencias) se reforzo la cola de archivos con estado por archivo, progreso por archivo, descripcion editable y mensajes claros.

Decisiones tecnicas recientes:
- Se reutilizo el endpoint existente `/api/evidencia/upload` para evitar romper contratos API.
- Se encapsulo la logica de Google Drive en un servicio dedicado (`GoogleDriveService`) dentro del modulo evidencia.
- Se mantuvo validacion PDF en frontend y backend, con limite de tamano configurable por `EVIDENCIA_MAX_FILE_SIZE_MB` (default 20 MB).

Pendientes inmediatos:
- Configurar variables de entorno de Google Drive en backend:
  - `GOOGLE_DRIVE_CLIENT_EMAIL`
  - `GOOGLE_DRIVE_PRIVATE_KEY`
  - `GOOGLE_DRIVE_PARENT_FOLDER_ID` (opcional, default `root`)
  - `EVIDENCIA_MAX_FILE_SIZE_MB` (opcional)
- Ejecutar prueba funcional con credenciales reales para validar subida efectiva a Drive y persistencia en BD en ambiente integrado.
- Verificar permisos de la cuenta de servicio sobre la carpeta raiz institucional definida.

Actualizacion aplicada en esta misma sesion:
- Se agrego `backend/.env.example` con variables requeridas para levantar backend y para carga de evidencias en Drive.
- Se actualizaron variables nuevas en `backend/.env` para facilitar configuracion local.
- Se documento la configuracion de Google Drive en `backend/README.md`.

Validacion tecnica reciente:
- Se implemento normalizacion robusta de `GOOGLE_DRIVE_PRIVATE_KEY` en runtime (comillas, `\\n`, `\\r`, saltos de linea).
- Se ejecuto prueba E2E backend (servicio evidencia -> Drive -> BD) con seguimiento real `id_seguimiento=27` y usuario `id_usuario=1`.
- Resultado: fallo en autenticacion/decodificacion de clave privada (error PEM), por lo que no se completo subida a Drive ni insercion en BD.
- Por seguridad se limpio `GOOGLE_DRIVE_PRIVATE_KEY` del `.env` y queda pendiente cargar una clave nueva rotada.

Actualizacion adicional de validacion:
- Con clave corregida, la autenticacion a Google Drive quedo operativa.
- Se detecto incompatibilidad entre entidad y esquema real de tabla `evidencia` (columnas `tipo_documento` y `tamano_kb` no existen en BD) y se ajusto el backend para mantener compatibilidad.
- Se valido creacion/aseguramiento de estructura de carpetas en Drive para `2026-A/docente_14/seguimiento_28`.
- La subida de archivo sigue fallando por limite de cuota de Service Account en `root` (Drive responde 403 "Service Accounts do not have storage quota").
- El endpoint ahora responde mensaje claro para frontend indicando configurar `GOOGLE_DRIVE_PARENT_FOLDER_ID` hacia carpeta de Shared Drive institucional.

Validacion con carpeta enviada por usuario:
- Se actualizo `GOOGLE_DRIVE_PARENT_FOLDER_ID` con la carpeta `1aj7DZ0jVzDQOmuS8loG030g1vw88ZXUM`.
- La cuenta de servicio tiene acceso a la carpeta y puede crear subcarpetas.
- El upload PDF continua fallando con 403 de cuota porque la carpeta pertenece a My Drive (`owners: sigedin@itp.edu.co`) y no a Shared Drive (`driveId` ausente).
- Conclusion operativa: para subir archivos con Service Account se requiere carpeta dentro de Shared Drive o delegacion OAuth de dominio.

Cierre de sesion:
- Se cierra la sesion con backend y frontend compilando correctamente.
- El modulo de evidencias queda estable y con mensajes claros en UI/API.
- Pendiente bloqueante para cierre funcional E2E exitoso: definir `GOOGLE_DRIVE_PARENT_FOLDER_ID` de una carpeta en Shared Drive institucional.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-03-13

Modulo trabajado:
Validacion final E2E del modulo Evidencias (backend evidencia + integracion Google Drive + verificacion BD/API).

Cambios realizados:
- No se realizaron cambios de codigo funcional en backend ni frontend.
- Se ejecuto validacion E2E operativa con `GOOGLE_DRIVE_PARENT_FOLDER_ID=1VwrsMs4otVR4r_OrUA40Zo2vmWFrJEWU` (carpeta compartida por usuario).
- Se probo upload real via `POST /api/evidencia/upload` con PDF de prueba y token ADMIN.
- Se verifico respuesta del endpoint, estado de BD (`evidencia`) y metadata de carpeta en Drive.

Estado actual del proyecto:
- El flujo de evidencias sigue estable a nivel de codigo (validaciones, mensajes claros, manejo de errores y rollback).
- La autenticacion de Service Account en Drive funciona.
- El upload real continua bloqueado por cuota de Service Account (Drive 403), con traduccion a 503 controlado en API.
- No se inserta registro en tabla `evidencia` mientras falle la subida a Drive.

Trabajo en curso:
- Diagnostico operativo de carpeta destino en Drive para confirmar pertenencia efectiva a Shared Drive (no solo compartida en My Drive).
- Validacion de `driveId` y contexto de almacenamiento compatible con Service Account para habilitar carga real.

Pendientes inmediatos:
- Confirmar un `GOOGLE_DRIVE_PARENT_FOLDER_ID` que pertenezca realmente a Shared Drive institucional (debe exponer `driveId`).
- Repetir validacion E2E completa: upload exitoso -> insercion en `evidencia` -> generacion de `ruta_archivo` -> confirmacion de lista en frontend.
- Cerrar sesion solo con evidencia de exito funcional end-to-end sin errores.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-14

Modulo trabajado:
Dashboard de seguimiento de agendas docentes (backend + frontend + consultas SQL de soporte).

Cambios realizados:
- Se implemento nuevo endpoint jerarquico `GET /api/dashboard/seguimiento` en backend, con respuesta estructurada por semestre, corte actual, semana actual y detalle por tipo.
- Se rediseño `frontend/src/Pages/Seguimiento.jsx` para lectura vertical por bloques: Semestre -> Corte actual -> Semana actual -> Detalle por tipo.
- Se agrego archivo `dashboard_seguimiento_queries.sql` con consultas completas y agregaciones seguras (sin duplicacion por joins entre planeacion y seguimiento).

Estado actual del proyecto:
- El dashboard de seguimiento ya no depende de `SUM(horas_semanales)` para calcular semestre; ahora usa planeacion real de `plan_corte_actividad`.
- El corte actual se detecta dinamicamente con `CURDATE() BETWEEN fecha_inicio AND fecha_fin`.
- La semana actual se calcula desde `agenda_docente.inicio_semestre` con la formula `FLOOR(DATEDIFF(CURDATE(), inicio_semestre)/7) + 1`.
- El detalle por tipo prioriza la semana actual y mantiene contexto porcentual de corte y semestre.

Trabajo en curso:
- Validacion funcional integrada con datos reales del ambiente (docente y periodo activos) para confirmar cifras y experiencia visual final.

Pendientes inmediatos:
- Verificar endpoint nuevo con usuarios ADMIN y DOCENTE en escenarios con y sin agenda creada.
- Ejecutar build de frontend/backend en ambiente de despliegue y ajustar detalles menores de UI si aplica.
- Si se decide retiro progresivo de endpoints antiguos de dashboard, planificar deprecacion sin romper compatibilidad.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-14

Modulo trabajado:
Cierre de implementacion del dashboard jerarquico de seguimiento (memoria tecnica y estado operativo).

Cambios realizados:
- Se cerro la implementacion funcional del dashboard jerarquico en backend y frontend.
- Se verifico compilacion exitosa de backend y frontend para confirmar estabilidad tecnica.
- Se consolidaron y documentaron las consultas SQL de soporte en archivo dedicado.
- Se actualizo la memoria del proyecto con estado, trabajo en curso y pendientes inmediatos.

Estado actual del proyecto:
- Disponible endpoint `GET /api/dashboard/seguimiento` con metricas por semestre, corte actual, semana actual y detalle por tipo.
- Interfaz de `Seguimiento.jsx` reorganizada por jerarquia temporal: Semestre -> Corte actual -> Semana actual -> Tipos.
- Persisten endpoints previos para compatibilidad, sin cambios destructivos.
- Build de backend y frontend en estado OK.

Trabajo en curso:
- Validacion funcional con datos reales por perfiles DOCENTE y ADMIN para confirmar consistencia de metricas en todos los escenarios operativos.

Pendientes inmediatos:
- Ejecutar pruebas funcionales de dashboard con distintos periodos (con y sin corte vigente).
- Validar casos sin agenda activa para garantizar UX clara y sin errores.
- Definir plan de migracion gradual del consumo frontend para retirar dependencias de endpoints legacy cuando se apruebe.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-14

Modulo trabajado:
Evidencias - integracion Google Drive (validacion de carpeta destino y errores operativos de Service Account).

Cambios realizados:
- Se reforzo `GoogleDriveService` para exigir `GOOGLE_DRIVE_PARENT_FOLDER_ID` y evitar fallback a `root`.
- Se agrego validacion de carpeta destino en Drive: existencia, tipo carpeta, no papelera y pertenencia a Shared Drive (`driveId`).
- Se mejoro traduccion de errores de Google Drive (permisos, not found, quota) con mensajes funcionales para frontend.
- Se mantuvo `supportsAllDrives: true` en operaciones de listar/crear/subir/eliminar.
- Se actualizo documentacion de entorno (`backend/.env.example`, `backend/README.md`) para declarar `GOOGLE_DRIVE_PARENT_FOLDER_ID` como obligatorio.

Estado actual del proyecto:
- El flujo de seguimiento -> evidencias permanece estable en backend/frontend.
- La subida a Drive ahora falla de forma explicita si la carpeta configurada no es valida para Shared Drive o no tiene permisos.
- Se evita error silencioso por configuracion implícita en `root`.

Trabajo en curso:
- Configuracion operativa de una carpeta real en Shared Drive institucional y validacion E2E de upload exitoso.

Pendientes inmediatos:
- Definir `GOOGLE_DRIVE_PARENT_FOLDER_ID` con carpeta valida en Shared Drive.
- Compartir carpeta/Shared Drive con el correo de la cuenta de servicio con rol Editor o Content manager.
- Ejecutar prueba completa: guardar seguimiento -> subir PDF -> verificar insercion en tabla `evidencia` -> visualizar en frontend.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-14

Modulo trabajado:
Seguimiento semanal y evidencias (fortalecimiento de validaciones y cierre operativo de errores de guardado/subida).

Cambios realizados:
- Se reforzo el guardado de seguimiento con mensajes de error mas claros para conflictos y validaciones.
- Se agrego manejo explicito de errores SQL en backend para `seguimiento_semanal` (duplicados, FK, check de semana).
- Se agrego validacion adicional de consistencia semana-corte para evitar registros en corte incorrecto.
- Se mejoro el frontend de `SeguimientoNuevo.jsx` para mostrar mensaje funcional real al fallar guardado.
- En evidencias, se reforzo validacion de carpeta destino Drive y mensajes operativos accionables para Shared Drive/permisos.

Estado actual del proyecto:
- El formulario de seguimiento ya reporta causas concretas de fallo en lugar de mensaje generico.
- El flujo de evidencias mantiene rollback y ahora exige configuracion valida de carpeta en Shared Drive.
- El sistema compila correctamente en backend y frontend luego de los ajustes.

Trabajo en curso:
- Validacion funcional E2E con datos reales para confirmar cierre completo de los flujos:
  - guardar seguimiento (con deteccion de duplicados/consistencia)
  - subir PDF a Drive institucional
  - persistir evidencia y visualizarla en frontend

Pendientes inmediatos:
- Configurar carpeta real de Shared Drive en `GOOGLE_DRIVE_PARENT_FOLDER_ID` y permisos para Service Account.
- Ejecutar prueba de conflicto controlado (misma actividad/corte/semana) y confirmar mensaje funcional esperado.
- Ejecutar prueba completa de evidencias con insercion en BD y visualizacion en pestana de evidencias.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-14

Modulo trabajado:
Seguimiento semanal (dashboard + formulario nuevo) con enfoque de alta de registros, pendientes semanales por actividad y limpieza UX del formulario.

Cambios realizados:
- Se ajusto `REPORTAR SEMANA` en dashboard para abrir `/seguimiento/nuevo` en modo crear, sin `id_seguimiento` ni estado de edicion.
- Se mantuvo la accion `ACTUALIZAR` por fila con contexto (`id_tipo`, `semana`, `id_corte`, `horas`) para flujo asistido de una actividad.
- En formulario (`SeguimientoNuevo.jsx`) se agrego distincion explicita entre modo creacion y modo edicion, con limpieza de query/state para evitar rehibridacion de un seguimiento previo.
- Se elimino UI no alineada al enfoque semanal (tarjeta de horas faltantes y bloque "Detalles de la agenda").
- Se ordeno dropdown de actividades por `id_tipo ASC` y `nombre ASC`, con formato `tipo - actividad`.
- Se implemento calculo de pendientes semanales por actividad y render en dropdown: `|| X hora(s) pendiente(s) para esta semana` / `Semana completada`.
- Se agregaron marcas visuales de estado `[PENDIENTE]`, `[OK]`, `[ALERTA]` con iconografia y leyenda.
- En backend (`/seguimiento/actividades`) se agregaron parametros `semana` y `corte` para devolver:
  - `horas_programadas_semana`
  - `horas_reportadas_semana_actual`
  - `horas_pendientes_semana_actual`
  - `inconsistencia_semana_actual`
- Se reforzo validacion backend para no exceder horas pendientes por semana (crear/actualizar) y mensajes funcionales de rechazo.

Estado actual del proyecto:
- Flujo de dashboard -> formulario quedo segmentado por intencion:
  - `REPORTAR SEMANA`: alta nueva (INSERT).
  - `ACTUALIZAR`: entrada contextual para completar/continuar una actividad.
- El formulario de seguimiento esta enfocado en reporte semanal y ahora muestra pendientes por actividad en tiempo real para semana/corte seleccionados.
- Validaciones frontend/backend alineadas para impedir sobrerregistro de horas semanales pendientes.
- Backend y frontend compilan correctamente despues de los cambios.

Trabajo en curso:
- Validacion funcional integrada con usuarios reales (DOCENTE/ADMIN) para confirmar UX final en escenarios:
  - actividad con pendientes
  - semana completada
  - inconsistencia historica de carga semanal

Pendientes inmediatos:
- Ejecutar pruebas E2E de seguimiento semanal en ambiente integrado para confirmar persistencia y transicion a evidencias.
- Validar mensajes finales de negocio con usuarios (copy final de `Semana completada` / `pendientes`).
- Mantener pendiente operativo de evidencias Drive: definir carpeta valida en Shared Drive y completar prueba E2E de upload.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-15

Modulo trabajado:
Seguimiento semanal (separacion estricta de modo crear vs modo editar y endurecimiento de validaciones de horas).

Cambios realizados:
- Se separo explicitamente el estado del formulario en `modoFormulario` con dos rutas operativas: `crear` y `editar`.
- Se ajusto navegacion desde dashboard para forzar contexto:
  - `REPORTAR SEMANA` -> `modo: crear`
  - `Actualizar` por fila -> `modo: editar`.
- En `SeguimientoNuevo.jsx` se evito que el flujo en modo crear reutilice `id_seguimiento` detectado por lookup; ahora no hereda contexto de edicion.
- Se reforzo guardado para que en modo crear use `POST /seguimiento` (INSERT) y en modo editar use `PUT /seguimiento/{id}` (UPDATE), con bloqueo si falta `id_seguimiento` en edicion.
- Se endurecio validacion de horas ejecutadas en frontend y backend (`> 0`) y mensaje funcional para exceso semanal sobre horas programadas.

Estado actual del proyecto:
- El boton superior `REPORTAR SEMANA` queda aislado para alta nueva y ya no debe terminar actualizando un registro existente.
- Los flujos de edicion quedan asociados al contexto `modo: editar` y conservan actualizacion sobre `id_seguimiento` existente.
- La validacion de horas semanales mantiene regla de no sobrepasar horas programadas y excluye el propio registro al editar en backend.

Trabajo en curso:
- Validacion funcional integrada con usuarios reales para confirmar UX final en escenarios mixtos (alta nueva, edicion existente, semana completada).

Pendientes inmediatos:
- Probar E2E `REPORTAR SEMANA` para confirmar INSERT en todos los casos y ausencia de UPDATE implicito.
- Probar E2E `Actualizar` por fila para confirmar UPDATE solo sobre el `id_seguimiento` correspondiente.
- Verificar mensajes finales de negocio en frontend para conflictos y limites de horas semanales.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-15

Modulo trabajado:
UX del panel de horas en Formulario de Seguimiento Semanal.

Cambios realizados:
- Se renombraron labels para separar claramente acumulado vs nuevo registro:
  - `Horas registradas hasta ahora`
  - `Horas a registrar`
  - `Disponible para registrar`.
- Se aplico rediseño visual del bloque en estilo dashboard (resumen en tarjetas + barra de progreso semanal).
- Se ajusto texto de ayuda dinamico del input a `Disponible para registrar: X.XX h`.
- Se reforzo validacion visual del input con mensaje funcional:
  `No puedes registrar mas horas de las disponibles para esta semana.`

Estado actual del proyecto:
- El formulario diferencia correctamente horas acumuladas de la semana y horas nuevas a registrar.
- El usuario visualiza de forma inmediata programadas, acumuladas, disponible y porcentaje de avance semanal.
- Se mantiene la logica funcional previa de crear/editar y fuentes de datos existentes.

Trabajo en curso:
- Validacion funcional con usuarios para confirmar comprension de labels y flujo operativo sin ambiguedad.

Pendientes inmediatos:
- Probar escenarios E2E con semana al limite (disponible 0) y con disponible parcial.
- Confirmar copy final con usuarios para mensajes de error y ayudas de captura.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-15

Modulo trabajado:
Correccion urgente de runtime en `SeguimientoNuevo`.

Cambios realizados:
- Se corrigio error en cliente que dejaba la pantalla en blanco en `/seguimiento/nuevo`.
- Causa: uso de `maxHorasPermitidasInput` antes de su inicializacion al calcular `limiteHorasInput` (Temporal Dead Zone de `const`).
- Solucion: reordenamiento de declaraciones para calcular primero `maxHorasPermitidasInput` y luego `limiteHorasInput`.

Estado actual del proyecto:
- Rutas del formulario de seguimiento deben volver a renderizar correctamente sin pantalla blanca.
- Build frontend validado correctamente despues del ajuste.

Pendientes inmediatos:
- Validacion manual en navegador de:
  - `/seguimiento/nuevo`
  - `/seguimiento/nuevo?id_tipo=1&semana=10&id_corte=2&horas=10`

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-15

Modulo trabajado:
UX de autocompletado de horas en formulario de seguimiento semanal.

Cambios realizados:
- Se agrego autocompletado de `Horas a registrar` con el valor faltante de la semana (`Disponible para registrar`) cuando el formulario esta en modo crear.
- Se ajusto el criterio por defecto de `lookup` para rutas `seguimiento/nuevo` sin contexto explicito de edicion:
  - solo entra en edicion automatica si viene forzado (`modo: editar`) o con `id_seguimiento`.
  - en los demas casos permanece en modo crear.

Estado actual del proyecto:
- Al seleccionar actividad/corte/semana en modo crear, el input de horas propone automaticamente el valor faltante (ej: `1.99`).
- Se mantiene compatibilidad de edicion cuando se ingresa por `id_seguimiento` o boton `Actualizar`.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-15

Modulo trabajado:
Ajuste de logica de `Horas a registrar` por modo (crear vs modificar).

Cambios realizados:
- Se corrigio el autocompletado para que no herede valores de una actividad previa.
- Regla aplicada al seleccionar actividad:
  - estado `OK` -> `Horas a registrar = 0.00`
  - estado `PENDIENTE` -> `Horas a registrar = Disponible para registrar`
- En modo crear se permite edicion manual del input; el autocompletado solo inicializa por cambio de contexto.
- En modo editar con `id_seguimiento` se respeta el valor del registro existente (sin sobreescritura automatica).
- Se reforzo el flujo de validacion para priorizar mensaje de semana completada cuando no hay disponible.

Pendientes inmediatos:
- Verificar UX manual en navegador para dos rutas:
  - `/seguimiento/nuevo`
  - `/seguimiento/nuevo?id_tipo=1&semana=10&id_corte=2&horas=10`

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-15

Modulo trabajado:
Correccion fina de autocompletado en `Horas a registrar`.

Cambios realizados:
- Se ajusto logica para que, al seleccionar actividad:
  - `[PENDIENTE]` -> autocompletar con `Disponible para registrar`.
  - `[OK]` -> autocompletar con `0.00`.
- Se elimino arrastre de valor previo por actividad, reiniciando contexto y bandera de edicion manual al cambiar seleccion.
- Se separo comportamiento de edicion explicita (`id_seguimiento` en query):
  - edicion explicita conserva valor del registro.
  - edicion no explicita permite autocompletado sugerido por disponible.

Estado actual del proyecto:
- El campo `Horas a registrar` deja de tomar por error el acumulado (`horas registradas hasta ahora`) y usa el disponible semanal para sugerencia.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-15

Modulo trabajado:
Correccion de validacion decimal en `Horas a registrar`.

Cambios realizados:
- Se corrigio validacion HTML del input para aceptar decimales de dos cifras (`step=0.01`).
- Se agrego normalizacion de decimal en frontend para evitar conflictos coma/punto en captura (`1,99` -> `1.99`).
- Se agrego parseo seguro del valor de horas para validaciones y payloads (`parsearHorasInput`).
- Se mantiene regla de negocio: no mayor al disponible y mayor que cero.

Estado actual del proyecto:
- El caso `10.00 - 8.01 = 1.99` ya es valido en el input y no debe disparar error nativo del navegador por step.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-15

Modulo trabajado:
Seguimiento semanal (persistencia multiple por actividad/corte/semana).

Cambios realizados:
- Se elimino validacion de unicidad en backend para flujo de creacion de seguimiento semanal.
- Ahora `POST /seguimiento` permite multiples registros para la misma combinacion `id_actividad + id_corte + semana`.
- Se conserva control de negocio por acumulado:
  - no exceder horas disponibles de la semana
  - no permitir horas <= 0.
- Se retiro unicidad de la entidad `SeguimientoSemanal` y se agrego script SQL para ajustar indices en base de datos:
  - `ajuste_seguimiento_semanal_multiples_registros.sql`.

Estado actual del proyecto:
- Flujo `Reportar semana` queda orientado a INSERT de registros independientes con fecha propia.
- Flujo `Actualizar` mantiene edicion puntual por `id_seguimiento`.
- Para que el cambio funcione plenamente en ambiente real, debe ejecutarse el script SQL y eliminar indices unicos de `seguimiento_semanal`.

Pendientes inmediatos:
- Ejecutar `ajuste_seguimiento_semanal_multiples_registros.sql` en la base activa.
- Probar caso real: ya registrado 1.99, nuevo 8.01, total 10.00 (debe permitir INSERT).

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-15

Modulo trabajado:
Evidencias (Google Drive) en Formulario Unico de Seguimiento.

Cambios realizados:
- Se retiro la exigencia de Shared Drive para `GOOGLE_DRIVE_PARENT_FOLDER_ID`; ahora se acepta carpeta de My Drive o Shared Drive.
- Se mejoro validacion de carpeta y mensajes de error con texto funcional orientado a la cuenta `uniputumayoagendas@gmail.com`.
- Se actualizo estructura de carpetas de evidencias en Drive a:
  - `{periodo}/seguimiento_semanal/corte_{numero_corte}`
- Se agrego generacion de nombre unico de PDF en backend con formato:
  - `{periodo}_C{corte}_S{semana}_ACT{idActividad}_SEG{idSeguimiento}_EVD{consecutivo}_{yyyyMMdd_HHmmss}.pdf`
- Se agrego verificacion de nombre existente en carpeta destino para incrementar consecutivo y evitar colisiones.

Estado actual del proyecto:
- Integracion compatible con My Drive + Shared Drive a nivel de codigo backend.
- El flujo de subida mantiene rollback si falla guardado de metadata.

Pendientes inmediatos:
- Configurar en entorno el `GOOGLE_DRIVE_PARENT_FOLDER_ID` real de la carpeta `sigedin_agendas`.
- Ejecutar prueba E2E real con credenciales/permiso vigentes para confirmar subida en Drive.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-15

Modulo trabajado:
Depuracion operativa de subida de evidencias (logs backend temporales).

Cambios realizados:
- Se agregaron logs de trazabilidad en backend para el flujo completo de subida:
  - lectura de `GOOGLE_DRIVE_PARENT_FOLDER_ID`
  - cuenta usada para inicializar Drive
  - validacion de carpeta padre (id/nombre/tipo My Drive o Shared Drive)
  - creacion/busqueda de carpetas por periodo/corte
  - ruta final resuelta
  - nombre final del archivo
  - respuesta de API de Drive (`fileId`, `webViewLink`)
  - error exacto y rollback en caso de fallo.

Estado actual del proyecto:
- Backend compilado con logs de diagnostico habilitados para prueba real en ambiente.

Pendientes inmediatos:
- Ejecutar prueba funcional de carga PDF en Formulario Unico de Seguimiento > Evidencias y revisar logs para ubicar causa exacta del fallo operativo.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-15

Modulo trabajado:
Evidencias en almacenamiento local (sin dependencia inmediata de Google Drive).

Cambios realizados:
- Se habilito modo de almacenamiento local para evidencias con selector por entorno:
  - `EVIDENCIA_STORAGE_PROVIDER=local|drive`.
- Se implemento guardado local en `backend/uploads/evidencias` con nombres unicos siguiendo formato institucional.
- Se agrego rollback local (elimina archivo fisico si falla persistencia en BD).
- Se publico carpeta de archivos locales desde backend en `/uploads/*`.
- Se configuro entorno local (`backend/.env`) para usar almacenamiento local:
  - `EVIDENCIA_STORAGE_PROVIDER=local`
  - `EVIDENCIA_PUBLIC_BASE_URL=http://localhost:3001`

Estado actual del proyecto:
- Flujo de Evidencias puede operar en local sin bloquear por Google Drive.
- `ruta_archivo` queda apuntando a URL local del backend.

Pendientes inmediatos:
- Reiniciar backend y validar E2E en UI: seleccionar PDF -> agregar -> guardar evidencias -> abrir URL local guardada.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-15

Modulo trabajado:
Cierre de sesion de desarrollo (seguimiento semanal + evidencias local/Drive).

Cambios realizados:
- Se estabilizo `SeguimientoNuevo` en separacion crear/editar para evitar updates implicitos desde `Reportar semana`.
- Se ajusto validacion de horas para aceptar decimales (`step=0.01`), normalizar coma/punto y respetar disponible semanal.
- Se habilito persistencia multiple en `seguimiento_semanal` para misma combinacion actividad/corte/semana con control por suma acumulada.
- Se elimino la exigencia rigida de Shared Drive y se dejo compatibilidad My Drive + Shared Drive en backend de evidencias.
- Se habilito modo local de evidencias (`EVIDENCIA_STORAGE_PROVIDER=local`) con archivos en `uploads/evidencias` y URL publica `/uploads/*`.

Estado actual del proyecto:
- Formulario de seguimiento semanal opera con reglas de negocio de horas pendientes y distincion clara entre crear/modificar.
- Evidencias puede operar de inmediato en local sin dependencia de Drive.
- Integracion con Drive queda lista para uso por configuracion cuando el entorno tenga permisos/carpeta validos.

Trabajo en curso:
- Validacion funcional integrada en ambiente local del flujo completo: guardar seguimiento -> cargar PDF -> guardar evidencia -> visualizar archivo.

Pendientes inmediatos:
- Ejecutar prueba E2E local desde UI y confirmar insercion en tabla `evidencia` con `ruta_archivo` local.
- Si se migra nuevamente a Drive: cambiar `EVIDENCIA_STORAGE_PROVIDER=drive` y validar permisos sobre carpeta `sigedin_agendas`.
- Retirar logs temporales de depuracion una vez se confirme flujo estable en ambiente objetivo.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-16

Modulo trabajado:
Formulario Unico de Seguimiento - Evidencias (eliminacion completa frontend + backend + BD + almacenamiento).

Cambios realizados:
- Frontend (`SeguimientoNuevo.jsx`):
  - Se agrego confirmacion previa `¿Deseas eliminar esta evidencia?` tanto para evidencias en cola (no persistidas) como para evidencias ya guardadas.
  - Se mantuvo iconografia de papelera para la accion de eliminar y se agrego estado `Eliminando...` por item para evitar doble clic.
  - Al eliminar evidencia persistida se recarga la lista desde backend para mantener consistencia visual con BD.
- Backend (`EvidenciaService`):
  - Se corrigio el flujo de eliminacion para borrar de forma definitiva el registro en BD (`DELETE` fisico por `id_evidencia`).
  - Antes de borrar en BD, se intenta eliminar archivo asociado:
    - Google Drive cuando existe `google_file_id` o se puede extraer `fileId` desde `ruta_archivo`.
    - almacenamiento local cuando `ruta_archivo` corresponde a `/uploads/evidencias/`.
  - Si falla la eliminacion del archivo, se retorna error controlado y no se ejecuta `DELETE` en BD.
- Backend (`GoogleDriveService`):
  - `eliminarArchivo` ahora reporta errores operativos (antes los silenciaba), ignora `notFound` y registra trazabilidad de borrado.

Estado actual del proyecto:
- La eliminacion de evidencias ya no es solo visual: elimina cola local en frontend cuando aplica y elimina persistencia real en backend/BD para evidencias guardadas.
- El endpoint `DELETE /api/evidencia/{id_evidencia}` aplica borrado definitivo del registro y cleanup de archivo asociado (Drive/local) segun contexto.

Pendientes inmediatos:
- Validar en ambiente integrado dos escenarios E2E:
  - `EVIDENCIA_STORAGE_PROVIDER=local` (borrado de archivo fisico + registro BD).
  - `EVIDENCIA_STORAGE_PROVIDER=drive` (borrado en Drive + registro BD).

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-16

Modulo trabajado:
Informes (reporte consolidado de seguimiento semanal docente) en backend + frontend.

Cambios realizados:
- Backend:
  - Se crea modulo `informes` con endpoints protegidos por JWT para:
    - filtros (`periodos`, `cortes`, `semanas`, `docentes`)
    - consulta principal paginada/ordenable desde `vw_reporte_seguimiento_detallado`
    - exportacion Excel del resultado filtrado.
  - Se agrega control de alcance por rol reutilizando `ScopeService`:
    - DOCENTE: restringe por cedula del docente autenticado.
    - ADMIN: restringe por facultad del administrador.
  - Se incorpora normalizacion de `periodo_academico`/`anio` para evitar formato decimal como `2.026`.
  - Se integra dependencia `exceljs` para generacion de archivos `.xlsx`.
- Frontend:
  - Se crea nueva vista `Informes.jsx` y ruta `/informes`.
  - Se implementa pantalla de reportes con:
    - encabezado (titulo/subtitulo)
    - filtros multi-select con busqueda, Select All / Deselect All
    - acciones: Consultar, Limpiar filtros, Copiar, Exportar a Excel
    - tabla de previsualizacion con scroll horizontal, paginacion y ordenamiento basico.
  - Se conecta el menu lateral existente `Informes` al nuevo modulo mediante routing.

Estado actual del proyecto:
- El modulo Informes queda funcional de extremo a extremo (consulta + previsualizacion + exportacion a Excel) sobre la vista `vw_reporte_seguimiento_detallado`.
- Backend y frontend compilan correctamente tras la integracion.

Pendientes inmediatos:
- Validar en ambiente con datos reales que la vista `vw_reporte_seguimiento_detallado` exponga todas las columnas esperadas sin renombres.
- Confirmar con usuarios finales si filtros multiseleccion deben mantenerse en todos los campos o reducirse a seleccion simple en algunos casos de uso.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-16

Modulo trabajado:
Seguimiento semanal (ajustes UI/UX finales) + estabilizacion del dashboard + cierre operativo del modulo Informes.

Cambios realizados:
- Se modernizo la UI de Evidencias en `SeguimientoNuevo.jsx`:
  - estado visual `Guardado` con iconografia.
  - acciones con iconos `Ver` y `Eliminar`.
  - modal de previsualizacion PDF embebida con fallback para abrir en nueva ventana.
- Se actualizaron pestañas de `Seguimiento semanal` / `Evidencias` para igualar estilo azulado del modelo solicitado (estado activo/inactivo, contenedor, tipografia y espaciado).
- Se ajusto el bloque de detalle en `Seguimiento.jsx`:
  - titulo `Detalle del avance semanal`.
  - eliminacion de columnas `Corte` y `Semestre`.
  - incorporacion de fila resumen final con totales programado/ejecutado y avance total porcentual.
- Se corrigio error de pantalla blanca en `/seguimiento` por orden de hooks en React (`Rendered more hooks than during the previous render`), reubicando `useMemo` para mantener orden estable.

Estado actual del proyecto:
- El dashboard y formulario de seguimiento quedan estables y funcionales en UI.
- El modulo Informes permanece integrado en menu lateral, con consulta y exportacion Excel operativas.
- Backend y frontend compilan correctamente en el estado actual de codigo.

Trabajo en curso:
- Validacion funcional integrada en ambiente real para confirmar experiencia final de usuario en:
  - seguimiento semanal (tabla de detalle + resumen)
  - evidencias (previsualizacion modal + eliminacion)
  - informes (filtros combinados y exportacion).

Pendientes inmediatos:
- Ejecutar prueba E2E con datos reales del modulo Informes para validar consistencia de filtros multiseleccion y contenido exportado.
- Confirmar con usuario final si la accion `Ver` de evidencia requiere controles adicionales (zoom/descarga directa) dentro del modal.
- Revisar si se retiran logs temporales de depuracion en backend de evidencias despues de validacion final.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-16

Modulo trabajado:
Informes (navegacion de submenu + nuevo Informe ejecutivo + mantenimiento de Consolidado general).

Cambios realizados:
- Frontend:
  - Se convierte `Informes` del sidebar en menu desplegable con subopciones:
    - `Informe ejecutivo` -> `/informes/ejecutivo`
    - `Consolidado general` -> `/informes/consolidado`
  - Se agrega nueva vista `InformeEjecutivo.jsx` con:
    - filtros en orden: Facultad, Periodo, Corte, Semana, Docente, Identificacion
    - previsualizacion tabular
    - exportacion a Excel
  - Se ajusta routing en `App.jsx` para separar ambos reportes y redirigir `/informes` a `/informes/consolidado`.
- Backend:
  - Se agregan endpoints ejecutivos:
    - `GET /api/informes/ejecutivo/filtros`
    - `GET /api/informes/ejecutivo/reporte`
    - `GET /api/informes/ejecutivo/exportar`
  - Se implementa logica de resumen ejecutivo por:
    - periodo, facultad, docente, tipo actividad, clase actividad
    - avance corte1, corte2, corte3 y semestre
  - Se mantiene `Consolidado general` sobre la vista `vw_reporte_seguimiento_detallado` sin reemplazarlo.

Estado actual del proyecto:
- Informes ahora tiene dos reportes separados dentro del submenu solicitado.
- Consolidado general sigue operativo sobre modulo existente.
- Informe ejecutivo queda habilitado con filtros, consulta y exportacion Excel.
- Backend y frontend compilan correctamente tras los cambios.

Pendientes inmediatos:
- Validar en ambiente integrado porcentajes de avance del informe ejecutivo contra casos de negocio reales.
- Confirmar con usuario final formato final del Excel ejecutivo (ancho de columnas y estilo adicional si se requiere).

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-16

Modulo trabajado:
Informes (nuevo filtro Facultad + reorganizacion de filtros + integracion backend/frontend).

Cambios realizados:
- Backend:
  - Se agrega endpoint `GET /api/informes/filtros/facultades` para listar facultades dinamicamente desde tabla `facultad`.
  - Se ajusta parseo de filtros para aceptar `facultades`/`id_facultad` como lista CSV.
  - Se integra filtro de facultad en la construccion de `WHERE` del reporte, resolviendo IDs a nombre de facultad para aplicar filtro sobre `vw_reporte_seguimiento_detallado` sin romper compatibilidad.
  - Se aplica el mismo filtro en `GET /api/informes/reporte` y `GET /api/informes/exportar` (Excel), reutilizando la misma logica de consulta.
- Frontend (`Informes.jsx`):
  - Se agrega select multiseleccion de `Facultad` en el bloque `Filtros de consulta`.
  - Se reorganiza orden visual y funcional de filtros a: Facultad -> Periodo -> Corte -> Semana -> Docente -> Identificacion.
  - Se ajusta grilla responsive a 6 columnas en desktop (`xl`) y 3 en `lg` para evitar layout apretado.
  - Se integra envio del filtro `facultades` en consultas, carga de opciones y exportacion.
  - Se incluye limpieza completa del nuevo filtro en accion `Limpiar filtros`.

Estado actual del proyecto:
- El modulo Informes ya soporta filtro opcional por Facultad de extremo a extremo (filtros, tabla y exportacion Excel).
- El orden solicitado de filtros queda aplicado y estable en UI responsiva.

Pendientes inmediatos:
- Validar en ambiente integrado que la lista de facultades cargue los nombres reales esperados (incluyendo Ingenieria/Ciencias Basicas y Ciencias Empresariales).
- Ejecutar prueba funcional con combinaciones de filtros para confirmar consistencia entre previsualizacion y archivo Excel exportado.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-17

Modulo trabajado:
Dashboard de seguimiento (rediseño de supervisión por cortes para rol administrativo/decano en frontend + endpoint de detalle por docente en backend).

Cambios realizados:
- Se mantuvo intacto el bloque de Semestre y el bloque de Corte actual del dashboard.
- Se elimino de la seccion inferior la tarjeta `Semana actual` y la tabla `Detalle del avance semanal`.
- Se implemento nuevo bloque de supervision por cortes con tabs fijas `Corte 1`, `Corte 2`, `Corte 3` y tabla por docente con columnas:
  - Docente
  - Horas programadas
  - Horas ejecutadas
  - Avance del corte (porcentaje + barra)
  - Estado (ALTO/MEDIO/BAJO)
  - Acciones (Aprobar / Revisar) como placeholders para integracion futura.
- Se agrego endpoint backend `GET /api/dashboard/seguimiento-cortes` con alcance por rol existente:
  - DOCENTE: solo su informacion.
  - ADMIN (decano): docentes de su facultad.
- Se actualizo subtitulo del bloque superior a formato dinamico:
  `Vision macro del semestre (AAAA-P | Inicio: dd/mm/aaaa - Fin: dd/mm/aaaa)`.

Estado actual del proyecto:
- El dashboard queda orientado a supervision por cortes en su seccion inferior sin romper contratos existentes del endpoint principal.
- `GET /api/dashboard/seguimiento` sigue operativo para metricas macro.
- `GET /api/dashboard/seguimiento-cortes` queda disponible para alimentar tabs por corte con detalle por docente.
- Backend y frontend compilando correctamente tras la integracion.

Pendientes inmediatos:
- Validar funcionalmente con usuarios ADMIN/decano en ambiente real que el filtro por facultad refleje el universo correcto de docentes.
- Ajustar copy/flujo final de acciones `Aprobar` y `Revisar` cuando se implemente persistencia real y vista de evidencias.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-17

Modulo trabajado:
Nuevo modulo Supervision (dashboard exclusivo Decano/ADMIN) y restauracion del dashboard original de Seguimiento.

Cambios realizados:
- Se creo dashboard independiente en `frontend/src/Pages/Supervision.jsx` accesible desde ruta existente `/supervision`.
- Se mantuvo intacta la navegacion del menu y se reemplazo el placeholder por una vista funcional de supervision.
- El dashboard de Supervision incluye:
  - bloque superior de vision macro del semestre con periodo y fechas
  - bloque de corte actual
  - bloque principal con tabs `Corte 1/2/3` y tabla por docente con acciones `Aprobar` y `Revisar` (placeholders UI)
- Se restauraron en `frontend/src/Pages/Seguimiento.jsx` los bloques propios del dashboard de seguimiento (incluyendo `Semana actual` y `Detalle del avance semanal`) para mantener separacion total entre modulos.
- Se agregaron endpoints dedicados del modulo supervision:
  - `GET /api/dashboard/supervision/resumen`
  - `GET /api/dashboard/supervision/cortes`
- Estos endpoints reutilizan logica existente y restringen acceso a rol Decano/ADMIN.

Estado actual del proyecto:
- Existen dos dashboards separados:
  - `Seguimiento`: tablero operativo semanal del docente.
  - `Supervision`: tablero de evaluacion por cortes para Decano/ADMIN.
- Se conserva compatibilidad del endpoint previo `GET /api/dashboard/seguimiento`.
- Backend y frontend compilan correctamente despues de los cambios.

Pendientes inmediatos:
- Validar con usuario Decano/ADMIN en ambiente real la cobertura de docentes por facultad en cada corte.
- Definir persistencia real para la accion `Aprobar` y flujo funcional de `Revisar` evidencias por docente/corte.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-17

Modulo trabajado:
Gestion de roles de usuario (alta/edicion/login) con incorporacion de rol `DECANO`.

Cambios realizados:
- Se habilito `DECANO` en los formularios de usuarios del frontend para crear/editar cuentas.
- Se ajusto backend para aceptar `DECANO` en entidad y DTOs de usuario (`ADMIN|DECANO|DOCENTE`).
- Se actualizo `ScopeService` para reconocer `DECANO` como rol valido y aplicarlo con alcance administrativo por facultad.
- Se habilito acceso al modulo de Supervision para `DECANO` ademas de `ADMIN`.
- Se ajusto visual de listado de usuarios para mostrar badge diferenciado del nuevo rol `DECANO`.

Estado actual del proyecto:
- El sistema ya permite asignar y persistir el rol `DECANO` desde UI sin rechazo de validacion backend.
- Los usuarios `DECANO` pueden acceder al dashboard de Supervision y resolver su scope por facultad.
- Build de frontend y backend en estado OK tras los cambios.

Pendientes inmediatos:
- Revisar si se desea que `DECANO` tenga acceso a todo el modulo de Administracion o solo a Supervision (definicion funcional).
- Si se requiere control fino, crear guard/permissions por modulo para separar `ADMIN` tecnico de `DECANO` funcional.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-17

Modulo trabajado:
Control de Usuarios (listado + edicion de usuario + persistencia de actualizacion en backend).

Cambios realizados:
- Se corrigio la visibilidad de acciones en listado de usuarios: iconos de editar/eliminar quedan siempre visibles por fila.
- Se habilito edicion de `username` en formulario de editar usuario (antes bloqueado en frontend).
- Se agrego endpoint faltante `GET /api/admin-usuario/:id` para cargar datos de edicion correctamente.
- Se amplio `ActualizarUsuarioDto` para aceptar `username` en update.
- Se reforzo `UsuarioService.actualizar`:
  - actualiza `username` con validacion de no vacio y unicidad
  - mantiene logica de `password_hash` solo si llega nueva contrasena
  - mantiene actualizacion de `rol`, `activo`, `id_docente`.
- Se revisaron validaciones en frontend para obligatorios: username, rol, estado y docente asociado cuando aplica (`DOCENTE` o `DECANO`).

Estado actual del proyecto:
- El listado muestra acciones de edicion/eliminacion de forma permanente.
- La vista de editar usuario permite modificar: username, contrasena, rol, estado y docente asociado.
- Al guardar, la actualizacion impacta el registro correcto en tabla `usuario` via ORM y mantiene hash previo cuando no se envia nueva contrasena.
- Backend y frontend compilan correctamente despues de los cambios.

Pendientes inmediatos:
- Ejecutar validacion funcional manual en entorno integrado con casos: cambio de username, cambio de docente, cambio de rol/estado y password opcional vacia/no vacia.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-17

Modulo trabajado:
Estandarizacion visual de acciones en listados de Administracion (frontend).

Cambios realizados:
- Se eliminaron patrones de ocultamiento por hover para acciones de editar/eliminar en modulos administrativos.
- Los iconos de acciones quedan visibles de forma permanente desde la carga inicial del listado.
- Modulos ajustados:
  - `Docentes`
  - `Programas`
  - `Facultades`
  - `Tipos de Actividad`
  - `Usuarios` ya estaba corregido en sesion previa y se mantiene consistente.

Estado actual del proyecto:
- En la seccion Administracion, las acciones de editar y eliminar ahora son siempre visibles en los listados afectados.
- Se mantiene estilo visual existente (tamano, color, espaciado y alineacion) sin introducir rediseno.
- Build de frontend exitoso tras los cambios.

Pendientes inmediatos:
- Validar visualmente en ambiente integrado cada tabla administrativa para confirmar consistencia final en desktop y responsive.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-17

Modulo trabajado:
Gestion de Docentes (integracion de nuevos campos `mail` y `sede` en backend y frontend).

Cambios realizados:
- Backend docente:
  - Se agregaron columnas `mail` y `sede` en entidad `Docente`.
  - Se extendieron DTOs de crear/actualizar docente para soportar ambos campos.
  - Se agrego validacion de email en DTO y normalizacion en servicio (trim/lowercase para mail, trim para sede).
  - Se reforzo validacion de `sede` para evitar valor vacio.
- Frontend docentes:
  - Se agregaron campos `Correo electronico` y `Sede` en formulario nuevo/editar docente.
  - Se habilitaron validaciones en formulario:
    - correo requerido con formato basico valido
    - sede requerida
  - Se agregaron columnas `Correo` y `Sede` en listado de docentes con truncado visual en correo.
  - Se amplio filtro del listado para buscar tambien por correo y sede.

Estado actual del proyecto:
- Los campos `mail` y `sede` quedan integrados en flujo completo de docentes:
  - crear
  - editar
  - listar
- Persisten correctamente mediante ORM en tabla `docente`.
- Backend y frontend compilan correctamente tras la integracion.

Pendientes inmediatos:
- Ejecutar validacion funcional en ambiente con datos reales (crear docente nuevo, editar docente existente y verificar persistencia en BD).

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-17

Modulo trabajado:
Estandarizacion global de iconos de acciones (editar/eliminar) con referencia visual de `Periodos Academicos`.

Cambios realizados:
- Se creo componente reutilizable `TableActionButtons` con el estilo exacto de referencia:
  - editar: `p-2.5 bg-institutional-blue/10 text-institutional-blue rounded-xl ...`
  - eliminar: `p-2.5 bg-red-50 text-red-500 rounded-xl ...`
  - iconos y jerarquia visual equivalentes al modulo `Periodos`.
- Se reemplazaron implementaciones locales de botones de acciones por el componente reutilizable en listados/tablas de:
  - Periodos (tabla principal y cortes embebidos)
  - Cortes Academicos
  - Agendas
  - Actividades
  - Docentes
  - Usuarios
  - Programas
  - Tipos de Actividad
  - Facultades (cards/listado visual)
- Se mantuvo visibilidad permanente de acciones (sin dependencia de hover para aparecer).

Estado actual del proyecto:
- El sistema usa un patron unico de acciones de editar/eliminar, alineado visualmente con `Periodos Academicos`.
- Se elimina duplicacion de estilos y se centraliza la consistencia en un componente reutilizable.
- Frontend compila correctamente tras la estandarizacion.

Pendientes inmediatos:
- Validar visualmente en ambiente integrado los listados actualizados para confirmar consistencia en desktop y responsive.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-17

Modulo trabajado:
Facultades (navegacion a detalle y gestion de programas asociados por facultad).

Cambios realizados:
- Se agrego accion explicita en tarjetas de `Facultades` para ver/gestionar programas asociados (icono + tooltip).
- Se habilito navegacion por clic sobre la tarjeta hacia detalle de facultad.
- Se creo nueva vista `FacultadProgramasPage` con:
  - nombre de facultad
  - resumen de cantidad de programas
  - listado de programas filtrado por facultad
  - acciones por programa: Ver y Editar
  - boton `Nuevo Programa`
  - boton de retorno al listado de facultades.
- Se reutilizo `ProgramaForm` para crear/editar programas dentro del detalle, fijando `id_facultad` de la vista.
- Backend:
  - nuevo endpoint `GET /api/admin-docente/facultades/:id`
  - `GET /api/admin-docente/programas` ahora soporta filtro `id_facultad`.
- Se agrega nueva ruta frontend:
  - `/admin/facultades/:id/programas`.

Estado actual del proyecto:
- Cada facultad tiene acceso directo a su vista de programas asociados.
- La gestion de programas queda contextualizada por facultad, evitando mezclar programas de otras facultades.
- Backend y frontend compilan correctamente tras la integracion.

Pendientes inmediatos:
- Validar funcionalmente en ambiente integrado la navegacion completa (facultades -> detalle -> crear/editar programa -> volver).

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-17

Modulo trabajado:
Rediseño de vista principal de Facultades con tabs por facultad y detalle inmediato de programas asociados.

Cambios realizados:
- Se reemplazo el enfoque de tarjetas separadas por una interfaz tabulada en `Facultades`.
- Cada facultad ahora se muestra como pestaña (tab), con activacion dinamica y cambio de contexto inmediato.
- Debajo de la tab activa se renderiza:
  - resumen de cantidad de programas asociados,
  - buscador de programas de la facultad activa,
  - grid de cards modernas por programa.
- Cada card de programa incluye acciones directas:
  - Editar
  - Eliminar
- Se agrego accion `Nuevo Programa` contextual a la tab activa, con asociacion automatica a la facultad seleccionada (sin re-seleccionar facultad).
- Se mantuvieron acciones de facultad (editar/eliminar) aplicadas a la facultad activa.
- Se incluyo estado vacio elegante por facultad sin programas, con CTA para agregar programa.

Estado actual del proyecto:
- El modulo de Facultades ya funciona como panel por tabs con detalle inmediato de programas asociados.
- La gestion de programas queda contextualizada y coherente con diseño institucional.
- Frontend compila correctamente despues del rediseño.

Pendientes inmediatos:
- Validar en ambiente integrado comportamiento de tabs con facultades reales y cobertura responsive en grid de programas.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-17

Modulo trabajado:
Ajuste del flujo de creacion de programas desde tabs de Facultades (preseleccion automatica de facultad activa).

Cambios realizados:
- Se robustecio `ProgramaForm` para respetar contexto de facultad activa cuando se abre desde `Facultades`:
  - `id_facultad` inicial se toma automaticamente de `fixedFacultadId`.
  - En submit, si existe facultad fija, se fuerza ese `id_facultad` en payload.
  - Se omite validacion de selector de facultad cuando el contexto ya esta fijado por tab.
- Se ajusto UI del modal para mostrar la facultad activa como campo de solo lectura cuando aplica.
- Se mantiene comportamiento tradicional (selector editable) para usos fuera del contexto tabulado.

Estado actual del proyecto:
- Desde una pestaña de facultad activa, al hacer clic en `Nuevo Programa`, el modal abre con la facultad ya cargada.
- El usuario solo diligencia `Nombre del Programa` y guarda.
- El programa se persiste asociado a la facultad activa y refresca la vista de programas asociados.
- Frontend compila correctamente tras el ajuste.

Pendientes inmediatos:
- Validar manualmente en ambiente integrado el flujo: crear facultad nueva -> abrir tab -> crear programa -> confirmar asociacion correcta.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-17

Modulo trabajado:
Gestion de Docentes (rediseño por facultades con pestañas y estado activo/inactivo).

Cambios realizados:
- Se rediseño `Docentes` a estructura por tabs dinamicas de facultad (cargadas desde BD).
- Cada tab muestra docentes filtrados por facultad activa con:
  - contador de docentes por facultad
  - buscador contextual dentro de la facultad
  - tabla completa con columnas: nombre, identificacion, correo, sede, programa, vinculacion/dedicacion, estado y acciones.
- Se agrego indicador visual de estado por docente:
  - ACTIVO (badge verde)
  - INACTIVO (badge gris)
  - basado en usuarios asociados (`usuario.activo`).
- Se agrego boton `Nuevo Docente` contextual a la tab activa, enviando `id_facultad` por query.
- Se ajusto `DocenteFormPage` para contexto de facultad:
  - filtra programas por `id_facultad` al crear desde tabs
  - muestra facultad seleccionada en solo lectura
  - mantiene selector normal para flujos sin facultad fija.
- Backend docente ajustado para incluir relacion `usuarios` en listados/consulta individual, permitiendo resolver estado activo/inactivo en frontend.

Estado actual del proyecto:
- El modulo de docentes queda organizado por facultad con experiencia tabulada y gestion contextual.
- El flujo de creacion desde pestaña de facultad evita re-seleccionar facultad y reduce errores de asociacion.
- Backend y frontend compilan correctamente tras el rediseño.

Pendientes inmediatos:
- Validar en ambiente integrado que el criterio de estado activo/inactivo cumpla la regla funcional esperada cuando un docente tenga multiples usuarios asociados.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-17

Modulo trabajado:
Correccion de actualizacion en Editar Docente.

Cambios realizados:
- Se corrigio el payload de update en `DocenteFormPage` para no enviar `identificacion` en modo edicion.
- El backend de update docente no espera `identificacion` en `ActualizarDocenteDto`; al enviarse desde frontend generaba el error:
  `property identificacion should not exist`.
- Con el ajuste, ahora si se actualizan correctamente campos editables como `mail`, `sede`, `programa`, `vinculacion`, `dedicacion`, etc.

Estado actual del proyecto:
- Editar Docente vuelve a guardar cambios correctamente sin error de validacion por campo no permitido.
- Build frontend exitoso tras la correccion.

Pendientes inmediatos:
- Validar funcionalmente en ambiente integrado un caso completo de edicion de docente cambiando correo y sede.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-17

Modulo trabajado:
Gestion de Docentes por Facultad (enfoque en control de acceso de usuarios asociados).

Cambios realizados:
- Tabla de docentes ajustada para enfoque de credenciales/acceso:
  - Se eliminaron columnas: `Programa`, `Correo`, `Vinculacion / Dedicacion`.
  - Se agregaron columnas: `Rol` y `Acceso / Usuario`.
- Se agrego accion por fila para gestion de acceso del docente:
  - Si el docente tiene usuario asociado -> redirige a `Editar Usuario`.
  - Si no tiene usuario -> redirige a `Nuevo Usuario` con docente preasociado.
- En columna `Rol` se muestra el rol del usuario asociado (`ADMIN`, `DECANO`, `DOCENTE`) o badge `Sin acceso` cuando no existe usuario.
- Se ajusto `UsuarioFormPage` para admitir prefill desde query:
  - `id_docente` preasociado
  - `rol` predefinido
  - bloqueo del selector de docente cuando llega preasociado desde tabla de docentes.

Estado actual del proyecto:
- Gestion de docentes queda alineada a administracion de acceso:
  - rol visible por docente
  - boton directo para crear/editar credenciales.
- El flujo desde docentes hacia usuarios funciona en ambos escenarios (con/sin usuario).
- Frontend compila correctamente tras los ajustes.

Pendientes inmediatos:
- Validar en ambiente integrado casos con docentes que tengan multiples usuarios para confirmar criterio del rol mostrado en tabla.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-17

Modulo trabajado:
Flujo de retorno entre Gestion de Docentes y formulario de Control de Usuarios.

Cambios realizados:
- Se agrego trazabilidad de origen al navegar desde Docentes hacia crear/editar usuario:
  - `from=docentes`
  - `facultad_id` activa
  - `q` (busqueda activa) cuando aplica.
- Se actualizo `Docentes` para reflejar y conservar en URL el estado de vista:
  - facultad activa (`facultad_id`)
  - filtro (`q`)
  permitiendo restaurar contexto al volver.
- Se ajusto `UsuarioFormPage` para boton `Cancelar` y `Volver al listado`:
  - si origen es `docentes`, retorna a `/admin/docentes` restaurando facultad y filtro
  - si no, mantiene retorno a `/admin/usuarios`.

Estado actual del proyecto:
- El flujo UX queda natural: entrando desde docentes al formulario de usuario, cancelar vuelve al modulo de docentes en el mismo contexto.
- Se evita romper experiencia llevando al listado general de usuarios cuando no corresponde.
- Frontend compila correctamente tras el ajuste.

Pendientes inmediatos:
- Validar en ambiente integrado retorno desde ambos flujos (crear acceso y editar usuario existente) con y sin texto de busqueda activo.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-17

Modulo trabajado:
Gestion de Docentes (correccion de estado vacio por facultad sin registros).

Cambios realizados:
- Se corrigio la vista en tabs de docentes para evitar pantalla en blanco al seleccionar facultades sin docentes.
- Se ajusto import faltante del icono usado en estado vacio (`GraduationCap`) en `Docentes.jsx`, que estaba provocando error de render en ese escenario.

Estado actual del proyecto:
- Al cambiar a una facultad con 0 docentes, se mantiene el contenedor normal con:
  - nombre de facultad activa,
  - buscador,
  - boton `+ Nuevo Docente`,
  - mensaje de estado vacio.
- Frontend compila correctamente.

Pendientes inmediatos:
- Validar visualmente en ambiente integrado el estado vacio en varias facultades sin registros.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-17

Modulo trabajado:
Creacion de docentes (correccion de validacion de alcance por facultad/programa).

Cambios realizados:
- Se corrigio validacion backend que bloqueaba alta de docentes en facultades distintas a la facultad del ADMIN autenticado.
- En `docente.service`:
  - `validarProgramaScope` ahora valida existencia del programa y solo aplica restriccion por facultad para roles no ADMIN.
  - `validarDocenteScope` y `listarDocentes` se ajustan para que usuario `ADMIN` tenga alcance completo (sin filtro forzado por facultad).
  - Para roles no ADMIN se mantiene control por `idFacultad` de alcance.
- Se elimina error funcional: `El programa no pertenece a la facultad del administrador` en escenarios validos para ADMIN.

Estado actual del proyecto:
- ADMIN puede crear/editar docentes usando programas de cualquier facultad valida del sistema.
- La validacion sigue bloqueando solo casos realmente invalidos (programa inexistente o fuera de alcance en roles restringidos).
- Backend compila correctamente tras el ajuste.

Pendientes inmediatos:
- Validar en ambiente integrado alta de docente en `Ciencias Empresariales` con programa `Administracion de Empresas` y confirmar visibilidad en listado correspondiente.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-17

Modulo trabajado:
Cierre de sesion y estabilizacion del modulo Gestion de Docentes (facultades, acceso de usuarios y alta multi-facultad).

Cambios realizados:
- Se consolido la correccion de validacion backend para alta/edicion de docentes con programas de distintas facultades cuando el rol es `ADMIN`.
- Se dejo operativo el flujo de acceso desde docentes hacia usuarios (crear/editar) con retorno contextual a la misma facultad y filtro.
- Se mantuvo estable el render de estado vacio por facultad sin docentes.
- Se verifico compilacion de backend/frontend en los ajustes recientes de la sesion.

Estado actual del proyecto:
- Gestion de Docentes funciona por pestañas de facultad con estados vacios controlados.
- La tabla de docentes esta orientada a control de acceso (rol y gestion de usuario asociado).
- El formulario de usuario respeta origen de navegacion y vuelve a docentes cuando aplica.
- El alta de docentes para `ADMIN` ya no se bloquea por facultad del administrador cuando el programa es valido.

Trabajo en curso:
- Validacion funcional integral E2E del flujo `Facultades -> Programas -> Docentes -> Usuarios` con datos reales y diferentes combinaciones de roles.

Pendientes inmediatos:
- Confirmar en ambiente integrado que alta de docente en Ciencias Empresariales persiste y aparece en su pestaña sin errores.
- Validar criterio de `usuarioPrincipal` cuando un docente tenga multiples usuarios asociados (prioridad de rol/estado mostrada en tabla).
- Ejecutar smoke test de navegacion para retorno contextual desde formulario de usuarios hacia docentes.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-18

Modulo trabajado:
Autenticacion y proteccion de rutas (frontend).

Cambios realizados:
- Se endurecio la inicializacion de sesion en `AuthContext` para validar token JWT al cargar la aplicacion:
  - si token ausente, invalido, vencido o usuario persistido corrupto, se limpia sesion y queda estado no autenticado.
- Se reforzo `PrivateRoute` para permitir acceso a rutas internas solo cuando existe sesion autenticada valida.
- Se agrego `PublicOnlyRoute` para evitar ingreso a `/login` cuando el usuario ya tiene sesion valida (redirige a `/`).
- Se agrego redireccion de fallback en rutas privadas para evitar navegacion a rutas internas no definidas.
- Se agrego interceptor de respuesta en `api.js` para manejar `401`:
  - limpia sesion local y redirige a `/login` cuando corresponda.

Estado actual del proyecto:
- Al abrir la app sin sesion valida, el sistema redirige al login y no renderiza modulos internos.
- Si el usuario intenta navegar manualmente a rutas privadas sin autenticacion, queda redirigido a `/login`.
- Si el usuario tiene sesion valida, mantiene acceso normal a los modulos internos.
- Build de frontend en estado OK tras los cambios.

Pendientes inmediatos:
- Validar en ambiente integrado flujo completo de expiracion real de token (expirada por tiempo) para confirmar redireccion automatica por `401`.
- Validar navegacion directa por URL en rutas internas representativas sin token en localStorage.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-18

Modulo trabajado:
Control de Usuarios (flujo Crear acceso desde Gestion de Docentes).

Cambios realizados:
- Se ajusto `UsuarioFormPage` para que, al abrir `Nuevo Usuario` desde `Gestion de Docentes` con query `from=docentes` e `id_docente`, el campo `username` se autocomplemente con la `identificacion` (cedula) del docente preasociado.
- Se forzo `password` vacio en el flujo de creacion para evitar arrastre de valores previos en estado de formulario.
- Se agregaron atributos de autocompletado en inputs de credenciales:
  - `username`: `autoComplete="off"`
  - `password`: `autoComplete="new-password"`
  para reducir precarga automatica no deseada en el flujo de alta.

Estado actual del proyecto:
- En `Gestion de Docentes` -> `Crear acceso` (docente sin usuario):
  - `Username` queda autocompletado con cedula del docente.
  - `Contrasena` se presenta vacia para captura manual del administrador.
- El resto de preasociaciones existentes (`rol`, `id_docente`, retorno contextual) se mantiene sin cambios.
- Build frontend en estado OK tras el ajuste.

Pendientes inmediatos:
- Validar en ambiente integrado con varios docentes sin acceso que el username tome siempre la identificacion correcta.
- Confirmar en navegador objetivo (Chrome/Edge) que no se inyecten credenciales guardadas en el campo de contrasena para este flujo.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-18

Modulo trabajado:
Gestion de Docentes (orden por recientes y paginacion del listado por facultad).

Cambios realizados:
- Se ajusto el listado tabulado de `Docentes` para ordenar por defecto de mas reciente a mas antiguo:
  - prioridad por `created_at DESC` cuando el campo existe y es valido.
  - fallback robusto a `id_docente DESC` para mantener orden descendente en todos los escenarios.
- Se implemento paginacion en tabla con tamano fijo de 5 registros por pagina.
- Se agregaron controles de navegacion:
  - `Anterior`
  - `Siguiente`
  - numeracion de paginas en desktop.
- Se agrego reinicio de pagina a `1` cuando cambia la facultad activa o el filtro de busqueda.
- Se mantiene el orden descendente en todas las paginas de la tabla.

Estado actual del proyecto:
- Al entrar a Gestion de Docentes, cada facultad muestra primero los docentes mas recientes y limita la vista a 5 filas por pagina.
- La navegacion permite recorrer todos los registros sin perder el orden establecido.
- Build frontend en estado OK tras la implementacion.

Pendientes inmediatos:
- Validar en ambiente integrado que el campo `created_at` llegue de forma consistente desde backend para confirmar prioridad de orden por fecha real.
- Ejecutar prueba UX en mobile para asegurar comodidad de uso de paginacion cuando hay multiples paginas.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-23

Modulo trabajado:
Agendas docentes (correccion de loading infinito en frontend + ajuste de alcance ADMIN en backend de agendas).

Cambios realizados:
- Frontend (`Agendas.jsx`):
  - Se corrige condicion de render que mantenia "Cargando agendas..." en bucle cuando `cargando=false` pero `anioActivo=null` (caso sin datos o con error).
  - Se agrega estado `errorCarga` y manejo de errores funcional en UI con mensaje:
    - `No fue posible cargar las agendas`
    - detalle real del backend cuando viene en respuesta.
  - Se agrega accion `Reintentar` para relanzar consulta al endpoint `/api/agendas`.
  - Se normaliza respuesta para asegurar que `agendas` siempre sea arreglo.
- Backend (`agenda.service.ts`):
  - Se ajusta `obtenerScope` para rol `ADMIN` con fallback controlado cuando `ScopeService` retorna `403` por ausencia de docente/facultad asociada.
  - Se mantiene seguridad: errores `401` (token/usuario invalido) no usan fallback.
  - Se habilita alcance global real para ADMIN en consultas/validaciones clave de agenda (listar, validar agenda, validar docente), evitando filtros por facultad cuando el rol es ADMIN.

Estado actual del proyecto:
- La pantalla `Agendas docentes` ya no debe quedar en loading infinito.
- Ante error de backend, el usuario ve diagnostico claro y opcion de reintento.
- El rol ADMIN puede consultar agendas sin bloqueo por scope de facultad en este modulo.
- Build de frontend y backend en estado OK tras los ajustes.

Pendientes inmediatos:
- Validar en ambiente integrado la respuesta HTTP real de `GET /api/agendas` para el usuario reportado y confirmar render de tablas por periodo.
- Verificar en navegador (Network) escenarios:
  - respuesta exitosa con datos,
  - respuesta vacia,
  - error 4xx/5xx con mensaje funcional en UI.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-23

Modulo trabajado:
Agendas docentes (listado + formulario de apertura de agenda).

Cambios realizados:
- Listado (`Agendas.jsx`):
  - Se mantiene orden descendente por recencia y se robustece criterio:
    1) `fecha_diligenciamiento` DESC
    2) `createdAt/created_at` DESC (si existe en payload)
    3) `id_agenda` DESC
  - Se elimina visualizacion de estado (`Borrador/Enviada/Aprobada/Rechazada`) en tabla para simplificar la vista.
- Formulario (`AgendaFormPage.jsx`):
  - Se elimina completamente el bloque visual `Estado de agenda`.
  - En creacion, el frontend envia estado fijo `Aprobada` de forma interna (campo oculto al usuario).
- Backend (`agenda.service.ts`):
  - En `crear(...)` se fuerza persistencia con `estado: 'Aprobada'` ignorando valores variables del cliente.
  - En `obtenerTodas(...)` se refuerza orden SQL con `fecha_diligenciamiento DESC` + `id_agenda DESC`.

Estado actual del proyecto:
- El listado de Agendas muestra primero registros recientes y ya no renderiza la columna/badge de estado.
- La pantalla `Nueva Agenda` ya no muestra selector de estado.
- Toda agenda nueva queda almacenada automaticamente con estado `Aprobada`.
- Build de frontend y backend en estado OK tras los ajustes.

Pendientes inmediatos:
- Validar funcionalmente en ambiente integrado que las nuevas agendas aparezcan en la parte superior del listado en todos los escenarios de filtros por anio.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-23

Modulo trabajado:
Agendas docentes (ajuste de orden descendente por ID de agenda).

Cambios realizados:
- Backend de agendas ajustado para listar con `ORDER BY agenda.id_agenda DESC` como criterio principal.
- Frontend de `Agendas` ajustado para no reordenar localmente y respetar el orden recibido desde backend.

Estado actual del proyecto:
- El listado de agendas muestra primero los IDs mas altos (registros mas nuevos) y al final los IDs mas bajos.
- La paginacion mantiene consistencia porque opera sobre el orden entregado por backend.
- Build de backend y frontend en estado OK.

Pendientes inmediatos:
- Validar en ambiente integrado: crear agenda nueva y confirmar que aparece en la primera posicion del listado.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-23

Modulo trabajado:
Agendas docentes (orden de docentes en Nueva Agenda + restitucion de estado en listado).

Cambios realizados:
- Backend (`docente.service.ts`):
  - Se ajusta `listarDocentes` para ordenar por `id_docente DESC`, permitiendo que el select de docentes en `Nueva Agenda` priorice registros recientes.
- Frontend (`AgendaFormPage.jsx`):
  - Se normaliza carga de docentes para mantener orden descendente por `id_docente` antes de renderizar opciones en `Seleccione docente`.
- Frontend (`Agendas.jsx`):
  - Se restituye columna `Estado` en el listado principal.
  - Se agrega badge visual con colores por estado, soportando estados operativos actuales y variantes existentes (`En_Elaboracion`, `En_Revision`, `Con_Observaciones`, `Aprobada`, etc.).

Estado actual del proyecto:
- En `Nueva Agenda`, los docentes mas nuevos se muestran primero en el select.
- En `Agendas docentes`, vuelve a visualizarse el estado por agenda con badge claro y legible.
- Paginacion, filtros y acciones del listado se mantienen operativos.
- Build de frontend y backend en estado OK.

Pendientes inmediatos:
- Validar en ambiente integrado que los estados almacenados en BD se muestren con el badge/color esperado segun catalogo funcional vigente.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-23

Modulo trabajado:
Nueva agenda (estado oculto con asignacion automatica en creacion).

Cambios realizados:
- Se mantiene oculto el campo `estado` en formulario `Nueva agenda`.
- Frontend de creacion ajustado para enviar `estado: 'En_Elaboracion'` al crear.
- Backend de creacion de agenda ajustado para forzar persistencia con `estado: 'En_Elaboracion'`.
- DTO y entidad de agenda ajustados para incluir estados operativos actuales:
  - `En_Elaboracion`
  - `En_Revision`
  - `Con_Observaciones`

Estado actual del proyecto:
- Al crear una agenda, el estado queda automaticamente en `En_Elaboracion` sin intervención del usuario.
- El formulario no expone visualmente el campo de estado.
- Build de frontend y backend en estado OK tras los cambios.

Pendientes inmediatos:
- Validar en ambiente integrado que la columna `estado` de la BD admita `En_Elaboracion` en el enum fisico (si el esquema aun conserva solo estados legacy, se requiere ajuste de BD).

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-23

Modulo trabajado:
Agendas docentes (mejora visual de badges de estado en listado).

Cambios realizados:
- Se estandariza el render de estado en `Agendas.jsx` con helper dedicado:
  - `getEstadoClass(estado)`
  - `getEstadoLabel(estado)`
- Se ajusta mapeo visual solicitado para estados del enum actual:
  - `En_Elaboracion` -> gris
  - `En_Revision` -> azul
  - `Con_Observaciones` -> amarillo/naranja
  - `Aprobada` -> verde

Estado actual del proyecto:
- La columna `Estado` muestra badges diferenciados por color y texto legible segun estado real.
- Build frontend en estado OK tras el ajuste.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-23

Modulo trabajado:
Gestion de Docentes (correccion de carga para usuarios ADMIN y diagnostico de errores de consultas facultades/docentes).

Cambios realizados:
- Se corrigio backend en `DocenteService` para tolerar usuarios `ADMIN` sin `id_docente` asociado al resolver scope del modulo Docentes.
- Se mantuvo seguridad: el fallback solo aplica ante errores `403` de scope y conserva rechazo para errores `401` (token invalido/usuario no autorizado).
- Se ajusto frontend `Docentes.jsx` para cargar `facultades` y `docentes` con `Promise.allSettled`, evitando falso negativo de "No hay facultades registradas" cuando falla solo la consulta de docentes.
- Se agrego diagnostico visual diferenciado:
  - error real de carga de facultades,
  - error real de carga de docentes,
  - ausencia real de datos en BD.

Estado actual del proyecto:
- Un usuario ADMIN debe visualizar facultades aunque falle temporalmente la consulta de docentes.
- Se elimina el escenario donde un error del endpoint `/admin-docente/docentes` vaciaba facultades en UI y mostraba mensaje incorrecto.
- Build de backend y frontend en estado OK luego del ajuste.

Pendientes inmediatos:
- Validar en ambiente integrado con el usuario reportado (`18128903`) el rol efectivo en JWT y la respuesta de `/api/admin-docente/docentes`.
- Confirmar con datos reales de BD que el listado tabulado muestra docentes por facultad despues del ajuste.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-23

Modulo trabajado:
Agendas docentes (cierre de ajustes funcionales en listado y formulario Nueva agenda).

Cambios realizados:
- Se estabilizo la carga de `Agendas docentes` para evitar loading infinito y mostrar diagnostico funcional cuando falla el endpoint.
- Se alineo el orden del listado de agendas a `id_agenda DESC` desde backend y se elimino reordenamiento contradictorio en frontend.
- Se ajusto `Nueva agenda` para mantener estado oculto y persistir automaticamente `estado = 'En_Elaboracion'`.
- Se restablecio la visualizacion de estado en el listado con badges por estado (`En_Elaboracion`, `En_Revision`, `Con_Observaciones`, `Aprobada`).
- Se ordeno el select de docentes de `Nueva agenda` por `id_docente DESC` (docentes mas recientes primero).

Estado actual del proyecto:
- El modulo `Agendas docentes` lista registros en orden descendente por ID de agenda y mantiene paginacion consistente.
- El formulario `Nueva agenda` no expone el campo estado y crea agendas en `En_Elaboracion`.
- La tabla de agendas muestra estado en badge con colores diferenciados segun flujo operativo.
- Build de backend y frontend en estado OK tras los cambios.

Trabajo en curso:
- Validacion integrada en ambiente real con usuarios ADMIN para confirmar comportamiento extremo de scope y consistencia de estados en toda la trazabilidad (creacion -> listado -> edicion).

Pendientes inmediatos:
- Verificar en BD productiva que el enum fisico de `agenda_docente.estado` incluya `En_Elaboracion`, `En_Revision` y `Con_Observaciones`.
- Ejecutar prueba funcional final: crear agenda nueva y confirmar primera posicion por `id_agenda DESC` + badge de estado correcto en listado.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-23

Modulo trabajado:
Estandarizacion visual de formularios y consultas (frontend) con base de tarjetas modernas y paleta institucional verde.

Cambios realizados:
- Se centralizo la capa visual de formularios en `frontend/src/index.css` bajo alcance `.sigedin-form-theme`.
- Se definieron tokens de estilo para tarjetas, sombras, radios, focos y tablas con enfoque verde institucional.
- Se estandarizaron visualmente inputs/selects/textarea con fondo claro, bordes suaves y focus ring verde.
- Se homogenizo presentacion de contenedores tipo card (radio 14px, sombra suave, bordes livianos).
- Se ajusto comportamiento visual de botones principales verdes y elementos previamente azules dentro del alcance de formularios.
- Se aplico el alcance de tema en layout principal y login para cubrir formularios CRUD, filtros de consulta y tablas del sistema sin alterar logica funcional.

Estado actual del proyecto:
- Formularios y vistas de consulta comparten lenguaje visual consistente (cards modernas, sombras suaves, espaciados limpios y acentos verdes).
- Se mantiene responsive y funcionamiento existente; no hubo cambios de negocio ni contratos API.
- Build frontend en estado OK despues del rediseño global.

Pendientes inmediatos:
- Validar visualmente en ambiente integrado todos los flujos CRUD (docentes, usuarios, agendas, actividades, reportes) para ajustes finos de contraste/espaciado si aplica.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-23

Modulo trabajado:
Perfil autenticado (migracion de modal a vista dedicada + actualizacion de datos docentes + cambio de contraseña condicionado por estado de usuario).

Cambios realizados:
- Se reemplazo el flujo de `Perfil` en menu de usuario: ahora navega a ruta dedicada `/perfil` dentro del layout principal (sin modal).
- Se implemento nueva pagina `PerfilPage` con diseño institucional verde (cards modernas, sombras suaves, inputs limpios y espaciado consistente).
- Se mantuvieron campos de solo lectura en perfil:
  - `identificacion`
  - `programa`
- Se habilitaron campos editables:
  - `nombres`, `mail`, `sede`, `tipo_vinculacion`, `tipo_dedicacion`, `escalafon`, `franja`.
- Se incorporo seccion de cambio de contraseña en perfil con validaciones de:
  - contraseña actual,
  - nueva contraseña,
  - confirmación.
- Se condiciono cambio de contraseña a `usuario.activo = 1`; si está inactivo se deshabilitan campos y se informa mensaje funcional.
- En backend, `PATCH /api/perfil` soporta actualizacion de datos de docente y cambio de contraseña en el mismo flujo.

Estado actual del proyecto:
- El perfil del usuario autenticado se gestiona en vista dedicada `/perfil`, sin romper el resto de navegacion.
- Header superior conserva bloque de usuario y al entrar a perfil se cargan datos reales de `docente` relacionado al `usuario`.
- Al guardar, los datos se persisten y se reflejan en sesion/encabezado.
- Build de backend y frontend en estado OK.

Pendientes inmediatos:
- Ejecutar validacion funcional en ambiente integrado con usuario activo e inactivo para confirmar reglas de cambio de contraseña.
- Validar caso de sincronizacion de correo en `usuario.username` cuando el username del usuario es tipo correo.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-23

Modulo trabajado:
Gestion de Docentes (columna Acceso/Usuario con acciones separadas crear/editar).

Cambios realizados:
- Se reemplazo accion unica de `Acceso / Usuario` por dos acciones explicitas por fila:
  - `Crear` (icono + boton verde) para alta de acceso.
  - `Editar` (icono + boton secundario) para administrar acceso existente.
- El flujo de `Crear` mantiene preasociacion automatica de `id_docente` desde la fila y no vuelve a pedir seleccion de docente en el formulario.
- El flujo de `Editar` abre el usuario asociado del docente y mantiene restricciones ya implementadas (desde docentes solo rol/estado/password, username y docente bloqueados).
- Se agrego control UX para evitar duplicados desde esta vista:
  - `Crear` deshabilitado si ya existe usuario asociado.
  - `Editar` deshabilitado si aun no existe usuario.
- Se preserva retorno contextual a `/admin/docentes` con `facultad_id` y `q` luego de guardar en formulario de usuarios.

Estado actual del proyecto:
- La columna `Acceso / Usuario` permite crear y administrar usuario directamente desde Gestion de Docentes con acciones claras y consistentes con la UI institucional.
- Se mantiene intacta la funcionalidad de otros modulos.
- Build frontend en estado OK.

Pendientes inmediatos:
- Validar en ambiente integrado escenarios por fila: crear acceso nuevo, editar acceso existente y mensajes de control en botones deshabilitados.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-23

Modulo trabajado:
Control de visibilidad y acceso por rol (menu lateral + rutas frontend).

Cambios realizados:
- Se centralizo la matriz de acceso por rol en `frontend/src/config/roleAccess.js` para menu y rutas.
- Se ajusto `Sidebar.jsx` para mostrar opciones dinamicamente segun rol autenticado:
  - ADMIN: Administracion + Supervision + Actividades + Seguimiento + Informes.
  - DECANO: Supervision + Actividades + Seguimiento + Informes.
  - DOCENTE: Actividades + Seguimiento + Informes.
- Se implemento guardia de rutas por rol en `App.jsx` (`RoleRoute`) para evitar acceso por URL a modulos no permitidos.
- Se protegieron explicitamente rutas de supervision, actividades, seguimiento, informes y todo bloque `/admin/*` por rol.

Estado actual del proyecto:
- El menu lateral responde automaticamente al rol del usuario al cargar la aplicacion.
- Los cambios de visibilidad no requieren recarga completa y mantienen diseno actual del sidebar.
- La validacion de permisos ya no es solo visual; tambien bloquea navegacion directa por rutas no autorizadas.
- Build frontend en estado OK.

Pendientes inmediatos:
- Validar con sesiones reales de ADMIN, DECANO y DOCENTE que la navegacion permitida/denegada coincida con politica funcional esperada.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-23

Modulo trabajado:
Perfil autenticado (header superior + modal Mi perfil + endpoints de perfil docente autenticado).

Cambios realizados:
- Se agregaron endpoints autenticados `GET /api/perfil` y `PATCH /api/perfil` para consultar/actualizar el docente asociado al usuario logueado, con restricciones de campos editables.
- En frontend se implemento modal `Mi perfil` abierto desde el menu del bloque de usuario en header (junto a campanita), sin navegar a pantalla aparte.
- Se corrigio fuente de datos del bloque superior de usuario para priorizar datos reales de `docente` (nombre e identificacion) y mantener `rol` desde `usuario`.
- Se elimino dependencia de mostrar username como nombre principal cuando existe docente asociado.
- Se agrego sincronizacion de sesion en `AuthContext` para refrescar en caliente los datos de `usuario.docente` despues de guardar perfil.

Estado actual del proyecto:
- El header muestra nombre/cédula reales del docente asociado (`docente.nombres`, `docente.identificacion`) y badge de rol del usuario autenticado.
- El menu de usuario incluye `Perfil` y `Cerrar sesion`; `Perfil` abre modal moderno y permite editar solo campos permitidos.
- Campos bloqueados en perfil: identificacion y programa.
- Build backend/frontend en estado OK tras los cambios.

Pendientes inmediatos:
- Validar en ambiente integrado con usuarios reales (ADMIN/DOCENTE) que todos los usuarios con `id_docente` asociado visualicen datos correctos en header.
- Confirmar comportamiento esperado para usuarios sin docente asociado (mensaje controlado en modal, sin ruptura de UI).

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-23

Modulo trabajado:
Cierre de sesion de desarrollo (actualizacion de memoria tecnica del proyecto).

Cambios realizados:
- No se realizaron cambios funcionales de backend ni frontend en esta iteracion de cierre.
- Se actualizo la documentacion de memoria operativa y de historial para consolidar estado de avance y pendientes vigentes.

Estado actual del proyecto:
- Queda vigente la implementacion de control de roles en menu/rutas, flujo de perfil dedicado en `/perfil` y acciones crear/editar acceso en Gestion de Docentes.
- Backend y frontend permanecen en estado compilable segun validaciones previas de la sesion.

Trabajo en curso:
- Validacion funcional integrada en ambiente real para confirmar permisos por rol (ADMIN/DECANO/DOCENTE), flujo de perfil y operaciones de acceso por docente.

Pendientes inmediatos:
- Ejecutar pruebas E2E por rol para confirmar visibilidad de menu y bloqueo de rutas no autorizadas.
- Validar flujo de perfil con usuarios activos/inactivos, incluyendo cambio de contraseña condicionado por `usuario.activo`.
- Verificar escenarios de Gestion de Docentes: crear acceso, editar acceso y retorno al contexto de facultad/filtro.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-24

Modulo trabajado:
Gestion de Actividades (correccion de sumatorias por corte y rediseño del resumen inferior para docente autenticado).

Cambios realizados:
- Backend (`ActividadService`): se corrige `GET /api/actividades/resumen-cortes` para sumar `plan_corte_actividad` filtrando por `id_agenda` de la solicitud (join con `actividad`), evitando acumulados globales por `id_corte`.
- Backend: el resumen por corte ahora toma `horas_planeadas_total` solo de actividades de la agenda en contexto y usa `MAX(numero_semanas)` del plan por corte como fuente principal (con fallback a calculo por fechas).
- Frontend (`Actividades.jsx`): se reemplazan los bloques inferiores de cortes por tarjeta/tabla resumen moderna con columnas `Corte 1`, `Corte 2`, `Corte 3`, `Total` y filas `Semanas`/`Horas`.
- Frontend: se agrega encabezado del resumen con `Periodo` y `Horas/semana del docente` para reforzar lectura del contexto autenticado.

Estado actual del proyecto:
- El modulo Actividades ya no debe mostrar horas infladas por mezcla de docentes al calcular cortes.
- El resumen inferior presenta matriz clara por periodo con totales de semanas y horas del docente/agendada seleccionada.
- Build de backend y frontend en estado OK tras los ajustes.

Pendientes inmediatos:
- Validar en ambiente integrado con usuario docente real (`CC 18128909`) que los valores por corte correspondan a su agenda (ejemplo esperado: 80h, 60h, 50h para 2026-A).
- Validar escenario ADMIN con selector de agenda para confirmar que la tabla resume solo la agenda elegida (sin mezcla entre agendas).

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-24

Modulo trabajado:
UI global - contraste de texto sobre superficies verdes (accesibilidad visual).

Cambios realizados:
- Se aplico regla global en `frontend/src/index.css` para forzar texto blanco sobre fondos verdes oscuros/institucionales y variantes usadas en el sistema.
- Se incluyeron selectores reutilizables para clases comunes y heredadas de componentes:
  - `.bg-institutional-green`, `.bg-institutional-dark`
  - `.bg-success`, `.badge-success`, `.total-bar`, `.summary-bar`
  - clases con color hexadecimal verde (`#051F20`, `#235347`, `#173831`, `#006431`, `#005229`, `#1F9D78`, `#8CB79B`).
- Se ajustaron casos puntuales con `text-black` sobre fondo verde en:
  - `Actividades.jsx` (chips de totales)
  - `SeguimientoNuevo.jsx` (botones de corte no activo).

Estado actual del proyecto:
- Los elementos con fondo verde oscuro/institucional mantienen texto blanco de forma consistente, incluyendo contenido interno.
- Se preserva legibilidad en estados `hover` y `active`.
- Build frontend en estado OK despues del ajuste.

Pendientes inmediatos:
- Validar visualmente en ambiente integrado componentes deshabilitados (`disabled`) con fondo no verde para confirmar contraste final por navegador.
- Ejecutar smoke test visual rapido en modulos clave: Actividades, Seguimiento, Informes, Agendas y formularios administrativos.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-24

Modulo trabajado:
Supervision (rol DECANO) - dashboard analitico de facultad con acciones operativas por corte/docente.

Cambios realizados:
- Backend:
  - Se implementa endpoint BI principal `GET /api/supervision/dashboard` con resumen de semestre y detalle por cortes (`corte1`, `corte2`, `corte3`).
  - Se agrega resolucion de facultad para DECANO usando `facultad.id_docente_decano` como criterio de alcance.
  - Se agregan endpoints operativos para tabla de supervision:
    - `GET /api/supervision/evidencias`
    - `PATCH /api/supervision/aprobar-informe`
    - `PATCH /api/supervision/observaciones`
  - Se mantiene compatibilidad con endpoints legacy de dashboard de supervision reutilizando la nueva logica.
- Frontend:
  - Se rediseña `Supervision.jsx` en formato analytics moderno (KPI cards, radial de avance, comparativo planeado vs ejecutado, tabla por cortes con tabs).
  - Se implementan acciones por docente en cada corte:
    - revisar evidencias (modal con detalle por seguimiento)
    - aprobar informe
    - enviar observaciones (modal + guardado backend).

Estado actual del proyecto:
- El modulo de supervision ya entrega vision macro semestral y detalle por docente/corte con filtros estrictos por facultad del decano autenticado.
- La interfaz queda orientada a toma de decisiones (cumplimiento, pendientes y semaforizacion de avance).
- Build backend y frontend en estado OK tras la implementacion.

Pendientes inmediatos:
- Validar con datos reales la formula funcional de horas planeadas para supervision frente a la configuracion actual de `plan_corte_actividad` en ambiente productivo.
- Ejecutar prueba integral con usuario DECANO real para confirmar aislamiento total de facultad y acciones de aprobacion/observaciones.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-24

Modulo trabajado:
Supervision (DECANO) - correccion de resolucion de facultad por `id_docente_decano` usando identificacion limpia.

Cambios realizados:
- Backend (`seguimiento.service.ts`):
  - Se ajusta la resolucion de facultad para rol DECANO para usar `docente.identificacion` del usuario autenticado y compararla contra `facultad.id_docente_decano`.
  - Se agrega normalizacion de identificacion (elimina espacios, puntos, comas y guiones) antes de comparar.
  - Se agrega fallback controlado con `scope.idDocente` normalizado para escenarios legacy.
  - Si no hay coincidencia, se retorna mensaje explicito: `No se encontró facultad asociada al decano actual`.
- Frontend (`Supervision.jsx`):
  - Se reemplaza fallback visual `Sin facultad` por mensaje funcional: `No se encontró facultad asociada al decano actual`.

Estado actual del proyecto:
- El encabezado de Supervisión queda alineado a la regla de negocio del modelo relacional (`facultad.id_docente_decano`).
- El dashboard continua filtrando toda la analitica por `id_facultad` resuelto para el decano autenticado.
- Build backend y frontend en estado OK tras el ajuste.

Pendientes inmediatos:
- Validar con usuario DECANO real (`CC 18128912`) que el nombre de facultad se visualice correctamente en encabezado.
- Confirmar en ambiente integrado que no se muestren registros de otras facultades tras la resolucion por identificacion limpia.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-24

Modulo trabajado:
Supervision - correccion de inflado de horas planeadas por corte/semestre.

Cambios realizados:
- Backend (`seguimiento.service.ts`):
  - Se corrige formula de horas planeadas en consultas de `GET /api/supervision/dashboard` para evitar multiplicacion duplicada por semanas.
  - Se reemplaza agregacion incorrecta `SUM(pca.horas_planeadas * pca.numero_semanas)` por `SUM(pca.horas_planeadas)` en:
    - resumen semestral macro,
    - tabla por docente en cada corte.
  - Se mantiene agrupacion por actividad y luego por docente/corte para evitar duplicidad por joins.

Estado actual del proyecto:
- Los valores planeados de Supervision quedan alineados con Actividades (misma base de `plan_corte_actividad.horas_planeadas`).
- Para casos como 20h/sem con 8,6,5 semanas, los cortes deben reflejar 160/120/100 y total 380 (sin sobreconteo).
- Build backend en estado OK tras la correccion.

Pendientes inmediatos:
- Validar en ambiente integrado con el docente `CC 18128909` que Supervision y Actividades muestren exactamente los mismos planeados por corte y total semestre.
- Ejecutar smoke test de supervision por facultad para confirmar que no hay mezcla de datos entre docentes/facultades.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-24

Modulo trabajado:
Supervision - tabla "Cumplimiento por docente" (paginacion, orden y pestaña Avance general).

Cambios realizados:
- Frontend (`Supervision.jsx`):
  - Se agrega paginacion por pestaña con 5 docentes por pagina (`Anterior`, `Siguiente`, botones numerados).
  - Se mantiene estado de pagina independiente para `Corte 1`, `Corte 2`, `Corte 3` y `Avance general`.
  - Se agrega pestaña `Avance general` en el bloque inferior.
  - Se ordenan filas por mayor `% avance` y, en empate, por mayor `horas_ejecutadas`.
  - El `% avance` se muestra redondeado a entero y acotado entre 0 y 100.
  - Se ajusta semaforizacion visual a regla solicitada:
    - Verde: 80-100
    - Amarillo: 50-79
    - Rojo: 0-49
  - Las acciones (`Revisar`, `Aprobar`, `Observar`) funcionan tambien en `Avance general`, resolviendo corte de accion por fila.
- Backend (`seguimiento.service.ts`):
  - Se agrega arreglo consolidado `cortes.avance_general` en `GET /api/supervision/dashboard`.
  - El acumulado semestral por docente suma cortes 1+2+3 sin duplicar docentes y conserva alcance por facultad.

Estado actual del proyecto:
- El decano visualiza primero docentes con mayor cumplimiento en cada pestaña.
- La tabla inferior muestra maximo 5 docentes por pagina con navegacion clara.
- `Avance general` presenta acumulado semestral por docente y mantiene acciones operativas.
- Build backend y frontend en estado OK tras los ajustes.

Pendientes inmediatos:
- Validar en ambiente integrado que el orden/paginacion coincidan con dataset real de cada corte.
- Confirmar con usuario DECANO que la pestaña `Avance general` cumple el flujo operativo esperado para acciones por docente.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-24

Modulo trabajado:
Supervision - correccion de datos vacios en pestaña `Avance general`.

Cambios realizados:
- Backend (`seguimiento.service.ts`):
  - Se agrega alias `cortes.general` apuntando al mismo consolidado de `cortes.avance_general` para robustecer compatibilidad del payload.
- Frontend (`Supervision.jsx`):
  - Se ajusta la pestaña para consumir `cortes.avance_general`.
  - Se mantiene fallback a `cortes.general` por compatibilidad.
  - Se corrigen condiciones de encabezado de columnas semestrales para el key `avance_general`.

Estado actual del proyecto:
- La pestaña `Avance general` ya no depende de un registro fisico en BD; muestra acumulado dinamico de los tres cortes por docente.
- Se mantiene filtro por facultad del decano y no se mezclan docentes de otras facultades.
- Build backend y frontend en estado OK tras la correccion.

Pendientes inmediatos:
- Validar en ambiente integrado con dataset real que `Avance general` liste docentes esperados aun cuando algun corte tenga valores en cero.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-24

Modulo trabajado:
Cierre tecnico del modulo de Supervision (DECANO) con consolidacion de avance general, orden/paginacion y ajustes de consistencia frontend-backend.

Cambios realizados:
- Se corrigio el inflado de horas planeadas en Supervision para alinear formula con Actividades (`SUM(pca.horas_planeadas)` sin multiplicacion adicional por semanas).
- Se ajusto la resolucion de facultad para DECANO usando identificacion limpia contra `facultad.id_docente_decano` y mensaje explicito cuando no existe asociacion.
- Se implemento paginacion de 5 docentes por pagina en `Cumplimiento por docente` con controles `Anterior`, `Siguiente` y numeracion por pagina/tab.
- Se aplico orden por mayor `% avance` (descendente) y desempate por mayor `horas_ejecutadas`.
- Se agrego y estabilizo pestaña `Avance general` con acumulado dinamico por docente (Corte 1 + Corte 2 + Corte 3), evitando dependencia de registros inexistentes.
- Se corrigio desalineacion de claves entre backend y frontend para `avance_general` y se agrego alias de compatibilidad (`general`).

Estado actual del proyecto:
- El dashboard de Supervision presenta metricas coherentes con el modulo de Actividades.
- La tabla inferior funciona por pestañas (`Corte 1`, `Corte 2`, `Corte 3`, `Avance general`) con orden, formato de porcentaje entero (0-100) y paginacion operativa.
- Se mantiene aislamiento por facultad del decano autenticado y no mezcla de docentes de otras facultades.
- Build de backend y frontend en estado OK.

Trabajo en curso:
- Validacion funcional integrada con usuarios reales DECANO y dataset completo de facultad para confirmar experiencia final E2E.

Pendientes inmediatos:
- Validar en ambiente integrado el caso docente `CC 18128909` para verificar equivalencia exacta de planeados por corte y semestre entre Actividades y Supervision.
- Ejecutar smoke test de acciones por docente en Supervision (`Revisar`, `Aprobar`, `Observar`) en pestañas por corte y `Avance general`.
- Confirmar en QA que la paginacion por pestaña mantiene estado esperado al cambiar de tab y recargar dashboard.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-27

Modulo trabajado:
Supervision (filtro de docentes con agenda activa por periodo) + redireccion inicial por rol al iniciar sesion.

Cambios realizados:
- Backend (`seguimiento.service.ts`): en `obtenerSupervisionDashboard` se cambio la relacion con `agenda_docente` de `LEFT JOIN` a `INNER JOIN` filtrada por `ad.id_periodo`, tanto en resumen semestral como en detalle por cortes.
- Con esto, la tabla `Cumplimiento por docente` y metricas de supervision solo consideran docentes con agenda programada en el periodo activo seleccionado.
- Se mantiene el filtro por facultad para rol DECANO/ADMIN y la resolucion de decano por `facultad.id_docente_decano` con identificacion limpia.
- Frontend (`App.jsx`): se implemento redireccion inicial por rol en ruta raiz:
  - `DECANO` -> `/supervision`
  - `DOCENTE` -> `/seguimiento`
  - `ADMIN` -> `/admin/agendas` (equivalente funcional a administracion de agendas docentes)

Estado actual del proyecto:
- Supervision ya no debe listar docentes sin agenda en el periodo activo.
- La ruta inicial posterior al login queda alineada al rol del usuario y evita carga por defecto de Actividades para todos.
- Build de backend y frontend en estado OK tras los ajustes.

Pendientes inmediatos:
- Validar en ambiente integrado con periodo activo real (ej. 2026-A) que no aparezcan docentes sin agenda.
- Validar con usuario DECANO que no se mezclen docentes de otras facultades en `Cumplimiento por docente`.
- Ejecutar prueba E2E de login por rol para confirmar redireccion esperada (ADMIN/DECANO/DOCENTE).

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-27

Modulo trabajado:
UI global - correccion de contraste visual en contenedores verdes.

Cambios realizados:
- Se corrige regla global en `frontend/src/index.css` que aplicaba fondo verde a elementos `.text-institutional-blue` dentro de `.sigedin-form-theme`, generando barras/rectangulos no deseados.
- Se endurece la politica global de contraste para forzar `color: #FFFFFF` en texto y contenido interno de contenedores con fondo verde institucional/oscuro.
- Se incluye cobertura para clases de fondo verdes institucionales y variantes verdes oscuras comunes (`bg-institutional-green`, `bg-institutional-dark`, `bg-institutional-blue`, `bg-primary`, `bg-success`, `badge-success`, `total-bar`, `summary-bar`, tonos verdes y emerald oscuros).
- No se alteraron layouts, tamanos, posiciones, logica de negocio, backend ni base de datos.

Estado actual del proyecto:
- El texto dentro de rectangulos/badges/tabs/barras verdes debe renderizarse en blanco para mantener legibilidad.
- Se elimina el efecto visual no deseado del tipo "barra verde" asociado al uso de `text-institutional-blue`.
- Build de frontend en estado OK despues del ajuste.

Pendientes inmediatos:
- Validar visualmente en ambiente integrado modulos con alta densidad de badges/tabs verdes (Facultades, Supervision, Actividades, Seguimiento, Agendas).
- Confirmar en QA que no existan regresiones de contraste en estados hover/active/deshabilitado.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-27

Modulo trabajado:
Gestion de Docentes (formulario Nuevo/Editar) - defaults ocultos y control de sede por catalogo.

Cambios realizados:
- Frontend (`DocenteFormPage.jsx`):
  - Se ocultan los campos `Escalafon` y `Franja` del formulario en creacion y edicion.
  - Se fuerzan en submit los valores:
    - `escalafon = Titular`
    - `franja = Diurna`
  - `Sede` pasa de input libre a lista desplegable con opciones fijas:
    - `Mocoa`
    - `Sibundoy`
  - Se agrega validacion de submit para impedir envio de sedes fuera del catalogo.
- Backend (`docente.service.ts` y DTO):
  - Se refuerza normalizacion para que `escalafon` y `franja` tomen defaults (`Titular`/`Diurna`) cuando lleguen vacios o no enviados.
  - Se valida sede permitida (`Mocoa` o `Sibundoy`) en servicio.
  - DTO de docente actualizado para restringir `sede` a enum `['Mocoa', 'Sibundoy']` en crear/actualizar.

Estado actual del proyecto:
- En Nuevo Docente y Editar Docente, el usuario ya no visualiza ni modifica `Escalafon` ni `Franja`.
- Los registros se guardan con `Titular` y `Diurna` por defecto.
- `Sede` queda estandarizada a dos opciones de negocio para mantener consistencia de datos.
- Build de backend y frontend en estado OK tras los cambios.

Pendientes inmediatos:
- Validar funcionalmente en ambiente integrado:
  - creacion de docente con sede `Mocoa` y `Sibundoy`;
  - edicion de docente existente confirmando persistencia de defaults ocultos (`Titular`/`Diurna`).

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-27

Modulo trabajado:
Gestion de Docentes - validacion de identificacion (solo cedula numerica).

Cambios realizados:
- Frontend (`DocenteFormPage.jsx`):
  - En campo `Identificacion` se restringe escritura a solo digitos (se eliminan caracteres no numericos en tiempo real).
  - Se agregan atributos `inputMode="numeric"`, `pattern="[0-9]*"` y `maxLength={20}`.
  - Se agrega validacion previa al submit para impedir envio si contiene caracteres no numericos.
  - Se agrega mensaje de error de campo: "La identificación debe contener solo números".
- Backend (`docente.dto.ts` y `docente.service.ts`):
  - DTO de creacion incorpora `@Matches(/^\\d+$/)` para validar solo numeros.
  - Servicio refuerza validacion defensiva en normalizacion (`BadRequestException`) si `identificacion` tiene letras/simbolos.

Estado actual del proyecto:
- La identificacion de docente queda validada de extremo a extremo (UI + API) como dato numerico de cedula.
- Se evita persistencia de identificaciones con letras.
- Build backend/frontend en estado OK.

Pendientes inmediatos:
- Validar flujo de error en UI al intentar pegar texto alfanumerico en identificacion.
- Confirmar en QA que el mensaje de validacion sea consistente con el resto del formulario.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-27

Modulo trabajado:
Gestion de Docentes - retorno al listado conservando facultad activa.

Cambios realizados:
- Se corrige el flujo de navegacion en formulario de docentes (`nuevo`/`editar`) para retornar al listado preservando la facultad origen.
- `DocenteFormPage` ahora toma `id_facultad` (o fallback `facultad_id`) desde querystring y reutiliza ese valor en:
  - boton superior `Volver al listado`,
  - boton inferior `Cancelar`,
  - redireccion posterior a guardar.
- En listado `Docentes`:
  - se acepta `id_facultad` como parametro de entrada (con compatibilidad a `facultad_id`),
  - la URL de estado del listado se normaliza con `id_facultad`,
  - el acceso a `Editar` incluye `?id_facultad=<facultad_activa>` para mantener contexto.

Estado actual del proyecto:
- Si el usuario abre `Nuevo Docente` o `Editar Docente` desde una facultad especifica, al volver retorna a esa misma facultad activa.
- Se evita la regresion de volver siempre a la primera facultad.
- Build de frontend en estado OK.

Pendientes inmediatos:
- Validar manualmente flujo completo desde al menos dos facultades distintas en `Nuevo` y `Editar`.
- Confirmar que retorno desde modulos de usuarios que aun envian `facultad_id` sigue siendo compatible.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-27

Ultima sesion de trabajo:
Cierre de iteracion funcional en Gestion de Docentes + estabilizacion de UX de navegacion y validaciones de captura.

Cambios realizados:
- Supervision: se ajusto filtro para considerar solo docentes con agenda programada en periodo activo y se mantuvo alcance por facultad para DECANO.
- Login/Ruta inicial: se implemento redireccion por rol (`DECANO -> /supervision`, `DOCENTE -> /seguimiento`, `ADMIN -> /admin/agendas`).
- UI global: se corrigio contraste para texto sobre contenedores verdes (texto blanco) y se elimino regla CSS que generaba barras verdes no deseadas.
- Docentes (Nuevo/Editar):
  - `escalafon` y `franja` ocultos en formulario, persistidos con defaults (`Titular`, `Diurna`).
  - `sede` convertida a select cerrado (`Mocoa`, `Sibundoy`).
  - `identificacion` validada como solo numerica (frontend + backend).
  - retorno al listado preservando facultad origen (`id_facultad`) en nuevo/editar/guardar/cancelar.

Estado actual del proyecto:
- Proyecto estable en backend/frontend con build exitoso posterior a todos los cambios de la sesion.
- Gestion de Docentes queda alineada a reglas de negocio actuales (captura controlada, defaults y navegacion contextual).
- Supervision y redireccion por rol operan con logica de alcance y experiencia esperada para usuarios ADMIN/DECANO/DOCENTE.

Trabajo en curso:
- Validacion funcional integrada (QA/UAT) en ambiente con datos reales para confirmar consistencia final de:
  - supervision por periodo y facultad,
  - flujos de docentes (nuevo/editar/volver),
  - contraste visual global en estados activos/hover.

Pendientes inmediatos:
- Ejecutar pruebas E2E por rol (ADMIN, DECANO, DOCENTE) verificando modulo de entrada al login.
- Validar que en `Cumplimiento por docente` no se incluyan docentes sin agenda del periodo activo.
- Validar en QA flujo completo de Gestion de Docentes desde distintas facultades (incluyendo retorno exacto a pestaña origen).
- Confirmar mensajeria de errores de formulario para identificacion/sede con casos invalidos.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-27

Modulo trabajado:
Seguimiento (rediseño integral por rol + dashboard consolidado DECANO/ADMIN + detalle docente en drawer).

Cambios realizados:
- Backend (`seguimiento.controller.ts` + `seguimiento.service.ts`):
  - Se agrega endpoint consolidado por docente con filtros: `GET /api/seguimiento/consolidado`.
  - Se agrega endpoint de historial semanal por docente: `GET /api/seguimiento/docente-historial`.
  - El consolidado soporta filtros por:
    - facultad,
    - programa,
    - docente,
    - estado de avance,
    - semana,
    - corte,
    - tipo de actividad,
    - texto de busqueda (nombre/identificacion).
  - Se incorpora fallback de scope para rol `ADMIN` cuando no existe asociacion docente/facultad en contexto, manteniendo control de seguridad por rol.
  - Se mantiene alcance por facultad para `DECANO` y alcance individual para `DOCENTE`.
- Frontend (`Seguimiento.jsx`):
  - Se rediseña pantalla con logica por rol:
    - `DOCENTE`: vista individual de seguimiento (sin ruptura del flujo actual).
    - `DECANO/ADMIN`: dashboard jerarquico consolidado de docentes del periodo.
  - Se agregan metricas globales:
    - total docentes adscritos,
    - horas planeadas,
    - horas ejecutadas,
    - horas pendientes,
    - porcentaje global,
    - conteo de niveles alto/medio/bajo.
  - Se agregan filtros visibles y rapidos con aplicacion directa:
    - facultad, programa, docente,
    - estado de avance,
    - semana, corte, tipo,
    - buscador en tiempo real.
  - Se implementa toggle de visualizacion:
    - cards,
    - tabla comparativa ordenable,
    - vista jerarquica facultad -> programa -> docente.
  - Se agrega drawer de detalle por docente con:
    - vision macro del semestre,
    - corte actual,
    - semana actual,
    - detalle por tipo,
    - historial semanal.
  - Se reemplaza estado vacio generico en vista global por mensaje contextual con opcion de limpiar filtros.
  - Se incorporan skeleton loaders para carga inicial en vista global.

Estado actual del proyecto:
- Seguimiento ahora responde al rol autenticado con UX diferenciada:
  - docente (individual),
  - decano/admin (consolidado y navegable).
- DECANO/ADMIN ya no dependen de la vista vacia "Sin datos por tipo para este periodo" en contexto global.
- Build de frontend y backend en estado OK tras los cambios.

Pendientes inmediatos:
- Validar en ambiente integrado filtros cruzados (facultad+programa+docente+semana+corte+tipo) con data real por rol.
- Confirmar con usuario DECANO que el alcance de docentes mostrado corresponde exclusivamente a su facultad.
- Validar con usuario ADMIN escenarios globales multi-facultad y orden en vista tabla.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-27

Modulo trabajado:
Actividades (rediseño integral UX/UI con control por roles y vista global para DECANO/ADMIN).

Cambios realizados:
- Frontend (`Actividades.jsx`):
  - Se rediseño completamente la pantalla con estructura dashboard:
    - header informativo con metricas,
    - barra de filtros,
    - vista principal con toggle `Grid` / `Tabla`,
    - detalle de actividades en `drawer` lateral para roles globales.
  - Se implemento control por rol:
    - `DECANO`/`ADMIN`: vista global consolidada de agendas del periodo.
    - `DOCENTE`: vista simplificada de su propia agenda del periodo activo.
  - Se elimino el estado vacio generico de "Sin agenda activa" para `DECANO`/`ADMIN` y se reemplazo por paneles de estado orientados a periodos/filtros.
  - Se agregaron filtros rapidos para vista global:
    - busqueda en tiempo real por docente,
    - estado (`activo`, `sin_actividades`, `pendiente`),
    - rango de fechas (`desde` / `hasta`).
  - Se agregaron indicadores visuales por docente:
    - badge de estado,
    - cantidad de actividades,
    - horas por semana,
    - alerta visual cuando la agenda no tiene actividades.
  - Cada card/fila global ahora permite:
    - `Ver actividades` (abre drawer con detalle),
    - `Nueva actividad` (acceso rapido por agenda).
  - En el detalle de agenda se mantuvo gestion operativa:
    - busqueda de actividades,
    - tabs por tipo,
    - acciones editar/eliminar,
    - resumen por cortes.
- Backend (`agenda.controller.ts`):
  - Se habilito `GET /api/agendas` tambien para rol `DECANO` (ademas de `ADMIN`) para soportar la vista global.
  - Se mantiene el alcance por facultad definido en servicio para usuarios no `ADMIN`.

Estado actual del proyecto:
- El modulo Actividades diferencia correctamente experiencia global (DECANO/ADMIN) vs individual (DOCENTE).
- DECANO/ADMIN pueden navegar agendas docentes del periodo desde un dashboard visual sin depender de selector unico ni mensaje vacio generico.
- Build de frontend y backend en estado OK tras los cambios.

Pendientes inmediatos:
- Validar en ambiente integrado la vista global con usuarios reales `DECANO` para confirmar alcance por facultad y volumen de agendas.
- Ejecutar prueba UX responsive (desktop/tablet/mobile) de grid, tabla y drawer en Actividades.
- Confirmar con usuarios finales si se requiere una tercera vista tipo calendario sobre la misma base de datos ya consolidada.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-27

Modulo trabajado:
Supervision - Vision Macro del Semestre (totales por corte y avance general con formato tipo Excel).

Cambios realizados:
- Frontend (`Supervision.jsx`):
  - Se agrego calculo de totales por pestaña (`Corte 1`, `Corte 2`, `Corte 3`, `Avance general`) usando suma de docentes del tab activo:
    - `total_planeadas`, `total_ejecutadas`, `total_pendientes`.
  - Se implemento porcentaje total por corte con formula correcta:
    - `avance = (total_ejecutadas / total_planeadas) * 100`.
  - Se agrego titulo dinamico por pestaña:
    - `Corte X - Avance Y%`.
    - `Avance General - Avance Y%`.
  - Se agrego barra horizontal de progreso bajo el titulo con semaforizacion:
    - rojo (0-49), amarillo (50-79), verde (80-100).
  - Se agrego fila `TOTAL` al pie de la tabla, alineada con columnas existentes:
    - `TOTAL | planeadas | ejecutadas | pendientes | % avance | (vacio) | (vacio)`.
  - Se mantuvo paginacion/acciones existentes y no se altero la logica individual por docente.

Estado actual del proyecto:
- Supervision muestra resumen por corte y avance general con comportamiento consistente al ejemplo de Excel.
- El porcentaje del corte ya no depende de promedio de porcentajes individuales; ahora se calcula sobre los totales acumulados del tab.
- Build de frontend en estado OK despues del ajuste.

Pendientes inmediatos:
- Validar en ambiente integrado que los totales por pestaña coincidan con el archivo Excel de referencia para casos reales de facultad.
- Confirmar con usuario DECANO que la fila `TOTAL` y la barra de avance cubren el flujo operativo esperado en todas las pestañas.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-27

Modulo trabajado:
Seguimiento (DECANO/ADMIN) - rediseño de entrada tipo Actividades + detalle docente y accion reportar semana contextual.

Cambios realizados:
- Frontend (`Seguimiento.jsx`):
  - Se rediseña la vista global para DECANO/ADMIN con comportamiento tipo Actividades:
    - listado inicial de docentes en cards/grid/tabla/jerarquia,
    - datos de agenda por docente (estado, actividades, horas/semana, periodo, fecha, alerta),
    - accion `Ver detalle` para abrir dashboard individual en drawer,
    - accion rapida `Reportar` por docente.
  - Se integra fuente de datos de agendas (`GET /api/agendas`) junto con consolidado de seguimiento para mantener coherencia entre navegacion por docente y metricas de avance.
  - Se incorpora filtro por fechas de agenda (`desde`/`hasta`) y se ajusta bloque de filtros/toggles para layout limpio y responsive.
  - En drawer de detalle se agrega boton `Reportar semana` contextual al docente seleccionado.
- Frontend (`SeguimientoNuevo.jsx`):
  - Se agrega soporte de `id_docente` por query para cargar actividades filtradas al docente objetivo cuando el origen es DECANO/ADMIN.
- Backend (`seguimiento.controller.ts` + `seguimiento.service.ts`):
  - `GET /api/seguimiento/actividades` ahora acepta `id_docente` opcional.
  - Se valida alcance por rol/facultad para impedir seleccion de docentes fuera del scope del decano/admin.

Estado actual del proyecto:
- DECANO/ADMIN ingresan a Seguimiento viendo primero listado de docentes (misma experiencia base de Actividades).
- Desde la lista pueden abrir detalle individual y reportar semana para el docente seleccionado sin perder contexto.
- DOCENTE mantiene su flujo individual directo.
- Build backend/frontend en estado OK.

Pendientes inmediatos:
- Validar en ambiente integrado con usuarios reales de Ingenierias (Narli/David) que `Reportar semana` desde DECANO registra en el docente correcto.
- Confirmar consistencia final de cards/tabla con criterios de negocio en periodos de prueba (con y sin actividades).

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-27

Modulo trabajado:
Seguimiento individual (frontend) - agrupacion visual por bloques temporales con barra de progreso por bloque.

Cambios realizados:
- Frontend (`Seguimiento.jsx`):
  - Se agrega componente visual de bloque temporal para organizar el dashboard del docente en tres secciones:
    - `Semestre actual`
    - `Corte actual`
    - `Semana actual`
  - Cada bloque incluye:
    - titulo destacado,
    - descripcion contextual,
    - badge de nivel (ALTO/MEDIO/BAJO),
    - barra horizontal de progreso con porcentaje visible,
    - grilla responsive de 4 tarjetas de metricas.
  - Se mantiene la seccion final `Detalle del avance semanal` como cierre del flujo.

Estado actual del proyecto:
- El dashboard individual de seguimiento tiene mejor jerarquia visual y lectura rapida por niveles de tiempo (semestre/corte/semana).
- Build de frontend en estado OK tras el ajuste.

Pendientes inmediatos:
- Validar con usuarios docentes en ambiente integrado que la nueva agrupacion visual mejore comprension sin afectar flujo operativo.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-27

Modulo trabajado:
Seguimiento (vista DOCENTE) - restauracion de estructura original de avance individual.

Cambios realizados:
- Frontend (`Seguimiento.jsx`):
  - Se ajusta la vista de `DOCENTE` para recuperar la secuencia funcional original:
    1) avance del semestre,
    2) avance del corte actual,
    3) avance de la semana actual,
    4) detalle del avance semanal por tipo al final.
  - Se agregan tarjetas de resumen para corte actual y semana actual con horas y porcentaje.
  - Se mantiene la tabla de detalle semanal por tipo y acciones de actualizacion.

Estado actual del proyecto:
- El formulario de seguimiento individual vuelve al flujo visual esperado por usuarios docentes.
- Build de frontend en estado OK tras el ajuste.

Pendientes inmediatos:
- Validar en UI con usuarios docentes reales que el orden y lectura de bloques coincide con el formato operativo esperado.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-27

Modulo trabajado:
Seguimiento - correccion de consistencia por rol DECANO vs Supervision y ajuste visual de bloque de filtros/vistas.

Cambios realizados:
- Backend (`seguimiento.service.ts`):
  - Se alinea alcance de facultad para `DECANO` con la misma logica de Supervision (`resolverFacultadSupervision`) en:
    - consolidado por docente,
    - historial semanal por docente.
  - Se corrige inconsistencia donde Seguimiento podia quedar sin docentes aunque Supervision mostrara datos para el mismo periodo/facultad.
  - Se amplian datos del consolidado por docente con:
    - avance de corte actual,
    - avance de semana actual,
    - horas planeadas/ejecutadas/pendientes para corte y semana actual.
- Frontend (`Seguimiento.jsx`):
  - Se ajusta layout de filtros para mantener controles dentro del card principal (sin desbordes de toggles Cards/Tabla/Jerarquia).
  - Se mejora visualizacion en cards/tabla/jerarquia mostrando avance de corte actual y semana actual por docente.
  - Se cambia accion visible por docente a `Ver detalle` y se mantiene drawer lateral con detalle completo.

Estado actual del proyecto:
- Seguimiento usa el mismo criterio de facultad de DECANO que Supervision, evitando vacios falsos cuando existen docentes con datos en la facultad.
- La vista consolidada muestra mejor contexto operativo por docente (semestre + corte actual + semana actual).
- Build backend/frontend en estado OK.

Pendientes inmediatos:
- Validar en ambiente integrado con usuarios reales (David Rodriguez / Narli Alvear) que la lista consolidada del decano incluya los docentes esperados para 2026-A.
- Confirmar que metricas agregadas de Seguimiento coincidan con Supervision para el mismo alcance y sin filtros activos.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-27

Modulo trabajado:
Seguimiento (QA y ajustes finos de resiliencia de carga y filtros por estado).

Cambios realizados:
- Se agrega advertencia no bloqueante en `Seguimiento.jsx` cuando falla `/api/agendas` pero el consolidado de seguimiento responde correctamente.
- Se mantiene render del listado de docentes con datos de consolidado para evitar falsos estados vacios.
- Se valida y conserva filtro por `estado de avance` (`ALTO/MEDIO/BAJO`) en la vista global.

Estado actual del proyecto:
- El modulo Seguimiento mantiene flujo por rol:
  - `DOCENTE` -> vista individual directa.
  - `DECANO/ADMIN` -> listado de docentes + detalle individual.
- Si agendas falla de forma parcial, la vista informa warning y no bloquea el consolidado.
- Build frontend en estado OK tras el ajuste.

Pendientes inmediatos:
- Ejecutar validacion funcional integrada por rol en ambiente real para confirmar equivalencia de datos entre Seguimiento, Supervision y Actividades para un mismo periodo/docente/facultad.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-27

Modulo trabajado:
Seguimiento - correccion de causa raiz para vista vacia en DECANO y ajuste de alineacion de filtros/vistas.

Cambios realizados:
- Backend (`seguimiento.service.ts`):
  - Se implementa `resolverFacultadDecanoSeguimiento(...)` para resolver facultad efectiva del DECANO con estrategia robusta:
    - candidata por `scope.idFacultad` (coherente con Actividades),
    - candidata por `resolverFacultadSupervision(...)`,
    - seleccion por disponibilidad de agendas en el periodo activo.
  - `obtenerConsolidadoSeguimientoPorDocente` y `obtenerHistorialSemanalDocente` migran a esta resolucion para evitar vacios por facultad desalineada.
  - `resolverDocenteDashboard` usa la misma resolucion para validar `Ver detalle` por docente.
  - Se agrega logging opcional de diagnostico con `SEGUIMIENTO_DEBUG=true` para trazabilidad de rol/facultad/periodo/filtros.
- Frontend (`Seguimiento.jsx`):
  - Se agregan logs de depuracion en desarrollo (`[Seguimiento]`) para request/response de consolidado/agendas.
  - Se mantiene warning no bloqueante cuando falla `/api/agendas`.
  - Se reorganiza grilla de filtros y bloque de botones `Cards/Tabla/Jerarquía` para alineacion limpia dentro del card.

Estado actual del proyecto:
- Seguimiento para DECANO/ADMIN queda alineado al criterio de facultad de Actividades y con fallback compatible con Supervision.
- Se reduce el riesgo de mostrar metricas en cero por resolucion de facultad incorrecta en periodo activo.
- Build de backend y frontend en estado OK.

Pendientes inmediatos:
- Validar en ambiente integrado con usuario Narli Alvear (2026-A) que el consolidado muestre docentes esperados y que `Ver detalle` abra dashboard individual correctamente.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-27

Modulo trabajado:
Seguimiento (DECANO/ADMIN) - flujo listado de docentes -> detalle individual consistente con vista docente.

Cambios realizados:
- Frontend (`Seguimiento.jsx`):
  - Se ajusta la carga consolidada con `Promise.allSettled` para evitar vacio falso cuando falla `/api/agendas` pero existe consolidado.
  - Se corrige filtro `Estado` para operar por avance (`ALTO`, `MEDIO`, `BAJO`) y no por estado de agenda.
  - Se rediseña la tarjeta de docente en vista global para priorizar metricas de seguimiento:
    - horas planeadas (semestre)
    - horas ejecutadas (semestre)
    - % avance general
    - % corte actual
    - % semana actual
    - badge de nivel de avance
  - Se mantiene accion visible `Ver detalle` y `Reportar` por docente.
  - En el drawer de detalle se unifica el diseño con la vista individual de docente usando bloques `Semestre actual`, `Corte actual`, `Semana actual` y `Detalle del avance semanal`.
- Backend (`seguimiento.service.ts`):
  - Se refuerza `resolverDocenteDashboard` para control por rol en consulta individual:
    - `DOCENTE`: solo su dashboard.
    - `DECANO`: valida docente dentro de su facultad resuelta por `resolverFacultadSupervision`.
    - `ADMIN`: permite consulta global por docente existente.

Estado actual del proyecto:
- Al entrar a Seguimiento como `DECANO/ADMIN`, la vista principal presenta primero listado de docentes con resumen de avance.
- Al hacer clic en `Ver detalle`, se muestra panel individual con la misma estructura visual del seguimiento docente (semestre/corte/semana + detalle por tipo).
- El filtro por estado ahora corresponde a niveles de avance y evita inconsistencias de resultado vacio por mapeo incorrecto.
- Build de frontend y backend en estado OK despues de los ajustes.

Pendientes inmediatos:
- Validar en ambiente integrado que el detalle por docente desde `Ver detalle` respete alcance de facultad para usuarios DECANO.
- Ejecutar prueba funcional con filtros combinados (`Docente + Estado + Corte/Semana`) y confirmar coherencia entre cards y detalle individual.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-27

Modulo trabajado:
Estabilidad frontend en Seguimiento (eliminacion de titileo por recargas repetidas).

Cambios realizados:
- Frontend (`Layout.jsx`):
  - Se corrige ciclo de recarga de perfil autenticado que provocaba re-render global continuo.
  - Se agrega comparacion de perfil docente (`esMismoDocente`) para evitar actualizar contexto de sesion cuando datos no cambian.
  - Se evita recreacion innecesaria de `usuario` en `AuthContext` desde `Layout`, reduciendo llamadas repetidas y parpadeo visual.
- Frontend (`Seguimiento.jsx`):
  - Se ajusta `cargarConsolidadoGlobal` para recibir filtros como argumento en lugar de depender de cambios de referencia del estado.
  - Se actualizan botones `Actualizar` y `Aplicar` para enviar filtros activos explicitamente.
  - Se evita recarga automatica no deseada del consolidado al editar filtros, eliminando flashes del skeleton.

Estado actual del proyecto:
- La vista `Seguimiento` deja de titilar por ciclos de carga/re-render continuo.
- El consolidado se recarga solo en eventos esperados (entrada a modulo/cambio de periodo/boton de accion).
- Build frontend en estado OK tras el ajuste.

Pendientes inmediatos:
- Validar en navegador con usuario DECANO el comportamiento estable durante 3-5 minutos (sin parpadeo y sin reinicio de skeleton).
- Confirmar por Network que `/api/perfil` y `/api/seguimiento/consolidado` ya no se ejecutan en bucle.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-27

Modulo trabajado:
Seguimiento (vista DECANO/ADMIN) - simplificacion de filtros de busqueda.

Cambios realizados:
- Frontend (`Seguimiento.jsx`):
  - Se eliminan filtros avanzados del bloque de busqueda global (`Facultad`, `Programa`, `Docente`, `Estado`, `Fechas`, `Semana`, `Corte`, `Tipo`).
  - Se conserva unicamente el buscador por texto de docente (nombre/identificacion) en tiempo real.
  - Se mantiene boton `Limpiar` y los toggles de vista (`Cards`, `Tabla`, `Jerarquía`).
  - Se simplifica estado interno de filtros para usar solo `q`.
  - Se ajusta la logica de filtrado local para aplicar exclusivamente por texto.

Estado actual del proyecto:
- La interfaz de filtros en Seguimiento queda mas simple y enfocada en busqueda por docente.
- El listado consolidado sigue funcionando y se mantiene el cambio de vistas sin impacto en backend.
- Build frontend en estado OK tras el ajuste.

Pendientes inmediatos:
- Validar en ambiente integrado con DECANO/ADMIN que la UX de busqueda unica cumpla el flujo operativo esperado.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-27

Modulo trabajado:
Seguimiento (vista global DECANO/ADMIN) - retiro de tarjetas resumen superiores.

Cambios realizados:
- Frontend (`Seguimiento.jsx`):
  - Se eliminan del encabezado global las tarjetas de resumen (Docentes adscritos, Horas planeadas/ejecutadas/pendientes, Avance global y semaforo ALTO/MEDIO/BAJO).
  - Se conserva el header principal con titulo del modulo y boton `Actualizar`.

Estado actual del proyecto:
- En `Seguimiento` ya no se renderiza el bloque de metricas destacado en rojo por el usuario.
- Se mantiene intacto el resto del flujo (buscador, vistas Cards/Tabla/Jerarquia y detalle por docente).
- Build frontend en estado OK tras el ajuste.

Pendientes inmediatos:
- Validar visualmente con usuario DECANO que el espacio superior quede conforme al layout esperado.

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-27

Modulo trabajado:
Supervision - evidencias (visor de archivo en modal elegante).

Cambios realizados:
- Frontend (`Supervision.jsx`):
  - La accion `Ver archivo` en modal de evidencias deja de abrir solo nueva pestana y ahora abre un visor en modal superpuesto.
  - Se incorpora modal `Visor de evidencia` con:
    - encabezado con nombre de archivo y descripcion,
    - visualizacion embebida por `iframe` (apto para PDF),
    - acciones `Abrir` y `Descargar`.
  - Se agrega cierre coordinado: al cerrar modal de evidencias tambien se cierra visor interno para evitar estados huérfanos.

Estado actual del proyecto:
- El flujo de revision de evidencias en supervision queda mas profesional y continuo dentro de la misma pantalla.
- Build frontend en estado OK tras el ajuste.

Pendientes inmediatos:
- Validar en navegador que archivos PDF del backend se rendericen inline segun cabeceras HTTP del servidor (si el navegador bloquea inline, queda disponible fallback `Abrir`).

--------------------------------
ULTIMA SESION
--------------------------------

Fecha:
2026-04-27

Modulo trabajado:
Cierre de iteracion frontend en Seguimiento y Supervision.

Cambios realizados:
- Seguimiento (`frontend/src/Pages/Seguimiento.jsx`):
  - Se simplifica la zona de filtros para conservar solo busqueda por docente.
  - Se elimina el bloque de tarjetas resumen superiores (metricas globales) por solicitud funcional.
- Supervision (`frontend/src/Pages/Supervision.jsx`):
  - `Ver archivo` en evidencias abre visor en modal embebido para PDF con acciones `Abrir` y `Descargar`.
  - Se mantiene cierre coordinado entre modal de evidencias y visor para evitar estados inconsistentes.
- Documentacion tecnica:
  - Se actualiza memoria operativa y trazabilidad de cambios en `PROJECT_LOG.md` y `DEV_HISTORY.md`.

Estado actual del proyecto:
- Seguimiento global (DECANO/ADMIN) queda con interfaz mas limpia: encabezado, buscador por docente, vistas `Cards/Tabla/Jerarquia` y detalle por docente.
- Supervision mejora la revision de evidencias con experiencia de visualizacion inline sin salir del flujo.
- Build frontend en estado OK despues de todos los ajustes.

Trabajo en curso:
- Validacion funcional integrada con usuario DECANO en ambiente real para confirmar:
  - estabilidad visual sin titileo,
  - consistencia de datos entre Seguimiento, Supervision y Actividades,
  - render inline de PDF segun cabeceras del servidor.

Pendientes inmediatos:
- Ejecutar prueba final de aceptacion de UX con DECANO (flujo completo: revisar -> ver archivo -> cerrar -> aprobar/observar).
- Confirmar comportamiento en navegadores objetivo (Chrome/Edge) para PDFs con cabecera `Content-Disposition` variable.
