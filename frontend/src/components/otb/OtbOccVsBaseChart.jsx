// Gráfico "Ocupación actual vs base — coloreada por pickup" (recharts, ComposedChart).
// Reutilizado en la pestaña Comparativa (debajo de la Ficha Técnica) y en la pestaña Gráficos.
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer } from 'recharts';
import { PICKUP_LABEL } from '../../lib/otb/compare.js';

// Ganó/perdió/estable simplificado (3 colores), reusa los mismos tonos de estado que badges/tabla.
const WL_FILL = { up: '#43a047', down: '#c62828', stable: '#9e9e9e' };
const C_BASE = '#1565c0';

const shortDate = (iso) => (iso && iso.length >= 10 ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : iso || '');
const axisTick = { fontSize: 10, fill: '#888' };
const grid = { stroke: 'rgba(0,0,0,0.06)' };
// Eje de fechas: siempre muestra todos los días (sin saltar etiquetas), rotadas para que quepan.
const dayAxis = { tick: { fontSize: 9, fill: '#888' }, interval: 0, angle: -45, textAnchor: 'end', height: 48 };

function OccVsBaseTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <div className="otb-chart-tip">
      <div className="otb-chart-tip-title">{r.stayDate || r.label}</div>
      <div>Occ actual: {r.occActual != null ? `${r.occActual}%` : 'N/D'}</div>
      <div>Occ base: {r.occBase != null ? `${r.occBase}%` : 'N/D'}</div>
      {r.pickup != null && <div>Pickup: {r.pickup > 0 ? '+' : ''}{r.pickup.toFixed(1)} pp</div>}
      {r.roomPickup != null && <div>Habs: {Math.round(r.roomsBefore || 0)} → {Math.round(r.roomsAfter || 0)} ({r.roomPickup > 0 ? '+' : ''}{Math.round(r.roomPickup)})</div>}
      <div style={{ marginTop: 4, fontWeight: 700 }}>{PICKUP_LABEL[r.status]}</div>
    </div>
  );
}

/** @param {{ comparison: any[], showBox?: boolean }} props */
export default function OtbOccVsBaseChart({ comparison, showBox = true }) {
  const rows = (comparison || []).filter((r) => r.pickup !== null && r.pickup !== undefined);
  if (rows.length < 2) return null;

  const showLabels = rows.length <= 20;
  const data = rows.map((r) => ({
    label: shortDate(r.stayDate), stayDate: r.stayDate,
    occActual: r.occAfter != null ? Math.round(r.occAfter) : null,
    occBase: r.occBefore != null ? Math.round(r.occBefore) : null,
    wl: r.pickup > 0 ? 'up' : r.pickup < 0 ? 'down' : 'stable',
    pickup: r.pickup, status: r.status, roomPickup: r.roomPickup, roomsBefore: r.roomsBefore, roomsAfter: r.roomsAfter,
  }));

  const chart = (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 16, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid vertical={false} {...grid} />
          <XAxis dataKey="label" {...dayAxis} />
          <YAxis tick={axisTick} width={38} unit="%" />
          <Tooltip content={<OccVsBaseTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="occActual" name="Occ Actual" legendType="none" radius={[4, 4, 0, 0]} label={showLabels ? { position: 'top', fontSize: 9, fill: '#555', formatter: (v) => (v != null ? `${v}%` : '') } : false}>
            {data.map((d, i) => <Cell key={i} fill={WL_FILL[d.wl]} />)}
          </Bar>
          <Line type="monotone" dataKey="occBase" name="Occ Base (referencia)" stroke={C_BASE} strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );

  if (!showBox) return chart;

  return (
    <div className="otb-chart-box full">
      <div className="otb-chart-title">📊 Ocupación actual vs base — coloreada por pickup</div>
      <div className="otb-chart-sub">Barras = Occ actual coloreadas por pickup · Línea azul = Occ base · 🟩 ganó · ⬜ estable · 🟥 perdió</div>
      {chart}
    </div>
  );
}
