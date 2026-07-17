// Tabla de tarifas genérica (Despegar/Expedia/HotelBeds/eDreams/Brand.com/Booking.com).
// Port de renderTable() de index.html: cascada de descuentos por fila, columnas de
// resultado configurables (colConfig), alerta de tarifa mínima, copiar al portapapeles,
// reordenar filas por drag-and-drop.
import { useState } from 'react';
import { fmtCop } from '../../lib/format.js';
import { applySteps, effectiveDiscounts } from '../../lib/simulator/calc.js';

/** @param {{ ch, sec, baseRates, commission, promoDisc, roomKeyConfig, minRate, geniusPct, mobilePct, onRowsChange, onCopy }} props */
export default function RateTable({ ch, sec, baseRates, commission, promoDisc, roomKeyConfig, minRate, geniusPct, mobilePct, onRowsChange, onCopy }) {
  const isBooking = ch.key === 'booking';
  const rows = sec.rows || [];
  const colH = sec.colHeaders || [];
  const cc = sec.colConfig || {};
  const showOta = cc.showOta !== false;
  const showMobile = cc.showMobile !== false;
  const showNet = cc.showNet !== false;

  const [dragIdx, setDragIdx] = useState(/** @type {number|null} */ (null));
  const [dragOverIdx, setDragOverIdx] = useState(/** @type {number|null} */ (null));
  const [draggableIdx, setDraggableIdx] = useState(/** @type {number|null} */ (null));

  const perRow = rows.map((row, ri) => {
    const bv = baseRates[row.base] || 0;
    const discs = effectiveDiscounts(row, promoDisc, sec, ri, roomKeyConfig);
    const vals = applySteps(bv, discs);
    return { row, bv, discs, vals, otaVal: vals[vals.length - 1] };
  });
  const maxDisc = Math.max(1, ...perRow.map((r) => r.discs.length));

  const midHeaders = [];
  for (let i = 1; i < maxDisc; i++) midHeaders.push(colH[1 + i] || `Paso ${i + 1}`);

  const otaIdx = colH.length - (commission > 0 ? 2 : 1);

  function handleDrop(toIdx) {
    if (dragIdx === null || dragIdx === toIdx) return;
    const next = [...rows];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(toIdx, 0, moved);
    onRowsChange(next);
    setDragIdx(null);
    setDragOverIdx(null);
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th style={{ width: 18 }}></th>
            <th>{colH[0] || 'Plan'}</th>
            <th>{colH[1] || 'Base'}</th>
            {midHeaders.map((h, i) => <th key={i}>{h}</th>)}
            {isBooking ? (
              <>
                {showOta && <th className="col-genius">{colH[colH.length - 3] || 'GENIUS ▼'}</th>}
                {showMobile && <th className="col-mobile">{colH[colH.length - 2] || 'MOBILE ▼'}</th>}
                {commission > 0 && showNet && <th className="col-net">{colH[colH.length - 1]}</th>}
              </>
            ) : (
              <>
                {showOta && <th className="col-ota">{colH[otaIdx]}</th>}
                {commission > 0 && showNet && <th className="col-net">{colH[colH.length - 1]}</th>}
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {perRow.map(({ row, bv, discs, vals, otaVal }, ri) => {
            const pairSep = sec.pairGroup && (ri + 1) % sec.pairGroup === 0;
            return (
              <tr
                key={ri}
                className={[pairSep && 'pair-sep', dragIdx === ri && 'row-dragging'].filter(Boolean).join(' ') || undefined}
                draggable={draggableIdx === ri}
                onDragStart={() => setDragIdx(ri)}
                onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); setDraggableIdx(null); }}
                onDragOver={(e) => { if (dragIdx === null || dragIdx === ri) return; e.preventDefault(); setDragOverIdx(ri); }}
                onDragLeave={() => setDragOverIdx((v) => (v === ri ? null : v))}
                onDrop={(e) => { e.preventDefault(); handleDrop(ri); }}
              >
                <td
                  className={`row-drag-handle${dragOverIdx === ri ? ' row-drag-over' : ''}`}
                  title="Arrastrar para reordenar"
                  onMouseDown={() => setDraggableIdx(ri)}
                  onMouseUp={() => setDraggableIdx(null)}
                >⠿</td>
                <td>{row.label}</td>
                <td className="td-base">{fmtCop(bv)}</td>
                {midHeaders.map((_, i) => {
                  const stepIdx = i + 1;
                  return <td key={i} className="td-mid">{stepIdx < discs.length ? fmtCop(vals[stepIdx]) : '—'}</td>;
                })}
                {isBooking
                  ? <BookingCells vals={vals} otaVal={otaVal} commission={commission} showOta={showOta} showMobile={showMobile} showNet={showNet} geniusPct={geniusPct} mobilePct={mobilePct} minRate={minRate} onCopy={onCopy} />
                  : <GenericCells otaVal={otaVal} commission={commission} showOta={showOta} showNet={showNet} minRate={minRate} onCopy={onCopy} />}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GenericCells({ otaVal, commission, showOta, showNet, minRate, onCopy }) {
  const netVal = commission > 0 ? otaVal * (1 - commission) : null;
  const alert = minRate > 0 && otaVal <= minRate;
  return (
    <>
      {showOta && (
        <td className={`td-ota${alert ? ' td-min-alert' : ''}`} title={alert ? `⚠ Tarifa en mínimo permitido (${fmtCop(minRate)}) — Clic para copiar` : 'Clic para copiar'} onClick={() => onCopy(otaVal)}>
          {fmtCop(otaVal)}
        </td>
      )}
      {commission > 0 && netVal !== null && showNet && <td className="td-net">{fmtCop(netVal)}</td>}
    </>
  );
}

function BookingCells({ vals, otaVal, commission, showOta, showMobile, showNet, geniusPct, mobilePct, minRate, onCopy }) {
  const despPromo = vals.length >= 2 ? vals[vals.length - 2] : otaVal;
  let chainPrice = despPromo;
  let geniusVal = null, mobVal = null, netVal = null;
  if (showOta) { geniusVal = chainPrice * (1 - geniusPct / 100); chainPrice = geniusVal; }
  if (showMobile) { mobVal = chainPrice * (1 - mobilePct / 100); chainPrice = mobVal; }
  if (commission > 0 && showNet) netVal = chainPrice * (1 - commission);
  const geniusAlert = showOta && minRate > 0 && geniusVal <= minRate;
  return (
    <>
      {showOta && (
        <td className={`td-ota${geniusAlert ? ' td-min-alert' : ''}`} title={geniusAlert ? `⚠ Tarifa en mínimo permitido (${fmtCop(minRate)}) — Clic para copiar` : 'Clic para copiar'} onClick={() => onCopy(geniusVal)}>
          {fmtCop(geniusVal)}
        </td>
      )}
      {showMobile && <td className="td-mobile" title="Clic para copiar" onClick={() => onCopy(mobVal)}>{fmtCop(mobVal)}</td>}
      {commission > 0 && netVal !== null && showNet && <td className="td-net">{fmtCop(netVal)}</td>}
    </>
  );
}
