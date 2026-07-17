// Ficha Técnica de Pickup OTB — port del bloque #otb-kpi-area de index.html.
const cls = (v) => (v > 0 ? 'up' : v < 0 ? 'down' : '');

/** @param {{ metrics: any, weeklyMetrics: any, moduleLabel?: string }} props */
export default function OtbTechSheet({ metrics, weeklyMetrics, moduleLabel = 'OTB' }) {
  if (!metrics) return null;
  const m = metrics;
  const wm = weeklyMetrics;

  const kpis = [
    { label: 'Fechas de estancia', val: m.total },
    { label: 'Con pickup positivo', val: m.up, cls: 'up', sub: m.total ? `${Math.round((m.up / m.total) * 100)}%` : '' },
    { label: 'Con pickup negativo', val: m.down, cls: 'down', sub: m.total ? `${Math.round((m.down / m.total) * 100)}%` : '' },
    { label: 'Estables', val: m.stable },
  ];

  if (m.hasRooms) {
    kpis.push({ label: 'Pickup total habs.', val: `${m.totalRoomPickup > 0 ? '+' : ''}${Math.round(m.totalRoomPickup)}`, cls: cls(m.totalRoomPickup), sub: 'habitaciones' });
    if (m.bestRoomDay) kpis.push({ label: 'Mejor fecha (habs)', val: `${m.bestRoomDay.stayDate} (${m.bestRoomDay.roomPickup > 0 ? '+' : ''}${Math.round(m.bestRoomDay.roomPickup)} habs)`, cls: 'up' });
    if (m.worstRoomDay) kpis.push({ label: 'Peor fecha (habs)', val: `${m.worstRoomDay.stayDate} (${Math.round(m.worstRoomDay.roomPickup)} habs)`, cls: 'down' });
    if (m.avgVelocityHabs != null) kpis.push({ label: 'Velocidad promedio', val: `${m.avgVelocityHabs > 0 ? '+' : ''}${m.avgVelocityHabs.toFixed(2)} habs/día`, cls: cls(m.avgVelocityHabs) });
  } else {
    kpis.push({ label: 'Pickup prom. (pp)', val: m.avgPickup != null ? `${m.avgPickup > 0 ? '+' : ''}${m.avgPickup.toFixed(1)} pp` : 'N/D', cls: cls(m.avgPickup), sub: 'puntos porcentuales' });
    if (m.bestDay) kpis.push({ label: 'Mejor fecha', val: `${m.bestDay.stayDate} (+${m.bestDay.pickup.toFixed(1)}pp)`, cls: 'up' });
    if (m.worstDay) kpis.push({ label: 'Peor fecha', val: `${m.worstDay.stayDate} (${m.worstDay.pickup.toFixed(1)}pp)`, cls: 'down' });
  }

  if (wm) {
    kpis.push({ label: 'Semanas comparadas', val: wm.totalWeeks });
    kpis.push({ label: 'Semanas pickup positivo', val: wm.positiveWeeks, cls: 'up' });
    kpis.push({ label: 'Semanas pickup negativo', val: wm.negativeWeeks, cls: 'down' });
    if (wm.bestWeek) kpis.push({ label: 'Mejor semana', val: `${wm.bestWeek.weekLabel} (${wm.bestWeek.avgPickup > 0 ? '+' : ''}${wm.bestWeek.avgPickup.toFixed(1)}pp)`, cls: 'up' });
    if (wm.worstWeek) kpis.push({ label: 'Peor semana', val: `${wm.worstWeek.weekLabel} (${wm.worstWeek.avgPickup.toFixed(1)}pp)`, cls: 'down' });
  }

  return (
    <div className="otb-techsheet">
      <div className="otb-techsheet-title">Ficha Técnica de Pickup {moduleLabel}</div>
      <div className="otb-kpi-grid">
        {kpis.map((k, i) => (
          <div className={`otb-kpi ${k.cls || ''}`} key={i}>
            <div className="otb-kpi-label">{k.label}</div>
            <div className="otb-kpi-value">{k.val}</div>
            {k.sub ? <div className="otb-kpi-sub">{k.sub}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
