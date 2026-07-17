// Página de un canal OTA: barra de inputs (habitación/tarifa/comisión), toolbar, barra
// Genius/Mobile (solo Booking) y el grid de tarjetas de estrategia. Port de
// buildChannelPage() + renderSections() de index.html.
import { useState } from 'react';
import { fmtCop } from '../../lib/format.js';
import { getBaseRates } from '../../lib/simulator/calc.js';
import { getBaseInput, setBaseInput, getChannelOverride, setChannelOverride, resolveChannelSections, setSectionOrder } from '../../lib/simulator/config.js';
import { HOTEL_MIN_RATES } from '../../lib/simulator/channels.js';
import SectionCard from './SectionCard.jsx';

/**
 * @param {{
 *   ch: any, hotel: string, roomType: string, roomTypes: {name:string, base:number}[],
 *   roomKey: string, config: any, onConfigChange: (updater: (c:any)=>any) => void,
 *   onRoomTypeChange: (name: string) => void, onOpenAddPromo: () => void, onCopy: (v:number)=>void,
 * }} props
 */
export default function ChannelPage({ ch, hotel, roomType, roomTypes, roomKey, config, onConfigChange, onRoomTypeChange, onOpenAddPromo, onCopy }) {
  const [dragSecId, setDragSecId] = useState(/** @type {string|null} */ (null));
  const [dragOverSecId, setDragOverSecId] = useState(/** @type {string|null} */ (null));

  const override = getChannelOverride(config, ch.key);
  const commission = override.commissionPct !== undefined ? override.commissionPct : ch.commission;
  const geniusPct = override.geniusPct !== undefined ? override.geniusPct : (ch.geniusPct ?? 20);
  const mobilePct = override.mobilePct !== undefined ? override.mobilePct : (ch.mobilePct || 0);

  const currentRoom = roomTypes.find((r) => r.name === roomType);
  const inputVal = getBaseInput(config, roomKey, hotel, ch.key, currentRoom ? currentRoom.base : 240000);
  const baseRates = getBaseRates(ch, inputVal);
  const minRate = HOTEL_MIN_RATES[hotel] || 0;
  const sections = resolveChannelSections(ch.key, config);

  function handleSectionDrop(targetId) {
    if (!dragSecId || dragSecId === targetId) return;
    const ids = sections.map((s) => s._id);
    const fromIdx = ids.indexOf(dragSecId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, dragSecId);
    onConfigChange((c) => setSectionOrder(c, ch.key, ids));
    setDragSecId(null);
    setDragOverSecId(null);
  }

  return (
    <div className="channel-page">
      <div className="input-bar">
        <div className="input-group">
          <label>Tipo de habitación</label>
          <select value={roomType} onChange={(e) => onRoomTypeChange(e.target.value)}>
            {roomTypes.map((rt) => <option key={rt.name} value={rt.name}>{rt.name}</option>)}
          </select>
        </div>
        <div className="input-divider" />
        <div className="input-group">
          <label>Tarifa base mínima por noche</label>
          <input
            type="number" min={0} step={1000} autoComplete="off"
            defaultValue={inputVal} key={`base-${roomKey}-${ch.key}`}
            onChange={(e) => onConfigChange((c) => setBaseInput(c, roomKey, ch.key, parseFloat(e.target.value) || 0))}
          />
        </div>
        {ch.key !== 'brandcom' && (
          <div className="input-group">
            <label>Comisión del canal</label>
            <input
              type="number" min={0} max={100} step={1} className="commission-input"
              defaultValue={Math.round(commission * 100)} key={`comm-${hotel}-${ch.key}`}
              onChange={(e) => onConfigChange((c) => setChannelOverride(c, ch.key, { commissionPct: (parseFloat(e.target.value) || 0) / 100 }))}
            />
          </div>
        )}
        <div className="input-divider" />
        <div className="base-rates">
          {ch.baseLabels.map((lbl, i) => (
            <div className="base-rate-chip" key={lbl}>
              <span className="chip-label">{lbl}</span>
              <span className="chip-val">{fmtCop(baseRates[ch.baseKeys[i]])}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="toolbar">
        <div className="legend">
          <div className="legend-item"><div className="legend-dot" style={{ background: '#d4edda', border: '1.5px solid #1a6e3c' }} /><span><strong>Tarifa recomendada para cargar en OTA</strong></span></div>
          <div className="legend-item"><div className="legend-dot" style={{ background: '#d0e4f7', border: '1.5px solid #14427a' }} /><span><strong>Ingreso neto estimado para el hotel</strong></span></div>
        </div>
        <button className="add-promo-btn" onClick={onOpenAddPromo}>+ Crear nueva estrategia</button>
      </div>

      {ch.key === 'booking' && (
        <div className="genius-config-bar">
          <label>🔵 Booking.com — descuentos</label>
          <div className="genius-cfg-group">
            <span>Descuento Genius</span>
            <input
              type="number" min={0} max={100} step={0.5}
              defaultValue={geniusPct} key={`genius-${hotel}-${ch.key}`}
              onChange={(e) => onConfigChange((c) => setChannelOverride(c, ch.key, { geniusPct: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) }))}
            />
            <span>%</span>
          </div>
          <div className="genius-cfg-group">
            <span>Descuento Mobile</span>
            <input
              type="number" min={0} max={100} step={0.5}
              defaultValue={mobilePct} key={`mobile-${hotel}-${ch.key}`}
              onChange={(e) => onConfigChange((c) => setChannelOverride(c, ch.key, { mobilePct: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) }))}
            />
            <span>%</span>
          </div>
          <span style={{ fontSize: '.65rem', color: '#7a6500', fontStyle: 'italic' }}>GENIUS = Después promo × (1 − Genius%). MOBILE = GENIUS × (1 − Mobile%). Recalcula en tiempo real.</span>
        </div>
      )}

      <div className="sections-grid" style={{ gridTemplateColumns: ch.gridCols ? 'repeat(auto-fill,minmax(340px,1fr))' : 'repeat(auto-fill,minmax(480px,1fr))' }}>
        {sections.map((sec) => (
          <SectionCard
            key={sec._id}
            ch={ch} sec={sec} chKey={ch.key} baseRates={baseRates} commission={commission}
            hotel={hotel} roomKey={roomKey} config={config} onConfigChange={onConfigChange}
            minRate={minRate} geniusPct={geniusPct} mobilePct={mobilePct} onCopy={onCopy}
            isDragOver={dragOverSecId === sec._id}
            dragProps={{
              onDragStart: () => setDragSecId(sec._id),
              onDragEnd: () => { setDragSecId(null); setDragOverSecId(null); },
              onDragOver: (e) => { if (!dragSecId || dragSecId === sec._id) return; e.preventDefault(); setDragOverSecId(sec._id); },
              onDragLeave: () => setDragOverSecId((v) => (v === sec._id ? null : v)),
              onDrop: (e) => { e.preventDefault(); handleSectionDrop(sec._id); },
            }}
          />
        ))}
      </div>
    </div>
  );
}
