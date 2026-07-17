// Modal "Nueva estrategia": elige qué columnas de resultado mostrar y crea una sección
// nueva (vacía, plantillada desde la primera sección por defecto del canal). Port de
// showAddPromoModal/confirmAddPromo/_createNewSection de index.html. Price Travel no usa
// este modal (se crea directo, ver ChannelPage/SimulatorModule).
import { useState } from 'react';

/** Opciones de columna seleccionables para un canal (igual a _addPromoColOptions). */
export function addPromoColOptions(ch, commission) {
  const defSec = ch.sections[0];
  const colH = defSec?.colHeaders || [];
  const isBk = ch.key === 'booking';
  const opts = [];
  if (isBk) {
    opts.push({ key: 'ota', label: colH[colH.length - 3] || 'GENIUS ▼', color: 'var(--green)' });
    opts.push({ key: 'mobile', label: colH[colH.length - 2] || 'MOBILE ▼', color: '#7c3aed' });
    if (commission > 0) opts.push({ key: 'net', label: colH[colH.length - 1] || 'Ingreso ▼', color: 'var(--blue)' });
  } else {
    const otaIdx = colH.length - (commission > 0 ? 2 : 1);
    opts.push({ key: 'ota', label: colH[otaIdx] || 'Sugerida OTA ▼', color: 'var(--green)' });
    if (commission > 0) opts.push({ key: 'net', label: colH[colH.length - 1] || 'Ingreso ▼', color: 'var(--blue)' });
  }
  return opts;
}

/** @param {{ ch: any, commission: number, onClose: () => void, onCreate: (colConfig: object) => void }} props */
export default function AddPromoModal({ ch, commission, onClose, onCreate }) {
  const opts = addPromoColOptions(ch, commission);
  const [checked, setChecked] = useState(() => Object.fromEntries(opts.map((o) => [o.key, true])));

  function confirm() {
    const colConfig = { showOta: false, showMobile: false, showNet: false };
    Object.keys(checked).forEach((k) => {
      if (checked[k]) colConfig[`show${k.charAt(0).toUpperCase()}${k.slice(1)}`] = true;
    });
    if (!colConfig.showOta && !colConfig.showMobile && !colConfig.showNet) {
      alert('Selecciona al menos un descuento para continuar.');
      return;
    }
    onCreate(colConfig);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">+ Nueva estrategia</div>
        <div className="modal-sub">Canal: {ch.name} — selecciona los descuentos a mostrar</div>
        <div className="add-promo-col-list">
          {opts.map((o) => (
            <label key={o.key} className="add-promo-col-item" style={{ borderColor: checked[o.key] ? o.color : undefined }}>
              <input
                type="checkbox" checked={!!checked[o.key]}
                style={{ accentColor: o.color }}
                onChange={(e) => setChecked((c) => ({ ...c, [o.key]: e.target.checked }))}
              />
              <span style={{ color: o.color, fontWeight: 700 }}>{o.label}</span>
            </label>
          ))}
        </div>
        <div className="modal-actions">
          <button className="fin-action-btn" onClick={onClose}>Cancelar</button>
          <button className="fin-action-btn primary" onClick={confirm}>Crear estrategia</button>
        </div>
      </div>
    </div>
  );
}
