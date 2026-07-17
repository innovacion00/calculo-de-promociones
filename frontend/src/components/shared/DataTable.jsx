// Tabla de datos genérica y paginada. Unifica las pestañas fin/bal/abo de index.html
// (antes casi triplicadas). Config por props: endpoint, columnas, filtros, export.
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * @typedef {Object} Column
 * @property {string} key
 * @property {string} header
 * @property {(row: any) => import('react').ReactNode} [render]
 * @property {string} [cellStyle]
 */

/**
 * @typedef {Object} Filter
 * @property {string} key
 * @property {'search'|'select'|'date'} type
 * @property {string} [placeholder]
 * @property {string} [title]
 * @property {{ value: string, label: string }[]} [options]
 * @property {string} [minWidth]
 */

/**
 * @param {Object} props
 * @param {string} props.endpoint            Ruta bajo /api (p. ej. '/financial/abonos')
 * @param {Column[]} props.columns
 * @param {Filter[]} [props.filters]
 * @param {string} [props.exportEndpoint]
 * @param {number} [props.pageSize]
 * @param {boolean} [props.manualQuery]      Si true, cambiar filtros no auto-consulta; requiere "Consultar"
 * @param {boolean} [props.initialLoad]      Si false, no carga al montar (espera al primer "Consultar"). Default true.
 * @param {string[]} [props.requiredFilters] Claves de filtro obligatorias para poder consultar (deshabilita "Consultar" si faltan)
 * @param {string} [props.emptyPrompt]       Mensaje antes de la primera consulta (p. ej. "Selecciona hotel y fecha")
 * @param {string} [props.queryLabel]
 * @param {string} [props.loadingText]       Texto del estado de carga (p. ej. para avisar que el PMS es lento)
 * @param {(rows: any[]) => void} [props.onRows]
 * @param {(filters: Record<string,string>) => void} [props.onLoad]  Se llama al iniciar cada carga, con los filtros actuales
 * @param {(row: any) => string|undefined} [props.rowClassName]  Clase CSS extra por fila (p. ej. resaltar saldo pendiente)
 */
export default function DataTable({
  endpoint, columns, filters = [], exportEndpoint, pageSize = 18,
  manualQuery = false, initialLoad = true, requiredFilters = [], emptyPrompt = 'Sin registros con los filtros actuales.',
  queryLabel = '🔍 Consultar', loadingText = 'Cargando…', onRows, onLoad, rowClassName,
}) {
  const [filterValues, setFilterValues] = useState(/** @type {Record<string,string>} */ ({}));
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(/** @type {any[]} */ ([]));
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(initialLoad);
  const [error, setError] = useState('');
  const [hasQueried, setHasQueried] = useState(initialLoad);

  const canQuery = requiredFilters.every((k) => !!filterValues[k]);

  const filtersRef = useRef(filterValues);
  filtersRef.current = filterValues;
  const debounceRef = useRef(/** @type {any} */ (null));
  const onRowsRef = useRef(onRows);
  onRowsRef.current = onRows;
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const load = useCallback(async (targetPage) => {
    setLoading(true);
    setError('');
    if (onLoadRef.current) onLoadRef.current({ ...filtersRef.current });
    const params = new URLSearchParams();
    params.set('page', String(targetPage));
    params.set('pageSize', String(pageSize));
    for (const [k, v] of Object.entries(filtersRef.current)) {
      if (v) params.set(k, v);
    }
    try {
      const res = await fetch(`/api${endpoint}?${params.toString()}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok || json.ok === false) throw new Error(json.error ?? `Error HTTP ${res.status}`);
      setRows(json.data ?? []);
      setTotal(json.total ?? 0);
      if (onRowsRef.current) onRowsRef.current(json.data ?? []);
    } catch (e) {
      setRows([]);
      setTotal(0);
      setError(e instanceof Error ? e.message : 'Error de red');
    } finally {
      setLoading(false);
    }
  }, [endpoint, pageSize]);

  // Carga inicial (salvo initialLoad=false, que espera al primer "Consultar").
  useEffect(() => {
    if (initialLoad) load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** @param {string} key @param {string} value @param {boolean} isSearch */
  const onFilterChange = (key, value, isSearch) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    if (manualQuery) return;
    setPage(1);
    if (isSearch) {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => load(1), 350);
    } else {
      // el estado se aplica en el próximo tick; leemos vía ref dentro de load
      setTimeout(() => load(1), 0);
    }
  };

  const goToPage = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
    load(p);
  };

  const runQuery = () => { if (!canQuery) return; setHasQueried(true); setPage(1); load(1); };

  const doExport = () => {
    if (!exportEndpoint) return;
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filterValues)) if (v) params.set(k, v);
    window.open(`/api${exportEndpoint}?${params.toString()}`, '_blank');
  };

  return (
    <div>
      <div className="fin-toolbar">
        {filters.map((f) => {
          if (f.type === 'select') {
            return (
              <select
                key={f.key} title={f.title} value={filterValues[f.key] ?? ''}
                onChange={(e) => onFilterChange(f.key, e.target.value, false)}
              >
                <option value="">{f.placeholder ?? 'Todos'}</option>
                {(f.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            );
          }
          return (
            <input
              key={f.key} type={f.type === 'date' ? 'date' : 'text'} title={f.title}
              placeholder={f.placeholder} value={filterValues[f.key] ?? ''}
              style={f.minWidth ? { minWidth: f.minWidth } : undefined}
              onChange={(e) => onFilterChange(f.key, e.target.value, f.type === 'search')}
            />
          );
        })}
        {manualQuery && (
          <button className="fin-action-btn primary" onClick={runQuery} disabled={!canQuery} title={!canQuery ? 'Completa los campos requeridos' : undefined}>
            {queryLabel}
          </button>
        )}
        {exportEndpoint && hasQueried && <button className="fin-action-btn" onClick={doExport}>⬇ Exportar CSV</button>}
      </div>

      <div className="fin-table-wrap">
        <table className="fin-table">
          <thead>
            <tr>{columns.map((c) => <th key={c.key}>{c.header}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} className="fin-empty">{loadingText}</td></tr>
            ) : error ? (
              <tr><td colSpan={columns.length} className="fin-empty">Error: {error}</td></tr>
            ) : !hasQueried ? (
              <tr><td colSpan={columns.length} className="fin-empty">{emptyPrompt}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={columns.length} className="fin-empty">Sin registros con los filtros actuales.</td></tr>
            ) : (
              rows.map((row, i) => (
                <tr key={row.id ?? i} className={rowClassName ? rowClassName(row) : undefined}>
                  {columns.map((c) => (
                    <td key={c.key} style={c.cellStyle ? parseStyle(c.cellStyle) : undefined}>
                      {c.render ? c.render(row) : (row[c.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {hasQueried && (
        <div className="fin-pagination">
          <button onClick={() => goToPage(page - 1)} disabled={page <= 1}>◀ Anterior</button>
          <span>Página {page} de {totalPages} · {total.toLocaleString('es-CO')} registros</span>
          <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages}>Siguiente ▶</button>
        </div>
      )}
    </div>
  );
}

/** Convierte "font-weight:700" en objeto de estilo React. */
function parseStyle(str) {
  /** @type {Record<string,string>} */
  const out = {};
  for (const decl of str.split(';')) {
    const [prop, val] = decl.split(':');
    if (!prop || !val) continue;
    const camel = prop.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = val.trim();
  }
  return out;
}
