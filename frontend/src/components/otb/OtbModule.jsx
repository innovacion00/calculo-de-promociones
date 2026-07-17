// Módulo OTB — núcleo: cargar 2 cortes Excel → comparativa (KPIs + tabla) → guardar/histórico.
// Diferido (fases siguientes): gráficos, semanal, diagnósticos, consultor IA, entrada manual, modos alternos.
import { Fragment, useEffect, useMemo, useState } from 'react';
import KpiRow from '../shared/KpiRow.jsx';
import { apiFetch } from '../../lib/api.js';
import { hasPermission } from '../../lib/session.js';
import { fmtCop, monthLabelEs } from '../../lib/format.js';
import { parseOtbWorkbook } from '../../lib/otb/parseExcel.js';
import { compareOTBExact, buildSummaryMetrics, daysBetweenCutoffs, dominantMonth, PICKUP_LABEL, compareWeekly, buildWeeklyMetrics } from '../../lib/otb/compare.js';
import OtbCharts from './OtbCharts.jsx';
import OtbConsultant from './OtbConsultant.jsx';
import OtbTechSheet from './OtbTechSheet.jsx';
import OtbOccVsBaseChart from './OtbOccVsBaseChart.jsx';

const pct = (v) => (v == null ? '—' : `${Math.round(v)}%`);
const pp = (v) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)}`);
/** Verde si el valor actual supera al base, rojo si es menor, sin color si empatan o faltan datos. */
const varCls = (cur, base) => {
  if (cur == null || base == null) return '';
  if (cur > base) return 'otb-pickup-pos';
  if (cur < base) return 'otb-pickup-neg';
  return '';
};
const generalCls = (general) => (general === 'Positivo' ? 'otb-pickup-pos' : general === 'Negativo' ? 'otb-pickup-neg' : '');
/**
 * Parsea la "Fecha análisis" en cualquiera de sus dos formatos históricos: ISO "YYYY-MM-DD"
 * (análisis guardados desde este frontend) o "D/M/YYYY" (análisis heredados de la app anterior).
 * @param {string|null|undefined} str
 * @returns {Date|null}
 */
const parseHistDate = (str) => {
  if (!str) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [y, m, d] = str.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const parts = str.split('/');
  if (parts.length === 3) return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  return null;
};

/** @param {{ session: import('../../lib/session.js').Session }} props */
export default function OtbModule({ session }) {
  const [hoteles, setHoteles] = useState(/** @type {string[]} */ ([]));
  const [hotel, setHotel] = useState('');
  const [before, setBefore] = useState(/** @type {any} */ (null));
  const [after, setAfter] = useState(/** @type {any} */ (null));
  const [comparison, setComparison] = useState(/** @type {any[]|null} */ (null));
  const [metrics, setMetrics] = useState(/** @type {any} */ (null));
  const [weeklyMetrics, setWeeklyMetrics] = useState(/** @type {any} */ (null));
  const [tab, setTab] = useState('upload');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [history, setHistory] = useState(/** @type {any[]} */ ([]));
  const [viewingSaved, setViewingSaved] = useState(false);
  const [expandedIds, setExpandedIds] = useState(/** @type {Set<string>} */ (new Set()));
  const [chartCache, setChartCache] = useState(/** @type {Record<string, any[]>} */ ({}));
  const [loadingIds, setLoadingIds] = useState(/** @type {Set<string>} */ (new Set()));
  const [histFrom, setHistFrom] = useState('');
  const [histTo, setHistTo] = useState('');
  const [histMonth, setHistMonth] = useState('');

  const canSave = hasPermission(session, 'canEditOtb') || hasPermission(session, 'canUploadOtbFiles');

  useEffect(() => {
    apiFetch('/hoteles').then((r) => {
      const all = r.nombres ?? [];
      const visible = session.role === 'master_admin' || !session.hotelAccess?.length
        ? all : all.filter((h) => session.hotelAccess.includes(h));
      setHoteles(visible);
      if (visible.length) setHotel(visible[0]);
    }).catch(() => {});
  }, []);

  const loadHistory = () => {
    if (!hotel) { setHistory([]); return; }
    apiFetch(`/otb/analyses?hotelId=${encodeURIComponent(hotel)}`).then((r) => setHistory(r.analyses ?? [])).catch(() => setHistory([]));
  };
  useEffect(() => { if (tab === 'history') loadHistory(); }, [tab, hotel]);

  /** @param {'before'|'after'} side @param {File} file */
  const onFile = async (side, file) => {
    setError('');
    try {
      const buf = await file.arrayBuffer();
      const parsed = parseOtbWorkbook(buf, file.name, side);
      const setter = side === 'before' ? setBefore : setAfter;
      setter((prev) => ({ ...(prev ?? {}), ...parsed, fileName: file.name }));
    } catch (e) {
      setError(`Error al leer ${side === 'before' ? 'Corte Base' : 'Corte Actual'}: ${e instanceof Error ? e.message : e}`);
    }
  };

  const setCutoff = (side, value) => {
    const setter = side === 'before' ? setBefore : setAfter;
    setter((prev) => ({ ...(prev ?? {}), cutoff: value }));
  };

  const runComparison = () => {
    setError('');
    if (!before?.rows?.length || !after?.rows?.length) {
      setError('Faltan datos. Cargue el Excel del Corte Base y del Corte Actual.');
      return;
    }
    const inventory = Math.max(
      0,
      ...before.rows.map((r) => r.totales || 0),
      ...after.rows.map((r) => r.totales || 0),
    ) || null;
    const days = daysBetweenCutoffs(before.cutoff, after.cutoff);
    const rows = compareOTBExact(before.rows, after.rows, inventory, days);
    if (!rows.length) { setError('No se encontraron días comparables.'); return; }
    setComparison(rows);
    setMetrics(buildSummaryMetrics(rows, after.summary, before.summary));
    setWeeklyMetrics(buildWeeklyMetrics(compareWeekly(before.rows, after.rows)));
    setViewingSaved(false);
    setSaveMsg('');
    setTab('comparison');
  };

  const save = async () => {
    if (!hotel) { setError('Selecciona un hotel para guardar el análisis.'); return; }
    if (!comparison || !metrics) return;
    setSaving(true);
    setSaveMsg('');
    try {
      await apiFetch('/otb/analyses', {
        method: 'POST',
        body: JSON.stringify({
          hotelId: hotel,
          month: dominantMonth(comparison),
          cutoffBefore: before?.cutoff ?? null,
          cutoffAfter: after?.cutoff ?? null,
          mode: 'exactDate',
          sourceBefore: 'excel',
          sourceAfter: 'excel',
          metrics,
          weeklyMetrics,
          comparison,
          date: new Date().toISOString().slice(0, 10),
        }),
      });
      setSaveMsg('✅ Análisis guardado en el histórico.');
      // Limpia filtros del Histórico: si quedaron de una consulta anterior, pueden ocultar
      // el análisis recién guardado (p.ej. filtro de mes distinto) y parecer que no se guardó.
      setHistFrom('');
      setHistTo('');
      setHistMonth('');
      loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const viewSaved = async (id) => {
    setError('');
    try {
      const r = await apiFetch(`/otb/analyses/${id}`);
      setComparison(r.analysis.comparison ?? []);
      setMetrics(r.analysis.metrics ?? null);
      setWeeklyMetrics(r.analysis.weeklyMetrics ?? null);
      setViewingSaved(true);
      setTab('comparison');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el análisis.');
    }
  };

  /** Permite tener varios gráficos del histórico abiertos a la vez. @param {string} id */
  const toggleHistoryChart = async (id) => {
    const alreadyOpen = expandedIds.has(id);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (alreadyOpen) next.delete(id); else next.add(id);
      return next;
    });
    if (alreadyOpen || chartCache[id]) return;
    setLoadingIds((prev) => new Set(prev).add(id));
    try {
      const r = await apiFetch(`/otb/analyses/${id}`);
      setChartCache((prev) => ({ ...prev, [id]: r.analysis.comparison ?? [] }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el gráfico.');
      setExpandedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    } finally {
      setLoadingIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  /** @param {string} id */
  const deleteHistory = async (id) => {
    if (!window.confirm('¿Eliminar esta comparativa del histórico? Esta acción no se puede deshacer.')) return;
    setError('');
    try {
      await apiFetch(`/otb/analyses/${id}`, { method: 'DELETE' });
      setHistory((prev) => prev.filter((a) => a.id !== id));
      setExpandedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar.');
    }
  };

  const filteredHistory = useMemo(() => {
    const fromDate = histFrom ? new Date(`${histFrom}T00:00:00`) : null;
    const toDate = histTo ? new Date(`${histTo}T00:00:00`) : null;
    return history.filter((a) => {
      if (histMonth && a.month !== histMonth) return false;
      if (fromDate || toDate) {
        const d = parseHistDate(a.date || a.createdAt);
        if (d) {
          if (fromDate && d < fromDate) return false;
          if (toDate && d > toDate) return false;
        }
      }
      return true;
    });
  }, [history, histFrom, histTo, histMonth]);

  const clearHistFilter = () => { setHistFrom(''); setHistTo(''); setHistMonth(''); };

  const kpis = useMemo(() => {
    if (!metrics) return [];
    const generalTone = metrics.general === 'Positivo' ? 'ok' : metrics.general === 'Negativo' ? 'bad' : undefined;
    return [
      { label: 'Balance general', value: metrics.general, tone: generalTone },
      { label: 'Pickup promedio', value: `${pp(metrics.avgPickup)} pp` },
      { label: 'Días ↑ / ↓ / =', value: `${metrics.up} / ${metrics.down} / ${metrics.stable}` },
      { label: 'Room pickup total', value: metrics.totalRoomPickup != null ? String(Math.round(metrics.totalRoomPickup)) : '—' },
      { label: 'Ocup. actual', value: pct(metrics.avgOcc), tone: 'ok' },
      { label: 'ADR actual', value: fmtCop(metrics.avgAdr) },
      { label: 'RevPAR actual', value: fmtCop(metrics.avgRevpar) },
    ];
  }, [metrics]);

  const renderUploadCard = (side, state, label, hint) => (
    <div className={`otb-upload-card${state?.rows?.length ? ' has-file' : ''}`}>
      <div className="otb-upload-icon">📊</div>
      <div className="otb-upload-title">{label}</div>
      <div className="otb-upload-hint">{hint}</div>
      <label className="otb-cutoff-label">Fecha de corte:</label>
      <input type="date" className="otb-cutoff-input" value={state?.cutoff ?? ''} onChange={(e) => setCutoff(side, e.target.value)} />
      <div className="otb-file-name">{state?.rows?.length ? `✅ ${state.fileName} · ${state.rows.length} fechas` : 'Sin archivo cargado'}</div>
      <label className="fin-action-btn primary" style={{ cursor: 'pointer' }}>
        📂 Seleccionar Excel
        <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files[0]) onFile(side, e.target.files[0]); e.target.value = ''; }} />
      </label>
      {state?.meta && (
        <div className="otb-meta">
          <strong>Hoja:</strong> {state.meta.sheet} · <strong>Fechas:</strong> {state.meta.dateRange}
          {state.meta.warnings?.length ? <div className="otb-meta-warn">⚠ {state.meta.warnings.join(' ')}</div> : null}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="otb-header">
        <h2>Comparativa On the Book (OTB)</h2>
        <p>Análisis de pickup diario de ocupación · Comparación por fecha de estancia</p>
      </div>

      <div className="otb-toolbar">
        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gold-dark)' }}>Hotel:</label>
        <select value={hotel} onChange={(e) => setHotel(e.target.value)}>
          {hoteles.length === 0 && <option value="">—</option>}
          {hoteles.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        {metrics && comparison && !viewingSaved && (
          <>
            {canSave && <button className="fin-action-btn primary" onClick={save} disabled={saving}>{saving ? 'Guardando…' : '💾 Guardar en histórico'}</button>}
            {saveMsg && <span style={{ fontSize: '0.8rem', color: '#2e7d32' }}>{saveMsg}</span>}
          </>
        )}
      </div>

      <div className="otb-tabs">
        <button className={`otb-tab${tab === 'upload' ? ' active' : ''}`} onClick={() => setTab('upload')}>Carga de datos</button>
        <button className={`otb-tab${tab === 'comparison' ? ' active' : ''}`} onClick={() => setTab('comparison')} disabled={!comparison}>Comparativa</button>
        <button className={`otb-tab${tab === 'charts' ? ' active' : ''}`} onClick={() => setTab('charts')} disabled={!comparison}>Gráficos</button>
        <button className={`otb-tab${tab === 'consultant' ? ' active' : ''}`} onClick={() => setTab('consultant')} disabled={!comparison}>Consultor RM</button>
        <button className={`otb-tab${tab === 'history' ? ' active' : ''}`} onClick={() => setTab('history')}>Histórico</button>
      </div>

      {error && <div className="otb-error">{error}</div>}

      {tab === 'upload' && (
        <div>
          <div className="otb-status">Cargue los dos cortes del reporte rptForecastNew y presione Calcular.</div>
          <div className="otb-upload-grid">
            {renderUploadCard('before', before, 'Corte Base', 'Excel rptForecastNew · corte anterior')}
            {renderUploadCard('after', after, 'Corte Actual', 'Excel rptForecastNew · corte más reciente')}
          </div>
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <button className="fin-action-btn primary" style={{ fontSize: '0.85rem', padding: '10px 28px' }} onClick={runComparison}>▶ Calcular comparativa</button>
          </div>
        </div>
      )}

      {tab === 'comparison' && metrics && comparison && (
        <div>
          {viewingSaved && <div className="otb-status">📁 Viendo un análisis guardado del histórico.</div>}
          <OtbTechSheet metrics={metrics} weeklyMetrics={weeklyMetrics} />
          <div style={{ marginBottom: 18 }}>
            <OtbOccVsBaseChart comparison={comparison} />
          </div>
          <KpiRow kpis={kpis} />
          <div className="fin-table-wrap">
            <table className="fin-table">
              <thead>
                <tr>
                  <th>Fecha</th><th>Ocup. base</th><th>Ocup. actual</th><th>Pickup (pp)</th>
                  <th>Habs base</th><th>Habs actual</th><th>Δ Habs</th><th>ADR actual</th><th>RevPAR actual</th><th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((r, i) => (
                  <tr key={r.stayDate || i}>
                    <td style={{ fontWeight: 600 }}>{r.stayDate || '—'}</td>
                    <td>{pct(r.occBefore)}</td>
                    <td>{pct(r.occAfter)}</td>
                    <td className={r.pickup > 0 ? 'otb-pickup-pos' : r.pickup < 0 ? 'otb-pickup-neg' : ''}>{pp(r.pickup)}</td>
                    <td>{r.roomsBefore ?? '—'}</td>
                    <td>{r.roomsAfter ?? '—'}</td>
                    <td className={r.roomPickup > 0 ? 'otb-pickup-pos' : r.roomPickup < 0 ? 'otb-pickup-neg' : ''}>{r.roomPickup != null ? (r.roomPickup > 0 ? `+${r.roomPickup}` : r.roomPickup) : '—'}</td>
                    <td>{fmtCop(r.adrAfter)}</td>
                    <td>{fmtCop(r.revparAfter)}</td>
                    <td><span className={`otb-badge ${r.status}`}>{PICKUP_LABEL[r.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'charts' && comparison && metrics && <OtbCharts comparison={comparison} metrics={metrics} />}

      {tab === 'consultant' && comparison && metrics && <OtbConsultant comparison={comparison} metrics={metrics} />}

      {tab === 'history' && (
        <div>
          <div className="otb-status">
            Análisis guardados para <strong>{hotel || '—'}</strong>
            {history.length > 0 && ` (${filteredHistory.length}${filteredHistory.length !== history.length ? ` de ${history.length}` : ''})`}.
          </div>
          <div className="otb-hist-filters">
            <label>Desde:<input type="date" value={histFrom} onChange={(e) => setHistFrom(e.target.value)} /></label>
            <label>Hasta:<input type="date" value={histTo} onChange={(e) => setHistTo(e.target.value)} /></label>
            <label>Mes:<input type="month" value={histMonth} onChange={(e) => setHistMonth(e.target.value)} /></label>
            <button className="otb-hist-btn" onClick={clearHistFilter}>✕ Limpiar</button>
          </div>
          <div className="fin-table-wrap">
            <table className="fin-table">
              <thead>
                <tr>
                  <th>Fecha análisis</th><th>Hotel</th><th>Mes</th><th>Fechas</th>
                  <th>Subieron</th><th>Bajaron</th><th>Estables</th>
                  <th>Var. Ocup</th><th>Var. ADR</th><th>Var. RevPAR</th><th>Estado</th><th></th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan={12} className="fin-empty">Sin análisis guardados para este hotel.</td></tr>
                ) : filteredHistory.length === 0 ? (
                  <tr><td colSpan={12} className="fin-empty">No hay análisis en el rango de fechas / mes seleccionado.</td></tr>
                ) : filteredHistory.map((a) => {
                  const m = a.metrics ?? {};
                  return (
                    <Fragment key={a.id}>
                      <tr>
                        <td>{(a.date || a.createdAt || '').slice(0, 10)}</td>
                        <td>{a.hotelNombre ?? hotel ?? '—'}</td>
                        <td>{monthLabelEs(a.month)}</td>
                        <td>{m.total ?? '—'}</td>
                        <td className="otb-pickup-pos">{m.up ?? '—'}</td>
                        <td className="otb-pickup-neg">{m.down ?? '—'}</td>
                        <td>{m.stable ?? '—'}</td>
                        <td className={varCls(m.avgOcc, m.avgOccBefore)}>{pct(m.avgOcc)}</td>
                        <td className={varCls(m.avgAdr, m.avgAdrBefore)}>{fmtCop(m.avgAdr)}</td>
                        <td className={varCls(m.avgRevpar, m.avgRevparBefore)}>{fmtCop(m.avgRevpar)}</td>
                        <td className={generalCls(m.general)} style={{ fontWeight: 700 }}>{m.general ?? '—'}</td>
                        <td className="otb-hist-actions">
                          <button className={`otb-hist-btn${expandedIds.has(a.id) ? ' active' : ''}`} title="Ver gráfico" onClick={() => toggleHistoryChart(a.id)}>📊</button>
                          <button className="otb-hist-btn" onClick={() => viewSaved(a.id)}>📂 Cargar</button>
                          <button className="otb-hist-btn danger" title="Eliminar" onClick={() => deleteHistory(a.id)}>✕</button>
                        </td>
                      </tr>
                      {expandedIds.has(a.id) && (
                        <tr>
                          <td colSpan={12} className="otb-hist-detail">
                            {loadingIds.has(a.id)
                              ? <div className="otb-status">⏳ Cargando gráfico…</div>
                              : chartCache[a.id]?.length
                                ? <OtbOccVsBaseChart comparison={chartCache[a.id]} />
                                : <div className="otb-status">Sin datos de ocupación en esta comparativa.</div>}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
