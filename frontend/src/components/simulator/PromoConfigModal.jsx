// Modal "Configuración de Promociones": auditoría cruzada por canal (qué cambió desde el
// último guardado explícito), historial de cambios de la sesión y export a Excel. Port de
// openPromoConfig/pcfgRenderChannel/pcfgSaveHotel/pcfgExportExcel de index.html.
// `savedSnapshot` es el "estado guardado" de referencia (solo en memoria, como en el
// original — no se persiste aparte de la config real en Mongo).
import { useState } from 'react';
import * as XLSX from 'xlsx';
import { CHANNELS_BASE } from '../../lib/simulator/channels.js';
import { getPromoVal, getPaisPct, getPlanPct, setPromoVal, setPaisPct, setPlanPct, resolveChannelSections } from '../../lib/simulator/config.js';

const DOT_COLORS = { pending: '#f0a500', saved: '#1a6e3c', inherited: '#ccc' };

function promoStatus(config, snap, roomKey, hotel, sec) {
  const cur = getPromoVal(config, roomKey, hotel, sec);
  if (!snap || snap.promoValsMap?.[sec._id] === undefined) return 'inherited';
  return snap.promoValsMap[sec._id] === cur ? 'saved' : 'pending';
}
function planStatus(config, snap, roomKey, sec, ri) {
  const key = `${sec._id}_${ri}`;
  const cur = config.rawPlanPcts?.[roomKey]?.[key];
  if (cur === undefined) return 'inherited';
  if (!snap) return 'pending';
  return snap.planPcts?.[key] === cur ? 'saved' : 'pending';
}
function paisStatus(config, snap, roomKey, sec) {
  const cur = config.rawPaisPcts?.[roomKey]?.[sec._id];
  if (cur === undefined) return 'inherited';
  if (!snap) return 'pending';
  return snap.paisPcts?.[sec._id] === cur ? 'saved' : 'pending';
}

function snapshotRoomKey(config, roomKey) {
  const promoValsMap = {};
  CHANNELS_BASE.forEach((ch) => resolveChannelSections(ch.key, config).forEach((sec) => {
    const v = config.promoVals?.[sec._id]?.[roomKey];
    if (v !== undefined) promoValsMap[sec._id] = v;
  }));
  return {
    promoValsMap,
    planPcts: { ...(config.rawPlanPcts?.[roomKey] || {}) },
    paisPcts: { ...(config.rawPaisPcts?.[roomKey] || {}) },
  };
}

/**
 * @param {{
 *   hotel: string, roomKey: string, config: any, onConfigChange: (updater:(c:any)=>any)=>void,
 *   savedSnapshot: any, onSaveSnapshot: (snap:any)=>void, history: any[], onPersist: () => Promise<void>,
 *   onClose: () => void,
 * }} props
 */
