// Pestaña Gráficos de OTB (recharts). Port de otbRenderCharts (subset núcleo):
// 1) pickup diario coloreado por estado (diverging/status), 2) ocupación base vs actual,
// 3) reservas base vs actual, 4) distribución de días por estado.
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer,
} from 'recharts';
import { PICKUP_LABEL } from '../../lib/otb/compare.js';
import OtbOccVsBaseChart from './OtbOccVsBaseChart.jsx';

// Colores de ESTADO (reservados, con significado). Verde ganó ↔ gris estable ↔ rojo perdió.
const STATUS_FILL = {
  'strong-up': '#1b5e20', 'moderate-up': '#43a047', 'stable': '#9e9e9e', 'moderate-down': '#e65100', 'strong-down': '#b71c1c', 'unknown': '#bdbdbd',
};
// Par categórico validado (CVD-safe): base = azul, actual = oro.
const C_BASE = '#1565c0';
const C_ACTUAL = '#ce7e1f';

const shortDate = (iso) => (iso && iso.length >= 10 ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : iso || '');

function PickupTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <div className="otb-chart-tip">
      <div className="otb-chart-tip-title">{r.stayDate || r.label}</div>
      {r.occBefore != null && <div>Occ base: {Math.round(r.occBefore)}%</div>}
      {r.occAfter != null && <div>Occ actual: {Math.round(r.occAfter)}%</div>}
      {r.pickup != null && <div>Pickup: {r.pickup > 0 ? '+' : ''}{r.pickup.toFixed(1)} pp</div>}
      {r.roomPickup != null && <div>Pickup habs: {r.roomPickup > 0 ? '+' : ''}{r.roomPickup}</div>}
      <div style={{ marginTop: 4, fontWeight: 700 }}>{PICKUP_LABEL[r.status]}</div>
    </div>
  );
}

const axisTick = { fontSize: 10, fill: '#888' };
const grid = { stroke: 'rgba(0,0,0,0.06)' };
// Eje de fechas: siempre muestra todos los días (sin saltar etiquetas), rotadas para que quepan.
const dayAxis = { tick: { fontSize: 9, fill: '#888' }, interval: 0, angle: -45, textAnchor: 'end', height: 48 };

function ChartBox({ title, subtitle, children, height = 280, full = false }) {
  return (
    <div className={`otb-chart-box${full ? ' full' : ''}`}>
      <div className="otb-chart-title">{title}</div>
      {subtitle && <div className="otb-chart-sub">{subtitle}</div>}
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </div>
  );
}

/** @param {{ comparison: any[], metrics: any }} props */
export default function OtbCharts({ comparison, metrics }) {
  const rows = (comparison || []).filter((r) => r.pickup !== null && r.pickup !== undefined);
  if (rows.length < 2) {
    return <div className="otb-status">Datos insuficientes para graficar (se requieren al menos 2 días comparables).</div>;
  }

  const useRooms = rows.some((r) => r.roomPickup !== null);
  const pickupData = rows.map((r) => ({
    label: shortDate(r.stayDate), stayDate: r.stayDate,
    value: useRooms ? (r.roomPickup ?? 0) : Number((r.pickup ?? 0).toFixed(1)),
    status: r.status, occBefore: r.occBefore, occAfter: r.occAfter, pickup: r.pickup, roomPickup: r.roomPickup,
  }));
  const occData = rows.map((r) => ({ label: shortDate(r.stayDate), base: r.occBefore != null ? Math.round(r.occBefore) : null, actual: r.occAfter != null ? Math.round(r.occAfter) : null }));
  const roomsData = rows.map((r) => ({ label: shortDate(r.stayDate), base: r.roomsBefore, actual: r.roomsAfter }));
  const distData = [
    { label: 'Pickup fuerte', count: metrics?.strongUp ?? 0, status: 'strong-up' },
    { label: 'Pickup moderado', count: metrics?.moderateUp ?? 0, status: 'moderate-up' },
    { label: 'Estable', count: metrics?.stable ?? 0, status: 'stable' },
    { label: 'Caída moderada', count: metrics?.moderateDown ?? 0, status: 'moderate-down' },
    { label: 'Caída fuerte', count: metrics?.strongDown ?? 0, status: 'strong-down' },
  ];
  const showLabels = rows.length <= 20;

  return (
    <div className="otb-chart-grid">
      <ChartBox
        title="📊 Comportamiento diario del pickup"
        subtitle={`Barras = ${useRooms ? 'habitaciones ganadas/perdidas' : 'puntos porcentuales'} · 🟩 ganó · ⬜ estable · 🟥 perdió`}
        height={320}
      >
        <BarChart data={pickupData} margin={{ top: 16, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid vertical={false} {...grid} />
          <XAxis dataKey="label" {...dayAxis} />
          <YAxis tick={axisTick} width={38} />
          <Tooltip content={<PickupTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} label={showLabels ? { position: 'top', fontSize: 9, fill: '#555', formatter: (v) => (v > 0 ? `+${v}` : v) } : false}>
            {pickupData.map((d, i) => <Cell key={i} fill={STATUS_FILL[d.status] ?? STATUS_FILL.unknown} />)}
          </Bar>
        </BarChart>
      </ChartBox>

      <OtbOccVsBaseChart comparison={comparison} />

      <ChartBox title="Ocupación: base vs actual" subtitle="Evolución de ocupación por día (%)">
        <LineChart data={occData} margin={{ top: 16, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid vertical={false} {...grid} />
          <XAxis dataKey="label" {...dayAxis} />
          <YAxis tick={axisTick} width={38} unit="%" />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="base" name="Base" stroke={C_BASE} strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="actual" name="Actual" stroke={C_ACTUAL} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ChartBox>

      <ChartBox title="Reservas: base vs actual" subtitle="Habitaciones reservadas por día">
        <BarChart data={roomsData} margin={{ top: 16, right: 12, bottom: 4, left: 4 }} barGap={2}>
          <CartesianGrid vertical={false} {...grid} />
          <XAxis dataKey="label" {...dayAxis} />
          <YAxis tick={axisTick} width={38} />
          <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="base" name="Base" fill={C_BASE} radius={[3, 3, 0, 0]} />
          <Bar dataKey="actual" name="Actual" fill={C_ACTUAL} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ChartBox>

      <ChartBox title="Distribución de días por estado" subtitle="Cuántos días cayeron en cada categoría de pickup">
        <BarChart data={distData} margin={{ top: 16, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid vertical={false} {...grid} />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#888' }} interval={0} angle={-20} textAnchor="end" height={50} />
          <YAxis tick={axisTick} width={38} allowDecimals={false} />
          <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 11, fill: '#555' }}>
            {distData.map((d, i) => <Cell key={i} fill={STATUS_FILL[d.status]} />)}
          </Bar>
        </BarChart>
      </ChartBox>
    </div>
  );
}
