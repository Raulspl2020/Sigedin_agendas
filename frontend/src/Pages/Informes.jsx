import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    CheckSquare,
    ChevronDown,
    Copy,
    Download,
    Eraser,
    Eye,
    FileSpreadsheet,
    Filter,
    Search,
} from 'lucide-react';
import { toast } from 'react-toastify';
import Layout from '../Components/Layout';
import api from '../services/api';

const PAGE_SIZE = 20;

const fmt = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return value ?? '-';
    return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

const MultiSelectFilter = ({
    label,
    placeholder,
    options,
    selected,
    onChange,
    searchValue,
    onSearchChange,
    loading = false,
}) => {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        const onClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    const selectedSet = useMemo(() => new Set(selected), [selected]);

    const visibleOptions = useMemo(() => {
        const q = String(searchValue || '').toLowerCase().trim();
        if (!q) return options;
        return options.filter((option) => String(option.label).toLowerCase().includes(q));
    }, [options, searchValue]);

    const toggleOption = (value) => {
        if (selectedSet.has(value)) {
            onChange(selected.filter((item) => item !== value));
            return;
        }
        onChange([...selected, value]);
    };

    const seleccionarTodoVisible = () => {
        const visibleValues = visibleOptions.map((item) => item.value);
        const next = new Set(selected);
        visibleValues.forEach((value) => next.add(value));
        onChange(Array.from(next));
    };

    const limpiarVisible = () => {
        const visibleValues = new Set(visibleOptions.map((item) => item.value));
        onChange(selected.filter((value) => !visibleValues.has(value)));
    };

    const selectedText = selected.length === 0
        ? placeholder
        : `${selected.length} seleccionado(s)`;

    return (
        <div ref={wrapperRef} className="relative">
            <label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</label>
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="mt-1 w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-left flex items-center justify-between gap-2"
            >
                <span className={`text-sm ${selected.length ? 'text-slate-700 font-semibold' : 'text-slate-400'}`}>{selectedText}</span>
                <ChevronDown size={16} className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute z-30 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-xl p-2">
                    <div className="relative mb-2">
                        <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={searchValue}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Buscar..."
                            className="w-full h-9 rounded-lg border border-slate-200 pl-7 pr-2 text-xs"
                        />
                    </div>

                    <div className="flex items-center justify-between mb-2 px-1">
                        <button type="button" onClick={seleccionarTodoVisible} className="text-[10px] font-black text-blue-700 uppercase tracking-wide">
                            Select All
                        </button>
                        <button type="button" onClick={limpiarVisible} className="text-[10px] font-black text-slate-600 uppercase tracking-wide">
                            Deselect All
                        </button>
                    </div>

                    <div className="max-h-52 overflow-auto space-y-1">
                        {loading ? (
                            <p className="text-xs text-slate-500 px-2 py-3">Cargando opciones...</p>
                        ) : visibleOptions.length === 0 ? (
                            <p className="text-xs text-slate-500 px-2 py-3">Sin resultados</p>
                        ) : (
                            visibleOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => toggleOption(option.value)}
                                    className={`w-full text-left px-2 py-2 rounded-lg text-xs flex items-center justify-between gap-2 ${selectedSet.has(option.value)
                                        ? 'bg-blue-50 text-blue-800 font-semibold'
                                        : 'hover:bg-slate-50 text-slate-700'
                                        }`}
                                >
                                    <span className="truncate">{option.label}</span>
                                    {selectedSet.has(option.value) && <CheckSquare size={14} className="shrink-0" />}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const Informes = () => {
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [copying, setCopying] = useState(false);

    const [periodos, setPeriodos] = useState([]);
    const [facultades, setFacultades] = useState([]);
    const [cortes, setCortes] = useState([]);
    const [semanas, setSemanas] = useState([]);
    const [docentes, setDocentes] = useState([]);

    const [selectedFacultades, setSelectedFacultades] = useState([]);
    const [selectedPeriodos, setSelectedPeriodos] = useState([]);
    const [selectedCortes, setSelectedCortes] = useState([]);
    const [selectedSemanas, setSelectedSemanas] = useState([]);
    const [selectedDocentes, setSelectedDocentes] = useState([]);
    const [identificacion, setIdentificacion] = useState('');

    const [searchFacultad, setSearchFacultad] = useState('');
    const [searchPeriodo, setSearchPeriodo] = useState('');
    const [searchCorte, setSearchCorte] = useState('');
    const [searchSemana, setSearchSemana] = useState('');
    const [searchDocente, setSearchDocente] = useState('');

    const [rows, setRows] = useState([]);
    const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1, sortBy: 'fecha_registro', sortDir: 'DESC' });

    const buildQueryParams = useCallback((extra = {}) => {
        const params = {
            facultades: selectedFacultades.join(','),
            periodos: selectedPeriodos.join(','),
            cortes: selectedCortes.join(','),
            semanas: selectedSemanas.join(','),
            docentes: selectedDocentes.join(','),
            identificacion,
            docente: searchDocente,
            ...extra,
        };

        return Object.fromEntries(
            Object.entries(params).filter(([, value]) => String(value ?? '').trim() !== ''),
        );
    }, [selectedFacultades, selectedPeriodos, selectedCortes, selectedSemanas, selectedDocentes, identificacion, searchDocente]);

    const cargarOpciones = useCallback(async () => {
        try {
            const query = buildQueryParams();
            const [resFacultades, resPeriodos, resCortes, resSemanas, resDocentes] = await Promise.all([
                api.get('/informes/filtros/facultades', { params: query }),
                api.get('/informes/filtros/periodos', { params: query }),
                api.get('/informes/filtros/cortes', { params: query }),
                api.get('/informes/filtros/semanas', { params: query }),
                api.get('/informes/filtros/docentes', { params: query }),
            ]);

            setFacultades((resFacultades.data || []).map((item) => ({
                value: String(item.id_facultad),
                label: item.nombre,
            })));
            setPeriodos((resPeriodos.data || []).map((item) => ({ value: item, label: item })));
            setCortes((resCortes.data || []).map((item) => ({
                value: String(item.numero_corte),
                label: `${item.nombre_corte || `Corte ${item.numero_corte}`}`,
            })));
            setSemanas((resSemanas.data || []).map((item) => ({ value: String(item), label: `Semana ${item}` })));
            setDocentes((resDocentes.data || []).map((item) => ({
                value: String(item.cedula),
                label: `${item.docente} (${item.cedula})`,
            })));
        } catch {
            toast.error('No se pudieron cargar los filtros de informes');
        }
    }, [buildQueryParams]);

    const consultar = useCallback(async (page = 1, sortBy = meta.sortBy, sortDir = meta.sortDir) => {
        setLoading(true);
        try {
            const { data } = await api.get('/informes/reporte', {
                params: buildQueryParams({ page, pageSize: PAGE_SIZE, sortBy, sortDir }),
            });

            setRows(Array.isArray(data?.data) ? data.data : []);
            setMeta(data?.meta || { total: 0, page: 1, totalPages: 1, sortBy, sortDir });
        } catch {
            toast.error('No se pudo consultar el reporte');
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [buildQueryParams, meta.sortBy, meta.sortDir]);

    useEffect(() => {
        cargarOpciones();
    }, [cargarOpciones]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            cargarOpciones();
        }, 300);
        return () => clearTimeout(timeout);
    }, [searchDocente, identificacion, cargarOpciones]);

    useEffect(() => {
        consultar(1, 'fecha_registro', 'DESC');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const limpiarFiltros = () => {
        setSelectedFacultades([]);
        setSelectedPeriodos([]);
        setSelectedCortes([]);
        setSelectedSemanas([]);
        setSelectedDocentes([]);
        setIdentificacion('');
        setSearchFacultad('');
        setSearchPeriodo('');
        setSearchCorte('');
        setSearchSemana('');
        setSearchDocente('');
        consultar(1, 'fecha_registro', 'DESC');
    };

    const copiarResultados = async () => {
        if (rows.length === 0) {
            toast.info('No hay filas para copiar');
            return;
        }

        setCopying(true);
        try {
            const headers = [
                'Periodo', 'Corte', 'Semana', 'Cedula', 'Docente', 'Programa', 'Facultad', 'Tipo actividad', 'Actividad',
                'Horas semanales', 'Horas planeadas', 'Horas ejecutadas', 'Avance semanal', 'Avance vs corte', 'Estado', 'Observaciones', 'Fecha registro',
            ];
            const lines = rows.map((row) => [
                row.periodo_academico,
                row.nombre_corte || row.numero_corte,
                row.semana,
                row.cedula,
                row.docente,
                row.programa_adscrito,
                row.facultad,
                row.tipo_actividad,
                row.actividad,
                row.horas_semanales,
                row.horas_planeadas,
                row.horas_ejecutadas,
                row.avance_semanal_actividad,
                row.avance_vs_corte,
                row.estado_avance,
                row.observaciones,
                row.fecha_registro,
            ].map((cell) => String(cell ?? '')).join('\t'));

            await navigator.clipboard.writeText([headers.join('\t'), ...lines].join('\n'));
            toast.success('Resultados copiados al portapapeles');
        } catch {
            toast.error('No fue posible copiar la información');
        } finally {
            setCopying(false);
        }
    };

    const exportarExcel = async () => {
        setExporting(true);
        try {
            const response = await api.get('/informes/exportar', {
                params: buildQueryParams({ sortBy: meta.sortBy, sortDir: meta.sortDir }),
                responseType: 'blob',
            });

            const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `reporte_consolidado_seguimiento_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Archivo Excel generado correctamente');
        } catch {
            toast.error('No se pudo exportar a Excel');
        } finally {
            setExporting(false);
        }
    };

    const onSort = (sortBy) => {
        const nextDir = meta.sortBy === sortBy && meta.sortDir === 'ASC' ? 'DESC' : 'ASC';
        consultar(1, sortBy, nextDir);
    };

    const headers = [
        { key: 'periodo_academico', label: 'Periodo' },
        { key: 'nombre_corte', label: 'Corte' },
        { key: 'semana', label: 'Semana' },
        { key: 'cedula', label: 'Cedula' },
        { key: 'docente', label: 'Docente' },
        { key: 'programa_adscrito', label: 'Programa adscrito' },
        { key: 'facultad', label: 'Facultad' },
        { key: 'tipo_actividad', label: 'Tipo actividad' },
        { key: 'actividad', label: 'Actividad' },
        { key: 'horas_semanales', label: 'Horas semanales' },
        { key: 'horas_planeadas', label: 'Horas planeadas' },
        { key: 'horas_ejecutadas', label: 'Horas ejecutadas' },
        { key: 'avance_semanal_actividad', label: 'Avance semanal %' },
        { key: 'avance_vs_corte', label: 'Avance vs corte %' },
        { key: 'estado_avance', label: 'Estado avance' },
        { key: 'observaciones', label: 'Observaciones' },
        { key: 'fecha_registro', label: 'Fecha registro' },
    ];

    return (
        <Layout>
            <div className="max-w-7xl mx-auto space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1F9D78]">Modulo Informes</p>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">Reporte consolidado de seguimiento semanal docente</h1>
                    <p className="text-sm text-slate-500 mt-2">
                        Consulta, filtra, previsualiza y exporta la informacion consolidada del seguimiento semanal docente.
                    </p>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-[#1F9D78]" />
                        <h2 className="text-sm font-black uppercase tracking-widest text-slate-700">Filtros de consulta</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        <MultiSelectFilter
                            label="Facultad"
                            placeholder="Seleccione facultad"
                            options={facultades}
                            selected={selectedFacultades}
                            onChange={setSelectedFacultades}
                            searchValue={searchFacultad}
                            onSearchChange={setSearchFacultad}
                        />

                        <MultiSelectFilter
                            label="Periodo"
                            placeholder="Seleccione periodo"
                            options={periodos}
                            selected={selectedPeriodos}
                            onChange={setSelectedPeriodos}
                            searchValue={searchPeriodo}
                            onSearchChange={setSearchPeriodo}
                        />

                        <MultiSelectFilter
                            label="Corte"
                            placeholder="Seleccione corte"
                            options={cortes}
                            selected={selectedCortes}
                            onChange={setSelectedCortes}
                            searchValue={searchCorte}
                            onSearchChange={setSearchCorte}
                        />

                        <MultiSelectFilter
                            label="Semana"
                            placeholder="Seleccione semana"
                            options={semanas}
                            selected={selectedSemanas}
                            onChange={setSelectedSemanas}
                            searchValue={searchSemana}
                            onSearchChange={setSearchSemana}
                        />

                        <MultiSelectFilter
                            label="Docente"
                            placeholder="Seleccione docente"
                            options={docentes}
                            selected={selectedDocentes}
                            onChange={setSelectedDocentes}
                            searchValue={searchDocente}
                            onSearchChange={setSearchDocente}
                        />

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Identificacion</label>
                            <input
                                value={identificacion}
                                onChange={(e) => setIdentificacion(e.target.value)}
                                placeholder="Buscar por numero"
                                className="mt-1 w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => consultar(1, meta.sortBy, meta.sortDir)}
                            className="h-10 px-4 rounded-xl bg-[#1F9D78] text-white text-xs font-black uppercase tracking-widest inline-flex items-center gap-2"
                        >
                            <Search size={14} /> Consultar
                        </button>
                        <button
                            type="button"
                            onClick={limpiarFiltros}
                            className="h-10 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest inline-flex items-center gap-2"
                        >
                            <Eraser size={14} /> Limpiar filtros
                        </button>
                        <button
                            type="button"
                            onClick={copiarResultados}
                            disabled={copying}
                            className="h-10 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest inline-flex items-center gap-2 disabled:opacity-60"
                        >
                            <Copy size={14} /> Copiar
                        </button>
                        <button
                            type="button"
                            onClick={exportarExcel}
                            disabled={exporting}
                            className="h-10 px-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-black uppercase tracking-widest inline-flex items-center gap-2 disabled:opacity-60"
                        >
                            <FileSpreadsheet size={14} /> {exporting ? 'Exportando...' : 'Exportar a Excel'}
                        </button>
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="inline-flex items-center gap-2 text-slate-700">
                            <Eye size={16} className="text-[#1F9D78]" />
                            <h2 className="text-sm font-black uppercase tracking-widest">Previsualizacion de resultados</h2>
                        </div>
                        <p className="text-xs font-semibold text-slate-500">Total: {meta.total}</p>
                    </div>

                    <div className="overflow-auto border border-slate-200 rounded-xl">
                        <table className="min-w-[1500px] w-full text-xs">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    {headers.map((header) => (
                                        <th key={header.key} className="text-left px-3 py-3 font-black uppercase tracking-wide text-slate-600">
                                            <button type="button" onClick={() => onSort(header.key)} className="inline-flex items-center gap-1">
                                                {header.label}
                                                {meta.sortBy === header.key && <ChevronDown size={13} className={`${meta.sortDir === 'ASC' ? 'rotate-180' : ''}`} />}
                                            </button>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={headers.length} className="text-center py-10 text-slate-500 font-semibold">Consultando informacion...</td>
                                    </tr>
                                ) : rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={headers.length} className="text-center py-10 text-slate-500 font-semibold">No se encontraron resultados para los filtros aplicados.</td>
                                    </tr>
                                ) : (
                                    rows.map((row, idx) => (
                                        <tr key={`${row.cedula}-${row.semana}-${idx}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                                            <td className="px-3 py-2">{row.periodo_academico || '-'}</td>
                                            <td className="px-3 py-2">{row.nombre_corte || `Corte ${row.numero_corte || '-'}`}</td>
                                            <td className="px-3 py-2">{row.semana ?? '-'}</td>
                                            <td className="px-3 py-2">{row.cedula || '-'}</td>
                                            <td className="px-3 py-2">{row.docente || '-'}</td>
                                            <td className="px-3 py-2">{row.programa_adscrito || '-'}</td>
                                            <td className="px-3 py-2">{row.facultad || '-'}</td>
                                            <td className="px-3 py-2">{row.tipo_actividad || '-'}</td>
                                            <td className="px-3 py-2">{row.actividad || '-'}</td>
                                            <td className="px-3 py-2">{fmt(row.horas_semanales)}</td>
                                            <td className="px-3 py-2">{fmt(row.horas_planeadas)}</td>
                                            <td className="px-3 py-2">{fmt(row.horas_ejecutadas)}</td>
                                            <td className="px-3 py-2">{fmt(row.avance_semanal_actividad)}%</td>
                                            <td className="px-3 py-2">{fmt(row.avance_vs_corte)}%</td>
                                            <td className="px-3 py-2">{row.estado_avance || '-'}</td>
                                            <td className="px-3 py-2 max-w-[280px] truncate" title={row.observaciones || ''}>{row.observaciones || '-'}</td>
                                            <td className="px-3 py-2">{row.fecha_registro || '-'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-slate-500 font-semibold">Pagina {meta.page} de {meta.totalPages}</p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={meta.page <= 1 || loading}
                                onClick={() => consultar(meta.page - 1, meta.sortBy, meta.sortDir)}
                                className="h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-50"
                            >
                                Anterior
                            </button>
                            <button
                                type="button"
                                disabled={meta.page >= meta.totalPages || loading}
                                onClick={() => consultar(meta.page + 1, meta.sortBy, meta.sortDir)}
                                className="h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-50 inline-flex items-center gap-1"
                            >
                                Siguiente <Download size={13} className="rotate-[-90deg] opacity-0" />
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </Layout>
    );
};

export default Informes;
