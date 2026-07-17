// Pestaña Saldos Pendientes (checkouts, live desde el PMS).
// Consulta 100% manual: el usuario elige hotel (solo los que tienen IP) + fecha y pulsa
// Consultar. Así se consulta un único PMS (rápido) en vez de los 14 hoteles.
import { useEffect, useRef, useState } from 'react';
import DataTable from '../shared/DataTable.jsx';
import KpiRow from '../shared/KpiRow.jsx';
import { apiFetch } from '../../lib/api.js';
import { fmtCop } from '../../lib/format.js';

const PLACEHOLDER_KPIS = [
  { label: 'Total checkouts', value: '—' },
  { label: 'Sin saldo', value: '—', tone: 'ok' },
  { label: 'Con saldo pendiente', value: '—', tone: 'bad' },
  { label: 'Valor total pendiente', value: '—', tone: 'bad' },
  { label: 'Promedio de saldo', value: '—' },
];

export default function BalancesTab() {
  const [kpis, setKpis] = useState(PLACEHOLDER_KPIS);
  const [channels, setChannels] = useState(/** @type {string[]} */ ([]));
  const [hotels, setHotels] = useState(/** @type {string[]} */ ([]));
  const lastStatsKey = useRef('');

  // Hoteles con IP configurada (los únicos consultables en el PMS).
  useEffect(() => {
    apiFetch('/financial/checkouts/hotels').then((r) => setHotels(r.hotels ?? [])).catch(() => {});
  }, []);

  /** Refresca KPIs/canales solo si cambiaron los filtros relevantes (no en paginación). */
  const handleLoad = (filters) => {
    const key = JSON.stringify({ h: filters.hotelName ?? '', d: filters.checkoutDate ?? '', c: filters.channel ?? '', s: filters.search ?? '' });
    if (key === lastStatsKey.current) return;
    lastStatsKey.current = key;

    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
    apiFetch(`/financial/checkouts/stats?${params.toString()}`).then((r) => {
      const s = r.stats;
      const pct = (n) => s.total ? `${Math.round((n / s.total) * 100)}%` : '—';
      setKpis([
        { label: 'Total checkouts', value: String(s.total) },
        { label: 'Sin saldo', value: String(s.noBalance), tone: 'ok', sub: pct(s.noBalance) },
        { label: 'Con saldo pendiente', value: String(s.withBalance), tone: 'bad', sub: pct(s.withBalance) },
        { label: 'Valor total pendiente', value: fmtCop(s.totalPendingAmount), tone: 'bad' },
        { label: 'Promedio de saldo', value: fmtCop(s.avgPendingAmount) },
      ]);
      if (Array.isArray(s.channels)) setChannels(s.channels);
    }).catch(() => {});
  };

  const columns = [
    { key: 'checkoutDate', header: 'Fecha checkout', render: (r) => r.checkoutDate || '—' },
    { key: 'hotelName', header: 'Hotel', render: (r) => r.hotelName || '—' },
    { key: 'room', header: 'Hab.', render: (r) => r.room || '—' },
    { key: 'channel', header: 'Canal', render: (r) => r.channel || '—' },
    { key: 'localizador', header: 'Localizador', render: (r) => r.localizador || '—' },
    { key: 'reservationId', header: 'Reserva', render: (r) => r.reservationId || '—' },
    { key: 'guestName', header: 'Huésped', render: (r) => r.guestName || '—' },
    { key: 'checkInDate', header: 'Check-in', render: (r) => r.checkInDate || '—' },
    { key: 'totalAmount', header: 'Valor total', render: (r) => fmtCop(r.totalAmount) },
    { key: 'paidAmount', header: 'Pagado', render: (r) => fmtCop(r.paidAmount) },
    { key: 'pendingBalance', header: 'Saldo pendiente', cellStyle: 'font-weight:700', render: (r) => fmtCop(r.pendingBalance) },
  ];

  const filters = [
    { key: 'hotelName', type: 'select', placeholder: 'Selecciona un hotel…', options: hotels.map((h) => ({ value: h, label: h })) },
    { key: 'checkoutDate', type: 'date', title: 'Fecha de checkout' },
    { key: 'channel', type: 'select', placeholder: 'Todos los canales', options: channels.map((c) => ({ value: c, label: c })) },
    { key: 'search', type: 'search', placeholder: 'Buscar reserva, huésped…', minWidth: '180px' },
  ];

  return (
    <div>
      <KpiRow kpis={kpis} />
      <DataTable
        endpoint="/financial/checkouts" exportEndpoint="/financial/checkouts/export"
        columns={columns} filters={filters}
        manualQuery initialLoad={false}
        requiredFilters={['hotelName', 'checkoutDate']}
        rowClassName={(r) => (r.pendingBalance > 0 ? 'fin-row-danger' : undefined)}
        emptyPrompt="Selecciona un hotel y una fecha de checkout, luego pulsa Consultar."
        onLoad={handleLoad}
        loadingText="Consultando el PMS… (puede tardar varios segundos)"
      />
    </div>
  );
}
