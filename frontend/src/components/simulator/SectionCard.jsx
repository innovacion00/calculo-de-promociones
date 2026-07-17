// Tarjeta de una estrategia (sección) dentro de un canal. Port de buildSectionCard() +
// buildCfgPanel() de index.html: cabecera (título editable, %promo, %país, editar/copiar/
// eliminar), panel de edición de filas (label, %plan, %país, borrar, añadir plan) y la
// tabla de resultados (genérica o Price Travel).
import { useState } from 'react';
import RateTable from './RateTable.jsx';
import PriceTravelTable from './PriceTravelTable.jsx';
import {
  getPromoVal, getPaisPct, getPlanPct, setPromoVal, setPaisPct, setPlanPct, setTitle,
  setSectionRows, setSectionRowsPT, removeSection, copySection,
} from '../../lib/simulator/config.js';

/**
 * @param {{
 *   ch: any, sec: any, chKey: string, baseRates: Record<string, number>, commission: number,
 *   hotel: string, roomKey: string, config: any, onConfigChange: (updater: (c: any) => any) => void,
 *   minRate: number, geniusPct: number, mobilePct: number, onCopy: (v: number) => void,
 *   dragProps: object, isDragOver: boolean,
 * }} props
 */
export default function SectionCard({ ch, sec, chKey, baseRates, commission, hotel, roomKey, config, onConfigChange, minRate, geniusPct, mobilePct, onCopy, dragProps, isDragOver }) {
  const [cfgOpen, setCfgOpen] = useState(false);
  const [draggable, setDraggable] = useState(false);

  const roomKeyConfig = {
    planPcts: config.rawPlanPcts[roomKey], hotelPlanPcts: config.rawPlanPcts[hotel],
    paisPcts: config.rawPaisPcts[roomKey], hotelPaisPcts: config.rawPaisPcts[hotel],
  };
  const promoVal = getPromoVal(config, roomKey, hotel, sec);
  const allRows = sec.ptMerged ? [...(sec.rowsSin || []), ...(sec.rowsCon || [])] : (sec.rows || []);
  const hasPais = allRows.some((r) => r.promoAdd);

  const isPtFull = sec.ptMerged; // ancho completo salvo en PT_NON_FULL_HOTELS (decide el padre)

  return (
    <div
      className={`section-card${isPtFull ? ' pt-full' : ''}${isDragOver ? ' drag-over' : ''}`}
      draggable={draggable}
      {...dragProps}
    >
      <div className="section-header">
        <div
          className="drag-handle"
          title="Arrastrar para reordenar"
          onMouseDown={() => setDraggable(true)}
          onMouseUp={() => setDraggable(false)}
        >⠿</div>
        <div style={{ width: 4, height: 13, background: 'var(--gold)', borderRadius: 2, flexShrink: 0 }} />
        <span
          className="section-title"
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onConfigChange((c) => setTitle(c, sec._id, e.currentTarget.textContent.trim()))}
        >
          {sec.title}
        </span>
        <div className="promo-ctrl">
          <label>% Promo</label>
          <input
            type="number" className="promo-input" min={0} max={100} step={1}
            defaultValue={promoVal}
            key={`promo-${roomKey}-${sec._id}`}
            onChange={(e) => onConfigChange((c) => setPromoVal(c, roomKey, sec._id, parseFloat(e.target.value) || 0))}
          />
          <span className="promo-pct">%</span>
        </div>
        {hasPais && (
          <div className="promo-ctrl">
            <label>{chKey === 'expedia' ? 'MEMBERS %' : 'PAÍS %'}</label>
            <input
              type="number" className="promo-input" min={0} max={100} step={1}
              defaultValue={getPaisPct(config, roomKey, hotel, sec._id)}
              key={`pais-${roomKey}-${sec._id}`}
              onChange={(e) => onConfigChange((c) => setPaisPct(c, roomKey, sec._id, parseFloat(e.target.value) || 0))}
            />
            <span className="promo-pct">%</span>
          </div>
        )}
        <button className="icon-btn" title="Editar planes" onClick={() => setCfgOpen((v) => !v)}>✏</button>
        <button className="icon-btn copy" title="Copiar estrategia" onClick={() => onConfigChange((c) => copySection(c, chKey, sec))}>📋</button>
        <button
          className="icon-btn del" title="Eliminar promoción"
          onClick={() => {
            if (!window.confirm(`¿Está seguro de eliminar la promoción "${sec.title}"?`)) return;
            onConfigChange((c) => removeSection(c, chKey, sec._id));
          }}
        >✕</button>
      </div>

      {cfgOpen && (
        <CfgPanel
          ch={ch} sec={sec} config={config} roomKey={roomKey} hotel={hotel}
          onConfigChange={onConfigChange}
        />
      )}

      {sec.ptMerged
        ? <PriceTravelTable sec={sec} baseRates={baseRates} promoDisc={promoVal / 100} roomKeyConfig={roomKeyConfig} minRate={minRate} onCopy={onCopy} />
        : (
          <RateTable
            ch={ch} sec={sec} baseRates={baseRates} commission={commission} promoDisc={promoVal / 100}
            roomKeyConfig={roomKeyConfig} minRate={minRate} geniusPct={geniusPct} mobilePct={mobilePct}
            onCopy={onCopy}
            onRowsChange={(rows) => onConfigChange((c) => setSectionRows(c, sec._id, rows))}
          />
        )}
    </div>
  );
}

