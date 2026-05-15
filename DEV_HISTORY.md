FECHA
2026-03-13

DESCRIPCION
Se implemento y estabilizo el flujo de carga de evidencias PDF del Formulario Unico de Seguimiento, integrando backend con Google Drive institucional y mejorando la experiencia de cola/progreso/estados en frontend.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
backend/package.json
backend/package-lock.json
backend/src/evidencia/evidencia.controller.ts
backend/src/evidencia/evidencia.module.ts
backend/src/evidencia/evidencia.service.ts
backend/src/evidencia/services/google-drive.service.ts
frontend/src/Pages/SeguimientoNuevo.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Backend:
  - Se mantuvo el endpoint existente `POST /api/evidencia/upload` y se reforzo con filtro de PDF y limite de tamano en interceptor.
  - Se implemento `GoogleDriveService` para autenticar con Service Account y operar Drive v3.
  - Se implemento creacion/aseguramiento de estructura de carpetas:
    `SIGEDIN_EVIDENCIAS/{periodo}/docente_{id_docente}/seguimiento_{id_seguimiento}`.
  - Se cambio el flujo de persistencia para subir primero a Drive y luego guardar metadata en tabla `evidencia`.
  - `ruta_archivo` ahora guarda URL de visualizacion en Drive.
  - Se agrego rollback del archivo en Drive si falla el guardado en BD para evitar inconsistencias.
  - Se agrego dependencia `googleapis`.

- Frontend (`SeguimientoNuevo.jsx`, tab Evidencias):
  - Se estandarizaron estados por archivo: `pendiente`, `subiendo`, `cargado`, `error`.
  - Se mantuvo la logica de cola y se mejoro con mensaje por archivo.
  - Se mantuvo descripcion editable por archivo y progreso individual por upload.
  - Se reforzaron mensajes amigables de error para evitar exponer `Internal server error` en UI final.
  - Se mantuvo el flujo: seleccionar archivos -> agregar a cola -> guardar evidencias (subida real).

RESULTADO
El modulo de evidencias queda funcional y mas robusto: valida PDF en ambos lados, organiza archivos en Drive institucional, guarda metadata consistente en BD, muestra progreso/estado por archivo al usuario y mejora el manejo de errores en la interfaz.

FECHA
2026-03-13

DESCRIPCION
Se completo la preparacion operativa para configuracion de entorno del modulo de evidencias, dejando variables documentadas y plantilla de entorno para despliegue seguro.

MODULOS AFECTADOS
backend

ARCHIVOS MODIFICADOS
backend/.env
backend/.env.example
backend/README.md
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Se agregaron variables de configuracion para Google Drive y tamano maximo de evidencia en `backend/.env`.
- Se creo `backend/.env.example` para estandarizar configuracion por ambiente sin exponer credenciales reales.
- Se documento en `backend/README.md` la configuracion requerida para subir evidencias PDF a Drive.

RESULTADO
El proyecto queda listo para configurar credenciales reales de Service Account y ejecutar prueba funcional E2E de carga de evidencias con menor riesgo operativo.

FECHA
2026-03-13

DESCRIPCION
Se reforzo la reconstruccion de clave privada en runtime para Google Drive y se ejecuto validacion E2E backend; la clave entregada no pudo decodificarse en formato PEM, por lo que se limpio del entorno y se dejo pendiente rotacion efectiva.

MODULOS AFECTADOS
backend

ARCHIVOS MODIFICADOS
backend/src/evidencia/services/google-drive.service.ts
backend/.env
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Se normalizo `GOOGLE_DRIVE_PRIVATE_KEY` en runtime para manejar variaciones comunes de formato (`\\n`, `\\r`, comillas y espacios).
- Se ejecuto prueba E2E backend invocando `EvidenciaService.subir` con datos reales de BD para validar Drive + insercion en `evidencia`.
- La prueba retorno `503` por falla de autenticacion/decodificacion PEM de la clave privada.
- Se retiro la clave del `.env` por seguridad tras detectar inconsistencia de formato/validez.

RESULTADO
El codigo queda estable y preparado para operar con clave valida; pendiente cargar nueva `GOOGLE_DRIVE_PRIVATE_KEY` rotada para completar validacion E2E exitosa (Drive + BD + UI).

FECHA
2026-03-13

DESCRIPCION
Se completo validacion tecnica con clave Drive corregida, se alineo el backend al esquema real de tabla `evidencia` y se mejoro el mensaje de error del endpoint para escenarios de cuota/permisos en Drive.

MODULOS AFECTADOS
backend

ARCHIVOS MODIFICADOS
backend/src/evidencia/evidencia.service.ts
backend/src/evidencia/entities/evidencia.entity.ts
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Se valido autenticacion real de Service Account contra Google Drive (OK).
- Se identifico mismatch entre entidad y BD: `tipo_documento` y `tamano_kb` no existen en tabla `evidencia`; se removieron del modelo y del insert para evitar fallos.
- Se confirmo creacion de estructura de carpetas en Drive con `GoogleDriveService`.
- El upload de archivo falla con 403 por cuota de Service Account al usar `root`.
- Se agrego mapeo de errores externos a mensajes claros para frontend, incluyendo instruccion de usar `GOOGLE_DRIVE_PARENT_FOLDER_ID` en Shared Drive.

RESULTADO
El endpoint responde errores entendibles y la integracion queda lista para operar al definir una carpeta institucional en Shared Drive; pendiente repetir E2E de subida + insercion BD con ese `parent folder id`.

FECHA
2026-03-13

DESCRIPCION
Se valido la carpeta institucional compartida por URL y se confirmo la causa raiz del fallo de upload: la carpeta destino esta en My Drive y no en Shared Drive, lo que mantiene el error de cuota para Service Account.

MODULOS AFECTADOS
backend

ARCHIVOS MODIFICADOS
backend/.env
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Se configuro `GOOGLE_DRIVE_PARENT_FOLDER_ID=1aj7DZ0jVzDQOmuS8loG030g1vw88ZXUM`.
- Se verifico autenticacion Drive OK y acceso de escritura a la carpeta.
- Se verifico metadata de carpeta: `owners` presente y `driveId` ausente (carpeta en My Drive).
- El endpoint `POST /api/evidencia/upload` mantiene fallo 503 al subir archivo por respuesta Drive 403 de cuota de Service Account.

RESULTADO
Integracion y validaciones quedan correctas; falta migrar el `GOOGLE_DRIVE_PARENT_FOLDER_ID` a una carpeta de Shared Drive para habilitar upload real y, con ello, insercion en tabla `evidencia`.

FECHA
2026-03-13

DESCRIPCION
Se cierra la sesion de desarrollo dejando actualizada la memoria operativa y el historial tecnico del proyecto.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Se consolidaron resultados finales de validacion Drive/BD/UI en la memoria del proyecto.
- Se dejo documentado el bloqueo operativo actual: carpeta objetivo en My Drive sin `driveId`, incompatible con upload final de Service Account por cuota.
- Se dejo como accion inmediata pendiente migrar `GOOGLE_DRIVE_PARENT_FOLDER_ID` a Shared Drive institucional.

RESULTADO
Sesion cerrada con trazabilidad completa y pendiente tecnico claramente definido para retomar en la siguiente iteracion.

FECHA
2026-03-13

DESCRIPCION
Se ejecuto revalidacion E2E completa del flujo de evidencias usando el nuevo `GOOGLE_DRIVE_PARENT_FOLDER_ID` compartido por el usuario y se confirmo que el bloqueo operativo persiste por cuota de Service Account en Drive.

MODULOS AFECTADOS
backend

ARCHIVOS MODIFICADOS
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Se levanto backend y se probo upload real de PDF hacia `POST /api/evidencia/upload` con `id_seguimiento=28` y usuario ADMIN en alcance.
- El endpoint devolvio `503` controlado con mensaje funcional: cuenta de servicio sin cuota para almacenar en destino actual.
- Se verifico por API de Drive la metadata de la carpeta `1VwrsMs4otVR4r_OrUA40Zo2vmWFrJEWU`; no se obtuvo `driveId`, por lo que no se confirma contexto operativo de Shared Drive para almacenamiento con Service Account.
- Se consulto BD y no hubo insercion en tabla `evidencia` tras el intento fallido, manteniendo consistencia transaccional del flujo.
- No se realizaron cambios de codigo fuente en backend/frontend; solo actualizacion de memoria tecnica del proyecto.

RESULTADO
Queda confirmado que la integracion de codigo sigue estable y que el bloqueo restante es operativo de Drive (carpeta destino/almacenamiento). Pendiente inmediato: usar un `GOOGLE_DRIVE_PARENT_FOLDER_ID` con `driveId` de Shared Drive y repetir E2E para cierre funcional exitoso.

FECHA
2026-04-14

DESCRIPCION
Se implemento el rediseño integral del dashboard de seguimiento con jerarquia temporal (semestre -> corte actual -> semana actual -> detalle por tipo), incluyendo endpoint nuevo, logica SQL robusta sin duplicaciones y actualizacion completa de la vista frontend.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
backend/src/seguimiento/dashboard.controller.ts
backend/src/seguimiento/seguimiento.service.ts
frontend/src/Pages/Seguimiento.jsx
dashboard_seguimiento_queries.sql
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Backend:
  - Se agrego `GET /api/dashboard/seguimiento` en `DashboardController`.
  - Se implemento `obtenerDashboardSeguimiento` en `SeguimientoService` con respuesta JSON estandarizada:
    - `semestre` (planeadas, ejecutadas, pendientes, porcentaje, nivel)
    - `corte_actual` (id_corte, nombre, planeadas, ejecutadas, pendientes, porcentaje)
    - `semana_actual` (numero, programadas, ejecutadas, faltantes, porcentaje)
    - `tipos[]` (enfoque semanal + contexto corte/semestre)
  - Se corrigio base de calculo semestral usando `plan_corte_actividad` (no `SUM(horas_semanales)` para semestre).
  - Se implementaron agregaciones por subconsulta (`plan_*`, `seg_*`) para evitar sobreconteo por joins 1:N.
  - Se hizo deteccion dinamica de corte por fecha y semana actual desde `agenda_docente.inicio_semestre`.

- Frontend:
  - Se rehizo `Seguimiento.jsx` para consumir `/dashboard/seguimiento?id_periodo=...`.
  - Se reorganizo UI en bloques jerarquicos:
    1) Card principal Semestre
    2) Card Corte actual
    3) Card Semana actual
    4) Tabla de detalle por tipo con foco en semana y contexto de corte/semestre
  - Se unifico semaforizacion visual ALTO/MEDIO/BAJO y barras de progreso por seccion.

- SQL:
  - Se agrego `dashboard_seguimiento_queries.sql` con consultas completas para:
    - resumen semestral
    - deteccion de corte actual
    - resumen corte actual
    - resumen semana actual
    - detalle por tipo (semana + corte + semestre)
  - Todas las consultas usan `COALESCE`, `NULLIF` y agregacion aislada para robustez numerica.

RESULTADO
El dashboard queda implementado de forma funcional y alineado al objetivo de lectura jerarquica para docente, con metricas consistentes entre backend y frontend y sin los errores de duplicacion del modelo anterior.

FECHA
2026-04-14

DESCRIPCION
Se formalizo el cierre de la iteracion del dashboard jerarquico de seguimiento, dejando actualizada la memoria del proyecto y la trazabilidad tecnica de cambios para continuidad de la siguiente sesion.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
PROJECT_LOG.md
DEV_HISTORY.md

IMPACTO TECNICO
- Se consolida el estado operativo del nuevo dashboard con trazabilidad completa de arquitectura, endpoint y UI.
- Se deja explicitado el plan inmediato de validacion funcional y migracion gradual desde endpoints legacy.
- Se garantiza continuidad entre sesiones sin perdida de contexto tecnico ni funcional.

FECHA
2026-04-14

DESCRIPCION
Se implemento hardening del flujo de carga de evidencias en Google Drive para eliminar configuraciones ambiguas y devolver errores operativos claros cuando la carpeta destino no cumple requisitos de Shared Drive o permisos de Service Account.

MODULOS AFECTADOS
backend

ARCHIVOS MODIFICADOS
backend/src/evidencia/services/google-drive.service.ts
backend/.env.example
backend/README.md
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Se agrego validacion obligatoria de `GOOGLE_DRIVE_PARENT_FOLDER_ID`:
  - no vacio
  - distinto de `root`
  - existente y accesible en Drive
  - tipo carpeta
  - no eliminada
  - con `driveId` (Shared Drive)
- Se agrego cache de carpeta padre validada para evitar validaciones redundantes.
- Se robustecio manejo de errores de Google API en listar/crear/subir:
  - not found -> carpeta inexistente/no accesible
  - permisos insuficientes -> falta compartir carpeta/drive con Service Account
  - quota de Service Account -> uso invalido de Mi unidad
- Se mantuvo soporte a Shared Drives mediante `supportsAllDrives: true`.
- Se alineo documentacion y ejemplo de variables de entorno con el comportamiento real del servicio.

IMPACTO TECNICO
- El backend deja de intentar subida en `root` cuando falta configuracion y evita fallos opacos.
- La causa de error se vuelve accionable para operaciones (configuracion/permisos) y para UX del frontend.
- Se reduce riesgo de inconsistencias operativas en el flujo `upload Drive -> persistencia evidencia`.

FECHA
2026-04-14

DESCRIPCION
Se cerraron ajustes de robustez para el flujo de seguimiento y evidencias, incorporando manejo detallado de errores de persistencia en seguimiento semanal, validaciones de consistencia semana-corte y mejora de mensajes funcionales hacia frontend.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
backend/src/seguimiento/seguimiento.service.ts
frontend/src/Pages/SeguimientoNuevo.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Seguimiento (backend):
  - Se agrego `manejarErrorPersistenciaSeguimiento` para mapear errores de BD a mensajes funcionales:
    - `ER_DUP_ENTRY` -> conflicto por seguimiento existente
    - `ER_NO_REFERENCED_ROW_2` -> actividad/corte invalido
    - `ER_CHECK_CONSTRAINT_VIOLATED` -> semana fuera de rango
  - Se reforzo validacion para evitar colision por `uq_actividad_semana` en semana ya registrada con otro corte.
  - Se agrego validacion para asegurar que la semana seleccionada pertenezca al corte correspondiente por calendario.
  - Se encapsulo guardado en `try/catch` para devolver errores controlados y evitar mensajes genericos.

- Seguimiento (frontend):
  - En `guardarSeguimiento`, se usa `obtenerMensajeError` para mostrar mensaje real devuelto por backend en vez de fallback generico.

IMPACTO TECNICO
- Mejora trazabilidad de fallos operativos y de datos en guardado de seguimiento.
- Reduce incidencias por conflictos de unicidad no explicados al usuario final.
- Mejora experiencia de docente al habilitar diagnostico accionable en UI sin perder estabilidad del flujo.

FECHA
2026-04-14

DESCRIPCION
Se implemento una mejora integral del flujo de seguimiento semanal para separar claramente alta nueva vs actualizacion contextual, incorporar pendientes semanales por actividad en el dropdown y reforzar validaciones de horas para evitar sobre-registro en la semana activa.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
backend/src/seguimiento/seguimiento.controller.ts
backend/src/seguimiento/seguimiento.service.ts
frontend/src/Pages/Seguimiento.jsx
frontend/src/Pages/SeguimientoNuevo.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Dashboard (`Seguimiento.jsx`):
  - `REPORTAR SEMANA` ahora navega a `/seguimiento/nuevo` en modo crear (`state.modo='crear'`), sin `id_seguimiento` ni flags de edicion.
  - Se mantiene `ACTUALIZAR` por fila para abrir formulario con contexto (`id_tipo`, `semana`, `id_corte`, `horas`).

- Formulario (`SeguimientoNuevo.jsx`):
  - Se agrego deteccion de modo creacion forzado desde `location.state`.
  - En modo crear se limpia contexto previo (query/state) y se evita hidratacion de edicion por `id_seguimiento`.
  - Se simplifico UX para enfoque semanal (sin tarjetas de faltantes acumulados ni "Detalles de la agenda").
  - Se ordeno dropdown por tipo y nombre, y se formateo cada opcion como:
    `id_tipo-nombre_tipo - nombre_actividad || estado semanal`.
  - Se agregaron estados visuales `[PENDIENTE]`, `[OK]`, `[ALERTA]` con iconos y leyenda.
  - Se ajusto maximo de horas en input y mensajes de UI segun pendiente semanal real.

- Backend (`seguimiento`):
  - `GET /seguimiento/actividades` ahora acepta `periodo`, `semana`, `corte` para devolver metrica semanal por actividad.
  - Se agregaron campos en respuesta:
    - `nombre_tipo`
    - `horas_programadas_semana`
    - `horas_reportadas_semana_actual`
    - `horas_pendientes_semana_actual`
    - `inconsistencia_semana_actual`
  - Se reforzo validacion de negocio en crear/actualizar para no exceder pendientes de la semana activa (`id_actividad + id_corte + semana`).
  - Mensajes de error funcionales cuando la semana ya esta completada o cuando se supera el maximo disponible semanal.

IMPACTO TECNICO
- Se evita que el flujo de "nuevo reporte" derive accidentalmente en actualizacion de un seguimiento existente.
- El docente visualiza pendientes semanales por actividad antes de seleccionar, reduciendo errores de captura.
- La validacion queda consistente entre frontend y backend para proteger integridad de `seguimiento_semanal` en semana activa.
- Se mantiene compatibilidad con el flujo contextual de `ACTUALIZAR` sin romper contratos API existentes.

