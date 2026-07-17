// Vista de Price Travel (sin/con comisión). Port de renderPTMerged() de index.html:
// caja comparativa STD vs NR + dos tablas lado a lado (CON COMISIÓN ÷0.75 y SIN COMISIÓN).
import { fmtCop } from '../../lib/format.js';
import { applySteps, effectiveDiscounts } from '../../lib/simulator/calc.js';

/** @param {{ sec, baseRates, promoDisc, roomKeyConfig, minRate, onCopy }} props */
export default function PriceTravelTable({ sec, baseRates, promoDisc, roomKeyConfig, minRate, onCopy }) {
  const sinRows = sec.rowsSin || [];
  const stdRow = sinRows.find((r) => r.base === 'std');
  const nrRow = sinRows.find((r) => r.base === 'nr');

  let comparison = null;
  if (stdRow && nrRow) {
    const stdIdx = sinRows.indexOf(stdRow);
    const nrIdx = sinRows.indexOf(nrRow);
    const stdVals = applySteps(baseRates.std || 0, effectiveDiscounts(stdRow, promoDisc, sec, stdIdx, roomKeyConfig));
    const nrVals = applySteps(baseRates.nr || 0, effectiveDiscounts(nrRow, promoDisc, sec, nrIdx, roomKeyConfig));
    const stdTar = stdVals[stdVals.length - 1];
    const nrTar = nrVals[nrVals.length - 1];
    const diff = stdTar > 0 ? ((nrTar / stdTar) - 1) * 100 : 0;
    const sinStdC = applySteps(baseRates.stdC || 0, effectiveDiscounts({ ...stdRow, base: 'stdC' }, promoDisc, sec, stdIdx, roomKeyConfig));
    const sinNrC = applySteps(baseRates.nrC || 0, effectiveDiscounts({ ...nrRow, base: 'nrC' }, promoDisc, sec, nrIdx, roomKeyConfig));
    comparison = { stdTar, nrTar, diff, stdC: sinStdC[sinStdC.length - 1], nrC: sinNrC[sinNrC.length - 1] };
  }

  return (
    <div className="pt-merged-body">
      {comparison && (
        <div className="pt-comparison">
          <div className="pt-cmp-item"><div className="pt-cmp-label">STD sin comi</div><div className="pt-cmp-val">{fmtCop(comparison.stdTar)}</div></div>
          <div className="pt-cmp-item"><div className="pt-cmp-label">NR sin comi</div><div className="pt-cmp-val">{fmtCop(comparison.nrTar)}</div></div>
          <div className="pt-cmp-item"><div className="pt-cmp-label">Diferencia</div><div className="pt-cmp-diff">{comparison.diff.toFixed(1)}%</div></div>
          <div className="pt-cmp-item"><div className="pt-cmp-label">STD con comi</div><div className="pt-cmp-val">{fmtCop(comparison.stdC)}</div></div>
          <div className="pt-cmp-item"><div className="pt-cmp-label">NR con comi</div><div className="pt-cmp-val">{fmtCop(comparison.nrC)}</div></div>
        </div>
      )}
      <div className="pt-tables">
        <SubTable rows={sec.rowsCon || []} sec={sec} baseRates={baseRates} promoDisc={promoDisc} roomKeyConfig={roomKeyConfig} label="CON COMISIÓN (÷0.75)" applyMinCheck minRate={minRate} onCopy={onCopy} />
        <SubTable rows={sec.rowsSin || []} sec={sec} baseRates={baseRates} promoDisc={promoDisc} roomKeyConfig={roomKeyConfig} label="SIN COMISIÓN" applyMinCheck={false} minRate={minRate} onCopy={onCopy} />
      </div>
    </div>
  );
}

function SubTable({ rows, sec, baseRates, promoDisc, roomKeyConfig, label, applyMinCheck, minRate, onCopy }) {
  return (
    <div>
      <div className="pt-sub-label">{label}</div>
      <table>
        <thead>
          <tr><th>Plan</th><th>Base</th><th className="col-ota">Tarifa ▼</th></tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const bv = baseRates[row.base] || 0;
            const vals = applySteps(bv, effectiveDiscounts(row, promoDisc, sec, ri, roomKeyConfig));
            const tarVal = vals[vals.length - 1];
            const alert = applyMinCheck && minRate > 0 && tarVal <= minRate;
            const pairSep = sec.pairGroup && (ri + 1) % sec.pairGroup === 0;
            return (
              <tr key={ri} className={pairSep ? 'pair-sep' : undefined}>
                <td>{row.label}</td>
                <td className="td-base">{fmtCop(bv)}</td>
                <td className={`td-ota${alert ? ' td-min-alert' : ''}`} title={alert ? `⚠ Tarifa en mínimo permitido (${fmtCop(minRate)}) — Clic para copiar` : 'Clic para copiar'} onClick={() => onCopy(tarVal)}>
                  {fmtCop(tarVal)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
