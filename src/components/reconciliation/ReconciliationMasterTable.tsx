'use client';

import { useState } from 'react';
import { ReconciliationRecord, ReconciliationStatus } from '@/lib/reconciliationEngine';
import { formatCOP } from '@/lib/prepurchaseSettings';

const PAGE_SIZE = 50;

const STATUS_LABELS: Record<ReconciliationStatus, string> = {
  CONCILIADA: 'Conciliada',
  PRICE_NOT_GEH: 'Price sin GEH',
  GEH_NOT_PRICE: 'GEH sin Price',
  DIFF_VALOR: 'Dif. Valor',
  DIFF_HOTEL: 'Dif. Hotel',
  DIFF_FECHA: 'Dif. Fecha',
  DIFF_HUESPED: 'Dif. Huésped',
  CANCELLED_PRICE_ACTIVE_GEH: 'Cancelada/Activa',
  DUPLICADO_PRICE: 'Dup. Price',
  DUPLICADO_GEH: 'Dup. GEH',
  REVISION_MANUAL: 'Revisión Manual',
};

function rowBgColor(status: ReconciliationStatus): string {
  switch (status) {
    case 'CONCILIADA': return '#f0fdf4';
    case 'DUPLICADO_PRICE':
    case 'DUPLICADO_GEH':
    case 'CANCELLED_PRICE_ACTIVE_GEH': return '#fef2f2';
    case 'DIFF_VALOR':
    case 'DIFF_HOTEL':
    case 'DIFF_FECHA':
    case 'DIFF_HUESPED': return '#fffbeb';
    case 'PRICE_NOT_GEH':
    case 'GEH_NOT_PRICE': return '#f9fafb';
    default: return '#ffffff';
  }
}

interface Props {
  records: ReconciliationRecord[];
}

export default function ReconciliationMasterTable({ records }: Props) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [hotelFilter, setHotelFilter] = useState<string>('all');
  const [page, setPage] = useState(0);

  const allStatuses = Array.from(new Set(records.map((r) => r.reconciliationStatus)));
  const allHotels = Array.from(
    new Set(records.flatMap((r) => [r.priceHotelNormalized, r.gehHotel].filter(Boolean)))
  ).sort();

  const filtered = records.filter((r) => {
    const matchStatus = statusFilter === 'all' || r.reconciliationStatus === statusFilter;
    const matchHotel =
      hotelFilter === 'all' ||
      r.priceHotelNormalized === hotelFilter ||
      r.gehHotel === hotelFilter;
    return matchStatus && matchHotel;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRecords = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div>
          <label className="text-xs text-gray-500 mr-1">Estado:</label>
          <select
            className="text-xs border border-gray-200 rounded px-2 py-1"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          >
            <option value="all">Todos</option>
            {allStatuses.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mr-1">Hotel:</label>
          <select
            className="text-xs border border-gray-200 rounded px-2 py-1"
            value={hotelFilter}
            onChange={(e) => { setHotelFilter(e.target.value); setPage(0); }}
          >
            <option value="all">Todos</option>
            {allHotels.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>
        <span className="text-xs text-gray-400">
          {filtered.length.toLocaleString('es-CO')} registros
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2 text-left font-semibold text-gray-700">ID</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Estado</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Hotel Price</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Hotel GEH</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Huésped Price</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Huésped GEH</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">Neto Price</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">Valor GEH</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">Diferencia</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Observación</th>
            </tr>
          </thead>
          <tbody>
            {pageRecords.map((r) => (
              <tr
                key={r.id}
                style={{ backgroundColor: rowBgColor(r.reconciliationStatus) }}
                className="border-b border-gray-100"
              >
                <td className="px-3 py-2 font-mono">{r.id}</td>
                <td className="px-3 py-2">
                  <span className="px-1.5 py-0.5 rounded text-xs font-medium"
                    style={{ backgroundColor: 'rgba(0,0,0,0.06)' }}>
                    {STATUS_LABELS[r.reconciliationStatus] ?? r.reconciliationStatus}
                  </span>
                </td>
                <td className="px-3 py-2">{r.priceHotelNormalized || r.priceHotel}</td>
                <td className="px-3 py-2">{r.gehHotel}</td>
                <td className="px-3 py-2 max-w-32 truncate">{r.priceGuest}</td>
                <td className="px-3 py-2 max-w-32 truncate">{r.gehGuest}</td>
                <td className="px-3 py-2 text-right">{formatCOP(r.priceNeto)}</td>
                <td className="px-3 py-2 text-right">{formatCOP(r.gehAmount)}</td>
                <td className="px-3 py-2 text-right" style={{ color: r.valueDiff > 0 ? '#16a34a' : r.valueDiff < 0 ? '#dc2626' : undefined }}>
                  {formatCOP(r.valueDiff)}
                </td>
                <td className="px-3 py-2 max-w-48 truncate text-gray-500">{r.autoObservation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1 text-xs border rounded disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-xs text-gray-500">
            Página {page + 1} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="px-3 py-1 text-xs border rounded disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
