import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import api from '../services/api';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Clock3,
    ExternalLink,
    Eye,
    Paperclip,
    Plus,
    Save,
    Trash2,
    X,
    Upload,
} from 'lucide-react';
import { toast } from 'react-toastify';

const formatearFecha = (valor) => {
    if (!valor) return '-';
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return '-';
    return fecha.toLocaleDateString();
};

const formatearHoras = (valor) => {
    const numero = Number(valor || 0);
    if (!Number.isFinite(numero)) return '0';
    return Number.isInteger(numero) ? String(numero) : numero.toFixed(2);
};

const construirTextoPendienteSemana = (actividad) => {
    const horasPendientes = Math.max(0, Number(actividad?.horas_pendientes_semana_actual || 0));

    if (horasPendientes <= 0) {
        return 'Semana completada';
    }

    const etiquetaHora = horasPendientes === 1 ? 'hora pendiente' : 'horas pendientes';
    return `${formatearHoras(horasPendientes)} ${etiquetaHora} para esta semana`;
};

const obtenerEstadoPendienteSemana = (actividad) => {
    const inconsistencia = Boolean(actividad?.inconsistencia_semana_actual);
    const horasPendientes = Math.max(0, Number(actividad?.horas_pendientes_semana_actual || 0));

    if (inconsistencia) {
        return {
            codigo: 'ALERTA',
            clase: 'text-amber-700',
            texto: 'Inconsistencia semanal detectada',
        };
    }

    if (horasPendientes <= 0) {
        return {
            codigo: 'OK',
            clase: 'text-emerald-700',
            texto: 'Semana completada',
        };
    }

    return {
        codigo: 'PENDIENTE',
        clase: 'text-blue-700',
        texto: construirTextoPendienteSemana(actividad),
    };
};

const TAB_SEGUIMIENTO = 'seguimiento';
const TAB_EVIDENCIAS = 'evidencias';
const FORM_MODE_CREATE = 'crear';
const FORM_MODE_EDIT = 'editar';
const ESTADO_EVIDENCIA = {
    PENDIENTE: 'pendiente',
    SUBIENDO: 'subiendo',
    CARGADO: 'cargado',
    ERROR: 'error',
};

const obtenerMensajeError = (err, fallback) => {
    const msg = err?.response?.data?.message;
    const texto = Array.isArray(msg) ? msg.join(' ') : String(msg || '').trim();
    if (!texto) return fallback;
    if (texto.toLowerCase().includes('internal server error')) return fallback;
    return texto;
};

const normalizarDecimalInput = (valor) => String(valor ?? '').replace(',', '.');

const parsearHorasInput = (valor) => {
    const normalizado = normalizarDecimalInput(valor).trim();
    if (!normalizado) return NaN;
    const numero = Number(normalizado);
    return Number.isFinite(numero) ? numero : NaN;
};

const construirUrlPreviewDocumento = (rutaArchivo) => {
    const ruta = String(rutaArchivo || '').trim();
    if (!ruta) return '';

    const matchDrive = ruta.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (matchDrive?.[1]) {
        return `https://drive.google.com/file/d/${matchDrive[1]}/preview`;
    }

    return ruta;
};