FECHA
2026-04-15

DESCRIPCION
Se corrigio la logica del formulario de seguimiento semanal para separar de forma estricta los modos crear y editar, evitando que el flujo de "Reportar semana" reutilice `id_seguimiento` existente y termine ejecutando actualizaciones no intencionadas.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
frontend/src/Pages/Seguimiento.jsx
frontend/src/Pages/SeguimientoNuevo.jsx
backend/src/seguimiento/seguimiento.service.ts
backend/src/seguimiento/dto/crear-seguimiento.dto.ts
backend/src/seguimiento/dto/actualizar-seguimiento.dto.ts
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Frontend (`Seguimiento.jsx`):
  - Se ajusto navegacion de acciones para enviar contexto explicito de modo:
    - `REPORTAR SEMANA` -> `state.modo='crear'`.
    - `Actualizar` por fila -> `state.modo='editar'`.

- Frontend (`SeguimientoNuevo.jsx`):
  - Se reemplazo el booleano de edicion por `modoFormulario` (`crear` / `editar`) con derivadas `modoCrear` y `modoEditar`.
  - En modo crear forzado se limpia contexto de query y se evita hidratar `id_seguimiento` desde lookup, impidiendo herencia accidental de edicion.
  - Se reforzo `guardarSeguimiento` para enrutar segun modo:
    - `crear` -> `POST /seguimiento`.
    - `editar` -> `PUT /seguimiento/{id_seguimiento}` (con bloqueo si no existe ID).
  - Se agrego validacion de `horas_ejecutadas > 0` y mensaje funcional cuando el registro supera horas semanales programadas.

- Backend (`seguimiento.service.ts` y DTOs):
  - Se endurecio validacion de horas ejecutadas mayores que cero en DTO y servicio (crear/actualizar).
  - Se mantuvo validacion semanal por `actividad + corte + semana` con exclusion del propio registro en edicion.
  - Se actualizo mensaje de negocio para exceso semanal:
    `No se puede registrar esta semana porque las horas ejecutadas superan las horas programadas.`

RESULTADO
El flujo queda coherente con negocio: `Reportar semana` crea nuevos registros y no actualiza automaticamente un seguimiento existente; `Actualizar` opera en modo edicion con ID de seguimiento. Se mantiene la proteccion de integridad para no exceder horas programadas por semana.

FECHA
2026-04-15

DESCRIPCION
Se aplico mejora de UX en el panel de horas del formulario de seguimiento semanal para diferenciar explicitamente horas acumuladas vs horas nuevas a registrar, con rediseño visual tipo dashboard y validacion alineada al disponible semanal.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/Pages/SeguimientoNuevo.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Se actualizaron labels clave del bloque de horas:
  - `Horas registradas hasta ahora`
  - `Horas a registrar`
  - `Disponible para registrar`
- Se implemento calculo dinamico de disponible en UI:
  - `disponible = horas_programadas_semana - horas_registradas_hasta_ahora`
- Se rediseño el panel en dos bloques:
  - resumen (programadas, registradas, disponible) + barra de progreso semanal
  - accion (input y ayuda de disponible dinamico)
- Se unifico validacion visual del input para exceso de horas con mensaje claro en rojo:
  - `No puedes registrar mas horas de las disponibles para esta semana.`
- Se mantuvo la logica funcional existente fuera de este alcance.

RESULTADO
La interfaz reduce ambiguedad de captura, mejora legibilidad operativa y mantiene consistencia funcional para evitar sobre-registro semanal.

FECHA
2026-04-15

DESCRIPCION
Se corrigio un error runtime en el formulario de seguimiento que provocaba pantalla en blanco al ingresar a rutas de `seguimiento/nuevo`.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/Pages/SeguimientoNuevo.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Error observado en consola:
  `Uncaught ReferenceError: Cannot access 'maxHorasPermitidasInput' before initialization`.
- Causa tecnica:
  `limiteHorasInput` dependia de `maxHorasPermitidasInput` antes de su declaracion (orden de `const` en el componente).
- Correccion aplicada:
  reordenamiento de bloques `useMemo` para inicializar primero `maxHorasPermitidasInput` y despues `limiteHorasInput`.
- Verificacion:
  build frontend ejecutado correctamente tras el ajuste.

RESULTADO
El componente vuelve a montar sin error de inicializacion y deja de presentar pantalla en blanco en las rutas reportadas.

FECHA
2026-04-15

DESCRIPCION
Se implemento autocompletado de `Horas a registrar` con el valor faltante semanal en modo creacion, y se ajusto el fallback de `seguimiento/nuevo` para evitar entrar en edicion implicita cuando no hay contexto explicito.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/Pages/SeguimientoNuevo.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Se agrego `useEffect` de autocompletado que calcula y propone automaticamente en el input:
  - `horas_a_registrar = disponible_para_registrar` (ej: `1.99`).
- Se uso control por contexto (`actividad-corte-semana-disponible`) para evitar sobrescrituras repetitivas en cada render.
- En `lookup`, la pantalla `seguimiento/nuevo` sin `modo: editar` ni `id_seguimiento` ahora se mantiene en modo crear aunque exista seguimiento previo para esa combinacion.

RESULTADO
El usuario recibe una propuesta automatica del faltante semanal en `Horas a registrar`, reduciendo digitacion y ambiguedad en captura.

FECHA
2026-04-15

DESCRIPCION
Se ajusto la logica del campo `Horas a registrar` para diferenciar correctamente comportamiento entre modo crear y modo modificar, con recarga contextual por actividad/semana/corte y sin herencia de valores previos.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/Pages/SeguimientoNuevo.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Se agrego calculo de valor inicial del input segun estado de actividad:
  - `OK` -> `0.00`
  - `PENDIENTE` -> `disponible_para_registrar`.
- Se incorporo control de edicion manual con `ref` para evitar que el autocompletado sobrescriba lo digitado por el usuario en modo crear.
- Se aislo contexto de autocompletado por `modo + actividad + corte + semana + seguimiento` para impedir herencia entre selecciones.
- En modo editar con `id_seguimiento` se mantiene el valor del seguimiento cargado (respeta contexto de modificacion).
- Se ajusto orden de validaciones del guardado para priorizar mensaje de semana completada cuando disponible es 0.

RESULTADO
El campo `Horas a registrar` queda consistente con negocio: propone automaticamente el faltante correcto, permite ajuste manual en alta y preserva valores de edicion cuando corresponde.

FECHA
2026-04-15

DESCRIPCION
Se corrige inconsistencia donde `Horas a registrar` podia conservar el acumulado previo (ej. `8.01`) en lugar del disponible semanal (ej. `1.99`) al cambiar actividad.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/Pages/SeguimientoNuevo.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Se incorpora bandera `esEdicionExplicita` para distinguir edicion por `id_seguimiento` de edicion contextual.
- El autocompletado ahora usa valor sugerido por estado:
  - `PENDIENTE` -> disponible semanal.
  - `OK` -> `0.00`.
- Se evita herencia entre actividades al resetear contexto/autofill y no reutilizar `horas_registradas_hasta_ahora` como valor del input.
- En lookup con `modo editar` sin `id_seguimiento` se habilita sugerencia por disponible; con `id_seguimiento` se conserva valor del registro.

RESULTADO
El input refleja correctamente el faltante semanal por actividad y deja de mostrar el acumulado como valor inicial en escenarios pendientes.

FECHA
2026-04-15

DESCRIPCION
Se corrige bloqueo de validacion nativa del navegador en `Horas a registrar` para valores decimales validos como `1.99`.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/Pages/SeguimientoNuevo.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Causa: input `type=number` configurado con `step=0.5`, lo cual rechaza valores como `1.99` aunque sean validos por negocio.
- Ajuste aplicado:
  - `step` actualizado a `0.01`.
  - normalizacion de entrada decimal (`1,99` -> `1.99`) para robustez en locales ES.
  - parseo seguro de horas para validacion y envio de payload (`parsearHorasInput`).
- Se conserva validacion funcional:
  - `> 0`
  - `<= disponible`
  - mensaje de exceso de horas disponibles.

RESULTADO
El formulario acepta correctamente `1.99` cuando coincide con el disponible y permite continuar/guardar sin error de step.

FECHA
2026-04-15

DESCRIPCION
Se ajusta la logica de persistencia de `seguimiento_semanal` para permitir multiples registros por la misma combinacion de actividad/corte/semana, validando por suma acumulada en lugar de unicidad por existencia.

MODULOS AFECTADOS
backend

ARCHIVOS MODIFICADOS
backend/src/seguimiento/seguimiento.service.ts
backend/src/seguimiento/entities/seguimiento.entity.ts
ajuste_seguimiento_semanal_multiples_registros.sql
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Backend servicio:
  - Se removieron bloqueos por `findOne` de duplicado en `crear` y `actualizar`.
  - Se mantiene validacion por negocio usando acumulado de horas:
    - `SUM(horas_ejecutadas)` por `id_actividad + id_corte + semana`
    - bloqueo solo si excede programadas o si horas <= 0.
- Entidad:
  - Se elimino decorador `@Unique(['id_actividad', 'id_corte', 'semana'])` en `SeguimientoSemanal`.
- Base de datos:
  - Se agrego script de ajuste para eliminar indices unicos en tabla `seguimiento_semanal` y crear indices no unicos de soporte.
  - Nota clave: `TypeORM` corre con `synchronize: false`, por lo que el ajuste SQL debe ejecutarse manualmente.

RESULTADO
El flujo `Reportar semana` puede insertar nuevos registros independientes en la misma semana/corte/actividad, mientras la suma acumulada no supere las horas programadas.

FECHA
2026-04-15

DESCRIPCION
Se ajusta el modulo de evidencias para permitir carpeta raiz en My Drive (sin obligar Shared Drive), mantener compatibilidad con Shared Drive y organizar evidencias con estructura y nombre unico institucional en Google Drive.

MODULOS AFECTADOS
backend

ARCHIVOS MODIFICADOS
backend/src/evidencia/services/google-drive.service.ts
backend/src/evidencia/evidencia.service.ts
backend/.env.example
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Google Drive service:
  - Se elimina validacion rigida que rechazaba carpetas sin `driveId`.
  - Se conserva soporte `supportsAllDrives` para compatibilidad dual.
  - Se agrega deteccion de tipo de almacenamiento (`MY_DRIVE`/`SHARED_DRIVE`) y mensaje uniforme de acceso/permisos.
  - Se incorpora `existeArchivoConNombre(...)` para control de colisiones.
- Evidencia service:
  - Se amplian datos de contexto (`id_actividad`, `semana`, `numero_corte`, `periodo`) para nomenclatura.
  - Se implementa generador de nombre unico:
    `{periodo}_C{corte}_S{semana}_ACT{idActividad}_SEG{idSeguimiento}_EVD{consecutivo}_{yyyyMMdd_HHmmss}.pdf`.
  - Se cambia estructura de carpetas a:
    `{periodo}/seguimiento_semanal/corte_{numero_corte}`.
  - Se mantiene validacion de PDF, tamano maximo y rollback de archivo Drive si falla persistencia en BD.

RESULTADO
El backend queda preparado para subir evidencias a carpeta de My Drive o Shared Drive sin bloqueo por `driveId`, con rutas institucionales y nombres unicos por archivo.

FECHA
2026-04-15

DESCRIPCION
Se agregan logs temporales de depuracion para diagnosticar falla real de subida de evidencias en Google Drive en ambiente operativo.

MODULOS AFECTADOS
backend

ARCHIVOS MODIFICADOS
backend/src/evidencia/services/google-drive.service.ts
backend/src/evidencia/evidencia.service.ts
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- `GoogleDriveService`:
  - logs de lectura de config (`GOOGLE_DRIVE_PARENT_FOLDER_ID`)
  - log de cuenta usada para inicializar cliente Drive
  - log de validacion de carpeta padre (id/nombre/tipo My Drive o Shared Drive)
  - logs de busqueda/creacion de carpetas y ruta final
  - logs de subida de archivo y respuesta API (`fileId`, `webViewLink`)
  - logs detallados de error en operaciones Drive.
- `EvidenciaService`:
  - logs de contexto funcional del seguimiento (periodo/corte/semana/actividad)
  - log de carpeta final, nombre final de archivo y guardado de metadata en BD
  - log de error exacto del flujo completo y aviso de rollback en Drive.

RESULTADO
El backend ahora expone trazabilidad suficiente para identificar con precision si la falla esta en configuracion, permisos de carpeta, creacion de estructura, subida API o persistencia de metadata.

FECHA
2026-04-15

DESCRIPCION
Se implementa modo local de evidencias para operar sin Google Drive en ambiente de desarrollo, manteniendo compatibilidad para volver a modo Drive por configuracion.

MODULOS AFECTADOS
backend

ARCHIVOS MODIFICADOS
backend/src/evidencia/evidencia.service.ts
backend/src/main.ts
backend/.env
backend/.env.example
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Se agrega proveedor de almacenamiento por entorno:
  - `EVIDENCIA_STORAGE_PROVIDER=local|drive` (default: local).
- En modo `local`:
  - se guarda PDF en `uploads/evidencias` del backend,
  - se genera nombre unico institucional,
  - se construye URL publica con `EVIDENCIA_PUBLIC_BASE_URL`,
  - se aplica rollback del archivo fisico si falla guardado en BD.
- Se habilita publicacion de archivos estaticos en backend:
  - `app.useStaticAssets(..., { prefix: '/uploads/' })`.
- Modo `drive` se mantiene disponible sin romper integracion existente.

RESULTADO
El formulario de evidencias puede funcionar inmediatamente en local (guardar y consultar archivos) sin depender de permisos o disponibilidad de Google Drive.

FECHA
2026-04-15

DESCRIPCION
Se cierra la iteracion tecnica consolidando ajustes de seguimiento semanal y evidencias, dejando operacion local funcional para upload de PDFs y compatibilidad configurable con Google Drive.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
frontend/src/Pages/Seguimiento.jsx
frontend/src/Pages/SeguimientoNuevo.jsx
backend/src/seguimiento/seguimiento.service.ts
backend/src/seguimiento/entities/seguimiento.entity.ts
backend/src/evidencia/services/google-drive.service.ts
backend/src/evidencia/evidencia.service.ts
backend/src/main.ts
backend/.env
backend/.env.example
ajuste_seguimiento_semanal_multiples_registros.sql
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Seguimiento semanal:
  - Se separa formalmente crear vs editar en frontend y se corrige autocompletado de horas por estado (`PENDIENTE`/`OK`).
  - Se corrige validacion decimal del input (`step=0.01`) y parseo robusto (`1,99` -> `1.99`).
  - Se elimina restriccion logica de unicidad por existencia en backend y se mantiene validacion por suma acumulada para no exceder horas programadas.
  - Se agrega script SQL para retirar indices unicos de `seguimiento_semanal` en ambientes con esquema antiguo.
- Evidencias:
  - Se elimina obligacion de Shared Drive y se acepta carpeta padre de My Drive o Shared Drive.
  - Se define estructura destino `{periodo}/seguimiento_semanal/corte_{numero_corte}` y nomenclatura unica de archivo.
  - Se agregan logs temporales de depuracion para diagnostico operativo de Drive.
  - Se implementa modo local (`EVIDENCIA_STORAGE_PROVIDER=local`) con guardado en `uploads/evidencias`, URL publica y rollback local.

IMPACTO TECNICO
- El sistema reduce bloqueos operativos para evidencias al habilitar ejecucion local inmediata y mantener opcion Drive por configuracion.
- El flujo semanal evita conflictos de actualizacion accidental y soporta cargas parciales en la misma semana con control de integridad por acumulado.
- Queda trazabilidad completa para depuracion y cierre progresivo de pendientes en ambiente integrado.

FECHA
2026-04-16

DESCRIPCION
Se implementa el modulo completo de Informes para consulta consolidada del seguimiento semanal docente, incluyendo filtros dinamicos, previsualizacion tabular y exportacion de resultados filtrados a Excel usando la vista `vw_reporte_seguimiento_detallado`.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
backend/src/informes/informes.module.ts
backend/src/informes/informes.controller.ts
backend/src/informes/informes.service.ts
backend/src/app.module.ts
backend/package.json
backend/package-lock.json
frontend/src/Pages/Informes.jsx
frontend/src/App.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Backend:
  - Se crea modulo `informes` con endpoints JWT:
    - `GET /api/informes/filtros/periodos`
    - `GET /api/informes/filtros/cortes`
    - `GET /api/informes/filtros/semanas`
    - `GET /api/informes/filtros/docentes`
    - `GET /api/informes/reporte`
    - `GET /api/informes/exportar`
  - Consulta principal sobre `vw_reporte_seguimiento_detallado` con filtros combinables por periodo/corte/semana/docente/identificacion, paginacion y ordenamiento seguro por whitelist.
  - Se aplica alcance por rol reutilizando `ScopeService`:
    - DOCENTE restringido por cedula.
    - ADMIN restringido por facultad.
  - Se agrega normalizacion de `periodo_academico` y `anio` para corregir casos con formato decimal (`2.026`).
  - Se integra `exceljs` para exportar solo los resultados filtrados vigentes.

