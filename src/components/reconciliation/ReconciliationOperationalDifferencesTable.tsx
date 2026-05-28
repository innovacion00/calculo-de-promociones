'use client';

import { useState } from 'react';
import { ReconciliationRecord, ReconciliationStatus } from '@/lib/reconciliationEngine';
import { formatCOP } from '@/lib/prepurchaseSettings';

const OP_STATUSES: ReconciliationStatus[] = [
  'DIFF_HOTEL',
  'DIFF_FECHA',
  'DIFF_HUESPED',
  'CANCELLED_PRICE_ACTIVE_GEH',
];

const STATUS_LABELS: Record<string, string> = {
  DIFF_HOTEL: 'Dif. Hotel',
  DIFF_FECHA: 'Dif. Fecha',
  DIFF_HUESPED: 'Dif. Huésped',
  CANCELLED_PRICE_ACTIVE_GEH: 'Cancelada/Activa GEH',
};

interface Props {
  records: ReconciliationRecord[];
}

export default function ReconciliationOperationalDifferencesTable({ records }: Props) {
  const [subFilter, setSubFilter] = useState<string>('all');

  const filtered = records.filter((r) => {
    const isOp = OP_STATUSES.includes(r.reconciliationStatus);
    if (!isOp) return false;
    return subFilter === 'all' || r.reconciliationStatus === subFilter;
  });

  if (filtered.length === 0) {
    return (
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 mr-1">Tipo:</label>
          <select
            className="text-xs border border-gray-200 rounded px-2 py-1"
            value={subFilter}
            onChange={(e) => setSubFilter(e.target.value)}
          >
            <option value="all">Todos</option>
            {OP_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div className="text-center py-12 text-gray-400">
          No hay diferencias operativas en el filtro seleccionado
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3 items-center">
        <div>
          <label className="text-xs text-gray-500 mr-1">Tipo:</label>
          <select
            className="text-xs border border-gray-200 rounded px-2 py-1"
            value={subFilter}
            onChange={(e) => setSubFilter(e.target.value)}
          >
            <option value="all">Todos</option>
            {OP_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <span className="text-xs text-gray-400">{filtered.length.toLocaleString('es-CO')} registros</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2 text-left font-semibold text-gray-700">ID</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Tipo Diferencia</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Hotel Price</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Hotel GEH</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Huésped Price</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Huésped GEH</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Fecha Price</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Fecha GEH</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">Neto Price</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">Valor GEH</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Observación</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 bg-yellow-50">
                <td className="px-3 py-2 font-mono">{r.id}</td>
                <td className="px-3 py-2">
                  <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    {STATUS_LABELS[r.reconciliationStatus] ?? r.reconciliationStatus}
                  </span>
                </td>
                <td className="px-3 py-2">{r.priceHotelNormalized}</td>
                <td className="px-3 py-2">{r.gehHotel}</td>
                <td className="px-3 py-2">{r.priceGuest}</td>
                <td className="px-3 py-2">{r.gehGuest}</td>
                <td className="px-3 py-2">
                  {r.priceArrival ? r.priceArrival.toLocaleDateString('es-CO') : '—'}
                </td>
                <td className="px-3 py-2">
                  {r.gehCheckIn ? r.gehCheckIn.toLocaleDateString('es-CO') : '—'}
                </td>
                <td className="px-3 py-2 text-right">{formatCOP(r.priceNeto)}</td>
                <td className="px-3 py-2 text-right">{formatCOP(r.gehAmount)}</td>
                <td className="px-3 py-2 text-gray-500">{r.autoObservation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
