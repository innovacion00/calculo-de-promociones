// Módulo Simulador de Tarifas — orquestador: selector de hotel/tipo de habitación, tabs
// de canal OTA, carga/guardado de la configuración (guardado manual vía botón), modales
// "Nueva estrategia" y "Configuración de Promociones". Port de index.html
// (switchHotel/init) adaptado a estado React inmutable.
import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../lib/api.js';
import { CHANNELS_BASE, HOTEL_ROOM_TYPES } from '../../lib/simulator/channels.js';
import { emptyConfig, fromApiConfig, getRoomKey, addExtraSection } from '../../lib/simulator/config.js';
import ChannelPage from './ChannelPage.jsx';
import AddPromoModal from './AddPromoModal.jsx';
import PromoConfigModal from './PromoConfigModal.jsx';

/** @param {{ session: import('../../lib/session.js').Session }} props */
export default function SimulatorModule({ session }) {
  const [hoteles, setHoteles] = useState(/** @type {string[]} */ ([]));
  const [hotel, setHotel] = useState('');
  const [roomType, setRoomType] = useState('');
  const [channelKey, setChannelKey] = useState(CHANNELS_BASE[0].key);
  const [config, setConfig] = useState(emptyConfig());
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [addPromoOpen, setAddPromoOpen] = useState(false);
  const [promoConfigOpen, setPromoConfigOpen] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState(/** @type {Record<string, any>} */ ({}));
  const [toast, setToast] = useState('');

  const configRef = useRef(config);
  const historyRef = useRef(/** @type {any[]} */ ([]));
  configRef.current = config;

  useEffect(() => {
    apiFetch('/hoteles').then((r) => {
      const all = r.nombres ?? [];
      const visible = session.role === 'master_admin' || !session.hotelAccess?.length
        ? all : all.filter((h) => session.hotelAccess.includes(h));
      setHoteles(visible);
      if (visible.length) setHotel(visible[0]);
    }).catch(() => {});
  }, []);

  async function persistNow(hotelName, cfg) {
    if (!hotelName) return;
    setSaving(true);
    try {
      await apiFetch('/rate-config', { method: 'POST', body: JSON.stringify({ hotelId: hotelName, ...cfg }) });
      setDirty(false);
      setSaveStatus(`✓ Guardado a las ${new Date().toLocaleTimeString('es-CO')}`);
    } catch (e) {
      setSaveStatus(`⚠ Error: ${e instanceof Error ? e.message : e}`);
    } finally {
      setSaving(false);
    }
  }

  /** @param {(c: ReturnType<typeof emptyConfig>) => ReturnType<typeof emptyConfig>} updater */
  function onConfigChange(updater) {
    setConfig((prev) => updater(prev));
    setDirty(true);
  }

  function handleSaveClick() {
    persistNow(hotel, configRef.current);
  }

  function handleHotelChange(newHotel) {
    if (dirty && !window.confirm('Hay cambios sin guardar para este hotel. ¿Cambiar de hotel sin guardar? Se perderán los cambios.')) return;
    setHotel(newHotel);
  }

  // Cambio de hotel: carga la config guardada del hotel seleccionado.
  useEffect(() => {
    if (!hotel) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const rooms = HOTEL_ROOM_TYPES[hotel] || [];
      setRoomType(rooms.length ? rooms[0].name : '');
      try {
        const r = await apiFetch(`/rate-config?hotelId=${encodeURIComponent(hotel)}`);
        if (!cancelled) { setConfig(fromApiConfig(r.config)); setDirty(false); setSaveStatus(''); }
      } catch {
        if (!cancelled) { setConfig(emptyConfig()); setDirty(false); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotel]);

  function copyValue(val) {
    const text = String(Math.round(val));
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
    setToast(`✓  Copiado  ${'$ ' + Math.round(val).toLocaleString('es-CO')}`);
    setTimeout(() => setToast(''), 2200);
  }

  const roomTypes = HOTEL_ROOM_TYPES[hotel] || [];
  const roomKey = getRoomKey(hotel, roomType);
  const ch = CHANNELS_BASE.find((c) => c.key === channelKey) ?? CHANNELS_BASE[0];
  const chCommission = config.channelOverrides?.[channelKey]?.commissionPct ?? ch.commission;

  function openAddPromo() {
    if (ch.priceTravel) {
      const defSec = ch.sections[0];
      const newSec = {
        _id: undefined, title: 'NUEVA PROMOCIÓN', promoDefault: defSec?.promoDefault || 30,
        colHeaders: defSec?.colHeaders || ['Plan', 'Base', 'Promo', 'Tarifa ▼'], pairGroup: defSec?.pairGroup,
        ptMerged: true, colConfig: { showOta: true, showMobile: false, showNet: false },
        rowsSin: JSON.parse(JSON.stringify(defSec?.rowsSin || [])), rowsCon: JSON.parse(JSON.stringify(defSec?.rowsCon || [])),
      };
      onConfigChange((c) => addExtraSection(c, channelKey, { ...newSec, _id: `s${Date.now()}` }));
      return;
    }
    setAddPromoOpen(true);
  }

  if (loading && !hoteles.length) {
    return <div className="otb-status">Cargando…</div>;
  }

  return (
    <div>
      <div className="otb-header">
        <h2>Simulador de Tarifas OTA</h2>
        <p>Estrategia tarifaria · Canales OTA · Rentabilidad neta</p>
      </div>

      <div className="otb-toolbar">
        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gold-dark)' }}>Hotel:</label>
        <select value={hotel} onChange={(e) => handleHotelChange(e.target.value)}>
          {hoteles.length === 0 && <option value="">—</option>}
          {hoteles.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <button className="fin-action-btn" onClick={handleSaveClick} disabled={!dirty || saving}>💾 Guardar</button>
        <button className="fin-action-btn" onClick={() => setPromoConfigOpen(true)}>⚙ Configuración de Promociones</button>
        <span style={{ fontSize: '0.78rem', color: '#888' }}>{saving ? 'Guardando…' : dirty ? '● Cambios sin guardar' : saveStatus}</span>
      </div>

      <div className="channel-tabs">
        {CHANNELS_BASE.map((c) => (
          <button key={c.key} className={`channel-tab${c.key === channelKey ? ' active' : ''}`} onClick={() => setChannelKey(c.key)}>{c.name}</button>
        ))}
      </div>

      {loading ? (
        <div className="otb-status">Cargando configuración…</div>
      ) : (
        <ChannelPage
          ch={ch} hotel={hotel} roomType={roomType} roomTypes={roomTypes} roomKey={roomKey}
          config={config} onConfigChange={onConfigChange}
          onRoomTypeChange={setRoomType} onOpenAddPromo={openAddPromo} onCopy={copyValue}
        />
      )}

      {toast && <div className="sim-toast show">{toast}</div>}

      {addPromoOpen && (
        <AddPromoModal
          ch={ch} commission={chCommission}
          onClose={() => setAddPromoOpen(false)}
          onCreate={(colConfig) => {
            const defSec = ch.sections[0];
            const newSec = {
              _id: `s${Date.now()}`, title: 'NUEVA PROMOCIÓN', promoDefault: defSec?.promoDefault || 30,
              colHeaders: defSec?.colHeaders || ['Plan', 'Base', 'Promo', 'Tarifa ▼'], pairGroup: defSec?.pairGroup,
              ptMerged: false, colConfig,
              rows: JSON.parse(JSON.stringify(defSec?.rows || [])),
            };
            onConfigChange((c) => addExtraSection(c, channelKey, newSec));
            setAddPromoOpen(false);
          }}
        />
      )}

      {promoConfigOpen && (
        <PromoConfigModal
          hotel={hotel} roomKey={roomKey} config={config} onConfigChange={onConfigChange}
          savedSnapshot={savedSnapshot} onSaveSnapshot={(patch) => setSavedSnapshot((s) => ({ ...s, ...patch }))}
          history={historyRef.current}
          onPersist={async () => {
            await persistNow(hotel, configRef.current);
          }}
          onClose={() => setPromoConfigOpen(false)}
        />
      )}
    </div>
  );
}