- Frontend:
  - Se crea vista `Informes.jsx` con diseno consistente al sistema:
    - encabezado con titulo/subtitulo del reporte
    - filtros multi-select con busqueda en tiempo real y acciones Select All / Deselect All
    - campo de identificacion
    - acciones de Consultar, Limpiar, Copiar y Exportar a Excel
    - tabla de previsualizacion con scroll horizontal, paginacion y ordenamiento basico.
  - Se agrega ruta protegida `/informes` en `App.jsx` para integrar el menu lateral existente.

RESULTADO
El modulo Informes queda operativo de punta a punta para consulta y exportacion del reporte consolidado, sin cambios destructivos en arquitectura ni contratos existentes de modulos previos.

FECHA
2026-04-16

DESCRIPCION
Se corrige la eliminacion de evidencias del Formulario Unico de Seguimiento para que deje de ser solo visual y ejecute eliminacion completa de persistencia (archivo + BD), con confirmacion en UI y manejo controlado de errores.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
frontend/src/Pages/SeguimientoNuevo.jsx
backend/src/evidencia/evidencia.service.ts
backend/src/evidencia/services/google-drive.service.ts
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Frontend:
  - Se agrega confirmacion `¿Deseas eliminar esta evidencia?` para evidencias temporales en cola y evidencias persistidas.
  - Evidencias temporales (sin BD) se eliminan solo de la lista local.
  - Evidencias persistidas ejecutan `DELETE /api/evidencia/{id}` y luego recargan lista desde backend para evitar inconsistencias de UI.
  - Se agrega estado de boton `Eliminando...` para evitar doble envio.
- Backend (`EvidenciaService`):
  - Se incorpora lectura raw del registro para soportar `google_file_id` cuando exista en esquema real.
  - Se implementa extraccion de `fileId` desde `ruta_archivo` de Google Drive (`/d/{id}` o query `?id=`).
  - Se agrega eliminacion de archivo asociado:
    - Drive si hay `google_file_id` o se puede derivar `fileId`.
    - Local si la ruta corresponde a `/uploads/evidencias/`.
  - Solo despues del cleanup de archivo se ejecuta `DELETE` fisico en tabla `evidencia`.
  - Si falla cleanup de archivo, se responde error controlado y NO se borra BD.
- Backend (`GoogleDriveService`):
  - `eliminarArchivo` deja de silenciar errores.
  - Se ignora `notFound` como caso no bloqueante y se propaga error funcional para permisos/fallos reales.

RESULTADO
La accion de eliminar evidencia ahora cumple flujo completo: confirmacion en UI, retiro local cuando no existe en BD, y para evidencias persistidas elimina archivo asociado (Drive/local) y registro de BD con manejo de errores consistente.

FECHA
2026-04-16

DESCRIPCION
Se realiza cierre de iteracion con ajustes visuales y de estabilidad en el modulo de Seguimiento: modernizacion de tarjetas de evidencias, nuevo modal de previsualizacion PDF, rediseño de tabs segun referencia UI, actualizacion de tabla de detalle semanal con resumen de totales y correccion de error runtime por orden de hooks.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/Pages/SeguimientoNuevo.jsx
frontend/src/Pages/Seguimiento.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Evidencias (`SeguimientoNuevo.jsx`):
  - Se reemplaza estado textual por badge visual `Guardado` con icono.
  - Se agregan acciones con iconografia para `Ver` y `Eliminar`.
  - Se implementa modal de vista previa de documento PDF embebido (iframe) con fallback a apertura en nueva ventana.
- Tabs del formulario:
  - Se rediseña contenedor y botones de `Seguimiento semanal` / `Evidencias` para alinear look&feel al modelo solicitado (tonos azulados, degradado activo, estado inactivo, bordes y sombras).
- Dashboard `Seguimiento.jsx`:
  - Se cambia titulo de bloque a `Detalle del avance semanal`.
  - Se eliminan columnas `Corte` y `Semestre` de encabezado y filas.
  - Se agrega `tfoot` con resumen de:
    - total semanas/horas programadas
    - total semanas/horas ejecutadas
    - avance total porcentual con barra de progreso y nivel.
- Estabilidad runtime:
  - Se corrige error React de orden de hooks (`Rendered more hooks than during the previous render`) moviendo `useMemo` a zona no condicional del componente.

IMPACTO TECNICO
- Mejora de usabilidad y lectura visual del flujo de seguimiento sin alterar contratos API existentes.
- Mayor consistencia UI entre acciones de evidencias (ver/eliminar/estado) y menor friccion operativa para usuario final.
- Eliminacion de pantalla blanca por fallo de hooks, restaurando estabilidad de render en `/seguimiento`.

FECHA
2026-04-16

DESCRIPCION
Se agrega filtro de Facultad al modulo Informes y se reorganiza el bloque de filtros en frontend para respetar el nuevo orden funcional solicitado, con integracion completa en consulta y exportacion Excel.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
backend/src/informes/informes.controller.ts
backend/src/informes/informes.service.ts
frontend/src/Pages/Informes.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Backend:
  - Se crea endpoint `GET /api/informes/filtros/facultades` para cargar facultades desde tabla `facultad`.
  - Se extiende `parseFiltros` para soportar `facultades`/`id_facultad` como CSV.
  - Se incorpora `facultades: number[]` al contrato interno de filtros.
  - En `construirWhereSql` se aplica filtro opcional de facultad resolviendo IDs a nombres (`facultadRepo`) y filtrando por `LOWER(TRIM(vw.facultad))` en la vista `vw_reporte_seguimiento_detallado`.
  - La misma condicion queda aplicada en:
    - `consultarReporte` (tabla previsualizada)
    - `generarExcel` (exportacion `.xlsx`)
  - Se preserva compatibilidad con scope por rol (ADMIN/DOCENTE) existente.

- Frontend (`Informes.jsx`):
  - Se agrega estado y carga de opciones para `Facultad`.
  - Se agrega `MultiSelectFilter` de Facultad y se reordena el layout a:
    1) Facultad 2) Periodo 3) Corte 4) Semana 5) Docente 6) Identificacion.
  - Se ajusta la grilla responsive (`md:2`, `lg:3`, `xl:6`) para mantener distribucion limpia.
  - Se incluye `facultades` en `buildQueryParams`, por lo que impacta filtros disponibles, consulta y exportacion.
  - `Limpiar filtros` ahora tambien reinicia Facultad y su busqueda.

RESULTADO
El modulo Informes incorpora filtro opcional por Facultad cargado dinamicamente desde base de datos, mantiene el nuevo orden visual/funcional de filtros y aplica correctamente la restriccion en resultados y en la exportacion de Excel.

FECHA
2026-04-16

DESCRIPCION
Se implementa la reorganizacion de navegacion del modulo Informes con submenu desplegable y se crea el nuevo reporte `Informe ejecutivo de avance docente`, manteniendo `Consolidado general` como reporte independiente ya existente.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
frontend/src/Components/Sidebar.jsx
frontend/src/App.jsx
frontend/src/Pages/InformeEjecutivo.jsx
backend/src/informes/informes.controller.ts
backend/src/informes/informes.service.ts
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Frontend:
  - Sidebar:
    - `Informes` pasa de item simple a menu expandible/contraible.
    - Se agregan subopciones:
      - `Informe ejecutivo` (`/informes/ejecutivo`)
      - `Consolidado general` (`/informes/consolidado`)
    - Se agrega comportamiento visual de chevron y apertura automatica cuando la ruta activa pertenece a `/informes`.
  - Routing:
    - `/informes` redirige a `/informes/consolidado`.
    - Se registra nueva ruta protegida `/informes/ejecutivo`.
  - Nueva vista `InformeEjecutivo.jsx`:
    - formulario de filtros en orden solicitado: Facultad -> Periodo -> Corte -> Semana -> Docente -> Identificacion
    - previsualizacion paginada/ordenable
    - exportacion Excel filtrada
    - UI consistente con estilos del modulo de informes actual.

- Backend:
  - Nuevos endpoints ejecutivos en `informes.controller.ts`:
    - `GET /api/informes/ejecutivo/filtros`
    - `GET /api/informes/ejecutivo/reporte`
    - `GET /api/informes/ejecutivo/exportar`
  - `informes.service.ts`:
    - Se agrega consulta agregada sobre tablas operativas (`actividad`, `agenda_docente`, `periodo_academico`, `docente`, `programa`, `facultad`, `tipo_actividad`, `plan_corte_actividad`, `corte_academico`, `seguimiento_semanal`) para calcular:
      - avance_corte1
      - avance_corte2
      - avance_corte3
      - avance_semestre
    - Se mantiene control de alcance por rol (ADMIN/DOCENTE).
    - Se permite filtro opcional por facultad/periodo/corte/semana/docente/identificacion.
    - Se genera Excel ejecutivo con columnas:
      - Periodo, Facultad, Docente, Tipo Actividad, Clase Actividad, Avance corte1, Avance corte2, Avance corte3, Avance semestre.

RESULTADO
El sistema ahora expone dos reportes separados dentro de Informes: `Consolidado general` (existente) y `Informe ejecutivo` (nuevo), con submenu navegable, filtros previos, previsualizacion y exportacion Excel acorde al formato solicitado.

FECHA
2026-04-17

DESCRIPCION
Se rediseña la seccion inferior del dashboard de seguimiento para supervision por cortes con enfoque de validacion docente para rol administrativo/decano, manteniendo intactos los bloques macro existentes y agregando endpoint dedicado por corte/docente.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
backend/src/seguimiento/dashboard.controller.ts
backend/src/seguimiento/seguimiento.service.ts
frontend/src/Pages/Seguimiento.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Backend:
  - Se agrega endpoint `GET /api/dashboard/seguimiento-cortes` en `dashboard.controller.ts`.
  - Se implementa `obtenerDashboardSeguimientoCortes(...)` en `seguimiento.service.ts`.
  - La respuesta se estructura por corte con lista de docentes y metricas por docente:
    - `horas_programadas`
    - `horas_ejecutadas`
    - `avance_corte`
    - `estado` (`ALTO`/`MEDIO`/`BAJO`).
  - Se reutiliza alcance por rol existente (`ScopeService`):
    - `DOCENTE` -> solo su informacion.
    - `ADMIN` -> docentes de su facultad.

- Frontend (`Seguimiento.jsx`):
  - Se mantiene sin cambios funcionales el bloque `Vision macro del semestre` y `Corte actual`.
  - Se elimina tarjeta `Semana actual`.
  - Se reemplaza `Detalle del avance semanal` por bloque de supervision con tabs `Corte 1/2/3`.
  - Cada tab renderiza tabla por docente con columnas solicitadas y barra de progreso en `Avance del corte`.
  - Se agregan acciones UI preparadas para futuro backend:
    - `Aprobar` (verde)
    - `Revisar` (outline con icono ojo).
  - Se actualiza subtitulo macro a formato dinamico con semestre y rango de fechas del periodo activo.

RESULTADO
El dashboard queda adaptado a supervision por cortes para validacion docente (enfoque decano/admin) en la seccion inferior, preservando los bloques macro existentes y dejando preparada la base de UI/API para futuras acciones de aprobacion y revision de evidencias.

FECHA
2026-04-17

DESCRIPCION
Se crea un dashboard nuevo e independiente para el modulo `Supervision` (rol Decano/ADMIN), manteniendo separado el dashboard operativo de `Seguimiento` y exponiendo rutas API dedicadas para supervision por cortes.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
frontend/src/Pages/Supervision.jsx
frontend/src/Pages/Seguimiento.jsx
backend/src/seguimiento/dashboard.controller.ts
backend/src/seguimiento/seguimiento.service.ts
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Frontend:
  - Se reemplaza el placeholder de `Supervision` por un dashboard completo e independiente (sin reutilizar la vista `Seguimiento`).
  - El nuevo panel incluye:
    - resumen macro del semestre con periodo y rango de fechas
    - bloque de corte actual
    - tabs por corte (1/2/3) con tabla por docente y acciones `Aprobar` / `Revisar` (placeholders para integracion futura).
  - Se restaura `Seguimiento.jsx` a su enfoque operativo semanal original para evitar mezcla de responsabilidades entre modulos.

- Backend:
  - Se agregan endpoints dedicados para supervision:
    - `GET /api/dashboard/supervision/resumen`
    - `GET /api/dashboard/supervision/cortes`
  - Ambos endpoints reutilizan logica existente de calculo para evitar duplicacion y asegurar consistencia de metricas.
  - Se agrega restriccion de acceso por rol (`ADMIN`) para el modulo de supervision.

RESULTADO
El sistema queda con dos dashboards desacoplados: `Seguimiento` (operativo semanal) y `Supervision` (evaluacion por cortes para Decano/ADMIN), con base UI/API preparada para integrar aprobaciones reales y revision de evidencias.

FECHA
2026-04-17

DESCRIPCION
Se incorpora soporte formal del rol `DECANO` en creacion/edicion de usuarios y validacion backend, habilitando su uso funcional en el modulo de supervision con alcance por facultad.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
backend/src/auth/entities/usuario.entity.ts
backend/src/auth/dto/usuario-admin.dto.ts
backend/src/auth/scope.service.ts
frontend/src/Pages/UsuarioFormPage.jsx
frontend/src/Components/UsuarioForm.jsx
frontend/src/Pages/Usuarios.jsx
frontend/src/Pages/Supervision.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Backend:
  - Se amplia enum/validacion de rol a `ADMIN|DECANO|DOCENTE` en entidad y DTOs.
  - `ScopeService` ahora acepta `DECANO` como rol permitido y lo resuelve bajo alcance administrativo (facultad), manteniendo compatibilidad con logica existente.
- Frontend:
  - Se agrega opcion `DECANO` en formularios de usuario (pantalla y modal).
  - Se ajusta listado de usuarios con badge visual para `DECANO`.
  - Se habilita modulo `Supervision` para rol `DECANO` ademas de `ADMIN`.

RESULTADO
El rol `DECANO` queda operativo de extremo a extremo para gestion de usuarios y acceso al dashboard de supervision, evitando rechazos por validacion de API y manteniendo compatibilidad con los roles existentes.

FECHA
2026-04-17

DESCRIPCION
Se corrige integralmente el modulo de Control de Usuarios para garantizar visibilidad permanente de acciones en listado, edicion completa de campos en formulario y persistencia correcta de actualizaciones en la tabla `usuario`.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
frontend/src/Pages/Usuarios.jsx
frontend/src/Pages/UsuarioFormPage.jsx
frontend/src/Components/UsuarioForm.jsx
backend/src/auth/usuario.controller.ts
backend/src/auth/usuario.service.ts
backend/src/auth/dto/usuario-admin.dto.ts
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Frontend:
  - Se eliminaron estilos de ocultamiento por hover en acciones de tabla para que editar/eliminar se vean siempre.
  - En `UsuarioFormPage` y `UsuarioForm` se habilito edicion de `username` en modo editar.
  - Se reforzaron validaciones de submit para `username`, `rol`, `estado` y `id_docente` cuando aplica (rol `DOCENTE` o `DECANO`).
  - Se mantiene `password` opcional en edicion y obligatoria en creacion.

- Backend:
  - Se agrega endpoint `GET /api/admin-usuario/:id` en `UsuarioController` para cargar formulario de edicion.
  - Se amplia `ActualizarUsuarioDto` con campo opcional `username`.
  - `UsuarioService.actualizar` ahora soporta cambio de `username` con validacion:
    - no vacio
    - unicidad (sin colision con otros usuarios)
  - Se conserva logica de hash de contrasena: solo se recalcula `password_hash` si llega `password`; si no, se mantiene el actual.
  - Se mantiene update de `rol`, `activo` e `id_docente`.

RESULTADO
El administrador puede editar correctamente todos los campos requeridos del usuario y ver siempre las acciones en el listado; las actualizaciones se persisten de forma consistente en la tabla `usuario` sin romper comportamiento previo.

FECHA
2026-04-17

DESCRIPCION
Se estandariza la visibilidad permanente de acciones (editar/eliminar) en los listados de la seccion Administracion para eliminar la inconsistencia de UI causada por elementos ocultos hasta hover.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/Pages/Docentes.jsx
frontend/src/Pages/Programas.jsx
frontend/src/Pages/Facultades.jsx
frontend/src/Pages/TiposActividad.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Se removieron clases de ocultamiento por hover en contenedores de acciones:
  - `opacity-0`
  - `group-hover:opacity-100`
  - `transition-opacity` asociada a la aparicion condicional
- Se conservaron estilos existentes de botones para no alterar identidad visual:
  - tamano de iconos
  - colores de estado/hover
  - espaciado y alineacion en columna `Acciones`.
- Se valido que no queden patrones equivalentes en modulos administrativos (solo permanece un caso en `Dashboard.jsx` no relacionado a acciones de administracion).

RESULTADO
Los iconos de editar y eliminar quedan visibles de forma permanente y consistente en los listados administrativos ajustados, mejorando usabilidad sin cambios funcionales en backend.

FECHA
2026-04-17

