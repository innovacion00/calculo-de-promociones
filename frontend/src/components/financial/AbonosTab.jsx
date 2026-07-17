// Pestaña Abonos (negociaciones fallidas por abonar, live desde Bitrix).
import { useEffect, useState } from 'react';
import DataTable from '../shared/DataTable.jsx';
import KpiRow from '../shared/KpiRow.jsx';
import { apiFetch } from '../../lib/api.js';
import { fmtCop, truncate } from '../../lib/format.js';

export default function AbonosTab() {
  const [kpis, setKpis] = useState([
    { label: 'Negociaciones fallidas', value: '—' },
    { label: 'Neto a abonar', value: '—', tone: 'bad' },
  ]);
  const [options, setOptions] = useState({ hotels: [], banks: [] });

  useEffect(() => {
    apiFetch('/financial/abonos/stats').then((r) => {
      setKpis([
        { label: 'Negociaciones fallidas', value: String(r.stats.total) },
        { label: 'Neto a abonar', value: fmtCop(r.stats.totalNetAmount), tone: 'bad' },
      ]);
    }).catch(() => {});
    apiFetch('/financial/abonos/distinct').then((r) => setOptions({ hotels: r.hotels, banks: r.banks })).catch(() => {});
  }, []);

  const columns = [
    { key: 'name', header: 'Nombre', cellStyle: 'font-weight:600', render: (r) => r.name || '—' },
    { key: 'hotelName', header: 'Hotel', render: (r) => r.hotelName || '—' },
    { key: 'bank', header: 'Banco', render: (r) => r.bank || '—' },
    { key: 'netAmount', header: 'Neto abonar', cellStyle: 'font-weight:700', render: (r) => fmtCop(r.netAmount) },
    {
      key: 'failureReason', header: 'Causa del fallo',
      render: (r) => { const full = r.failureReason || '—'; return <span title={full}>{truncate(full)}</span>; },
    },
    { key: 'status', header: 'Estado', render: (r) => r.status ? <span className="fin-badge unreconciled">{r.status}</span> : '—' },
  ];

  const filters = [
    { key: 'search', type: 'search', placeholder: 'Buscar nombre, hotel, banco…', minWidth: '200px' },
    { key: 'hotelName', type: 'select', placeholder: 'Todos los hoteles', options: options.hotels.map((h) => ({ value: h, label: h })) },
    { key: 'bank', type: 'select', placeholder: 'Todos los bancos', options: options.banks.map((b) => ({ value: b, label: b })) },
  ];

  return (
    <div>
      <KpiRow kpis={kpis} />
      <DataTable endpoint="/financial/abonos" exportEndpoint="/financial/abonos/export" columns={columns} filters={filters} />
    </div>
  );
}