export default function PromoConfigModal({ hotel, roomKey, config, onConfigChange, savedSnapshot, onSaveSnapshot, history, onPersist, onClose }) {
  const [activeChKey, setActiveChKey] = useState(CHANNELS_BASE[0].key);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [footStatus, setFootStatus] = useState('');
  const ch = CHANNELS_BASE.find((c) => c.key === activeChKey);
  const sections = resolveChannelSections(activeChKey, config);
  const snap = savedSnapshot[roomKey] || savedSnapshot[hotel];

  const pushHistory = (entry) => { history.push({ ts: new Date().toLocaleString('es-CO'), hotel, ...entry }); };

  async function handleSave() {
    onSaveSnapshot({ [roomKey]: snapshotRoomKey(config, roomKey) });
    await onPersist();
    setFootStatus(`✓ Guardado para ${hotel} — ${new Date().toLocaleTimeString('es-CO')}`);
  }

  async function handleSaveAll() {
    // "Global": marca guardado el snapshot vigente; la persistencia real en Mongo sigue
    // siendo por hotel activo (igual que pcfgGlobalSave del original, que también solo
    // hace saveHotelRateConfig(currentHotel) pese al nombre "global").
    onSaveSnapshot({ [roomKey]: snapshotRoomKey(config, roomKey) });
    await onPersist();
    setFootStatus(`✓ Todos los hoteles guardados — ${new Date().toLocaleTimeString('es-CO')}`);
  }

  function exportExcel() {
    const wb = XLSX.utils.book_new();
    CHANNELS_BASE.forEach((c) => {
      const data = [['Sección', '% Promo', 'Estrategia', '% Plan', '% País', 'Estado']];
      const secs = resolveChannelSections(c.key, config);
      secs.forEach((sec) => {
        const pv = getPromoVal(config, roomKey, hotel, sec);
        const rows = sec.rows || (sec.ptMerged ? [...(sec.rowsSin || []), ...(sec.rowsCon || [])] : []);
        if (!rows.length) { data.push([sec.title, `${pv}%`, '', '', '', promoStatus(config, snap, roomKey, hotel, sec)]); return; }
        rows.forEach((row, ri) => {
          const planV = (row.discounts && row.discounts.length > 1) ? `${Math.round(getPlanPct(config, roomKey, hotel, sec._id, ri, row.planPct ?? row.discounts[0] * 100))}%` : '';
          const paisV = row.promoAdd ? `${getPaisPct(config, roomKey, hotel, sec._id)}%` : '';
          const st = [planStatus(config, snap, roomKey, sec, ri), row.promoAdd ? paisStatus(config, snap, roomKey, sec) : null].filter(Boolean).includes('pending') ? 'pendiente' : 'guardado';
          data.push([ri === 0 ? sec.title : '', ri === 0 ? `${pv}%` : '', row.label, planV, paisV, st]);
        });
      });
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, c.name.substring(0, 31));
    });
    if (history.length) {
      const hd = [['Hora', 'Hotel', 'Canal', 'Sección', 'Campo', 'Anterior', 'Nuevo']];
      history.forEach((r) => hd.push([r.ts, r.hotel, r.canal, r.seccion, r.campo, `${r.viejo}%`, `${r.nuevo}%`]));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(hd), 'Historial');
    }
    XLSX.writeFile(wb, `config_promociones_${hotel.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="pcfg-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pcfg-head">
          <div>
            <div className="modal-title">⚙ Configuración de Promociones</div>
            <div className="modal-sub" id="pcfg-hotel-sub">Configurando para: {hotel}</div>
          </div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="pcfg-ch-tabs">
          {CHANNELS_BASE.map((c) => (
            <button key={c.key} className={`pcfg-ch-tab${c.key === activeChKey ? ' active' : ''}`} onClick={() => setActiveChKey(c.key)}>{c.name}</button>
          ))}
        </div>

        <div className="pcfg-body">
          {sections.map((sec) => {
            const promoSt = promoStatus(config, snap, roomKey, hotel, sec);
            const promoVal = getPromoVal(config, roomKey, hotel, sec);
            const allRows = sec.rows || (sec.ptMerged ? [...(sec.rowsSin || []), ...(sec.rowsCon || [])] : []);
            const hasPlan = allRows.some((r) => r.discounts && r.discounts.length > 1);
            const hasPais = allRows.some((r) => r.promoAdd);
            return (
              <div className="pcfg-sec" key={sec._id}>
                <div className="pcfg-sec-head">
                  <span className="pcfg-sec-title">{sec.title}</span>
                  <div className="pcfg-promo-field">
                    <label>% Promo</label>
                    <input
                      type="number" min={0} max={100} step={1}
                      className={`pcfg-num${promoSt !== 'inherited' ? ` is-${promoSt}` : ''}`}
                      defaultValue={promoVal} key={`${roomKey}-${sec._id}`}
                      onChange={(e) => {
                        const nv = parseFloat(e.target.value) || 0;
                        pushHistory({ canal: ch.name, seccion: sec.title, campo: '% Promo', viejo: promoVal, nuevo: nv });
                        onConfigChange((c) => setPromoVal(c, roomKey, sec._id, nv));
                      }}
                    />
                    <span>%</span>
                    <span className="pcfg-sdot" style={{ background: DOT_COLORS[promoSt] }} title={promoSt} />
                  </div>
                </div>
                {allRows.length > 0 && (hasPlan || hasPais) && (
                  <table className="pcfg-rows-table">
                    <thead>
                      <tr>
                        <th>Estrategia</th>
                        {hasPlan && <th>% Plan</th>}
                        {hasPais && <th>% País</th>}
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allRows.map((row, ri) => {
                        const isPaisRow = !!row.promoAdd;
                        const hasPlanRow = row.discounts && row.discounts.length > 1;
                        const planSt = hasPlanRow ? planStatus(config, snap, roomKey, sec, ri) : null;
                        const paisSt = isPaisRow ? paisStatus(config, snap, roomKey, sec) : null;
                        const overall = [planSt, paisSt].filter(Boolean).some((s) => s === 'pending') ? 'pending'
                          : [planSt, paisSt].filter(Boolean).some((s) => s === 'saved') ? 'saved' : 'inherited';
                        return (
                          <tr key={ri}>
                            <td className="pcfg-row-label">{row.label}{isPaisRow && <span className="pcfg-pais-badge">país</span>}</td>
                            {hasPlan && (
                              <td>
                                {hasPlanRow ? (
                                  <>
                                    <input
                                      type="number" min={0} max={100} step={1}
                                      className={`pcfg-num${planSt !== 'inherited' ? ` is-${planSt}` : ''}`}
                                      defaultValue={Math.round(getPlanPct(config, roomKey, hotel, sec._id, ri, row.planPct ?? row.discounts[0] * 100))}
                                      key={`${roomKey}-${sec._id}-plan-${ri}`}
                                      onChange={(e) => {
                                        const old = getPlanPct(config, roomKey, hotel, sec._id, ri, row.planPct ?? row.discounts[0] * 100);
                                        const nv = parseFloat(e.target.value) || 0;
                                        pushHistory({ canal: ch.name, seccion: sec.title, campo: `% Plan · ${row.label}`, viejo: Math.round(old), nuevo: nv });
                                        onConfigChange((c) => setPlanPct(c, roomKey, sec._id, ri, nv));
                                      }}
                                    />%
                                  </>
                                ) : <span className="pcfg-dash">—</span>}
                              </td>
                            )}
                            {hasPais && (
                              <td>
                                {isPaisRow ? (
                                  <>
                                    <input
                                      type="number" min={0} max={100} step={1}
                                      className={`pcfg-num${paisSt !== 'inherited' ? ` is-${paisSt}` : ''}`}
                                      defaultValue={getPaisPct(config, roomKey, hotel, sec._id)}
                                      key={`${roomKey}-${sec._id}-pais`}
                                      onChange={(e) => {
                                        const old = getPaisPct(config, roomKey, hotel, sec._id);
                                        const nv = parseFloat(e.target.value) || 0;
                                        pushHistory({ canal: ch.name, seccion: sec.title, campo: '% País', viejo: old, nuevo: nv });
                                        onConfigChange((c) => setPaisPct(c, roomKey, sec._id, nv));
                                      }}
                                    />%
                                  </>
                                ) : <span className="pcfg-dash">—</span>}
                              </td>
                            )}
                            <td><span className="pcfg-sdot" style={{ background: DOT_COLORS[overall] }} title={overall} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>

        {historyOpen && (
          <div className="pcfg-hist-wrap open">
            {history.length === 0 ? (
              <p className="pcfg-hist-empty">No hay cambios registrados en esta sesión.</p>
            ) : (
              <table className="pcfg-hist-table">
                <thead><tr><th>Hora</th><th>Hotel</th><th>Canal</th><th>Sección</th><th>Campo</th><th>Anterior</th><th>Nuevo</th></tr></thead>
                <tbody>
                  {[...history].reverse().slice(0, 100).map((r, i) => (
                    <tr key={i}>
                      <td>{r.ts}</td><td>{r.hotel}</td><td>{r.canal}</td><td>{r.seccion}</td><td>{r.campo}</td>
                      <td style={{ color: '#c00' }}>{r.viejo}%</td><td style={{ color: '#1a6e3c' }}>{r.nuevo}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <div className="pcfg-foot">
          <span id="pcfg-foot-status">{footStatus}</span>
          <div className="pcfg-foot-actions">
            <button className="fin-action-btn" onClick={() => setHistoryOpen((v) => !v)}>🕘 Historial</button>
            <button className="fin-action-btn" onClick={exportExcel}>📊 Exportar Excel</button>
            <button className="fin-action-btn" onClick={handleSave}>💾 Guardar</button>
            <button className="fin-action-btn primary" onClick={handleSaveAll}>💾 Guardar todo</button>
          </div>
        </div>
      </div>
    </div>
  );
}