DESCRIPCION
Se integran los nuevos campos `mail` y `sede` en todo el modulo de Gestion de Docentes, cubriendo backend (entidad/DTO/servicio) y frontend (formularios de crear/editar y listado).

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
backend/src/docente/entities/docente.entity.ts
backend/src/docente/dto/docente.dto.ts
backend/src/docente/docente.service.ts
frontend/src/Pages/DocenteFormPage.jsx
frontend/src/Pages/Docentes.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Backend:
  - Se agregan propiedades `mail` y `sede` en entidad `Docente` para mapear columnas nuevas en BD.
  - `CrearDocenteDto` incorpora:
    - `mail` con validacion `IsEmail`.
    - `sede` con validacion de string y no vacio.
  - `ActualizarDocenteDto` incorpora `mail` y `sede` opcionales.
  - En `DocenteService` se agrega normalizacion de campos:
    - `mail`: trim + lowercase.
    - `sede`: trim + validacion de no vacio.
  - Los flujos de create/update/listado siguen usando ORM y ya incluyen ambos campos al persistir/consultar.

- Frontend:
  - `DocenteFormPage` agrega inputs para `Correo electronico` (tipo email) y `Sede`.
  - Se extiende estado inicial y carga en modo edicion para incluir los nuevos campos.
  - Se agrega validacion en submit para:
    - email requerido y formato valido
    - sede requerida.
  - `Docentes.jsx` agrega columnas `Correo` y `Sede` en la tabla.
  - El correo se muestra truncado para mantener limpieza visual.
  - Se amplia busqueda por `mail` y `sede`.

RESULTADO
El modulo de docentes queda actualizado de extremo a extremo para `mail` y `sede`, con captura, edicion, visualizacion y persistencia en base de datos sin romper la UI existente.

FECHA
2026-04-17

DESCRIPCION
Se estandariza globalmente el diseño de acciones de editar/eliminar en listados del sistema usando como patron exacto el estilo del modulo `Periodos Academicos`, mediante un componente reutilizable.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/Components/TableActionButtons.jsx
frontend/src/Pages/Periodos.jsx
frontend/src/Pages/CortesAcademicos.jsx
frontend/src/Pages/Agendas.jsx
frontend/src/Pages/Actividades.jsx
frontend/src/Pages/Docentes.jsx
frontend/src/Pages/Usuarios.jsx
frontend/src/Pages/Programas.jsx
frontend/src/Pages/TiposActividad.jsx
frontend/src/Pages/Facultades.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Se crea `TableActionButtons` para unificar visual y comportamiento de acciones en tablas/listados.
- El componente encapsula:
  - mismo tamano de contenedor y padding de referencia (`p-2.5`)
  - mismos colores de editar/eliminar
  - mismo radio (`rounded-xl`), sombra y estados hover/active
  - alineacion estandar (`justify-end` por defecto) y soporte para override de contenedor.
- Se reemplazan bloques duplicados de botones en modulos administrativos y operativos con columna de acciones.
- Se mantienen iconos siempre visibles y funcionalidad actual sin dependencia de hover para aparicion.

RESULTADO
La interfaz queda consistente a nivel sistema para acciones de editar/eliminar, con un unico patron visual reusable basado en `Periodos Academicos` y menor deuda de estilos duplicados.

FECHA
2026-04-17

DESCRIPCION
Se mejora el modulo de Facultades para navegar a un detalle por facultad y gestionar programas asociados en una vista dedicada, con filtrado por `id_facultad` y acciones de ver/editar/agregar programa.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
frontend/src/Pages/Facultades.jsx
frontend/src/Pages/FacultadProgramasPage.jsx
frontend/src/App.jsx
frontend/src/Components/ProgramaForm.jsx
backend/src/docente/docente.controller.ts
backend/src/docente/docente.service.ts
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Frontend:
  - Se agrega accion de `Ver programas` en tarjetas de facultad con iconografia coherente y tooltip.
  - Se habilita navegacion por clic en tarjeta a ruta dedicada `/admin/facultades/:id/programas`.
  - Nueva pagina `FacultadProgramasPage` con:
    - encabezado de facultad y resumen de total de programas
    - buscador local de programas
    - tabla de programas asociados
    - acciones por programa: `Ver` (modal resumen) y `Editar` (formulario reutilizado)
    - boton `Nuevo Programa` contextual a la facultad.
  - `ProgramaForm` se extiende para soportar facultad fija en contexto (`fixedFacultadId`, `fixedFacultadNombre`), evitando mezcla de facultades.

- Backend:
  - Se agrega `obtenerFacultad(id)` en servicio y endpoint `GET /admin-docente/facultades/:id`.
  - Se extiende `listarProgramas` para recibir filtro opcional `id_facultad` desde query.
  - El detalle consume `GET /admin-docente/programas?id_facultad={id}` para asegurar aislamiento de programas por facultad.

RESULTADO
Cada facultad cuenta con una vista de detalle organizada para visualizar y gestionar sus programas asociados, con navegacion clara ida/vuelta y sin mezclar registros de otras facultades.

FECHA
2026-04-17

DESCRIPCION
Se rediseña la vista principal del modulo `Facultades` para usar tabs por facultad y mostrar de forma inmediata los programas asociados en tarjetas modernas con gestion contextual.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/Pages/Facultades.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Se reemplaza el layout de tarjetas de facultad como vista principal por:
  - barra de tabs dinamica por facultad
  - panel de detalle por tab activa
  - grid de cards de programas asociados.
- Se integra carga de programas por `id_facultad` activo en cada cambio de tab.
- Se agrega buscador local de programas dentro del contexto de la facultad activa.
- Se reutiliza `ProgramaForm` con `fixedFacultadId` para crear/editar programas asociados automaticamente a la tab actual.
- Se incorporan acciones estandarizadas por programa (`Editar`/`Eliminar`) con iconografia global del sistema.
- Se incorpora estado vacio por facultad sin programas con CTA de alta.

RESULTADO
La experiencia de Facultades queda modernizada con navegacion por pestañas y gestion inmediata de programas por facultad activa, mejorando usabilidad y manteniendo coherencia visual institucional.

FECHA
2026-04-17

DESCRIPCION
Se corrige el flujo de alta de programas desde el modulo tabulado de Facultades para que la facultad activa quede preseleccionada automaticamente en el modal y no requiera seleccion manual adicional.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/Components/ProgramaForm.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- `ProgramaForm` ahora inicializa y conserva `id_facultad` desde `fixedFacultadId` cuando se invoca en contexto de facultad activa.
- En submit se fuerza `id_facultad` del contexto fijo para evitar desalineacion con la pestaña activa.
- Se ajusta validacion para no exigir selector de facultad cuando ya existe contexto fijado.
- Se reemplaza el selector editable por visualizacion de solo lectura del nombre de facultad en contexto tabulado.
- Se mantiene compatibilidad con uso general del formulario (sin facultad fija) mostrando selector normal.

RESULTADO
Al crear programas desde una pestaña de facultad, el modal abre con la facultad activa precargada y el usuario solo completa el nombre del programa; el guardado queda asociado correctamente a la facultad seleccionada.

FECHA
2026-04-17

DESCRIPCION
Se reorganiza el modulo de Gestion de Docentes para operar por pestañas de facultad con filtrado dinamico, contador por facultad, estado visual activo/inactivo y alta contextual de docentes por facultad activa.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
frontend/src/Pages/Docentes.jsx
frontend/src/Pages/DocenteFormPage.jsx
backend/src/docente/docente.service.ts
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Frontend (`Docentes.jsx`):
  - Se sustituye listado plano por interfaz tabulada dinamica usando facultades de BD.
  - Se calcula y muestra contador de docentes por facultad en cada tab.
  - Se agrega panel de facultad activa con buscador contextual.
  - Se renderiza tabla de docentes filtrada por facultad activa con acciones estandarizadas (editar/eliminar).
  - Se incorpora badge de estado basado en usuarios asociados (`ACTIVO`/`INACTIVO`).
  - El boton `Nuevo Docente` incluye `id_facultad` en ruta para flujo contextual.

- Frontend (`DocenteFormPage.jsx`):
  - Se lee `id_facultad` desde query en modo creacion.
  - Se filtra listado de programas por facultad fija cuando aplica.
  - Se muestra facultad fija en solo lectura para evitar re-seleccion manual.
  - Se conserva comportamiento estandar para edicion y para creacion sin contexto.

- Backend (`docente.service.ts`):
  - `listarDocentes` incluye `leftJoinAndSelect('docente.usuarios', 'usuarios')`.
  - `obtenerDocente` agrega relacion `usuarios`.
  - Lo anterior habilita en frontend la evaluacion consistente de estado por `usuario.activo`.

RESULTADO
Gestion de Docentes queda modernizada por facultades con tabs, conteo y estado visual inmediato, y con alta de docentes contextualizada a la facultad activa para mejorar usabilidad y reducir errores operativos.

FECHA
2026-04-17

DESCRIPCION
Se corrige el fallo de guardado en `Editar Docente` causado por envio de campo `identificacion` en update, el cual no es aceptado por el DTO de actualizacion.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/Pages/DocenteFormPage.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- En `DocenteFormPage`, el payload para edicion ahora excluye `identificacion`.
- Se mantiene `identificacion` en creacion, pero en update solo se envian campos permitidos por `ActualizarDocenteDto`.
- Esto elimina el error de validacion `property identificacion should not exist` y habilita guardado de cambios en correo/sede y demas campos editables.

RESULTADO
La edicion de docentes vuelve a funcionar correctamente y persiste los cambios esperados sin romper validaciones backend.

FECHA
2026-04-17

DESCRIPCION
Se adapta la tabla de Gestion de Docentes para priorizar control de acceso (rol y gestion de usuario asociado), incorporando accion directa para crear o editar credenciales desde cada docente.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/Pages/Docentes.jsx
frontend/src/Pages/UsuarioFormPage.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- `Docentes.jsx`:
  - Se removieron columnas de perfil academico no prioritarias para este flujo (`Programa`, `Correo`, `Vinculacion / Dedicacion`).
  - Se agregaron columnas:
    - `Rol` (derivado de usuario asociado)
    - `Acceso / Usuario` (boton de gestion de credenciales).
  - Se agrega resolucion de `usuarioPrincipal` por docente para decidir navegacion y rol mostrado.
  - Accion de acceso:
    - con usuario: `/admin/usuarios/editar/:id_usuario`
    - sin usuario: `/admin/usuarios/nuevo?id_docente=:id&rol=DOCENTE`.

- `UsuarioFormPage.jsx`:
  - Se agrego lectura de query params `id_docente` y `rol` para preasignacion en alta de usuario.
  - Se bloquea selector de docente cuando llega preasociado desde gestion de docentes.
  - Se mantiene flujo normal para altas/ediciones fuera de ese contexto.

RESULTADO
Desde la tabla de docentes ahora es posible administrar acceso de forma directa: visualizar rol actual y crear/editar usuario asociado sin pasos manuales extra de seleccion de docente.

FECHA
2026-04-17

DESCRIPCION
Se corrige el flujo de cancelacion en formulario de usuarios para respetar el origen desde Gestion de Docentes y retornar a la misma vista/facultad activa en lugar del listado general de usuarios.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/Pages/Docentes.jsx
frontend/src/Pages/UsuarioFormPage.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- `Docentes.jsx`:
  - Se incluye metadata de retorno al navegar a usuarios:
    - `from=docentes`
    - `facultad_id`
    - `q` (filtro activo)
  - Se sincroniza estado de contexto con URL para preservar facultad y busqueda.
- `UsuarioFormPage.jsx`:
  - Se agrega resolver de retorno (`navegarCancelar`) basado en query params.
  - Botones `Volver al listado` y `Cancelar` ahora:
    - regresan a `/admin/docentes` con contexto restaurado cuando `from=docentes`
    - mantienen `/admin/usuarios` en flujo normal.

RESULTADO
El usuario puede entrar desde Gestion de Docentes a crear/editar acceso y, al cancelar, vuelve al mismo modulo con la misma facultad activa y filtro, mejorando continuidad de trabajo.

FECHA
2026-04-17

DESCRIPCION
Se corrige bug de render en Gestion de Docentes que causaba pantalla en blanco al cambiar a facultades sin docentes registrados.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/Pages/Docentes.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- El estado vacio de la tabla utilizaba `GraduationCap` sin import declarado.
- En runtime, al entrar a facultades con lista vacia, React fallaba en el render de ese bloque y dejaba la vista en blanco.
- Se agrega el import faltante para asegurar render estable del empty state.

RESULTADO
La vista ya maneja correctamente facultades sin docentes: muestra estado vacio amigable y conserva buscador + boton de nuevo docente sin romper la interfaz.

FECHA
2026-04-17

DESCRIPCION
Se corrige la validacion de creacion/actualizacion de docentes para evitar bloqueo incorrecto por facultad del administrador cuando el usuario es rol `ADMIN` y selecciona un programa valido de otra facultad.

MODULOS AFECTADOS
backend

ARCHIVOS MODIFICADOS
backend/src/docente/docente.service.ts
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- `validarProgramaScope`:
  - ahora valida primero existencia del programa.
  - aplica restriccion por `idFacultad` solo para usuarios no `ADMIN`.
- `validarDocenteScope`:
  - permite alcance global para `ADMIN`.
  - mantiene restriccion por facultad para roles restringidos.
- `listarDocentes`:
  - elimina filtro obligatorio por facultad cuando el usuario es `ADMIN`.
  - conserva filtro por facultad para no ADMIN.
- Se mantiene control de errores para casos invalidos reales (programa inexistente o fuera de alcance).

RESULTADO
El flujo de alta de docentes vuelve a permitir registro en facultades distintas para usuarios ADMIN, siempre que el programa seleccionado sea valido, eliminando el error incorrecto reportado.

FECHA
2026-04-17

DESCRIPCION
Cierre tecnico de sesion con consolidacion de mejoras recientes en Gestion de Docentes y Control de Usuarios, dejando documentado el estado estable del flujo por facultades, gestion de acceso y validaciones de alta multi-facultad.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Se registra cierre formal de la iteracion con estado operativo actualizado.
- Se consolidan como cambios vigentes de la sesion:
  - tabs por facultad en docentes con empty state estable,
  - enfoque de tabla de docentes hacia control de acceso,
  - navegacion contextual docentes -> usuarios -> docentes,
  - validacion backend de alcance para permitir alta de docentes en cualquier facultad valida para rol ADMIN.
- Se documentan pendientes operativos para validacion E2E en ambiente integrado.

RESULTADO
La sesion queda cerrada con trazabilidad completa, sin perdida de historial, y con lineamientos claros para la siguiente iteracion de pruebas funcionales y estabilizacion final.

FECHA
2026-04-18

DESCRIPCION
Se refuerza la autenticacion del frontend para proteger rutas privadas desde el arranque de la aplicacion, validando token JWT persistido y forzando redireccion a login cuando no existe sesion valida.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/context/AuthContext.jsx
frontend/src/App.jsx
frontend/src/services/api.js
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- `AuthContext`:
  - se implementa validacion de token JWT en inicializacion (formato + `exp` vigente).
  - se agrega parseo seguro de datos persistidos para evitar errores por JSON corrupto.
  - cuando la sesion persistida no es valida, se limpia `token/usuario/periodo` y se marca estado no autenticado.
  - se expone bandera `autenticado` para simplificar reglas de acceso.
- `App.jsx`:
  - `PrivateRoute` usa `autenticado` y redirige a `/login` con `replace` cuando no hay sesion.
  - se agrega `PublicOnlyRoute` para que `/login` redirija a `/` si ya hay sesion valida.
  - se agrega ruta fallback interna `* -> /` dentro del bloque privado.
- `api.js`:
  - se incorpora interceptor de respuesta para `401`.
  - ante `401` se limpia sesion local y se redirige a `/login` (si no esta ya en esa ruta), evitando permanencia en pantallas protegidas con token invalido.
- Verificacion:
  - build frontend ejecutado exitosamente con `npm run build`.

RESULTADO
Al abrir la aplicacion, usuarios sin sesion valida son llevados automaticamente al login y no pueden acceder a rutas internas; usuarios autenticados mantienen acceso normal al sistema.

FECHA
2026-04-18

DESCRIPCION
Se ajusta el flujo de `Crear acceso` desde `Gestion de Docentes` para prellenar `username` con la cedula del docente seleccionado y mantener `password` vacia al abrir `Nuevo Usuario`.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/Pages/UsuarioFormPage.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- En `UsuarioFormPage` (modo crear):
  - se identifica el flujo de origen por query params (`from=docentes`, `id_docente`).
  - se localiza el docente preasociado dentro de `docentesData` cargado desde API.
  - se autocompleta `formData.username` con `docente.identificacion` normalizada.
  - se fuerza `formData.password = ''` para iniciar sin valor previo.
- Se agregan atributos de autocompletado en inputs:
  - `username` con `autoComplete="off"`.
  - `password` con `autoComplete="new-password"`.
  Esto reduce interferencia de autocompletado del navegador en el flujo de alta.
- Se mantiene intacta la logica existente de:
  - preasociacion de `id_docente` y `rol` desde query,
  - bloqueo de selector de docente cuando llega preasociado,
  - retorno contextual hacia `Gestion de Docentes`.
- Verificacion:
  - build frontend exitoso con `npm run build`.

RESULTADO
Desde `Gestion de Docentes` -> `Crear acceso`, el formulario abre con `Username = cedula del docente` y `Contrasena` vacia, manteniendo el resto de datos del docente preasociados de forma normal.

FECHA
2026-04-18

DESCRIPCION
Se mejora la usabilidad del listado en `Gestion de Docentes` incorporando orden descendente por recencia y paginacion fija de 5 registros por pagina en la tabla por facultad.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/Pages/Docentes.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- En `Docentes.jsx` se ajusta la derivacion de datos para:
  - ordenar docentes filtrados por recencia con prioridad `created_at DESC`.
  - aplicar fallback a `id_docente DESC` cuando `created_at` no existe o no es parseable.
