// Pestaña Conciliaciones (live desde Bitrix, category 22).
import { useEffect, useState } from 'react';
import DataTable from '../shared/DataTable.jsx';
import KpiRow from '../shared/KpiRow.jsx';
import { apiFetch } from '../../lib/api.js';
import { fmtCop } from '../../lib/format.js';

export default function ReconciliationsTab() {
  const [kpis, setKpis] = useState([
    { label: 'Total movimientos', value: '—' },
    { label: 'Monto total', value: '—' },
    { label: 'Conciliado', value: '—', tone: 'ok' },
    { label: 'No conciliado', value: '—', tone: 'bad' },
  ]);
  const [options, setOptions] = useState({ hotels: [], banks: [] });

  useEffect(() => {
    apiFetch('/financial/reconciliations/stats').then((r) => {
      const s = r.stats;
      const pct = (n) => s.total ? `${Math.round((n / s.total) * 100)}%` : '—';
      setKpis([
        { label: 'Total movimientos', value: s.total.toLocaleString('es-CO') },
        { label: 'Monto total', value: fmtCop(s.totalAmount) },
        { label: 'Conciliado', value: s.reconciled.toLocaleString('es-CO'), tone: 'ok', sub: pct(s.reconciled) },
        { label: 'No conciliado', value: s.unreconciled.toLocaleString('es-CO'), tone: 'bad', sub: pct(s.unreconciled) },
      ]);
    }).catch(() => {});
    apiFetch('/financial/reconciliations/distinct').then((r) => setOptions({ hotels: r.hotels, banks: r.banks })).catch(() => {});
  }, []);

  const columns = [
    { key: 'movementDate', header: 'Fecha del movimiento', render: (r) => r.movementDate || '—' },
    { key: 'movementName', header: 'Nombre', render: (r) => r.movementName || '—' },
    { key: 'hotelName', header: 'Hotel', render: (r) => r.hotelName || '—' },
    { key: 'bank', header: 'Banco', render: (r) => r.bank || '—' },
    { key: 'netAmount', header: 'Neto abonar', cellStyle: 'font-weight:700', render: (r) => fmtCop(r.netAmount) },
    {
      key: 'reconciledStatus', header: 'Estado',
      render: (r) => r.reconciledStatus === 'reconciled'
        ? <span className="fin-badge reconciled">Conciliado</span>
        : <span className="fin-badge unreconciled">No conciliado</span>,
    },
  ];

  const filters = [
    { key: 'search', type: 'search', placeholder: 'Buscar hotel, banco, referencia…', minWidth: '200px' },
    { key: 'status', type: 'select', placeholder: 'Todos los estados', options: [
      { value: 'reconciled', label: 'Conciliado' },
      { value: 'unreconciled', label: 'No conciliado' },
    ] },
    { key: 'hotelName', type: 'select', placeholder: 'Todos los hoteles', options: options.hotels.map((h) => ({ value: h, label: h })) },
    { key: 'bank', type: 'select', placeholder: 'Todos los bancos', options: options.banks.map((b) => ({ value: b, label: b })) },
    { key: 'dateFrom', type: 'date', title: 'Fecha desde' },
    { key: 'dateTo', type: 'date', title: 'Fecha hasta' },
  ];

  return (
    <div>
      <KpiRow kpis={kpis} />
      <DataTable endpoint="/financial/reconciliations" exportEndpoint="/financial/reconciliations/export" columns={columns} filters={filters} />
    </div>
  );
}