const SeguimientoNuevo = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { periodoSeleccionado, cargando: cargandoAuth } = useAuth();

    const [tabActiva, setTabActiva] = useState(TAB_SEGUIMIENTO);
    const [hidratadoDesdeQuery, setHidratadoDesdeQuery] = useState(false);
    const [prefillDashboardAplicado, setPrefillDashboardAplicado] = useState(false);
    const [alertaPrefill, setAlertaPrefill] = useState('');

    const [cargando, setCargando] = useState(true);
    const [cargandoActividades, setCargandoActividades] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [subiendo, setSubiendo] = useState(false);

    const [agenda, setAgenda] = useState(null);
    const [cortes, setCortes] = useState([]);
    const [metaSemanasPeriodo, setMetaSemanasPeriodo] = useState({ total_semanas: 0, cortes: [] });
    const [contextoHoy, setContextoHoy] = useState({ semana_actual: null, fuera_rango: false, corte_actual_numero: null, id_corte_actual: null });
    const [actividades, setActividades] = useState([]);
    const [corteSeleccionado, setCorteSeleccionado] = useState(null);

    const [semanaSeleccionada, setSemanaSeleccionada] = useState(null);
    const [actividadSeleccionada, setActividadSeleccionada] = useState('');
    const [idCorteCalculado, setIdCorteCalculado] = useState(null);
    const [seguimientoId, setSeguimientoId] = useState(null);
    const [modoFormulario, setModoFormulario] = useState(FORM_MODE_CREATE);

    const [form, setForm] = useState({
        horas_ejecutadas: '',
        observaciones: '',
    });

    const [rangoSemana, setRangoSemana] = useState(null);
    const [resumenActividad, setResumenActividad] = useState(null);
    const [evidencias, setEvidencias] = useState([]);
    const [archivosCola, setArchivosCola] = useState([]);
    const [archivosSeleccionados, setArchivosSeleccionados] = useState([]);
    const [errorEvidencia, setErrorEvidencia] = useState('');
    const [errorGuardado, setErrorGuardado] = useState('');
    const [eliminandoEvidencias, setEliminandoEvidencias] = useState([]);
    const [evidenciaVistaPrevia, setEvidenciaVistaPrevia] = useState(null);
    const [errorVistaPrevia, setErrorVistaPrevia] = useState(false);
    const modoForzadoInicializadoRef = useRef(false);
    const autofillHorasContextoRef = useRef('');
    const horasEditadasManualRef = useRef(false);

    const cortesLista = useMemo(() => (Array.isArray(cortes) ? cortes : []), [cortes]);
    const actividadesLista = useMemo(() => (Array.isArray(actividades) ? actividades : []), [actividades]);
    const idSeguimientoQuery = useMemo(() => Number(searchParams.get('id_seguimiento') || 0), [searchParams]);
    const idActividadQuery = useMemo(() => Number(searchParams.get('id_actividad') || 0), [searchParams]);
    const idDocenteQuery = useMemo(() => Number(searchParams.get('id_docente') || 0), [searchParams]);
    const idTipoQuery = useMemo(() => Number(searchParams.get('id_tipo') || 0), [searchParams]);
    const semanaQuery = useMemo(() => Number(searchParams.get('semana') || 0), [searchParams]);
    const idCorteQuery = useMemo(() => Number(searchParams.get('id_corte') || 0), [searchParams]);
    const horasProgramadasQuery = useMemo(() => {
        const valor = Number(searchParams.get('horas') || 0);
        return Number.isFinite(valor) && valor > 0 ? valor : 0;
    }, [searchParams]);
    const modoCrearForzado = useMemo(() => location?.state?.modo === FORM_MODE_CREATE, [location?.state]);
    const modoEditarForzado = useMemo(() => location?.state?.modo === FORM_MODE_EDIT, [location?.state]);
    const modoCrear = useMemo(() => modoFormulario === FORM_MODE_CREATE, [modoFormulario]);
    const modoEditar = useMemo(() => modoFormulario === FORM_MODE_EDIT, [modoFormulario]);
    const esEdicionExplicita = useMemo(() => Boolean(idSeguimientoQuery), [idSeguimientoQuery]);

    const totalSemanas = useMemo(() => {
        const total = Number(metaSemanasPeriodo?.total_semanas || 0);
        if (total > 0) return total;
        return 16;
    }, [metaSemanasPeriodo]);

    const semanaActual = contextoHoy?.semana_actual;

    const semanasDelCorteSeleccionado = useMemo(() => {
        if (!corteSeleccionado) return [];
        const cortesMeta = Array.isArray(metaSemanasPeriodo?.cortes) ? metaSemanasPeriodo.cortes : [];
        const corteMeta = cortesMeta.find((c) => Number(c.id_corte) === Number(corteSeleccionado));
        if (!corteMeta) return [];

        const inicio = Number(corteMeta.semana_inicio || 0);
        const fin = Number(corteMeta.semana_fin || 0);
        if (inicio <= 0 || fin < inicio) return [];
        return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
    }, [corteSeleccionado, metaSemanasPeriodo]);

    const semanasPorCorte = useMemo(() => {
        const cortesMeta = Array.isArray(metaSemanasPeriodo?.cortes) ? metaSemanasPeriodo.cortes : [];
        const mapa = new Map();

        cortesMeta.forEach((corteMeta) => {
            const inicio = Number(corteMeta.semana_inicio || 0);
            const fin = Number(corteMeta.semana_fin || 0);
            if (inicio <= 0 || fin < inicio) {
                mapa.set(Number(corteMeta.id_corte), []);
                return;
            }
            mapa.set(
                Number(corteMeta.id_corte),
                Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i),
            );
        });

        return mapa;
    }, [metaSemanasPeriodo]);

    const actividadesOrdenadas = useMemo(() => {
        return [...actividadesLista].sort((a, b) => {
            const tipoA = Number(a?.id_tipo || 0);
            const tipoB = Number(b?.id_tipo || 0);

            if (tipoA !== tipoB) {
                return tipoA - tipoB;
            }

            return String(a?.nombre || '').localeCompare(String(b?.nombre || ''), 'es');
        });
    }, [actividadesLista]);

    const actividadActiva = useMemo(
        () => actividadesLista.find((a) => Number(a.id_actividad) === Number(actividadSeleccionada)) || null,
        [actividadSeleccionada, actividadesLista],
    );

    const horasProgramadasSemanaActividad = useMemo(
        () => Number(resumenActividad?.programadas_semana ?? actividadActiva?.horas_programadas_semana ?? actividadActiva?.horas_semanales ?? 0),
        [resumenActividad, actividadActiva],
    );

    const horasReportadasSemanaActividad = useMemo(
        () => Number(actividadActiva?.horas_reportadas_semana_actual ?? 0),
        [actividadActiva],
    );

    const horasPendientesSemanaActividad = useMemo(
        () => Math.max(0, Number(actividadActiva?.horas_pendientes_semana_actual ?? 0)),
        [actividadActiva],
    );

    const horasRegistradasHastaAhora = useMemo(
        () => Math.max(0, Number(horasReportadasSemanaActividad || 0)),
        [horasReportadasSemanaActividad],
    );

    const horasDisponiblesParaRegistrar = useMemo(() => {
        return Math.max(
            0,
            Number((Number(horasProgramadasSemanaActividad || 0) - Number(horasRegistradasHastaAhora || 0)).toFixed(2)),
        );
    }, [horasProgramadasSemanaActividad, horasRegistradasHastaAhora]);

    const porcentajeSemanaRegistrada = useMemo(() => {
        const programadas = Number(horasProgramadasSemanaActividad || 0);
        const registradas = Number(horasRegistradasHastaAhora || 0);
        if (programadas <= 0) return 0;
        return Math.max(0, Math.min(100, Number(((registradas / programadas) * 100).toFixed(2))));
    }, [horasProgramadasSemanaActividad, horasRegistradasHastaAhora]);

    const maxHorasPermitidasInput = useMemo(() => {
        const maxSemana = Number(resumenActividad?.max_semana || 0);
        const maxPorSemana = maxSemana > 0 ? maxSemana : Number(horasProgramadasSemanaActividad || 0);
        const maxPorPendiente = modoEditar
            ? Number((horasPendientesSemanaActividad + horasReportadasSemanaActividad).toFixed(2))
            : Number(horasPendientesSemanaActividad.toFixed(2));

        if (maxPorSemana > 0 && maxPorPendiente > 0) {
            return Math.min(maxPorSemana, maxPorPendiente);
        }
        if (maxPorSemana > 0) return maxPorSemana;
        return Math.max(0, maxPorPendiente);
    }, [
        resumenActividad,
        horasProgramadasSemanaActividad,
        horasPendientesSemanaActividad,
        horasReportadasSemanaActividad,
        modoEditar,
    ]);

    const limiteHorasInput = useMemo(
        () => (modoEditar ? Number(maxHorasPermitidasInput || 0) : Number(horasDisponiblesParaRegistrar || 0)),
        [modoEditar, maxHorasPermitidasInput, horasDisponiblesParaRegistrar],
    );

    const mensajePendienteSemanaActividad = useMemo(() => {
        if (!actividadActiva || !semanaSeleccionada) return '';
        return construirTextoPendienteSemana(actividadActiva);
    }, [actividadActiva, semanaSeleccionada]);

    const estadoPendienteSemanaActividad = useMemo(() => {
        if (!actividadActiva || !semanaSeleccionada) return null;
        return obtenerEstadoPendienteSemana(actividadActiva);
    }, [actividadActiva, semanaSeleccionada]);

    const calcularValorInicialHorasRegistrar = (estadoActividad, disponible) => {
        const disponibleSeguro = Math.max(0, Number(disponible || 0));
        if (estadoActividad === 'OK') return '0.00';
        if (estadoActividad === 'PENDIENTE') return disponibleSeguro.toFixed(2);
        return disponibleSeguro > 0 ? disponibleSeguro.toFixed(2) : '0.00';
    };

    const errorHorasSemana = useMemo(() => {
        const horas = parsearHorasInput(form.horas_ejecutadas);
        if (!actividadSeleccionada || !semanaSeleccionada || !form.horas_ejecutadas) return '';

        if (Number.isNaN(horas)) {
            return 'Introduce un numero valido para horas a registrar';
        }

        if (modoCrear && horasPendientesSemanaActividad <= 0) {
            return 'Esta actividad ya completo las horas programadas para la semana seleccionada';
        }

        if (horas <= 0) {
            return 'Las horas ejecutadas deben ser mayores que 0';
        }

        if (limiteHorasInput > 0 && horas > limiteHorasInput) {
            return 'No puedes registrar mas horas de las disponibles para esta semana.';
        }
        return '';
    }, [
        form.horas_ejecutadas,
        actividadSeleccionada,
        semanaSeleccionada,
        limiteHorasInput,
        horasPendientesSemanaActividad,
        modoCrear,
    ]);

    useEffect(() => {
        if (!actividadSeleccionada || !semanaSeleccionada || !corteSeleccionado) {
            autofillHorasContextoRef.current = '';
            horasEditadasManualRef.current = false;
            return;
        }

        if (modoEditar && seguimientoId && esEdicionExplicita) {
            return;
        }

        const disponible = Math.max(0, Number(horasDisponiblesParaRegistrar || 0));
        const estado = estadoPendienteSemanaActividad?.codigo || 'PENDIENTE';
        const contexto = `${modoFormulario}-${actividadSeleccionada}-${corteSeleccionado}-${semanaSeleccionada}-${seguimientoId || 0}`;
        const contextoCambio = autofillHorasContextoRef.current !== contexto;

        if (contextoCambio) {
            autofillHorasContextoRef.current = contexto;
            horasEditadasManualRef.current = false;
        }

        if (horasEditadasManualRef.current) {
            return;
        }

        const valorInicial = calcularValorInicialHorasRegistrar(estado, disponible);
        setForm((prev) => ({
            ...prev,
            horas_ejecutadas: valorInicial,
        }));
    }, [
        modoFormulario,
        modoEditar,
        seguimientoId,
        esEdicionExplicita,
        actividadSeleccionada,
        semanaSeleccionada,
        corteSeleccionado,
        horasDisponiblesParaRegistrar,
        estadoPendienteSemanaActividad,
    ]);

    const manejarCambioActividad = (idActividad) => {
        horasEditadasManualRef.current = false;
        setActividadSeleccionada(idActividad);
        setForm((prev) => ({ ...prev, horas_ejecutadas: '' }));
    };

    const progresoSubidaTotal = useMemo(() => {
        if (!archivosCola.length) return 0;
        const total = archivosCola.reduce((acc, a) => acc + Number(a.progreso || 0), 0);
        return Math.round(total / archivosCola.length);
    }, [archivosCola]);

    const semanasReportadas = useMemo(() => {
        if (!actividadActiva) return [];
        const reportadas = actividadActiva.semanas_reportadas || [];
        if (!semanasDelCorteSeleccionado.length) return reportadas;
        return reportadas.filter((s) => semanasDelCorteSeleccionado.includes(s));
    }, [actividadActiva, semanasDelCorteSeleccionado]);

    const actualizarQuery = ({ idSeguimiento, tab }) => {
        const next = new URLSearchParams(searchParams);

        if (idSeguimiento) {
            next.set('id_seguimiento', String(idSeguimiento));
        } else {
            next.delete('id_seguimiento');
        }

        if (tab) {
            next.set('tab', tab);
        } else {
            next.delete('tab');
        }

        setSearchParams(next, { replace: true });
    };

    const cargarActividades = async ({ idPeriodo, semana, idCorte }) => {
        if (!idPeriodo) return;

        let endpoint = `/seguimiento/actividades?periodo=${idPeriodo}`;
        if (Number(semana || 0) > 0) {
            endpoint += `&semana=${Number(semana)}`;
        }
        if (Number(idCorte || 0) > 0) {
            endpoint += `&corte=${Number(idCorte)}`;
        }
        if (Number(idDocenteQuery || 0) > 0) {
            endpoint += `&id_docente=${Number(idDocenteQuery)}`;
        }

        setCargandoActividades(true);
        try {
            const { data } = await api.get(endpoint);
            setActividades(Array.isArray(data) ? data : []);
        } finally {
            setCargandoActividades(false);
        }
    };

    const cargarBase = async () => {
        if (!periodoSeleccionado?.id_periodo) return;

        const [{ data: agendaData }, { data: cortesData }, { data: semanasData }] = await Promise.all([
            api.get(`/agendas/mi-agenda?id_periodo=${periodoSeleccionado.id_periodo}`),
            api.get(`/agendas/cortes?id_periodo=${periodoSeleccionado.id_periodo}`),
            api.get(`/seguimiento/semanas-periodo?periodo=${periodoSeleccionado.id_periodo}`),
        ]);

        setAgenda(agendaData);
        setCortes(cortesData || []);
        setMetaSemanasPeriodo(semanasData || { total_semanas: 0, cortes: [] });
        setContextoHoy(semanasData?.hoy || { semana_actual: null, fuera_rango: false, corte_actual_numero: null, id_corte_actual: null });

        const cortesOrdenados = [...(cortesData || [])].sort((a, b) => Number(a.numero_corte) - Number(b.numero_corte));
        if (cortesOrdenados.length === 0) {
            setCorteSeleccionado(null);
            return;
        }

        const corteInicial = semanasData?.hoy?.id_corte_actual
            ? cortesOrdenados.find((c) => Number(c.id_corte) === Number(semanasData.hoy.id_corte_actual))
            : null;

        const corteInicialId = corteInicial?.id_corte || cortesOrdenados[0]?.id_corte || null;
        const semanaInicial = Number(semanasData?.hoy?.semana_actual || 0) || null;

        setCorteSeleccionado((prev) => prev || corteInicialId);
        await cargarActividades({
            idPeriodo: periodoSeleccionado.id_periodo,
            semana: semanaInicial,
            idCorte: corteInicialId,
        });
    };

    const cargarEvidencias = async (idSeguimiento) => {
        if (!idSeguimiento) {
            setEvidencias([]);
            return;
        }

        const { data } = await api.get(`/evidencia/seguimiento/${idSeguimiento}`);
        setEvidencias(data || []);
    };

    useEffect(() => {
        if (cargandoAuth) return;

        const init = async () => {
            setCargando(true);
            try {
                await cargarBase();
            } catch (err) {
                toast.error(err?.response?.data?.message || 'No se pudo cargar el formulario de seguimiento');
            } finally {
                setCargando(false);
            }
        };

        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cargandoAuth, periodoSeleccionado?.id_periodo]);

    useEffect(() => {
        if (cargando) return;
        if (!periodoSeleccionado?.id_periodo) return;

        const actualizar = async () => {
            try {
                await cargarActividades({
                    idPeriodo: periodoSeleccionado.id_periodo,
                    semana: semanaSeleccionada,
                    idCorte: corteSeleccionado,
                });
            } catch (err) {
                toast.error(err?.response?.data?.message || 'No se pudo actualizar la lista de actividades');
            }
        };

        actualizar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [periodoSeleccionado?.id_periodo, semanaSeleccionada, corteSeleccionado]);

    useEffect(() => {
        setHidratadoDesdeQuery(false);
        setPrefillDashboardAplicado(false);
        setAlertaPrefill('');
    }, [periodoSeleccionado?.id_periodo]);

    useEffect(() => {
        if (!modoCrearForzado && !modoEditarForzado) {
            modoForzadoInicializadoRef.current = false;
            return;
        }
        if (modoForzadoInicializadoRef.current) return;
        modoForzadoInicializadoRef.current = true;

        setSeguimientoId(null);
        setModoFormulario(modoCrearForzado ? FORM_MODE_CREATE : FORM_MODE_EDIT);
        setTabActiva(TAB_SEGUIMIENTO);
        setIdCorteCalculado(null);
        setRangoSemana(null);
        setEvidencias([]);
        setErrorEvidencia('');
        setErrorGuardado('');
        setArchivosSeleccionados([]);
        setArchivosCola([]);
        horasEditadasManualRef.current = false;
        autofillHorasContextoRef.current = '';
        setForm({ horas_ejecutadas: '', observaciones: '' });

        if (!modoCrearForzado) {
            return;
        }

        const tabQuery = searchParams.get('tab');
        const tieneQueryContexto = Boolean(
            idSeguimientoQuery
            || searchParams.get('id_actividad')
            || searchParams.get('id_tipo')
            || searchParams.get('semana')
            || searchParams.get('id_corte')
            || searchParams.get('horas')
            || tabQuery === TAB_EVIDENCIAS,
        );

        if (tieneQueryContexto) {
            const next = new URLSearchParams(searchParams);
            next.delete('id_seguimiento');
            next.delete('id_actividad');
            next.delete('id_tipo');
            next.delete('semana');
            next.delete('id_corte');
            next.delete('horas');
            next.set('tab', TAB_SEGUIMIENTO);
            setSearchParams(next, { replace: true });
        }
    }, [modoCrearForzado, modoEditarForzado, idSeguimientoQuery, searchParams, setSearchParams]);

    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam !== TAB_EVIDENCIAS && tabParam !== TAB_SEGUIMIENTO) {
            return;
        }

        if (tabParam === TAB_EVIDENCIAS && !seguimientoId && !idSeguimientoQuery) {
            return;
        }

        setTabActiva(tabParam);
    }, [searchParams, seguimientoId, idSeguimientoQuery]);

    useEffect(() => {
        if (cargando || !periodoSeleccionado?.id_periodo || hidratadoDesdeQuery) return;
        if (modoCrearForzado) {
            setHidratadoDesdeQuery(true);
            return;
        }
        if (!idSeguimientoQuery) {
            setHidratadoDesdeQuery(true);
            return;
        }

        const hidratar = async () => {
            try {
                const { data } = await api.get(`/seguimiento/${idSeguimientoQuery}`);

                setSeguimientoId(Number(data.id_seguimiento));
                setModoFormulario(FORM_MODE_EDIT);
                setCorteSeleccionado(Number(data.id_corte));
                setSemanaSeleccionada(Number(data.semana));
                setActividadSeleccionada(String(data.id_actividad));
                setForm({
                    horas_ejecutadas: data.horas_ejecutadas ?? '',
                    observaciones: data.observaciones ?? '',
                });
                horasEditadasManualRef.current = false;
                autofillHorasContextoRef.current = '';
                setEvidencias(Array.isArray(data.evidencias) ? data.evidencias : []);

                const tabParam = searchParams.get('tab');
                setTabActiva(tabParam === TAB_SEGUIMIENTO ? TAB_SEGUIMIENTO : TAB_EVIDENCIAS);
            } catch (err) {
                toast.error(err?.response?.data?.message || 'No se pudo recuperar el seguimiento enviado por URL');
                actualizarQuery({ idSeguimiento: null, tab: TAB_SEGUIMIENTO });
            } finally {
                setHidratadoDesdeQuery(true);
            }
        };

        hidratar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cargando, periodoSeleccionado?.id_periodo, idSeguimientoQuery, hidratadoDesdeQuery, modoCrearForzado]);

    useEffect(() => {
        if (cargando || !hidratadoDesdeQuery || prefillDashboardAplicado) return;

        if (modoCrearForzado) {
            setPrefillDashboardAplicado(true);
            return;
        }

        if (idSeguimientoQuery) {
            setPrefillDashboardAplicado(true);
            return;
        }

        const vieneDesdeDashboard = Boolean(idActividadQuery || idTipoQuery || semanaQuery || idCorteQuery || horasProgramadasQuery);
        if (!vieneDesdeDashboard) {
            setPrefillDashboardAplicado(true);
            return;
        }

        let mensaje = '';
        let corteObjetivo = Number(corteSeleccionado || 0);

        if (idCorteQuery > 0) {
            const existeCorte = cortesLista.some((c) => Number(c.id_corte) === idCorteQuery);
            if (existeCorte) {
                corteObjetivo = idCorteQuery;
                setCorteSeleccionado(idCorteQuery);
            } else {
                mensaje = 'El corte enviado desde dashboard no existe en este periodo. Seleccionalo manualmente.';
            }
        }

        if (semanaQuery > 0) {
            const semanasCorte = semanasPorCorte.get(Number(corteObjetivo)) || [];
            if (semanasCorte.length && semanasCorte.includes(semanaQuery)) {
                setSemanaSeleccionada(semanaQuery);
            } else if (corteObjetivo) {
                mensaje = mensaje || 'La semana enviada no pertenece al corte seleccionado. Ajustala manualmente.';
            } else {
                setSemanaSeleccionada(semanaQuery);
            }
        }

        const seleccionarActividad = () => {
            if (idActividadQuery > 0) {
                const actividadDirecta = actividadesLista.find((a) => Number(a.id_actividad) === idActividadQuery);
                if (actividadDirecta) {
                    return String(actividadDirecta.id_actividad);
                }
            }

            if (idTipoQuery > 0) {
                const actividadesDelTipo = actividadesOrdenadas
                    .filter((a) => Number(a.id_tipo) === idTipoQuery);

                if (!actividadesDelTipo.length) {
                    mensaje = mensaje || 'No hay actividades para el tipo seleccionado. Crea una actividad de ese tipo para continuar.';
                    return '';
                }

                return String(actividadesDelTipo[0].id_actividad);
            }

            return '';
        };

        const actividadInicial = seleccionarActividad();
        if (actividadInicial) {
            setActividadSeleccionada(actividadInicial);
        }

        if (mensaje) {
            setAlertaPrefill(mensaje);
            toast.warning(mensaje);
        }

        setPrefillDashboardAplicado(true);
    }, [
        cargando,
        hidratadoDesdeQuery,
        prefillDashboardAplicado,
        idSeguimientoQuery,
        idActividadQuery,
        idTipoQuery,
        semanaQuery,
        idCorteQuery,
        horasProgramadasQuery,
        actividadesLista,
        actividadesOrdenadas,
        cortesLista,
        semanasPorCorte,
        corteSeleccionado,
        modoCrearForzado,
    ]);

    useEffect(() => {
        if (!actividadSeleccionada || !corteSeleccionado || !semanaSeleccionada) {
            setResumenActividad(null);
            return;
        }

        const cargarResumen = async () => {
            try {
                const { data } = await api.get(
                    `/seguimiento/resumen?actividad=${actividadSeleccionada}&corte=${corteSeleccionado}&semana=${semanaSeleccionada}`,
                );
                setResumenActividad(data);
            } catch (err) {
                setResumenActividad(null);
                toast.error(err?.response?.data?.message || 'No se pudo cargar el resumen por corte y semana');
            }
        };

        cargarResumen();
    }, [actividadSeleccionada, corteSeleccionado, semanaSeleccionada]);

    useEffect(() => {
        if (!semanaSeleccionada || !actividadSeleccionada || !periodoSeleccionado?.id_periodo || !corteSeleccionado) {
            if (idSeguimientoQuery && !hidratadoDesdeQuery) return;

            setSeguimientoId(null);
            setModoFormulario(modoEditarForzado ? FORM_MODE_EDIT : FORM_MODE_CREATE);
            setIdCorteCalculado(null);
            setRangoSemana(null);
            setEvidencias([]);
            horasEditadasManualRef.current = false;
            autofillHorasContextoRef.current = '';
            setForm({ horas_ejecutadas: '', observaciones: '' });
            if (tabActiva === TAB_EVIDENCIAS) {
                setTabActiva(TAB_SEGUIMIENTO);
                actualizarQuery({ idSeguimiento: null, tab: TAB_SEGUIMIENTO });
            }
            return;
        }

        const lookup = async () => {
            try {
                const { data } = await api.get(
                    `/seguimiento/lookup?actividad=${actividadSeleccionada}&semana=${semanaSeleccionada}&periodo=${periodoSeleccionado.id_periodo}`,
                );

                setIdCorteCalculado(data.id_corte);
                setRangoSemana(data.rango_semana || null);

                if (data.seguimiento) {
                    if (modoEditarForzado || idSeguimientoQuery) {
                        const usarValorRegistroExistente = Boolean(idSeguimientoQuery);
                        setSeguimientoId(data.seguimiento.id_seguimiento);
                        setModoFormulario(FORM_MODE_EDIT);
                        setEvidencias(data.evidencias || []);
                        setForm({
                            horas_ejecutadas: usarValorRegistroExistente ? (data.seguimiento.horas_ejecutadas ?? '') : '',
                            observaciones: data.seguimiento.observaciones ?? '',
                        });
                        horasEditadasManualRef.current = false;
                        autofillHorasContextoRef.current = '';
                    } else {
                        setSeguimientoId(null);
                        setModoFormulario(FORM_MODE_CREATE);
                        setEvidencias([]);
                        horasEditadasManualRef.current = false;
                        autofillHorasContextoRef.current = '';
                        setForm({ horas_ejecutadas: '', observaciones: '' });
                    }
                } else {
                    setSeguimientoId(null);
                    setModoFormulario(modoEditarForzado ? FORM_MODE_EDIT : FORM_MODE_CREATE);
                    setEvidencias([]);
                    horasEditadasManualRef.current = false;
                    autofillHorasContextoRef.current = '';
                    setForm({ horas_ejecutadas: '', observaciones: '' });
                }
            } catch (err) {
                toast.error(err?.response?.data?.message || 'No se pudo validar semana y actividad');
            }
        };

        lookup();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        semanaSeleccionada,
        actividadSeleccionada,
        periodoSeleccionado?.id_periodo,
        corteSeleccionado,
        hidratadoDesdeQuery,
        modoCrearForzado,
        modoEditarForzado,
        idSeguimientoQuery,
    ]);

    useEffect(() => {
        if (!actividadSeleccionada) return;
        const existeActividad = actividadesOrdenadas.some((a) => Number(a.id_actividad) === Number(actividadSeleccionada));
        if (!existeActividad) {
            setActividadSeleccionada('');
        }
    }, [actividadesOrdenadas, actividadSeleccionada]);

    useEffect(() => {
        if (semanaSeleccionada) return;
        if (!semanaActual) return;
        if (!corteSeleccionado) return;
        if (!semanasDelCorteSeleccionado.length) return;

        if (semanasDelCorteSeleccionado.includes(semanaActual)) {
            setSemanaSeleccionada(semanaActual);
        }
    }, [semanaSeleccionada, semanaActual, corteSeleccionado, semanasDelCorteSeleccionado]);

    const cambiarCorte = (idCorte) => {
        setCorteSeleccionado(idCorte);
        setSemanaSeleccionada(null);
        setSeguimientoId(null);
        setModoFormulario(FORM_MODE_CREATE);
        setTabActiva(TAB_SEGUIMIENTO);
        setIdCorteCalculado(null);
        setRangoSemana(null);
        setEvidencias([]);
        setErrorEvidencia('');
        setErrorGuardado('');
        setArchivosSeleccionados([]);
        setArchivosCola([]);
        horasEditadasManualRef.current = false;
        autofillHorasContextoRef.current = '';
        setForm({ horas_ejecutadas: '', observaciones: '' });
        actualizarQuery({ idSeguimiento: null, tab: TAB_SEGUIMIENTO });
    };

    const guardarSeguimiento = async () => {
        setErrorGuardado('');

        if (!semanaSeleccionada || !actividadSeleccionada || !corteSeleccionado) {
            toast.warning('Selecciona corte, semana y actividad para continuar');
            return;
        }

        const maxPermitidas = Number(limiteHorasInput || 0);
        if (modoCrear && horasPendientesSemanaActividad <= 0) {
            toast.warning('Esta actividad ya completo las horas programadas para la semana seleccionada');
            return;
        }

        const horas = parsearHorasInput(form.horas_ejecutadas);
        if (Number.isNaN(horas)) {
            toast.warning('Introduce un numero valido para horas a registrar');
            return;
        }

        if (horas <= 0) {
            toast.warning('Las horas ejecutadas deben ser mayores que 0');
            return;
        }

        if (maxPermitidas > 0 && horas > maxPermitidas) {
            toast.warning('No puedes registrar mas horas de las disponibles para esta semana.');
            return;
        }

        if (errorHorasSemana) {
            toast.warning(errorHorasSemana);
            return;
        }

        setGuardando(true);
        try {
            let idSeguimientoFinal = seguimientoId;

            if (modoEditar) {
                if (!seguimientoId) {
                    toast.warning('No se encontro un seguimiento existente para actualizar. Usa Reportar semana para crear un nuevo registro.');
                    return;
                }

                const payloadActualizar = {
                    semana: Number(semanaSeleccionada),
                    horas_ejecutadas: horas,
                    observaciones: form.observaciones,
                };
                await api.put(`/seguimiento/${seguimientoId}`, payloadActualizar);
            } else {
                const payloadCrear = {
                    id_actividad: Number(actividadSeleccionada),
                    id_corte: Number(corteSeleccionado),
                    semana: Number(semanaSeleccionada),
                    horas_ejecutadas: horas,
                    observaciones: form.observaciones,
                };
                const { data } = await api.post('/seguimiento', payloadCrear);
                idSeguimientoFinal = Number(data.id_seguimiento);
            }

            if (!idSeguimientoFinal) {
                throw new Error('No se recibio id_seguimiento al guardar');
            }

            setSeguimientoId(idSeguimientoFinal);
            setModoFormulario(FORM_MODE_EDIT);
            await cargarEvidencias(idSeguimientoFinal);

            setTabActiva(TAB_EVIDENCIAS);
            actualizarQuery({ idSeguimiento: idSeguimientoFinal, tab: TAB_EVIDENCIAS });
            toast.success('Seguimiento guardado. Continua en la pestana de evidencias.');
        } catch (err) {
            const mensaje = obtenerMensajeError(err, 'Error al guardar seguimiento');
            setErrorGuardado(mensaje);
            toast.error(mensaje);
        } finally {
            setGuardando(false);
        }
    };

    const manejarSeleccionArchivos = (fileList) => {
        const archivos = Array.from(fileList || []);
        if (!archivos.length) return;

        const validos = [];
        let rechazados = 0;

        archivos.forEach((file) => {
            const nombre = String(file.name || '').toLowerCase();
            const esPdf = file.type === 'application/pdf' || nombre.endsWith('.pdf');
            if (!esPdf) {
                rechazados += 1;
                return;
            }

            validos.push(file);
        });

        if (rechazados > 0) {
            toast.warning('Solo se permiten archivos PDF');
        }

        if (validos.length > 0) {
            setArchivosSeleccionados((prev) => [...prev, ...validos]);
            setErrorEvidencia('');
        }
    };

    const agregarArchivosACola = () => {
        if (!archivosSeleccionados.length) {
            toast.warning('Selecciona al menos un archivo para agregar a la cola');
            return;
        }

        const nuevos = archivosSeleccionados.map((file) => ({
            idLocal: `${Date.now()}-${Math.random()}`,
            file,
            nombre: file.name,
            descripcion: '',
            estado: ESTADO_EVIDENCIA.PENDIENTE,
            progreso: 0,
            mensaje: '',
        }));

        setArchivosCola((prev) => [...prev, ...nuevos]);
        setArchivosSeleccionados([]);
        setErrorEvidencia('');
    };

    const actualizarDescripcionCola = (idLocal, descripcion) => {
        setArchivosCola((prev) => prev.map((a) => (
            a.idLocal === idLocal ? { ...a, descripcion } : a
        )));
    };

    const quitarArchivoCola = (idLocal) => {
        setArchivosCola((prev) => prev.filter((a) => a.idLocal !== idLocal));
    };

    const confirmarEliminarArchivoCola = (idLocal) => {
        if (!window.confirm('¿Deseas eliminar esta evidencia?')) {
            return;
        }
        quitarArchivoCola(idLocal);
    };

    const subirEvidencias = async (mostrarToast = true) => {
        if (!seguimientoId) {
            toast.warning('Primero debes guardar el seguimiento semanal');
            return { errores: 1 };
        }

        const pendientes = archivosCola.filter((a) => a.estado === ESTADO_EVIDENCIA.PENDIENTE || a.estado === ESTADO_EVIDENCIA.ERROR);
        if (pendientes.length === 0) {
            if (mostrarToast) toast.warning('No hay archivos nuevos para guardar');
            return { errores: 0 };
        }

        setSubiendo(true);
        let errores = 0;

        try {
            for (const item of pendientes) {
                setArchivosCola((prev) => prev.map((a) => (
                    a.idLocal === item.idLocal
                        ? { ...a, estado: ESTADO_EVIDENCIA.SUBIENDO, progreso: 0, mensaje: '' }
                        : a
                )));

                try {
                    const fd = new FormData();
                    fd.append('archivo', item.file);
                    fd.append('id_seguimiento', String(seguimientoId));
                    fd.append('descripcion', item.descripcion || '');

                    await api.post('/evidencia/upload', fd, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                        onUploadProgress: (evt) => {
                            const total = Number(evt.total || 0);
                            const progreso = total > 0
                                ? Math.min(100, Math.round((Number(evt.loaded || 0) * 100) / total))
                                : 0;

                            setArchivosCola((prev) => prev.map((a) => (
                                a.idLocal === item.idLocal
                                    ? { ...a, progreso }
                                    : a
                            )));
                        },
                    });

                    setArchivosCola((prev) => prev.map((a) => (
                        a.idLocal === item.idLocal
                            ? { ...a, estado: ESTADO_EVIDENCIA.CARGADO, progreso: 100, mensaje: 'Archivo cargado correctamente' }
                            : a
                    )));
                } catch (error) {
                    errores += 1;
                    const mensajeArchivo = obtenerMensajeError(error, 'Error al subir archivo');
                    setArchivosCola((prev) => prev.map((a) => (
                        a.idLocal === item.idLocal
                            ? { ...a, estado: ESTADO_EVIDENCIA.ERROR, progreso: 0, mensaje: mensajeArchivo }
                            : a
                    )));
                }
            }

            await cargarEvidencias(seguimientoId);
            setArchivosCola((prev) => prev.filter((a) => a.estado !== ESTADO_EVIDENCIA.CARGADO));
            setErrorEvidencia('');

            if (errores > 0 && mostrarToast) {
                toast.warning('Algunos archivos no se pudieron subir. Puedes reintentarlos.');
            } else if (mostrarToast) {
                toast.success('Archivo cargado correctamente');
            }

            return { errores };
        } catch (err) {
            if (mostrarToast) {
                toast.error(obtenerMensajeError(err, 'No se pudo guardar la evidencia'));
            }
            return { errores: pendientes.length || 1 };
        } finally {
            setSubiendo(false);
        }
    };

    const guardarEvidencias = async () => {
        setErrorEvidencia('');
        await subirEvidencias(true);
    };

    const eliminarEvidencia = async (idEvidencia) => {
        if (!window.confirm('¿Deseas eliminar esta evidencia?')) {
            return;
        }

        setEliminandoEvidencias((prev) => [...prev, Number(idEvidencia)]);
        try {
            await api.delete(`/evidencia/${idEvidencia}`);
            await cargarEvidencias(seguimientoId);
            toast.success('Evidencia eliminada');
        } catch (err) {
            toast.error(obtenerMensajeError(err, 'No se pudo eliminar la evidencia'));
        } finally {
            setEliminandoEvidencias((prev) => prev.filter((id) => id !== Number(idEvidencia)));
        }
    };

    const abrirVistaPreviaEvidencia = (evidencia) => {
        setErrorVistaPrevia(false);
        setEvidenciaVistaPrevia(evidencia);
    };

    const cerrarVistaPreviaEvidencia = () => {
        setErrorVistaPrevia(false);
        setEvidenciaVistaPrevia(null);
    };

    const urlVistaPreviaDocumento = useMemo(
        () => construirUrlPreviewDocumento(evidenciaVistaPrevia?.ruta_archivo),
        [evidenciaVistaPrevia],
    );

    const cambiarTab = (tab) => {
        if (tab === TAB_EVIDENCIAS && !seguimientoId) return;
        setTabActiva(tab);
        actualizarQuery({ idSeguimiento: seguimientoId || null, tab });
    };

    const onSubmit = async (e) => {
        e.preventDefault();

        if (tabActiva === TAB_SEGUIMIENTO) {
            await guardarSeguimiento();
            return;
        }

        await guardarEvidencias();
    };

    const deshabilitarBotonPrincipal = tabActiva === TAB_SEGUIMIENTO
        ? (
            guardando
            || subiendo
            || !semanaSeleccionada
            || !actividadSeleccionada
            || Boolean(errorHorasSemana)
            || (horasPendientesSemanaActividad <= 0 && modoCrear)
            || (modoEditar && !seguimientoId)
        )
        : (subiendo || !seguimientoId);

    const textoBotonPrincipal = tabActiva === TAB_SEGUIMIENTO
        ? (guardando ? 'Guardando seguimiento...' : 'Guardar y continuar')
        : (subiendo ? 'Subiendo evidencias...' : 'Guardar evidencias');

    if (cargando) {
        return (
            <Layout>
                <div className="flex items-center justify-center py-24">
                    <div className="w-12 h-12 border-4 border-institutional-green/20 border-t-institutional-green rounded-full animate-spin" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-[1400px] mx-auto px-2 sm:px-4">
                <section className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-4 sm:p-6 lg:p-7">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate('/seguimiento')}
                                className="p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:text-institutional-green"
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <div>
                                <p className="text-[10px] font-black text-institutional-green uppercase tracking-[0.2em]">Reporte semanal</p>
                                <h1 className="text-2xl font-black text-institutional-dark uppercase">Formulario unico de seguimiento</h1>
                            </div>
                        </div>
                    </div>

                    <div className="mb-4 grid grid-cols-2 gap-2 rounded-[1.1rem] border border-[#9fb6cf] bg-[#dfe8f3] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                        <button
                            type="button"
                            onClick={() => cambiarTab(TAB_SEGUIMIENTO)}
                            className={`h-11 rounded-[0.8rem] text-xs font-extrabold uppercase tracking-[0.14em] transition-all duration-200 ${tabActiva === TAB_SEGUIMIENTO
                                ? 'bg-gradient-to-b from-[#145189] to-[#0f3f6f] text-white border border-[#0f4b83] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_1px_2px_rgba(7,33,60,0.35)]'
                                : 'bg-[#d7e2ef] text-[#2f4f73] border border-transparent hover:bg-[#cfdbea]'
                                }`}
                        >
                            Seguimiento semanal
                        </button>
                        <button
                            type="button"
                            onClick={() => cambiarTab(TAB_EVIDENCIAS)}
                            disabled={!seguimientoId}
                            className={`h-11 rounded-[0.8rem] text-xs font-extrabold uppercase tracking-[0.14em] transition-all duration-200 ${tabActiva === TAB_EVIDENCIAS
                                ? 'bg-gradient-to-b from-[#145189] to-[#0f3f6f] text-white border border-[#0f4b83] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_1px_2px_rgba(7,33,60,0.35)]'
                                : 'bg-[#d7e2ef] text-[#2f4f73] border border-transparent'
                                } ${!seguimientoId ? 'opacity-55 cursor-not-allowed' : 'hover:bg-[#cfdbea]'}`}
                        >
                            Evidencias
                        </button>
                    </div>

                    {!seguimientoId && (
                        <p className="mb-4 text-[12px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                            La pestana de evidencias se habilita despues de guardar el seguimiento semanal.
                        </p>
                    )}

                    <form onSubmit={onSubmit} className="space-y-5">
                        {tabActiva === TAB_SEGUIMIENTO && (
                            <>
                                {alertaPrefill && (
                                    <p className="text-[12px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                                        {alertaPrefill}
                                    </p>
                                )}

                                <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 xl:gap-5">
                                    <div className="xl:col-span-3 space-y-4">
                                        <div>
                                            <p className="text-xs font-black text-institutional-dark uppercase tracking-widest mb-2">Paso 1: Seleccion de corte</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                {[...cortesLista]
                                                    .sort((a, b) => Number(a.numero_corte) - Number(b.numero_corte))
                                                    .map((corte) => {
                                                        const activo = Number(corteSeleccionado) === Number(corte.id_corte);
                                                        return (
                                                            <button
                                                                key={corte.id_corte}
                                                                type="button"
                                                                onClick={() => cambiarCorte(corte.id_corte)}
                                                                className={`h-10 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${activo
                                                                    ? 'bg-institutional-dark text-white border-institutional-dark shadow-sm'
                                                                    : 'bg-[#8CB79B] text-white border-[#235347] hover:bg-[#7fa98e]'
                                                                    }`}
                                                            >
                                                                Corte {corte.numero_corte}
                                                            </button>
                                                        );
                                                    })}
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-xs font-black text-institutional-dark uppercase tracking-widest mb-2">Paso 2: Seleccion de semana</p>
                                            <div className="grid grid-cols-6 md:grid-cols-10 gap-2">
                                                {(semanasDelCorteSeleccionado.length ? semanasDelCorteSeleccionado : Array.from({ length: totalSemanas }, (_, i) => i + 1)).map((semana) => {
                                                    const actual = semanaActual === semana;
                                                    const reportada = semanasReportadas.includes(semana);
                                                    const seleccionada = semanaSeleccionada === semana;
                                                    return (
                                                        <button
                                                            key={semana}
                                                            type="button"
                                                            disabled={!corteSeleccionado}
                                                            onClick={() => setSemanaSeleccionada(semana)}
                                                            className={`h-10 rounded-xl text-xs font-black border transition-all ${!corteSeleccionado
                                                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-70'
                                                                : seleccionada
                                                                    ? 'bg-institutional-green text-white border-institutional-green'
                                                                    : reportada
                                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                        : actual
                                                                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                                            : 'bg-gray-50 text-gray-600 border-gray-200'
                                                                }`}
                                                        >
                                                            {semana}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <p className="mt-2 text-xs text-gray-500 font-medium">
                                                {semanaSeleccionada
                                                    ? `Semana ${semanaSeleccionada} - Corte ${idCorteCalculado || '-'} (${formatearFecha(rangoSemana?.fecha_inicio)} a ${formatearFecha(rangoSemana?.fecha_fin)})`
                                                    : 'Selecciona una semana del corte activo para continuar'}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs font-black text-institutional-dark uppercase tracking-widest mb-2">Paso 3: Actividad a reportar</p>
                                            <select
                                                value={actividadSeleccionada}
                                                onChange={(e) => manejarCambioActividad(e.target.value)}
                                                disabled={!semanaSeleccionada}
                                                className={`w-full min-h-[48px] border rounded-2xl px-4 py-3 text-sm font-bold ${!semanaSeleccionada
                                                    ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                                    : 'bg-gray-50 border-gray-200'
                                                    }`}
                                            >
                                                <option value="">Seleccione una actividad...</option>
                                                {actividadesOrdenadas.map((a) => {
                                                    const estado = obtenerEstadoPendienteSemana(a);
                                                    return (
                                                        <option key={a.id_actividad} value={a.id_actividad}>
                                                            {`${a.id_tipo}-${a.tipo_actividad} - ${a.nombre} || [${estado.codigo}] ${estado.texto}`}
                                                        </option>
                                                    );
                                                })}
                                            </select>

                                            {!!semanaSeleccionada && (
                                                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-gray-600">
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                                        <Clock3 size={11} /> [PENDIENTE]
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <CheckCircle2 size={11} /> [OK]
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                                        <AlertTriangle size={11} /> [ALERTA]
                                                    </span>
                                                </div>
                                            )}

                                            {cargandoActividades && (
                                                <p className="mt-2 text-[11px] font-medium text-gray-500">Actualizando pendientes semanales por actividad...</p>
                                            )}

                                            {actividadSeleccionada && (
                                                <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                                                    {horasProgramadasQuery > 0 && idTipoQuery > 0 && (
                                                        <p className="text-[11px] font-semibold text-[#1F9D78]">
                                                            Horas programadas desde dashboard (tipo): {Number(horasProgramadasQuery || 0).toFixed(2)} h
                                                        </p>
                                                    )}
                                                    <p className="text-[11px] font-semibold text-gray-700">
                                                        Horas programadas para la semana seleccionada: {Number(horasProgramadasSemanaActividad || 0).toFixed(2)} h
                                                    </p>
                                                    <p className="text-[11px] font-semibold text-institutional-dark mt-1">
                                                        Disponible para registrar: {Number(horasDisponiblesParaRegistrar || 0).toFixed(2)} h
                                                    </p>
                                                    <p className="text-[11px] font-medium text-gray-600 mt-1">
                                                        {mensajePendienteSemanaActividad || 'Registra aqui solo las horas nuevas de la semana seleccionada.'}
                                                    </p>
                                                    {!!estadoPendienteSemanaActividad && (
                                                        <p className={`text-[11px] font-semibold mt-1 flex items-center gap-1 ${estadoPendienteSemanaActividad.clase}`}>
                                                            {estadoPendienteSemanaActividad.codigo === 'PENDIENTE' && <Clock3 size={13} />}
                                                            {estadoPendienteSemanaActividad.codigo === 'OK' && <CheckCircle2 size={13} />}
                                                            {estadoPendienteSemanaActividad.codigo === 'ALERTA' && <AlertTriangle size={13} />}
                                                            [{estadoPendienteSemanaActividad.codigo}] {estadoPendienteSemanaActividad.texto}
                                                        </p>
                                                    )}
                                                    {actividadActiva?.inconsistencia_semana_actual && (
                                                        <p className="text-[11px] font-semibold text-amber-700 mt-1">
                                                            Inconsistencia detectada: hay mas horas reportadas que las programadas en esta semana.
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {!semanaSeleccionada && (
                                                <p className="mt-2 text-[11px] font-medium text-gray-500">Selecciona una semana para habilitar actividades e indicadores.</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="xl:col-span-2 space-y-4">
                                        <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Resumen semanal</p>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Horas programadas</p>
                                                    <p className="text-sm font-black text-slate-900 mt-1">{horasProgramadasSemanaActividad.toFixed(2)} h</p>
                                                </div>
                                                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Horas registradas hasta ahora</p>
                                                    <p className="text-sm font-black text-slate-900 mt-1">{Number(horasRegistradasHastaAhora || 0).toFixed(2)} h</p>
                                                </div>
                                                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Disponible para registrar</p>
                                                    <p className="text-sm font-black text-emerald-700 mt-1">{Number(horasDisponiblesParaRegistrar || 0).toFixed(2)} h</p>
                                                </div>
                                            </div>

                                            <div className="mt-3">
                                                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                                                    <span>{Number(horasRegistradasHastaAhora || 0).toFixed(2)} h / {Number(horasProgramadasSemanaActividad || 0).toFixed(2)} h</span>
                                                    <span>{Number(porcentajeSemanaRegistrada || 0).toFixed(2)}%</span>
                                                </div>
                                                <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-[#1F9D78] to-[#58C9A8] transition-all duration-300"
                                                        style={{ width: `${Number(porcentajeSemanaRegistrada || 0)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Bloque de accion</p>
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Horas a registrar</label>
                                            <input
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                max={limiteHorasInput || undefined}
                                                required
                                                disabled={!semanaSeleccionada || !actividadSeleccionada}
                                                value={form.horas_ejecutadas}
                                                onChange={(e) => {
                                                    horasEditadasManualRef.current = true;
                                                    const valorNormalizado = normalizarDecimalInput(e.target.value);
                                                    setForm((p) => ({ ...p, horas_ejecutadas: valorNormalizado }));
                                                }}
                                                className={`mt-1 w-full bg-gray-50 border rounded-2xl px-4 py-3 text-sm font-bold ${errorHorasSemana ? 'border-red-300 focus:border-red-400' : 'border-gray-200'}`}
                                            />
                                            {actividadSeleccionada && (
                                                <p className="mt-1 text-[11px] font-medium text-gray-500">Disponible para registrar: {Number(horasDisponiblesParaRegistrar || 0).toFixed(2)} h</p>
                                            )}
                                            {errorHorasSemana && (
                                                <p className="mt-1 text-[11px] font-semibold text-red-600">{errorHorasSemana}</p>
                                            )}
                                        </div>

                                        <div className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-bold text-gray-500">
                                            Fecha de registro: se genera automaticamente al guardar
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Observaciones</label>
                                            <textarea
                                                rows={4}
                                                disabled={!semanaSeleccionada || !actividadSeleccionada}
                                                value={form.observaciones}
                                                onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))}
                                                className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {tabActiva === TAB_EVIDENCIAS && (
                            <>
                                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                                    <p className="text-xs font-black text-institutional-dark uppercase tracking-widest mb-3">Contexto del seguimiento</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                        <p className="font-semibold text-gray-700">Corte: <span className="text-institutional-dark">{cortesLista.find((c) => Number(c.id_corte) === Number(corteSeleccionado))?.numero_corte || '-'}</span></p>
                                        <p className="font-semibold text-gray-700">Semana: <span className="text-institutional-dark">{semanaSeleccionada || '-'}</span></p>
                                        <p className="font-semibold text-gray-700">Actividad: <span className="text-institutional-dark">{actividadActiva?.nombre || '-'}</span></p>
                                        <p className="font-semibold text-gray-700">Horas registradas: <span className="text-institutional-dark">{form.horas_ejecutadas || 0} h</span></p>
                                    </div>
                                </div>

                                <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50/60">
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-xs font-black text-institutional-dark uppercase tracking-widest">Evidencias</p>
                                        {modoEditar && <span className="text-[10px] font-black text-emerald-600 uppercase">Seguimiento guardado</span>}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                                        <label className="md:col-span-1 flex items-center justify-center gap-2 h-11 rounded-xl border border-dashed border-gray-300 bg-white text-xs font-black text-gray-600 cursor-pointer">
                                            <Upload size={14} />
                                            <span>{archivosSeleccionados.length > 0 ? `${archivosSeleccionados.length} seleccionado(s)` : 'Seleccionar archivos'}</span>
                                            <input
                                                type="file"
                                                multiple
                                                accept=".pdf,application/pdf"
                                                className="hidden"
                                                onChange={(e) => {
                                                    manejarSeleccionArchivos(e.target.files);
                                                    e.target.value = '';
                                                }}
                                            />
                                        </label>
                                        <button
                                            type="button"
                                            onClick={agregarArchivosACola}
                                            disabled={subiendo || archivosSeleccionados.length === 0}
                                            className="md:col-span-2 h-11 rounded-xl bg-institutional-dark text-white text-xs font-black uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            <Plus size={14} /> Agregar evidencia
                                        </button>
                                    </div>

                                    <p className="text-[11px] font-medium text-gray-500 mb-4">Formato permitido: PDF</p>

                                    {errorEvidencia && (
                                        <p className="text-[12px] font-semibold text-red-600 mb-3">
                                            {errorEvidencia}
                                        </p>
                                    )}

                                    {(guardando || subiendo) && archivosCola.length > 0 && (
                                        <div className="mb-3 rounded-xl border border-gray-200 bg-white px-3 py-2">
                                            <p className="text-[11px] font-semibold text-gray-700">
                                                {subiendo ? 'Subiendo evidencias...' : 'Guardando seguimiento...'} ({progresoSubidaTotal}%)
                                            </p>
                                            <div className="mt-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                                                <div className="h-full bg-institutional-green" style={{ width: `${progresoSubidaTotal}%` }} />
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                                            {archivosCola.map((item) => (
                                                <div key={item.idLocal} className="bg-white border border-gray-200 rounded-xl px-3 py-2 min-w-0">
                                                    <p className="text-xs font-bold text-institutional-dark truncate" title={item.nombre}>{item.nombre}</p>
                                                    <p className={`text-[10px] font-black mt-1 ${item.estado === ESTADO_EVIDENCIA.ERROR ? 'text-red-600' : item.estado === ESTADO_EVIDENCIA.CARGADO ? 'text-emerald-600' : 'text-gray-500'}`}>
                                                        {item.estado}
                                                    </p>
                                                    <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                                        <div
                                                            className={`h-full ${item.estado === ESTADO_EVIDENCIA.ERROR ? 'bg-red-500' : 'bg-institutional-green'}`}
                                                            style={{ width: `${Number(item.progreso || 0)}%` }}
                                                        />
                                                    </div>
                                                    {item.mensaje && (
                                                        <p className={`mt-1 text-[10px] font-semibold ${item.estado === ESTADO_EVIDENCIA.ERROR ? 'text-red-600' : 'text-emerald-700'}`}>
                                                            {item.mensaje}
                                                        </p>
                                                    )}
                                                    <input
                                                        type="text"
                                                        placeholder="Descripcion del archivo"
                                                        value={item.descripcion || ''}
                                                        onChange={(e) => actualizarDescripcionCola(item.idLocal, e.target.value)}
                                                        disabled={item.estado !== ESTADO_EVIDENCIA.PENDIENTE && item.estado !== ESTADO_EVIDENCIA.ERROR}
                                                        className="mt-2 w-full h-8 rounded-lg border border-gray-200 px-2 text-[11px] font-medium"
                                                    />
                                                    {(item.estado === ESTADO_EVIDENCIA.PENDIENTE || item.estado === ESTADO_EVIDENCIA.ERROR) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => confirmarEliminarArchivoCola(item.idLocal)}
                                                            className="mt-2 inline-flex items-center gap-1 text-[10px] font-black text-red-600"
                                                        >
                                                            <Trash2 size={12} /> Eliminar
                                                        </button>
                                                    )}
                                                </div>
                                            ))}

                                            {evidencias.map((ev) => (
                                                <div key={`up-${ev.id_evidencia}`} className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 min-w-0">
                                                    <p className="text-xs font-bold text-institutional-dark truncate flex items-center gap-1" title={ev.nombre_archivo}>
                                                        <Paperclip size={12} /> {ev.nombre_archivo}
                                                    </p>
                                                    <p className="text-[10px] font-black mt-1 text-gray-700">{formatearFecha(ev.fecha_carga)}</p>
                                                    <p className="text-[10px] font-medium text-gray-600 truncate mt-1" title={ev.descripcion || ''}>
                                                        {ev.descripcion || 'Sin descripcion'}
                                                    </p>
                                                    <div className="mt-2 flex items-center justify-between gap-2">
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide">
                                                            <CheckCircle2 size={12} /> Guardado
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => abrirVistaPreviaEvidencia(ev)}
                                                                className="h-7 px-2 rounded-lg border border-sky-200 bg-sky-50 text-sky-700 text-[10px] font-black inline-flex items-center gap-1 hover:bg-sky-100 transition-colors"
                                                                title="Ver documento"
                                                            >
                                                                <Eye size={12} /> Ver
                                                            </button>

                                                            {Number(ev.validado) === 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => eliminarEvidencia(ev.id_evidencia)}
                                                                    disabled={eliminandoEvidencias.includes(Number(ev.id_evidencia))}
                                                                    className="h-7 px-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-[10px] font-black inline-flex items-center gap-1 hover:bg-red-100 transition-colors disabled:opacity-60"
                                                                    title="Eliminar evidencia"
                                                                >
                                                                    <Trash2 size={12} /> {eliminandoEvidencias.includes(Number(ev.id_evidencia)) ? 'Eliminando...' : 'Eliminar'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>

                                    {archivosCola.length === 0 && evidencias.length === 0 && (
                                        <p className="text-xs text-gray-500 font-medium mt-2">No hay evidencias en cola ni cargadas.</p>
                                    )}
                                </div>
                            </>
                        )}

                        {(guardando || subiendo) && (
                            <p className="text-[12px] font-semibold text-gray-600">
                                {guardando ? 'Guardando seguimiento...' : 'Subiendo evidencias...'}
                            </p>
                        )}

                        {errorGuardado && (
                            <p className="text-sm font-semibold text-red-600">
                                {errorGuardado}
                            </p>
                        )}

                        <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur border-t border-gray-100 pt-3 -mx-4 sm:-mx-6 lg:-mx-7 px-4 sm:px-6 lg:px-7 pb-1">
                            <button
                                type="submit"
                                disabled={deshabilitarBotonPrincipal}
                                className="w-full h-12 rounded-2xl bg-institutional-green text-white font-black text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Save size={16} /> {textoBotonPrincipal}
                            </button>
                        </div>
                    </form>
                </section>
            </div>

            {evidenciaVistaPrevia && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4">
                    <div className="w-full max-w-5xl bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-[10px] font-black text-institutional-green uppercase tracking-[0.16em]">Vista previa</p>
                                <h3 className="text-sm font-black text-institutional-dark truncate" title={evidenciaVistaPrevia.nombre_archivo}>
                                    {evidenciaVistaPrevia.nombre_archivo}
                                </h3>
                            </div>

                            <div className="flex items-center gap-2">
                                <a
                                    href={evidenciaVistaPrevia.ruta_archivo}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="h-9 px-3 rounded-xl border border-gray-200 text-gray-700 text-xs font-black inline-flex items-center gap-1 hover:bg-gray-50"
                                >
                                    <ExternalLink size={14} /> Abrir en nueva ventana
                                </a>
                                <button
                                    type="button"
                                    onClick={cerrarVistaPreviaEvidencia}
                                    className="h-9 w-9 rounded-xl border border-gray-200 text-gray-700 inline-flex items-center justify-center hover:bg-gray-50"
                                    title="Cerrar"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-3">
                            {urlVistaPreviaDocumento && !errorVistaPrevia ? (
                                <iframe
                                    title={`preview-${evidenciaVistaPrevia.id_evidencia}`}
                                    src={urlVistaPreviaDocumento}
                                    className="w-full h-[70vh] rounded-xl border border-gray-200 bg-white"
                                    onError={() => setErrorVistaPrevia(true)}
                                />
                            ) : (
                                <div className="h-[70vh] rounded-xl border border-dashed border-gray-300 bg-white flex flex-col items-center justify-center gap-2 px-6 text-center">
                                    <AlertTriangle size={18} className="text-amber-600" />
                                    <p className="text-sm font-bold text-gray-700">No se pudo previsualizar este documento.</p>
                                    <p className="text-xs text-gray-500">Puedes abrirlo en una nueva ventana para revisarlo directamente.</p>
                                    <a
                                        href={evidenciaVistaPrevia.ruta_archivo}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-1 h-9 px-3 rounded-xl border border-gray-200 text-gray-700 text-xs font-black inline-flex items-center gap-1 hover:bg-gray-50"
                                    >
                                        <ExternalLink size={14} /> Abrir documento
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default SeguimientoNuevo;