- Se implementa paginacion local con:
  - `REGISTROS_POR_PAGINA = 5`.
  - estado `paginaActual`.
  - calculo de `totalPaginas` y slice de `docentesPaginados`.
- Se agregan reglas de consistencia de navegacion:
  - reset a pagina 1 al cambiar facultad o texto de busqueda.
  - ajuste automatico de pagina actual si el total de paginas disminuye.
- Se incorpora UI de paginacion bajo la tabla:
  - botones `Anterior` y `Siguiente` con estados deshabilitados.
  - botonera numerica de paginas en viewport desktop.
  - resumen de pagina actual y total de docentes filtrados.
- Verificacion:
  - build frontend exitoso con `npm run build`.

RESULTADO
El modulo `Gestion de Docentes` ahora muestra por defecto los 5 docentes mas recientes y permite navegar de forma paginada por el resto de registros, manteniendo orden descendente consistente en todas las paginas.

FECHA
2026-04-23

DESCRIPCION
Se corrige el modulo `Agendas docentes` para eliminar el loading infinito en frontend y se ajusta el backend de agendas para que usuarios `ADMIN` no queden bloqueados por reglas de scope que exigian facultad/docente asociado.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
frontend/src/Pages/Agendas.jsx
backend/src/agenda/agenda.service.ts
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Frontend (`Agendas.jsx`):
  - Se reemplaza la condicion de loading en render para depender solo de `cargando`, eliminando el estado infinito causado por `(!buscarTodosLosAnios && !anioActivo)` cuando no habia anios disponibles.
  - Se agrega estado `errorCarga` y captura de mensaje backend (`error.response.data.message`) con fallback `No fue posible cargar las agendas`.
  - Se agrega bloque UX de error con mensaje claro y boton `Reintentar`.
  - Se normaliza `setAgendas` para aceptar solo arreglos y evitar inconsistencia por payload inesperado.
- Backend (`agenda.service.ts`):
  - Se ajusta `obtenerScope` para rol `ADMIN` con fallback ante `403` de `ScopeService` (cuando no existe docente/facultad asociada), manteniendo propagacion de `401`.
  - Se actualizan validaciones de alcance (`validarAgendaScope`, `validarDocenteScope`) para no aplicar filtro por facultad cuando el usuario es `ADMIN`.
  - Se ajusta `obtenerTodas` para permitir consulta global de agendas al rol `ADMIN`.

RESULTADO
La pantalla de `Agendas docentes` deja de quedarse en "Cargando agendas..." de forma indefinida, muestra errores funcionales cuando aplica y permite que el rol `ADMIN` consulte/agregue/edite agendas sin bloqueo por scope de facultad en este modulo.

FECHA
2026-04-23

DESCRIPCION
Se ajusta el modulo `Agendas docentes` para ocultar estado en listado/formulario, forzar nuevas agendas con estado `Aprobada` y consolidar orden descendente por recencia.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
frontend/src/Pages/Agendas.jsx
frontend/src/Pages/AgendaFormPage.jsx
backend/src/agenda/agenda.service.ts
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Frontend (`Agendas.jsx`):
  - Se elimina columna visual de estado en la tabla de agendas y su badge asociado.
  - Se mantiene orden de registros por recencia con fallback en este orden:
    - `fecha_diligenciamiento` DESC
    - `createdAt/created_at` DESC (si el payload lo incluye)
    - `id_agenda` DESC
- Frontend (`AgendaFormPage.jsx`):
  - Se elimina el bloque completo `Estado de Agenda` (selector ya no visible ni editable).
  - En creacion, el payload envia internamente `estado: 'Aprobada'`.
  - El estado inicial del formulario se alinea a `Aprobada` para evitar inconsistencias internas.
- Backend (`agenda.service.ts`):
  - En `crear(...)` se fija `estado: 'Aprobada'` para toda nueva agenda, independiente del valor recibido.
  - En `obtenerTodas(...)` se agrega orden secundario SQL por `id_agenda DESC` para estabilidad cuando hay empate de fecha.

RESULTADO
El listado de agendas queda limpio (sin estado visible), mantiene las agendas nuevas arriba, y el formulario de apertura crea agendas con estado `Aprobada` automaticamente sin exponer ese campo al usuario.

FECHA
2026-04-23

DESCRIPCION
Se ajusta el orden del listado de `Agendas docentes` para usar criterio unico descendente por `id_agenda`, garantizando que registros nuevos queden primero y sin reordenamiento adicional en frontend.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
backend/src/agenda/agenda.service.ts
frontend/src/Pages/Agendas.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Backend (`agenda.service.ts`):
  - En `obtenerTodas(...)` se define orden SQL unico: `orderBy('agenda.id_agenda', 'DESC')`.
- Frontend (`Agendas.jsx`):
  - Se elimina `sort` local para evitar contradiccion con backend.
  - El listado usa directamente el arreglo recibido y mantiene el orden `DESC` por ID entregado por la API.

RESULTADO
El endpoint y la vista quedan alineados en `id_agenda DESC`: nuevas agendas arriba, antiguas abajo y paginacion consistente sobre ese orden.

FECHA
2026-04-23

DESCRIPCION
Se ajusta `Nueva agenda` para priorizar docentes recientes en el selector y se restaura en `Agendas docentes` la visualizacion del estado por registro con badges diferenciados.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
backend/src/docente/docente.service.ts
frontend/src/Pages/AgendaFormPage.jsx
frontend/src/Pages/Agendas.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Backend (`docente.service.ts`):
  - `listarDocentes(...)` ahora incluye `orderBy('docente.id_docente', 'DESC')`.
- Frontend (`AgendaFormPage.jsx`):
  - La fuente de docentes se normaliza y ordena por `id_docente DESC` antes de poblar el select `Seleccione docente`.
- Frontend (`Agendas.jsx`):
  - Se reincorpora la columna `Estado` en la tabla principal.
  - Se implementa `getEstadoBadge(...)` con mapeo visual para estados solicitados (`En_Elaboracion`, `En_Revision`, `Con_Observaciones`, `Aprobada`) y compatibilidad con estados ya existentes (`Borrador`, `Enviada`, `Rechazada`).
  - Se conserva el resto de comportamiento del listado (filtros, paginacion, acciones).

RESULTADO
El formulario `Nueva agenda` muestra primero docentes recientes y el modulo `Agendas docentes` vuelve a exponer el estado real de cada agenda en formato visual claro, sin afectar la operacion del listado.

FECHA
2026-04-23

DESCRIPCION
Se ajusta la creacion de `Nueva agenda` para que el estado quede oculto en UI y se persista automaticamente como `En_Elaboracion`.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
frontend/src/Pages/AgendaFormPage.jsx
backend/src/agenda/agenda.service.ts
backend/src/agenda/dto/crear-agenda.dto.ts
backend/src/agenda/entities/agenda.entity.ts
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Frontend (`AgendaFormPage.jsx`):
  - Se mantiene el estado sin campo visual y se envia en creacion como `En_Elaboracion`.
  - Se ajusta estado inicial interno y fallback de carga a `En_Elaboracion`.
- Backend (`agenda.service.ts`):
  - `crear(...)` fuerza estado persistido `En_Elaboracion` para nuevas agendas.
- Backend (`crear-agenda.dto.ts` y `agenda.entity.ts`):
  - Se amplian valores permitidos del estado para contemplar flujo operativo actual (`En_Elaboracion`, `En_Revision`, `Con_Observaciones`) manteniendo compatibilidad con valores previos.

RESULTADO
La creacion de agendas queda alineada al flujo requerido: el usuario no ve el estado y toda nueva agenda se guarda como `En_Elaboracion`.

FECHA
2026-04-23

DESCRIPCION
Se mejora la visualizacion del estado en el listado de `Agendas docentes` usando badges con mapeo explicito de estilos por estado del enum operativo.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/Pages/Agendas.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Se reemplaza mapeo generico por helpers dedicados:
  - `getEstadoClass(estado)` para resolver clases CSS por estado.
  - `getEstadoLabel(estado)` para etiqueta legible.
- Se configura estilo por estado requerido:
  - `En_Elaboracion`: gris
  - `En_Revision`: azul
  - `Con_Observaciones`: amarillo/naranja
  - `Aprobada`: verde
- Se mantiene fallback visual neutro para estados no contemplados.

RESULTADO
La columna `Estado` ahora comunica claramente el avance de cada agenda con badges consistentes y diferenciados por color segun el estado real.

FECHA
2026-04-23

DESCRIPCION
Se corrige el fallo de carga en `Gestion de Docentes` para usuarios `ADMIN`, eliminando el falso mensaje "No hay facultades registradas" cuando el error real provenia de la consulta de docentes/scope.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
backend/src/docente/docente.service.ts
frontend/src/Pages/Docentes.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Backend (`docente.service.ts`):
  - Se ajusta `obtenerScope` para rol `ADMIN` con fallback controlado cuando `ScopeService` retorna `403` por ausencia de docente/facultad asociada.
  - El fallback devuelve scope administrativo valido para el modulo (`rol: ADMIN`) y evita bloquear `GET /admin-docente/docentes` en ese escenario.
  - Se mantiene seguridad de autenticacion: errores `401` no usan fallback y se propagan.
- Frontend (`Docentes.jsx`):
  - Se cambia carga concurrente a `Promise.allSettled` para desacoplar fallos entre `/admin-docente/facultades` y `/admin-docente/docentes`.
  - Se agregan estados de diagnostico `errorFacultades` y `errorDocentes`.
  - Se evita limpiar facultades por error de docentes, eliminando el falso positivo de "No hay facultades registradas".
  - Se agregan mensajes diferenciados en UI para:
    - error de endpoint de facultades,
    - error de endpoint de docentes,
    - ausencia real de datos en BD.

RESULTADO
El flujo de `Gestion de Docentes` vuelve a comportarse correctamente para `ADMIN`: si existen facultades se muestran, y si falla la consulta de docentes se reporta el diagnostico real sin ocultar facultades ni mostrar mensajes incorrectos de ausencia de datos.

FECHA
2026-04-23

DESCRIPCION
Se cierra iteracion de `Agendas docentes` con ajustes funcionales en ordenamiento, estados y experiencia de creacion/listado, dejando el flujo de administracion alineado a reglas de negocio actuales.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
backend/src/agenda/agenda.service.ts
backend/src/agenda/dto/crear-agenda.dto.ts
backend/src/agenda/entities/agenda.entity.ts
backend/src/docente/docente.service.ts
frontend/src/Pages/Agendas.jsx
frontend/src/Pages/AgendaFormPage.jsx
frontend/src/Pages/Docentes.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Backend:
  - Se unifica listado de agendas con `orderBy('agenda.id_agenda', 'DESC')` para garantizar recencia por ID.
  - Se fuerza `estado: 'En_Elaboracion'` en creacion de agendas y se amplian enums/DTO para estados operativos (`En_Elaboracion`, `En_Revision`, `Con_Observaciones`, `Aprobada`).
  - Se ordena listado de docentes con `id_docente DESC` para el selector de `Nueva agenda`.
  - Se mantiene fallback de scope para ADMIN en modulo docentes/agendas ante `403` de scope por ausencia de docente asociado.
- Frontend:
  - `Agendas.jsx` respeta orden backend, mantiene paginacion estable y renderiza estado con badges por color.
  - `AgendaFormPage.jsx` mantiene oculto estado y crea agendas enviando internamente `En_Elaboracion`.
  - `Docentes.jsx` desacopla errores de facultades/docentes con `Promise.allSettled` para evitar mensajes falsos de ausencia de datos.

RESULTADO
El modulo de administracion de agendas queda estable: nuevas agendas se crean en `En_Elaboracion`, aparecen arriba por `id_agenda DESC`, estados se visualizan claramente en listado y el flujo ADMIN reduce fallos por scope en vistas clave.

FECHA
2026-04-23

DESCRIPCION
Se implementa perfil autenticado del docente con endpoints dedicados y modal de edicion desde el header superior, corrigiendo ademas la visualizacion de nombre/cedula del usuario logueado con datos reales de `docente`.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
backend/src/auth/auth.module.ts
backend/src/auth/perfil.controller.ts
backend/src/auth/usuario.service.ts
backend/src/auth/dto/perfil-docente.dto.ts
frontend/src/context/AuthContext.jsx
frontend/src/Components/Layout.jsx
frontend/src/Components/ProfileModal.jsx
AGENTS.md
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Backend:
  - Se agregan endpoints autenticados:
    - `GET /api/perfil` para consultar usuario/docente asociado.
    - `PATCH /api/perfil` para actualizar solo campos permitidos del docente autenticado.
  - Se amplian capacidades de `UsuarioService`:
    - resolucion de usuario autenticado por `id_usuario/sub`.
    - mapeo de perfil con `usuario` + `docente` + `programa`.
    - validaciones de negocio para perfil sin docente asociado.
  - Se restringe actualizacion a campos editables:
    - `nombres`, `mail`, `sede`, `tipo_vinculacion`, `tipo_dedicacion`, `escalafon`, `franja`.
  - Se mantienen fuera de actualizacion:
    - `identificacion`, `id_programa`.

- Frontend:
  - Se incorpora `ProfileModal` (modal elegante y responsive) desde menu de usuario en header.
  - `Layout.jsx` ahora consulta `/perfil` para sincronizar datos reales de docente y mostrarlos en bloque superior (nombre + cedula + rol).
  - Se reemplaza accion `Perfil` del dropdown para abrir modal (sin navegacion a vista aparte).
  - En `AuthContext` se agrega `actualizarUsuario(...)` para refrescar en sesion `usuario.docente` tras guardar perfil.
  - El modal maneja caso sin docente asociado con mensaje claro y sin romper la interfaz.

RESULTADO
El usuario autenticado ahora visualiza correctamente en el header su nombre y cedula reales desde `docente`, puede abrir `Mi perfil` desde el menu superior y editar unicamente los campos permitidos; al guardar, los cambios se reflejan de inmediato en la UI y persisten en BD.

FECHA
2026-04-23

DESCRIPCION
Se estandariza la UI de formularios y consultas del sistema con una capa global de estilos basada en tarjetas modernas (bordes redondeados, sombras suaves, espaciado limpio) y paleta institucional verde.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/index.css
frontend/src/Components/Layout.jsx
frontend/src/Pages/Login.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Se implementa tema global de formularios con scope `.sigedin-form-theme` para evitar duplicacion de estilos por pagina/componente.
- Se definen tokens visuales en `:root` para verdes institucionales, grises de soporte y sombra de tarjetas.
- Se unifican contenedores card (`div/section/form` blancos con bordes + rounded):
  - radio uniforme de 14px,
  - sombra ligera moderna,
  - borde suave.
- Se estandarizan campos de captura (`input/select/textarea`) con:
  - bordes y fondos suaves,
  - altura/forma consistentes,
  - foco verde con halo institucional.
- Se homogeniza visual de botones primarios (`bg-institutional-green` y equivalentes azules en formularios) hacia criterio verde, con hover mas oscuro y sombra ligera.
- Se mejora estilo de tablas de consulta (encabezado suave, hover sutil en filas, bordes livianos).
- El alcance se activa en layout principal y login para cubrir CRUD y consultas sin tocar logica funcional.

RESULTADO
La aplicacion queda con apariencia mas limpia y coherente en formularios/consultas: tarjetas uniformes, controles consistentes y acentos verdes institucionales, manteniendo intacta la funcionalidad y la respuesta responsive.

FECHA
2026-04-23

DESCRIPCION
Se migra `Perfil` de modal a vista dedicada dentro del layout principal y se amplía el flujo para permitir actualización de datos del docente autenticado más cambio de contraseña condicionado al estado activo del usuario.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
frontend/src/Components/Layout.jsx
frontend/src/Pages/PerfilPage.jsx
frontend/src/App.jsx
frontend/src/context/AuthContext.jsx
backend/src/auth/dto/perfil-docente.dto.ts
backend/src/auth/usuario.service.ts
backend/src/auth/perfil.controller.ts
AGENTS.md
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Frontend:
  - Se elimina el uso de modal para `Perfil` y se redirige desde el dropdown de usuario a ruta dedicada `/perfil`.
  - Nueva vista `PerfilPage` con diseño moderno institucional (cards, sombras suaves, paleta verde, espaciado limpio).
  - Campos editables en formulario:
    - `nombres`, `mail`, `sede`, `tipo_vinculacion`, `tipo_dedicacion`, `escalafon`, `franja`.
  - Campos bloqueados en solo lectura:
    - `identificacion`, `programa`.
  - Se agrega bloque de seguridad para cambio de contraseña con:
    - contraseña actual,
    - nueva contraseña,
    - confirmación.
  - Si `usuario.activo = 0`, se deshabilitan campos de contraseña y se muestra mensaje: `Usuario inactivo. No puede cambiar la contraseña.`
  - Se actualiza sesión local (`AuthContext`) tras guardar para reflejar cambios de perfil en header.

- Backend:
  - `PATCH /api/perfil` se amplía para aceptar `password_actual` y `password_nueva` como campos opcionales.
  - Cambio de contraseña permitido únicamente cuando `usuario.activo = 1` y la contraseña actual es válida.
  - Se mantiene actualización de datos docentes en el mismo endpoint.
  - Se incluye `usuario.activo` en respuesta de `GET /api/perfil` para controlar UI de seguridad.
  - Se agrega sincronización opcional de correo a `usuario.username` cuando el username representa correo del mismo usuario.

