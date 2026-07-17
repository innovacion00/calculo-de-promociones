// Consultor RM (recomendaciones basadas en reglas). Port de otbRenderRMRecommendations.
import { generateRMRecommendations } from '../../lib/otb/rmConsultant.js';
import { useMemo } from 'react';

const DIAG = {
  positive: { cls: 'positive', icon: '✅' },
  negative: { cls: 'negative', icon: '🚨' },
  mixed: { cls: 'mixed', icon: '⚠' },
  stable: { cls: 'stable', icon: '📋' },
};

function DateCard({ d, variant }) {
  return (
    <div className={`otb-date-card ${variant}`}>
      <div className="otb-date-card-title">{d.date}</div>
      <div className="otb-date-card-reason">{d.reason}</div>
      <div className="otb-date-card-metrics">
        {d.occ != null && <span>🏨 Occ: <strong>{d.occ}%</strong></span>}
        {d.roomPickup != null && <span>🛏 Pickup: <strong>{d.roomPickup > 0 ? '+' : ''}{d.roomPickup} habs</strong></span>}
        {d.velocity != null && <span>⚡ Vel: <strong>{typeof d.velocity === 'number' ? d.velocity.toFixed(2) : d.velocity}</strong></span>}
      </div>
      <ul className="otb-date-card-actions">
        {(d.actions || []).map((a, i) => <li key={i}>{a}</li>)}
      </ul>
    </div>
  );
}

/** @param {{ comparison: any[], metrics: any }} props */
export default function OtbConsultant({ comparison, metrics }) {
  const recs = useMemo(() => generateRMRecommendations(metrics, comparison || []), [comparison, metrics]);
  const diag = DIAG[recs.generalDiagnosis.generalClass] ?? DIAG.stable;
  const priGroups = { high: [], medium: [], low: [] };
  recs.priorityActions.forEach((p) => { if (priGroups[p.priority]) priGroups[p.priority].push(p); });
  const priCfg = [
    { key: 'high', label: '🔴 Alta' }, { key: 'medium', label: '🟠 Media' }, { key: 'low', label: '⚪ Baja' },
  ];

  return (
    <div>
      <div className={`otb-diag ${diag.cls}`}>
        <div className="otb-diag-title">{diag.icon} DIAGNÓSTICO GENERAL</div>
        <div className="otb-diag-text">{recs.generalDiagnosis.text}</div>
        {metrics && (
          <div className="otb-diag-chips">
            {metrics.avgPickup != null && <span>Pickup promedio: {typeof metrics.avgPickup === 'number' ? metrics.avgPickup.toFixed(2) : metrics.avgPickup} pp</span>}
            {metrics.totalRoomPickup != null && <span>Pickup habs: {Math.round(metrics.totalRoomPickup)}</span>}
            {metrics.total != null && <span>Días analizados: {metrics.total}</span>}
          </div>
        )}
      </div>

      <div className="otb-rec-section">
        <div className="otb-rec-title green">📈 Fechas con oportunidad de subida tarifaria ({recs.opportunityDates.length})</div>
        {recs.opportunityDates.length === 0
          ? <div className="otb-rec-empty green">✅ Sin fechas en esta categoría</div>
          : <div className="otb-date-cards">{recs.opportunityDates.map((d, i) => <DateCard key={i} d={d} variant="green" />)}</div>}
      </div>

      <div className="otb-rec-section">
        <div className="otb-rec-title red">📉 Fechas con riesgo comercial ({recs.riskDates.length})</div>
        {recs.riskDates.length === 0
          ? <div className="otb-rec-empty red">✅ Sin fechas en esta categoría</div>
          : <div className="otb-date-cards">{recs.riskDates.map((d, i) => <DateCard key={i} d={d} variant="red" />)}</div>}
      </div>

      {recs.stagnantDates.length > 0 && (
        <div className="otb-rec-section">
          <div className="otb-rec-title orange">😐 Fechas estancadas con baja ocupación ({recs.stagnantDates.length})</div>
          <div className="otb-date-cards">{recs.stagnantDates.map((d, i) => <DateCard key={i} d={d} variant="orange" />)}</div>
        </div>
      )}

      <div className="otb-rec-section">
        <div className="otb-rec-title dark">⚡ Acciones por prioridad</div>
        <div className="otb-pri-grid">
          {priCfg.map((cfg) => (
            <div className={`otb-pri-col ${cfg.key}`} key={cfg.key}>
              <div className="otb-pri-col-head">{cfg.label}</div>
              {priGroups[cfg.key].length === 0
                ? <div className="otb-pri-empty">Sin acciones en esta prioridad</div>
                : priGroups[cfg.key].map((item, i) => (
                  <div className="otb-pri-item" key={i}>
                    <div className="otb-pri-item-title">{item.title}</div>
                    <div className="otb-pri-item-body">{item.body}</div>
                    {item.dates.length > 0 && <div className="otb-pri-item-dates">Fechas: {item.dates.slice(0, 5).join(', ')}{item.dates.length > 5 ? '…' : ''}</div>}
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