function makeNewRow(baseKey, fallbackDiscounts) {
  const discounts = Array.isArray(fallbackDiscounts) && fallbackDiscounts.length > 0 ? [...fallbackDiscounts] : [0];
  return { label: 'Nuevo Plan', base: baseKey, discounts, planPct: 0 };
}

function CfgPanel({ ch, sec, config, roomKey, hotel, onConfigChange }) {
  const [pickerFor, setPickerFor] = useState(/** @type {'rows'|'rowsSin'|null} */ (null));

  function updateRows(rowsKey, nextRows, pairedKey, pairedRows) {
    if (sec.ptMerged) {
      const nextSin = rowsKey === 'rowsSin' ? nextRows : (pairedKey === 'rowsSin' ? pairedRows : sec.rowsSin);
      const nextCon = rowsKey === 'rowsCon' ? nextRows : (pairedKey === 'rowsCon' ? pairedRows : sec.rowsCon);
      onConfigChange((c) => setSectionRowsPT(c, sec._id, nextSin, nextCon));
    } else {
      onConfigChange((c) => setSectionRows(c, sec._id, nextRows));
    }
  }

  function RowList({ rows, label, rowsKey, pairedRows, pairedKey }) {
    return (
      <>
        {label && <div className="cfg-group-label">{label}</div>}
        {rows.map((row, ri) => (
          <div className="cfg-row" key={ri}>
            <div className="cfg-row-label">
              <input
                type="text" defaultValue={row.label} key={`${roomKey}-${sec._id}-${rowsKey}-${ri}`}
                onChange={(e) => {
                  const next = [...rows];
                  next[ri] = { ...next[ri], label: e.target.value };
                  let nextPaired = pairedRows;
                  if (pairedRows && pairedRows[ri]) {
                    nextPaired = [...pairedRows];
                    nextPaired[ri] = { ...nextPaired[ri], label: e.target.value };
                  }
                  updateRows(rowsKey, next, pairedKey, nextPaired);
                }}
              />
            </div>
            {row.discounts && row.discounts.length > 1 && (
              <div className="cfg-pct">
                <input
                  type="number" min={0} max={100} step={1}
                  defaultValue={Math.round(getPlanPct(config, roomKey, hotel, sec._id, ri, row.planPct ?? row.discounts[0] * 100))}
                  onChange={(e) => onConfigChange((c) => setPlanPct(c, roomKey, sec._id, ri, parseFloat(e.target.value) || 0))}
                />
                <span>%</span>
              </div>
            )}
            <label className="cfg-pais" title="Aplicar porcentaje de promoción del país a este plan">
              <input
                type="checkbox" defaultChecked={!!row.promoAdd}
                onChange={(e) => {
                  const val = e.target.checked ? 0.05 : 0;
                  const next = [...rows];
                  next[ri] = { ...next[ri], promoAdd: val };
                  let nextPaired = pairedRows;
                  if (pairedRows && pairedRows[ri] !== undefined) {
                    nextPaired = [...pairedRows];
                    nextPaired[ri] = { ...nextPaired[ri], promoAdd: val };
                  }
                  updateRows(rowsKey, next, pairedKey, nextPaired);
                }}
              />
              % País
            </label>
            <button
              className="icon-btn del"
              onClick={() => {
                const next = rows.filter((_, i) => i !== ri);
                let nextPaired = pairedRows;
                if (pairedRows && pairedRows[ri] !== undefined) nextPaired = pairedRows.filter((_, i) => i !== ri);
                updateRows(rowsKey, next, pairedKey, nextPaired);
              }}
            >✕</button>
          </div>
        ))}
      </>
    );
  }

  if (sec.ptMerged) {
    const sinOptions = ch.baseKeys
      .map((k, i) => ({ key: k, label: ch.baseLabels[i], factor: ch.baseFactors[i] }))
      .filter((o) => o.factor !== null && !o.key.endsWith('C'));
    const options = sinOptions.length ? sinOptions : [{ key: 'std', label: 'Estándar SIN COMI' }, { key: 'nr', label: 'No reembolsable SIN COMI' }];
    return (
      <div className="cfg-panel open">
        <RowList rows={sec.rowsSin || []} label="SIN COMISIÓN" rowsKey="rowsSin" pairedRows={sec.rowsCon} pairedKey="rowsCon" />
        <div style={{ position: 'relative' }}>
          <button className="cfg-add-btn" onClick={() => setPickerFor((v) => (v === 'rowsSin' ? null : 'rowsSin'))}>+ Añadir plan tarifario</button>
          {pickerFor === 'rowsSin' && (
            <PlanPicker options={options} onSelect={(key) => {
              const fallbackSin = (sec.rowsSin && sec.rowsSin[0]?.discounts) || [0, 0];
              const fallbackCon = (sec.rowsCon && sec.rowsCon[0]?.discounts) || [0, 0];
              const nextSin = [...(sec.rowsSin || []), makeNewRow(key, fallbackSin)];
              const nextCon = [...(sec.rowsCon || []), makeNewRow(`${key}C`, fallbackCon)];
              onConfigChange((c) => setSectionRowsPT(c, sec._id, nextSin, nextCon));
              setPickerFor(null);
            }} onClose={() => setPickerFor(null)} />
          )}
        </div>
        <RowList rows={sec.rowsCon || []} label="CON COMISIÓN" rowsKey="rowsCon" pairedRows={sec.rowsSin} pairedKey="rowsSin" />
      </div>
    );
  }

  const planOptions = ch.baseKeys.map((k, i) => ({ key: k, label: ch.baseLabels[i] }));
  return (
    <div className="cfg-panel open">
      <RowList rows={sec.rows || []} label="" rowsKey="rows" />
      <div style={{ position: 'relative' }}>
        <button className="cfg-add-btn" onClick={() => setPickerFor((v) => (v === 'rows' ? null : 'rows'))}>+ Añadir plan tarifario</button>
        {pickerFor === 'rows' && (
          <PlanPicker options={planOptions} onSelect={(key) => {
            const fallbackDiscounts = (sec.rows && sec.rows[0]?.discounts) || [0, 0];
            const next = [...(sec.rows || []), makeNewRow(key, fallbackDiscounts)];
            onConfigChange((c) => setSectionRows(c, sec._id, next));
            setPickerFor(null);
          }} onClose={() => setPickerFor(null)} />
        )}
      </div>
    </div>
  );
}

function PlanPicker({ options, onSelect, onClose }) {
  return (
    <div className="cfg-plan-picker">
      {options.map((o) => (
        <button key={o.key} className="cfg-plan-picker-item" onClick={() => onSelect(o.key)}>{o.label}</button>
      ))}
      <button className="cfg-plan-picker-item cfg-plan-picker-close" onClick={onClose}>Cancelar</button>
    </div>
  );
}