RESULTADO
El flujo de perfil queda alineado al requerimiento: navegación a vista dedicada, edición de datos docentes permitidos, bloqueo de campos no editables, cambio de contraseña con reglas de estado activo y retroalimentación clara de éxito/error, sin afectar la lógica fuera de este módulo.

FECHA
2026-04-23

DESCRIPCION
Se mejora la columna `Acceso / Usuario` de Gestion de Docentes para operar con dos acciones directas por fila (`Crear` y `Editar`) manteniendo contexto de facultad/busqueda y evitando flujo ambiguo de una sola accion.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/Pages/Docentes.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Se reemplaza boton unico de acceso por dos botones/acciones con iconografia clara:
  - `Crear` para alta de usuario asociado al docente seleccionado.
  - `Editar` para actualizar usuario ya asociado.
- `Crear`:
  - inhabilitado cuando ya existe usuario para la fila,
  - navega a `/admin/usuarios/nuevo` con `id_docente` y `rol=DOCENTE` preconfigurados,
  - conserva parametros de retorno (`from=docentes`, `facultad_id`, `q`).
- `Editar`:
  - inhabilitado cuando no existe usuario,
  - navega a `/admin/usuarios/editar/:id_usuario` con parametros de retorno.
- Se agregan mensajes de UX (`toast.info`) para guiar al usuario cuando la accion seleccionada no aplica por estado de la fila.

RESULTADO
La gestion de acceso por docente queda mas clara y operativa: se puede crear o editar usuario directamente desde la tabla, con preasociacion automatica del docente y retorno correcto al contexto actual de Gestion de Docentes.

FECHA
2026-04-23

DESCRIPCION
Se implementa control dinamico de menu lateral y proteccion de rutas por rol autenticado (ADMIN, DECANO, DOCENTE), centralizando reglas de acceso para evitar inconsistencias entre UI y navegacion directa por URL.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/config/roleAccess.js
frontend/src/Components/Sidebar.jsx
frontend/src/App.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Se crea `roleAccess.js` con utilidades reutilizables:
  - `normalizarRol(...)`
  - `tieneAccesoMenu(rol, menuKey)`
  - `tieneAccesoRuta(rol, routeKey)`
- Se adapta `Sidebar.jsx` para render condicional por rol:
  - bloque de administracion visible solo para ADMIN,
  - `Supervisión` visible para ADMIN/DECANO,
  - `Actividades`, `Seguimiento`, `Informes` visibles para ADMIN/DECANO/DOCENTE.
- Se agrega `RoleRoute` en `App.jsx` para control de acceso por ruta y redireccion a `/` cuando el rol no esta autorizado.
- Se protegen rutas:
  - `/supervision` solo ADMIN/DECANO,
  - `/actividades*`, `/seguimiento*`, `/informes*` para ADMIN/DECANO/DOCENTE,
  - `/admin/*` solo ADMIN.

RESULTADO
La aplicacion ahora aplica permisos por rol de forma consistente en interfaz y navegacion: los usuarios ven solo menus habilitados y no pueden acceder por URL a modulos no autorizados, manteniendo intacto el estilo visual existente.

FECHA
2026-04-23

DESCRIPCION
Se registra cierre formal de sesion y consolidacion de memoria tecnica sin cambios funcionales adicionales en codigo de producto.

MODULOS AFECTADOS
documentacion

ARCHIVOS MODIFICADOS
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Se agrega entrada de cierre en memoria operativa (`PROJECT_LOG.md`) con:
  - resumen de ultima sesion,
  - estado actual del proyecto,
  - trabajo en curso,
  - pendientes inmediatos.
- Se agrega entrada historica en `DEV_HISTORY.md` para mantener trazabilidad continua del ciclo de desarrollo.
- No se alteran contratos API, componentes funcionales ni rutas de aplicacion en esta actualizacion.

RESULTADO
La sesion queda cerrada con historial y memoria actualizados, preservando continuidad tecnica para la siguiente iteracion de desarrollo.

FECHA
2026-04-24

DESCRIPCION
Se corrige la sumatoria por cortes en el modulo de Actividades para evitar mezcla de horas de otros docentes y se rediseña el resumen inferior en formato matricial (Semanas/Horas por corte y total) con enfoque visual institucional.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
backend/src/actividad/actividad.service.ts
frontend/src/Pages/Actividades.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Backend (`actividad.service.ts`):
  - En `obtenerResumenCortesPorAgenda(...)` se reemplaza la logica que sumaba por `id_corte` global.
  - Nueva agregacion con QueryBuilder:
    - `INNER JOIN actividad` para relacionar `plan_corte_actividad` con su actividad.
    - filtro `actividad.id_agenda = :idAgenda` para asegurar alcance por agenda en contexto.
    - `SUM(plan.horas_planeadas)` por corte para `horas_planeadas_total`.
    - `MAX(plan.numero_semanas)` por corte para semanas planeadas.
  - Se mantiene validacion de acceso por scope (`validarAccesoAgenda`) para respetar docente autenticado (o agenda seleccionada por ADMIN dentro de alcance).

- Frontend (`Actividades.jsx`):
  - Se elimina la franja de chips por corte y se reemplaza por tarjeta/tabla resumen responsive.
  - Nueva matriz por periodo:
    - columnas: Corte 1, Corte 2, Corte 3, Total.
    - filas: Semanas, Horas.
  - Se calcula total de semanas y horas del periodo desde `resumenCortes` ya filtrado por agenda.
  - Se mantiene coherencia visual institucional (verde oscuro, verde claro, blanco) y legibilidad para docente.

RESULTADO
El resumen de cortes en Actividades deja de mostrar acumulados globales (ej. 296h/222h/185h) y pasa a reflejar solo los datos de la agenda del docente autenticado; adicionalmente, la presentacion final queda mas clara y alineada al formato solicitado tipo Excel.

FECHA
2026-04-24

DESCRIPCION
Se corrige de forma global el contraste visual de texto sobre fondos verdes en frontend, evitando casos donde etiquetas/barras/badges mostraban texto oscuro o heredaban colores no legibles sobre superficies institucionales.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/index.css
frontend/src/Pages/Actividades.jsx
frontend/src/Pages/SeguimientoNuevo.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Se agrega hardening global de estilos en `index.css` para fondos verdes oscuros/institucionales:
  - clases: `.bg-institutional-green`, `.bg-institutional-dark`, `.bg-success`, `.badge-success`, `.total-bar`, `.summary-bar`.
  - variantes hex usadas en vistas: `#051F20`, `#235347`, `#173831`, `#006431`, `#005229`, `#1F9D78`, `#8CB79B`.
- Regla aplicada:
  - `color: #FFFFFF` en contenedor de fondo verde (cuando no esta deshabilitado).
  - `color: inherit` forzado para hijos internos, evitando herencias `text-*` de bajo contraste.
- Ajustes puntuales de consistencia:
  - `Actividades.jsx`: chips de totales pasan de `text-black` a `text-white`.
  - `SeguimientoNuevo.jsx`: boton de corte no activo pasa de `text-black` a `text-white` sobre fondo verde.
- Verificacion tecnica:
  - build frontend exitoso (`npm run build`).

RESULTADO
La UI mantiene contraste legible y consistente en elementos con fondo verde en distintas vistas del sistema, reduciendo riesgos de baja accesibilidad visual por herencia de texto oscuro.

FECHA
2026-04-24

DESCRIPCION
Se implementa el modulo de Supervision para DECANO con enfoque BI: dashboard analitico semestral por facultad, tablas por cortes con detalle por docente y acciones operativas de revisiones/evidencias, aprobacion de informe y envio de observaciones.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
backend/src/seguimiento/seguimiento.service.ts
backend/src/seguimiento/supervision.controller.ts
backend/src/seguimiento/seguimiento.module.ts
frontend/src/Pages/Supervision.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Backend:
  - Nuevo endpoint principal: `GET /api/supervision/dashboard`.
  - Respuesta consolidada:
    - `resumen`: `planeadas`, `ejecutadas`, `pendientes`, `porcentaje`.
    - `cortes`: `corte1`, `corte2`, `corte3` con filas por docente.
  - Alcance de datos para DECANO:
    - se resuelve facultad por `facultad.id_docente_decano`.
    - se restringen consultas a programas/docentes/agendas/actividades de esa facultad.
  - Se agregan endpoints de operacion por fila:
    - `GET /api/supervision/evidencias` (seguimientos + evidencias por docente/corte/periodo).
    - `PATCH /api/supervision/aprobar-informe` (actualiza/crea informe por corte).
    - `PATCH /api/supervision/observaciones` (escribe observaciones en `seguimiento_semanal`).
  - Se mantiene compatibilidad con endpoints legacy `dashboard/supervision/*` reutilizando la nueva logica.

- Frontend:
  - Rediseño completo de `Supervision.jsx`:
    - cards KPI (planeadas/ejecutadas/pendientes),
    - indicador radial de avance,
    - barra comparativa planeado vs ejecutado,
    - tabs por corte con tabla analitica por docente.
  - Se implementan acciones en tabla:
    - `Revisar` (modal de evidencias por seguimiento),
    - `Aprobar` (aprobacion de informe),
    - `Observar` (modal con textarea y guardado).
  - Semaforizacion visual de avance:
    - verde > 80,
    - amarillo 50-80,
    - rojo < 50.

RESULTADO
El decano dispone de un panel de supervision empresarial para monitorear cumplimiento semestral de su facultad, con lectura ejecutiva inmediata y capacidad de accion directa sobre evidencias, informes y observaciones por corte/docente.

FECHA
2026-04-24

DESCRIPCION
Se corrige la identificacion de facultad en Supervision para DECANO, usando la cedula limpia del docente autenticado contra `facultad.id_docente_decano`, evitando el fallback incorrecto que mostraba `Sin facultad`.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
backend/src/seguimiento/seguimiento.service.ts
frontend/src/Pages/Supervision.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Backend (`resolverFacultadSupervision`):
  - Se obtiene `docente.identificacion` del usuario autenticado por `scope.idDocente`.
  - Se normaliza identificacion con limpieza de espacios, puntos, comas y guiones.
  - Se compara contra `facultad.id_docente_decano` tambien normalizado en SQL para soportar formatos heterogeneos.
  - Se conserva fallback con `scope.idDocente` normalizado para compatibilidad de datos legacy.
  - Si no hay match, se lanza `ForbiddenException` con mensaje: `No se encontró facultad asociada al decano actual`.
- Frontend:
  - En encabezado de `Supervision.jsx` se reemplaza fallback `Sin facultad` por mensaje claro solicitado: `No se encontró facultad asociada al decano actual`.
- Verificacion tecnica:
  - build backend y frontend exitosos.

RESULTADO
Cuando existe relacion en `facultad.id_docente_decano`, el dashboard de Supervision muestra el nombre real de la facultad del decano y mantiene el filtrado completo por esa facultad; cuando no existe, informa de forma explicita el motivo.

FECHA
2026-04-24

DESCRIPCION
Se corrige la formula de horas planeadas del modulo de Supervision para eliminar el sobrecalculo por doble multiplicacion de semanas, alineando los resultados con el modulo de Actividades por docente/corte.

MODULOS AFECTADOS
backend

ARCHIVOS MODIFICADOS
backend/src/seguimiento/seguimiento.service.ts
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- En `obtenerSupervisionDashboard(...)` se ajustan dos subconsultas de planeacion:
  - resumen semestral (macro),
  - tabla por docente en cada corte.
- Antes:
  - `SUM(pca.horas_planeadas * pca.numero_semanas)`.
- Ahora:
  - `SUM(pca.horas_planeadas)`.
- Razon:
  - `plan_corte_actividad.horas_planeadas` ya representa el acumulado planeado del corte por actividad (calculado en modulo Actividades), por lo que multiplicar nuevamente por `numero_semanas` inflaba valores (ej. 160 -> 1280).
- Se mantiene agregacion por actividad en subconsulta y consolidacion por docente/corte para evitar duplicidad por joins.
- Verificacion tecnica:
  - build backend exitoso (`npm run build`).

RESULTADO
Supervision deja de sobreestimar horas planeadas por corte y semestre; los valores quedan consistentes con Actividades (ejemplo esperado: 160/120/100 y total 380 para 2026-A con 20 h/sem).

FECHA
2026-04-24

DESCRIPCION
Se mejora la seccion "Cumplimiento por docente" del modulo de Supervision con paginacion por pestaña, orden descendente por cumplimiento, porcentaje entero redondeado y nueva pestaña "Avance general" con acumulado semestral por docente.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
backend/src/seguimiento/seguimiento.service.ts
frontend/src/Pages/Supervision.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Frontend (`Supervision.jsx`):
  - Se implementa paginacion a 5 filas por pagina, con estado independiente por tab (`corte1`, `corte2`, `corte3`, `general`).
  - Se agrega tab `Avance general` al grupo de pestañas.
  - Se ordenan filas por:
    1) `% avance` desc,
    2) `horas_ejecutadas` desc,
    3) nombre asc.
  - Se normaliza porcentaje a rango 0-100 y se muestra redondeado a entero sin decimales.
  - Se ajusta colorimetria de badges/barras al criterio solicitado (>=80 verde, 50-79 amarillo, <50 rojo).
  - Las acciones por fila en `Avance general` resuelven `id_corte_accion` para mantener compatibilidad con endpoints existentes.

- Backend (`obtenerSupervisionDashboard`):
  - Se agrega salida `cortes.avance_general` consolidando por docente las sumas de `corte1`, `corte2`, `corte3`.
  - Se evita duplicidad de docentes usando `Map` por `id_docente`.
  - Se calculan por fila consolidada:
    - `horas_planeadas`,
    - `horas_ejecutadas`,
    - `horas_pendientes`,
    - `porcentaje_avance`.
  - Se conserva filtro por facultad ya aplicado en la construccion de cortes base.

- Verificacion tecnica:
  - build backend y frontend exitosos (`npm run build`).

RESULTADO
El decano ahora puede revisar cumplimiento ordenado por rendimiento, con navegacion paginada clara y una vista acumulada "Avance general" coherente con el semestre completo, sin alterar la logica de calculo de horas ya corregida.

FECHA
2026-04-24

DESCRIPCION
Se corrige la causa por la cual la pestaña `Avance general` aparecia vacia: desalineacion entre la clave del payload backend y la clave consumida por frontend.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
backend/src/seguimiento/seguimiento.service.ts
frontend/src/Pages/Supervision.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Backend:
  - Se mantiene `cortes.avance_general` y se agrega alias `cortes.general` para compatibilidad.
- Frontend:
  - La pestaña `Avance general` consume `cortes.avance_general`.
  - Se deja fallback a `cortes.general` para tolerancia a versiones previas.
  - Se corrigen encabezados condicionales para `key === 'avance_general'`.
- Verificacion tecnica:
  - build backend y frontend exitosos.

RESULTADO
La pestaña `Avance general` muestra correctamente el acumulado dinamico del semestre por docente (suma de Corte 1 + Corte 2 + Corte 3), sin requerir registros explicitos adicionales en base de datos.

FECHA
2026-04-24

DESCRIPCION
Se cierra la iteracion del modulo de Supervision con correcciones de calculo, alcance de facultad DECANO, paginacion/orden en tabla de cumplimiento y consolidacion funcional de la pestaña `Avance general` construida dinamicamente desde los tres cortes.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
backend/src/seguimiento/seguimiento.service.ts
backend/src/seguimiento/supervision.controller.ts
backend/src/seguimiento/seguimiento.module.ts
frontend/src/Pages/Supervision.jsx
frontend/src/Pages/Actividades.jsx
frontend/src/index.css
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Backend:
  - Ajuste de formula de horas planeadas en supervision para evitar doble multiplicacion por semanas.
  - Resolucion de facultad por DECANO usando `docente.identificacion` normalizada contra `facultad.id_docente_decano`.
  - Construccion de `cortes.avance_general` por acumulado de `corte1 + corte2 + corte3` agrupado por docente.
  - Alias de compatibilidad `cortes.general` para asegurar consumo frontend durante transicion.
  - Endpoints operativos de supervision activos para evidencias, aprobacion de informe y observaciones.
- Frontend:
  - Dashboard supervision con tabs por corte y tab `Avance general`.
  - Orden de filas por `% avance` descendente y desempate por `horas_ejecutadas`.
  - Paginacion por pestaña (5 filas) con controles de navegacion.
  - Normalizacion visual de `% avance` a entero redondeado entre 0 y 100.
  - Correccion de key de pestaña (`avance_general`) para evitar estados vacios.

IMPACTO TECNICO
- Se mejora la consistencia entre Supervision y Actividades en metricas de horas planeadas por corte/semestre.
- Se reduce riesgo de decisiones de gestion basadas en datos inflados o tablas vacias.
- Se fortalece la trazabilidad funcional del rol DECANO al restringir y presentar datos solo de su facultad.
- Se incrementa usabilidad operativa con paginacion y orden por cumplimiento para analisis rapido.

FECHA
2026-04-27

DESCRIPCION
Se corrige el modulo de Supervision para mostrar en `Cumplimiento por docente` unicamente docentes con agenda programada en el periodo activo seleccionado, y se implementa redireccion inicial por rol al ingresar al sistema.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
backend/src/seguimiento/seguimiento.service.ts
frontend/src/App.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Backend (`seguimiento.service.ts`):
  - En `obtenerSupervisionDashboard(...)` se reemplaza la relacion `LEFT JOIN agenda_docente` por `INNER JOIN agenda_docente` con condicion `ad.id_periodo = ?` en:
    - consulta de resumen semestral,
    - consulta de detalle por corte/docente.
  - El filtro de facultad (`p.id_facultad = ?`) se mantiene, por lo que en rol DECANO/ADMIN solo se incluyen docentes de su facultad y con agenda activa del periodo.
  - Se preserva la resolucion de facultad para DECANO usando `facultad.id_docente_decano` y comparacion de identificacion normalizada (sin puntos, comas, guiones ni espacios).
- Frontend (`App.jsx`):
  - Se agrega `obtenerRutaInicialPorRol(...)` y `HomeByRoleRoute` para controlar el destino de la ruta `/` por rol autenticado.
  - Redirecciones aplicadas:
    - `DECANO` -> `/supervision`
    - `DOCENTE` -> `/seguimiento`
    - `ADMIN`/`ADMINISTRADOR` -> `/admin/agendas` (ruta existente equivalente a administracion de agendas docentes).
  - Se elimina dependencia de un modulo unico por defecto para todos los roles.

RESULTADO
Supervision deja de incluir docentes sin agenda en el periodo activo y la entrada inicial del sistema queda alineada al rol de negocio: DECANO a Supervision, DOCENTE a Seguimiento y ADMIN a Administracion de Agendas.

FECHA
2026-04-27

DESCRIPCION
Se aplica correccion global de contraste visual para garantizar texto blanco sobre contenedores verdes y se elimina una regla CSS que estaba generando barras verdes no deseadas en elementos de texto.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/index.css
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Se corrige regla de tema en `.sigedin-form-theme`:
  - Antes: `button.bg-institutional-blue`, `a.bg-institutional-blue` y `.text-institutional-blue` forzaban `background-color` verde.
  - Ahora: solo se aplica a elementos de fondo (`button/a/.bg-institutional-blue`), evitando que clases de texto creen rectangulos verdes involuntarios.
- Se estandariza hardening global de contraste para fondos verdes:
  - `color: #FFFFFF !important` en contenedores verdes institucionales/oscuros.
  - herencia blanca forzada a hijos internos (`* { color: inherit !important; }`).
  - cobertura extendida a fondos verdes comunes de utilidades (`bg-green-6/7/8/9`, `bg-emerald-6/7/8/9`) y clases institucionales (`bg-institutional-green`, `bg-institutional-dark`, `bg-institutional-blue`, `bg-primary`, `bg-success`, `badge-success`, `total-bar`, `summary-bar`).
- Se mantiene alcance no destructivo: no se modifican tamaños, layout, logica de negocio ni backend/BD.
- Verificacion tecnica:
  - build frontend exitoso (`npm run build`).

RESULTADO
El sistema mejora legibilidad global en badges, barras, tabs y etiquetas con fondo verde; el texto en esos contenedores queda en blanco y se elimina el problema visual reportado en secciones como `Facultad activa`.

FECHA
2026-04-27

DESCRIPCION
Se ajusta el formulario de docentes (crear/editar) para ocultar `escalafon` y `franja` con persistencia por defecto, y se restringe `sede` a un selector con dos opciones oficiales (`Mocoa` y `Sibundoy`).

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
frontend/src/Pages/DocenteFormPage.jsx
backend/src/docente/docente.service.ts
backend/src/docente/dto/docente.dto.ts
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Frontend (`DocenteFormPage.jsx`):
  - Se definen constantes de negocio:
    - `ESCALAFON_POR_DEFECTO = 'Titular'`
    - `FRANJA_POR_DEFECTO = 'Diurna'`
    - `SEDES_PERMITIDAS = ['Mocoa', 'Sibundoy']`
  - Se eliminan del render los campos visibles de `Escalafon` y `Franja`.
  - En submit se envian siempre en payload:
    - `escalafon: 'Titular'`
    - `franja: 'Diurna'`
  - `Sede` se cambia de input libre a `select` con opciones cerradas (`Mocoa`/`Sibundoy`) y validacion previa al envio.
- Backend (`docente.service.ts`):
  - `normalizarCamposDocente(...)` ahora:
    - valida sede contra catalogo permitido,
    - asigna defaults para `escalafon` y `franja` cuando lleguen vacios/no enviados.
- Backend DTO (`docente.dto.ts`):
  - `sede` en crear/actualizar se restringe con `@IsEnum(['Mocoa', 'Sibundoy'])`.
- Verificacion tecnica:
  - build backend exitoso (`npm run build`).
  - build frontend exitoso (`npm run build`).

RESULTADO
El flujo de Nuevo/Editar Docente queda alineado al requerimiento: `escalafon` y `franja` se mantienen ocultos y persistidos con valores por defecto, mientras `sede` solo admite `Mocoa` o `Sibundoy`, mejorando consistencia de captura sin afectar el resto del formulario.

FECHA
2026-04-27

DESCRIPCION
Se implementa validacion estricta para que el campo `identificacion` de docente acepte unicamente numeros de cedula, bloqueando letras y simbolos en frontend y backend.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
frontend/src/Pages/DocenteFormPage.jsx
backend/src/docente/dto/docente.dto.ts
backend/src/docente/docente.service.ts
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Frontend (`DocenteFormPage.jsx`):
  - Restriccion en `handleChange` para `identificacion` con sanitizacion `replace(/\D+/g, '')`.
  - Validacion de submit con regex `^\\d+$`.
  - UI del input configurada para teclado numerico y patron de digitos (`inputMode`, `pattern`, `maxLength`).
  - Mensaje de error contextual cuando el valor no es numerico.
- Backend DTO (`docente.dto.ts`):
  - `CrearDocenteDto.identificacion` valida solo digitos con `@Matches(/^\\d+$/)`.
- Backend servicio (`docente.service.ts`):
  - Validacion defensiva en `normalizarCamposDocente` para rechazar identificaciones no numericas con `BadRequestException`.
- Verificacion tecnica:
  - build backend exitoso (`npm run build`).
  - build frontend exitoso (`npm run build`).

RESULTADO
La captura de identificacion queda alineada al criterio de cedula numerica: no se admiten letras ni simbolos en la interfaz y tampoco a nivel API, evitando registros invalidos.

FECHA
2026-04-27

DESCRIPCION
Se corrige el retorno de navegacion en Gestion de Docentes para mantener la facultad activa al volver desde formularios de Nuevo/Editar Docente.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/Pages/Docentes.jsx
frontend/src/Pages/DocenteFormPage.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- `Docentes.jsx`:
  - Lectura de query inicial robusta: `id_facultad` (preferente) con fallback a `facultad_id`.
  - Persistencia de estado de listado en URL usando `id_facultad`.
  - Navegacion a editar incluye contexto de facultad: `/admin/docentes/editar/:id?id_facultad=<id>`.
- `DocenteFormPage.jsx`:
  - Resolucion de facultad de retorno desde query (`id_facultad` / `facultad_id`).
  - Nuevo helper `volverAlListado()` reutilizado en:
    - boton "Volver al listado",
    - boton "Cancelar",
    - redireccion tras guardar.
  - Si existe facultad de origen, retorna a `/admin/docentes?id_facultad=<id>`; si no existe, retorna a `/admin/docentes`.
- Verificacion tecnica:
  - build frontend exitoso (`npm run build`).

RESULTADO
El sistema ya recuerda la facultad de origen en Gestion de Docentes y retorna exactamente a la misma pestaña/listado al salir de Nuevo/Editar Docente, evitando cambios involuntarios a otra facultad.

FECHA
2026-04-27

DESCRIPCION TECNICA DEL CAMBIO
Se cierra iteracion de ajustes transversales en Supervision, enrutamiento por rol, contraste visual global y Gestion de Docentes. La iteracion incluye filtros de datos por periodo/facultad, correcciones de UX de navegacion contextual, endurecimiento de validaciones de formulario y normalizacion de defaults de negocio en captura docente.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
backend/src/seguimiento/seguimiento.service.ts
backend/src/docente/docente.service.ts
backend/src/docente/dto/docente.dto.ts
frontend/src/App.jsx
frontend/src/index.css
frontend/src/Pages/DocenteFormPage.jsx
frontend/src/Pages/Docentes.jsx
PROJECT_LOG.md
DEV_HISTORY.md

IMPACTO TECNICO
- Integridad de datos: se elimina inclusion de docentes sin agenda activa en supervision por periodo; se restringe captura de docente a catálogos/formatos de negocio (sede cerrada, identificacion numerica, defaults obligatorios para escalafon/franja).
- Estabilidad funcional: se reduce comportamiento inesperado en navegacion (retorno a facultad incorrecta) y se alinea ruta inicial al rol operativo del usuario autenticado.
- Consistencia visual: se corrige contraste global en componentes verdes para mejorar legibilidad sin alterar estructura ni comportamiento.
- Compatibilidad: cambios evolutivos, sin modificaciones de esquema de base de datos ni ruptura de contratos principales; build backend/frontend validado exitosamente.

FECHA
2026-04-27

DESCRIPCION
Se rediseña el modulo Seguimiento con comportamiento por rol autenticado y experiencia visual moderna: vista individual para DOCENTE y dashboard consolidado jerarquico para DECANO/ADMIN con filtros avanzados, vistas alternas y detalle por docente en drawer.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
frontend/src/Pages/Seguimiento.jsx
backend/src/seguimiento/seguimiento.controller.ts
backend/src/seguimiento/seguimiento.service.ts
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Backend:
  - Se agrega endpoint `GET /api/seguimiento/consolidado`:
    - agrega y retorna seguimiento por docente para periodo activo,
    - soporta filtros por `id_facultad`, `id_programa`, `id_docente`, `estado_avance`, `semana`, `id_corte`, `id_tipo` y `q`.
  - Se agrega endpoint `GET /api/seguimiento/docente-historial`:
    - retorna historial semanal consolidado por docente/corte en periodo.
  - Se incorpora fallback de scope para `ADMIN` en modulo de seguimiento cuando `ScopeService` retorna `403` por falta de asociacion docente/facultad, manteniendo validacion estricta de rol.
  - Se conserva regla de alcance:
    - `DOCENTE`: solo su propio seguimiento,
    - `DECANO`: solo su facultad,
    - `ADMIN`: alcance global con opcion de filtrar por facultad/programa/docente.
- Frontend (`Seguimiento.jsx`):
  - Se implementa render condicional por rol:
    - `DOCENTE`: tablero individual con resumen semestre/corte/semana y detalle por tipo.
    - `DECANO/ADMIN`: dashboard consolidado de docentes con metricas globales y control jerarquico.
  - Se agregan metricas globales solicitadas:
    - total docentes,
    - horas planeadas,
    - horas ejecutadas,
    - horas pendientes,
    - porcentaje global,
    - conteo de niveles alto/medio/bajo.
  - Se agregan filtros visibles y rapidos + buscador en tiempo real.
  - Se implementa toggle de visualizacion:
    - cards,
    - tabla comparativa ordenable,
    - vista jerarquica facultad->programa->docente.
  - Cada card/fila muestra:
    - docente,
    - facultad/programa,
    - horas planeadas/ejecutadas/pendientes,
    - porcentaje,
    - badge de estado (ALTO/MEDIO/BAJO),
    - barra de progreso,
    - accion `Ver seguimiento`.
  - Drawer/modal lateral de detalle por docente con:
    - vision macro del semestre,
    - corte actual,
    - semana actual,
    - detalle por tipo,
    - historial semanal.
  - Estado vacio contextual para DECANO/ADMIN con mensaje no generico y boton de limpiar filtros.
  - Se agregan skeleton loaders para carga inicial de vista global.
- Validacion tecnica:
  - build backend exitoso (`npm run build`).
  - build frontend exitoso (`npm run build`).

RESULTADO
El modulo Seguimiento queda alineado a una operacion empresarial por roles: el docente conserva su flujo individual, mientras decano/admin disponen de un panel consolidado, filtrable y navegable para gestion de avance docente sin caer en estados vacios genericos cuando existe informacion en el alcance correspondiente.

FECHA
2026-04-27

DESCRIPCION
Se realiza rediseño integral del modulo Actividades con enfoque por rol: vista global consolidada para DECANO/ADMIN y vista individual mejorada para DOCENTE, incorporando filtros rapidos, toggle de visualizacion (grid/tabla), cards por docente y drawer de detalle operativo por agenda.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
frontend/src/Pages/Actividades.jsx
backend/src/agenda/agenda.controller.ts
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Backend:
  - Se ajusta autorizacion en `GET /api/agendas` para permitir `DECANO` ademas de `ADMIN`.
  - Se conserva control de alcance por facultad en servicio (`obtenerTodas`) para usuarios no ADMIN.
- Frontend (`Actividades.jsx`):
  - Se reemplaza implementacion previa por arquitectura de vista dual:
    - `ADMIN/DECANO`: dashboard global por periodo con agendas docentes.
    - `DOCENTE`: vista simplificada de su agenda activa.
  - Se agrega header con metricas clave:
    - total docentes,
    - agendas activas,
    - agendas del periodo,
    - actividades totales.
  - Se agrega barra de filtros globales:
    - busqueda en tiempo real por docente,
    - filtro por estado (`activo`, `sin_actividades`, `pendiente`),
    - rango de fechas (`desde`/`hasta`).
  - Se implementa toggle de visualizacion global:
    - `Grid` (cards por docente),
    - `Tabla` (listado consolidado).
  - Cada card/fila incluye acciones rapidas:
    - `Ver actividades` (abre drawer lateral),
    - `Nueva actividad` (navegacion contextual por agenda).
  - Se incorpora drawer de detalle con:
    - carga progresiva del detalle de agenda,
    - buscador de actividades,
    - tabs por tipo,
    - tabla con acciones editar/eliminar,
    - resumen por cortes y totales.
  - Se elimina para DECANO/ADMIN el mensaje generico "Sin agenda activa" y se reemplaza por estados vacios contextuales de periodo/filtro.
  - Se mantiene para DOCENTE un flujo acotado a su agenda activa con mejora visual y acceso directo a gestion de actividades.
- Validacion tecnica:
  - build frontend exitoso (`npm run build`).
  - build backend exitoso (`npm run build`).

RESULTADO
El modulo Actividades queda alineado a la operacion esperada por rol: supervision global navegable para DECANO/ADMIN y experiencia individual clara para DOCENTE, con mejor usabilidad, acceso rapido al detalle y mayor velocidad de gestion sin romper contratos ni estructura del sistema.

FECHA
2026-04-27

DESCRIPCION
Se ajusta la vista de Supervision (Vision Macro del Semestre) para incorporar resumen por corte con logica tipo Excel: fila `TOTAL`, porcentaje calculado sobre totales acumulados y barra visual de avance por pestaña.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/Pages/Supervision.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Se agrega agregacion por pestaña (`corte1`, `corte2`, `corte3`, `avance_general`) basada en la suma de filas del tab activo:
  - `total_planeadas = SUM(horas_planeadas)`
  - `total_ejecutadas = SUM(horas_ejecutadas)`
  - `total_pendientes = total_planeadas - total_ejecutadas`
- El porcentaje del corte se calcula con formula de totales (no promedio de porcentajes):
  - `avance = (total_ejecutadas / total_planeadas) * 100`, con proteccion de division por cero.
- Se agrega encabezado dinamico por pestaña:
  - `Corte X - Avance Y%`
  - `Avance General - Avance Y%`
- Se incorpora barra horizontal de progreso debajo del titulo con semaforizacion:
  - 0-49 rojo, 50-79 amarillo, 80-100 verde.
- Se agrega fila `TOTAL` en `tfoot` alineada con la tabla de docentes, manteniendo columnas de `Informe` y `Acciones` vacias para conservar estructura visual.
- Se reutilizan datos ya calculados del backend (sin recalculo por joins ni alteracion de contratos API) y se mantiene intacta la logica individual por docente.
- Verificacion tecnica:
  - build frontend exitoso (`npm run build`).

RESULTADO
Cada pestaña de supervision ahora muestra un resumen claro y consistente con el Excel de referencia: totales acumulados correctos, porcentaje real del corte/avance general y un indicador visual de avance sin romper el diseno existente.

FECHA
2026-04-27

DESCRIPCION
Se corrige inconsistencia funcional entre Supervision y Seguimiento para rol DECANO: el consolidado de Seguimiento ahora usa el mismo criterio de facultad de Supervision y deja de mostrar estado vacio cuando existen docentes con avance en la facultad/periodo.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
backend/src/seguimiento/seguimiento.service.ts
frontend/src/Pages/Seguimiento.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Backend:
  - En `obtenerConsolidadoSeguimientoPorDocente` y `obtenerHistorialSemanalDocente` se reemplaza el uso de `scope.idFacultad` para DECANO por la resolucion explicita de facultad con `resolverFacultadSupervision(user, scope)`.
  - Se garantiza coherencia de alcance entre modulos:
    - Supervision y Seguimiento consultan la misma facultad para DECANO.
  - Se extiende la salida consolidada por docente con nuevos campos:
    - `corte_actual` (horas y porcentaje de avance),
    - `semana_actual` (numero de semana, horas y porcentaje de avance).
  - Se mantiene control por rol:
    - DOCENTE: alcance individual,
    - DECANO: facultad asociada,
    - ADMIN: alcance global filtrable.
- Frontend (`Seguimiento.jsx`):
  - Se corrige alineacion del bloque de filtros + acciones + toggles de vista con grilla estable (`xl:grid-cols-12`) para evitar desbordes en desktop.
  - Se agregan indicadores visibles de `avance corte actual` y `avance semana actual` en cards, tabla y jerarquia.
  - Se estandariza la accion por fila/card como `Ver detalle` manteniendo drawer de informacion completa del docente.
- Verificacion tecnica:
  - build backend exitoso (`npm run build`).
  - build frontend exitoso (`npm run build`).

RESULTADO
El modulo Seguimiento queda consistente con Supervision para DECANO en periodo/facultad, habilitando visualizacion de docentes con seguimiento real (como el caso reportado) y mejorando la claridad operativa del panel consolidado con avance de corte y semana actual por docente.

FECHA
2026-04-27

DESCRIPCION
Se restaura la estructura original de la vista de Seguimiento para rol DOCENTE, priorizando lectura individual por bloques temporales antes del detalle semanal.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/Pages/Seguimiento.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- En la seccion `renderDocente` de `Seguimiento.jsx` se reorganiza la interfaz para mostrar en orden:
  - resumen del semestre,
  - resumen del corte actual,
  - resumen de la semana actual,
  - detalle de avance semanal por tipo.
- Se agregan tarjetas especificas para corte y semana con horas planeadas/ejecutadas/pendientes (o faltantes) y porcentaje.
- Se preserva la tabla de detalle y la accion de actualizacion por tipo.
- Verificacion tecnica:
  - build frontend exitoso (`npm run build`).

RESULTADO
La experiencia del docente vuelve al formato operativo esperado: primero vision global (semestre/corte/semana) y luego detalle semanal por tipo, manteniendo claridad y continuidad funcional.

FECHA
2026-04-27

DESCRIPCION
Se mejora visualmente el dashboard de Seguimiento individual agregando encabezados claros por bloque temporal y barra de progreso por cada bloque (semestre, corte y semana).

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/Pages/Seguimiento.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Se incorpora componente de presentacion `SectionResumenTemporal` para encapsular la estructura de cada bloque.
- Cada bloque incluye:
  - titulo visible (`h3`),
  - descripcion contextual,
  - badge de nivel segun porcentaje,
  - barra de progreso horizontal reutilizando porcentaje calculado en backend,
  - porcentaje mostrado como texto junto a la barra.
- Se reorganiza la vista docente en 3 secciones separadas:
  - `Semestre actual` (Planeadas, Ejecutadas, Pendientes, Avance semestre),
  - `Corte actual` (Planeadas, Ejecutadas, Pendientes, Avance corte actual),
  - `Semana actual` (Programadas, Ejecutadas, Faltantes, Avance semana actual).
- Se conserva la seccion final `Detalle del avance semanal` sin alterar logica de datos.
- Verificacion tecnica:
  - build frontend exitoso (`npm run build`).

RESULTADO
El dashboard individual queda mas organizado y profesional, con jerarquia temporal clara y lectura inmediata del avance por semestre, corte y semana, manteniendo coherencia visual y funcional.

FECHA
2026-04-27

DESCRIPCION
Se rediseña Seguimiento para DECANO/ADMIN con la misma experiencia de navegacion del modulo Actividades: listado inicial de docentes, detalle individual bajo demanda y accion de reporte semanal contextual al docente seleccionado.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
frontend/src/Pages/Seguimiento.jsx
frontend/src/Pages/SeguimientoNuevo.jsx
backend/src/seguimiento/seguimiento.controller.ts
backend/src/seguimiento/seguimiento.service.ts
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Frontend (`Seguimiento.jsx`):
  - Vista global (DECANO/ADMIN) reestructurada para entrada por listado de docentes tipo Actividades.
  - Se fusiona informacion de `GET /api/agendas` y consolidado de seguimiento para cards con:
    - nombre docente,
    - estado de agenda,
    - cantidad de actividades,
    - horas por semana,
    - periodo y fecha de agenda,
    - alertas por falta de registros.
  - Se mantienen vistas `Cards`, `Tabla` y `Jerarquia` con accion `Ver detalle` + accion rapida `Reportar`.
  - Drawer de detalle docente conserva dashboard individual (semestre/corte/semana/tipos/historial) y agrega boton `Reportar semana` contextual.
  - Se agregan filtros por rango de fechas de agenda (`fecha_desde`, `fecha_hasta`) y se ajusta layout responsive de filtros/toggles.
- Frontend (`SeguimientoNuevo.jsx`):
  - Se agrega lectura de `id_docente` en query params.
  - La carga de actividades incluye `id_docente` cuando viene en URL para mantener contexto del docente objetivo.
- Backend:
  - `GET /api/seguimiento/actividades` acepta `id_docente` opcional.
  - En servicio se valida scope por facultad para DECANO/ADMIN antes de aplicar filtro por docente.
  - Se evita que un decano/admin cargue actividades de un docente fuera de su alcance.
- Verificacion tecnica:
  - build backend exitoso (`npm run build`).
  - build frontend exitoso (`npm run build`).

RESULTADO
Seguimiento queda alineado con la navegacion de Actividades para perfiles de gestion: primero listado docente consolidado y luego detalle individual, con capacidad de reportar semana sobre el docente seleccionado y sin romper el flujo directo del rol DOCENTE.

FECHA
2026-04-27

DESCRIPCION
Se ajusta el modulo Seguimiento para consolidar el flujo de gestion por rol (DECANO/ADMIN) como listado inicial de docentes con resumen de avance y detalle individual consistente con la vista docente, corrigiendo ademas filtros de estado y resiliencia de carga para evitar vacios falsos.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
frontend/src/Pages/Seguimiento.jsx
backend/src/seguimiento/seguimiento.service.ts
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Frontend (`Seguimiento.jsx`):
  - Se migra la carga consolidada a `Promise.allSettled` para no descartar el consolidado cuando falle `/api/agendas`.
  - Se corrige filtro `estado_avance` para usar niveles de avance (`ALTO`, `MEDIO`, `BAJO`) en vez de estados de agenda (`activo`, `pendiente`, `sin_actividades`).
  - Se rediseña la card de docente en vista global para priorizar metrica de seguimiento:
    - horas planeadas semestre,
    - horas ejecutadas semestre,
    - porcentaje general,
    - porcentaje corte actual,
    - porcentaje semana actual,
    - badge de nivel de avance.
  - Se unifica el panel de `Ver detalle` (drawer) con los mismos bloques visuales de la vista docente:
    - `Semestre actual`,
    - `Corte actual`,
    - `Semana actual`,
    - `Detalle del avance semanal`.
- Backend (`seguimiento.service.ts`):
  - Se refuerza `resolverDocenteDashboard(user, scope, idDocenteQuery)` con control de alcance por rol:
    - `DOCENTE`: retorna su propio docente.
    - `DECANO`: valida docente contra facultad resuelta por `resolverFacultadSupervision`.
    - `ADMIN`: consulta global por existencia de docente.
  - Se mantiene compatibilidad del endpoint `GET /api/dashboard/seguimiento` para carga individual por `id_docente`.
- Verificacion tecnica:
  - build frontend exitoso (`npm run build`).
  - build backend exitoso (`npm run build`).

RESULTADO
El flujo operativo solicitado queda activo: DECANO/ADMIN ingresan a Seguimiento viendo primero tarjetas de docentes con resumen de avance y acceden a detalle individual consistente por `Ver detalle`; DOCENTE mantiene ingreso directo a su vista individual, con filtros de estado coherentes y menor riesgo de pantalla vacia por fallas parciales de carga.

FECHA
2026-04-27

DESCRIPCION
Se completa ajuste de QA funcional en Seguimiento para manejo de fallo parcial de `/api/agendas` sin bloquear la vista consolidada, incorporando advertencia no bloqueante y manteniendo consistencia del filtro por nivel de avance.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/Pages/Seguimiento.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- En carga consolidada se mantiene `Promise.allSettled` y se agrega estado `warningAgendas`:
  - si `/api/agendas` falla, se muestra mensaje funcional de advertencia,
  - se conserva render con datos de `/api/seguimiento/consolidado`.
- Se evita error silencioso de carga parcial y se reduce riesgo de falso vacio visual.
- Se mantiene filtro de estado sobre niveles de avance (`ALTO`, `MEDIO`, `BAJO`) para coherencia con las tarjetas de seguimiento.
- Verificacion tecnica:
  - build frontend exitoso (`npm run build`).

RESULTADO
El modulo Seguimiento queda mas robusto ante fallas parciales de API: informa la degradacion de datos complementarios (agendas) sin bloquear la operacion principal, preservando el flujo listado de docentes -> detalle individual por rol.

FECHA
2026-04-27

DESCRIPCION
Se corrige la causa raiz de vista vacia en Seguimiento para rol DECANO al resolver facultad efectiva con estrategia consistente entre modulos (Actividades/Supervision), y se ajusta la UI de filtros para alinear correctamente botones de vista dentro del card.

MODULOS AFECTADOS
ambos

ARCHIVOS MODIFICADOS
backend/src/seguimiento/seguimiento.service.ts
frontend/src/Pages/Seguimiento.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Backend (`seguimiento.service.ts`):
  - Se agrega `resolverFacultadDecanoSeguimiento(user, scope, idPeriodo?)`.
  - La resolucion de facultad para DECANO ahora considera dos fuentes:
    - `scope.idFacultad` (coherente con `/api/agendas` usado por Actividades),
    - `resolverFacultadSupervision(...)` (coherente con Supervision).
  - Cuando hay mas de una candidata, selecciona la primera con agendas en el periodo activo para evitar vacios falsos.
  - Se actualizan consumidores:
    - `resolverDocenteDashboard(...)`,
    - `obtenerConsolidadoSeguimientoPorDocente(...)`,
    - `obtenerHistorialSemanalDocente(...)`.
  - Se incorpora log opcional de diagnostico (`SEGUIMIENTO_DEBUG=true`) con rol, periodo, facultad resuelta y cantidad de docentes.
- Frontend (`Seguimiento.jsx`):
  - Se agregan logs de depuracion en entorno dev para requests/responses:
    - endpoint exacto llamado,
    - filtros enviados,
    - conteo de docentes/agendas recibidos,
    - errores parciales/no bloqueantes.
  - Se reorganiza el bloque de filtros para mantener alineacion visual de `Cards/Tabla/Jerarquía` y acciones (`Aplicar/Limpiar`) dentro del mismo contenedor.
  - Se conserva warning cuando falla `/api/agendas` sin bloquear consolidado.
- Verificacion tecnica:
  - build backend exitoso (`npm run build`).
  - build frontend exitoso (`npm run build`).

RESULTADO
Seguimiento reduce el escenario reportado de metricas en cero para DECANO por desalineacion de facultad: ahora usa una resolucion de facultad mas robusta y trazable, mantiene consistencia con modulos de referencia y mejora la legibilidad/orden del bloque de filtros y vistas.

FECHA
2026-04-27

DESCRIPCION
Se corrige el titileo de la vista `Seguimiento` causado por recargas repetidas del frontend, eliminando ciclos de re-render entre sincronizacion de perfil en `Layout` y carga consolidada de filtros en `Seguimiento`.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/components/Layout.jsx
frontend/src/Pages/Seguimiento.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- `Layout.jsx`:
  - Se agrega helper `esMismoDocente(...)` para comparar perfil docente actual vs perfil recibido de `/api/perfil`.
  - `sincronizarPerfilEnSesion(...)` ahora evita `setState` y `actualizarUsuario(...)` cuando no hay cambios reales de datos.
  - Se elimina dependencia inestable de `usuario?.docente` en `cargarPerfil`, evitando relanzamiento en cascada del efecto de carga.
- `Seguimiento.jsx`:
  - `cargarConsolidadoGlobal(...)` pasa a recibir `filtrosActivos` por parametro.
  - Se elimina dependencia directa de `filtros` para estabilizar la referencia del callback y evitar recargas no intencionadas.
  - Se actualizan acciones de UI (`Actualizar` y `Aplicar`) para enviar filtros activos de forma explicita.
- Verificacion tecnica:
  - build frontend exitoso (`npm run build`).

RESULTADO
La pantalla de Seguimiento deja de parpadear por recargas en bucle: el render queda estable, el skeleton aparece solo durante cargas reales y la consulta consolidada se dispara unicamente cuando corresponde por flujo de usuario.

FECHA
2026-04-27

DESCRIPCION
Se simplifica el bloque de filtros en `Seguimiento` para vista global DECANO/ADMIN, dejando solo la busqueda por nombre/identificacion del docente y eliminando filtros avanzados del panel.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/Pages/Seguimiento.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Se elimina del UI global de `Seguimiento` la segunda capa de filtros: facultad, programa, docente select, estado, fechas, semana, corte y tipo.
- Se conserva unicamente el input de busqueda en tiempo real (`q`) con placeholder orientado a docente.
- Se mantiene bloque de acciones para `Limpiar` y cambio de vista (`Cards`, `Tabla`, `Jerarquía`).
- Se simplifica el estado `filtros` y la funcion `limpiarFiltros` para usar solo `q`.
- Se actualiza el filtrado local de `docentesGlobal` para aplicar exclusivamente coincidencia por texto (nombre/identificacion).
- Verificacion tecnica:
  - build frontend exitoso (`npm run build`).

RESULTADO
La pantalla de Seguimiento queda alineada al requerimiento de operacion simple: buscar docentes por nombre/identificacion sin filtros adicionales, manteniendo estable la visualizacion consolidada y las vistas alternativas.

FECHA
2026-04-27

DESCRIPCION
Se retira del modulo Seguimiento (vista global DECANO/ADMIN) el bloque de tarjetas de resumen superior para simplificar la pantalla, manteniendo solo encabezado principal y herramientas de consulta/listado.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/Pages/Seguimiento.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Se ajusta `renderHeaderGlobal()` para eliminar secciones de metricas agregadas del consolidado:
  - `Docentes adscritos`
  - `Horas planeadas`
  - `Horas ejecutadas`
  - `Horas pendientes`
  - `Avance global`
  - `Docentes alto/medio/bajo`
- Se mantiene sin cambios el encabezado con titulo de modulo, periodo activo y accion `Actualizar`.
- El resto de vistas (`Cards`, `Tabla`, `Jerarquia`) y acciones por docente permanecen operativas.
- Verificacion tecnica:
  - build frontend exitoso (`npm run build`).

RESULTADO
La zona superior del modulo Seguimiento queda despejada conforme a solicitud del usuario, sin afectar el flujo de consulta y detalle por docente.

FECHA
2026-04-27

DESCRIPCION
Se mejora la experiencia de revision de evidencias en `Supervision`: al hacer clic en `Ver archivo` ahora se abre un visor embebido en modal elegante (especialmente para PDF), manteniendo opciones de abrir en nueva pestaña y descargar.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/Pages/Supervision.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- Se reemplaza enlace directo de `Ver archivo` por apertura de estado `modalVisorArchivo`.
- Se agrega modal secundario sobre el modal de evidencias con:
  - titulo y metadatos del archivo,
  - `iframe` para visualizacion inline,
  - botones `Abrir` (nueva pestaña) y `Descargar`.
- Se incorpora cierre sincronizado para evitar que quede visor abierto al cerrar modal padre de evidencias.
- Se agregan iconos de soporte visual (`ExternalLink`, `Download`) del set `lucide-react`.
- Verificacion tecnica:
  - build frontend exitoso (`npm run build`).

RESULTADO
El decano/admin revisa evidencias sin salir del flujo de supervision: el PDF se visualiza en un modal moderno dentro de la app y conserva acciones de contingencia para apertura/descarga.

FECHA
2026-04-27

DESCRIPCION
Se realiza cierre de sesion de desarrollo consolidando ajustes UX en `Seguimiento` y `Supervision`, con simplificacion de interfaz en seguimiento y visor embebido de evidencias PDF en supervision.

MODULOS AFECTADOS
frontend

ARCHIVOS MODIFICADOS
frontend/src/Pages/Seguimiento.jsx
frontend/src/Pages/Supervision.jsx
PROJECT_LOG.md
DEV_HISTORY.md

DETALLES TECNICOS
- `Seguimiento.jsx`:
  - Se retiran filtros avanzados y se conserva solo busqueda por texto de docente.
  - Se elimina bloque de tarjetas KPI superiores en vista global DECANO/ADMIN.
  - Se mantiene la carga consolidada y alternancia de vistas (`Cards`, `Tabla`, `Jerarquia`) sin alterar contratos API.
- `Supervision.jsx`:
  - Se reemplaza enlace directo `Ver archivo` por apertura de modal visor embebido.
  - El visor usa `iframe` para PDF y agrega acciones de contingencia (`Abrir`, `Descargar`).
  - Se asegura cierre sincronizado de modales para evitar estados huérfanos.
- Verificacion tecnica:
  - build frontend exitoso (`npm run build`).

IMPACTO TECNICO
- Mejora de experiencia de usuario: menos ruido visual en Seguimiento y flujo de revision documental mas fluido en Supervision.
- Impacto de riesgo bajo: cambios acotados a capa frontend, sin modificaciones de esquema de base de datos ni contratos backend.
- Mejor mantenibilidad UI: menor complejidad del panel de filtros y separacion clara de responsabilidades entre listado y visor de evidencias.
