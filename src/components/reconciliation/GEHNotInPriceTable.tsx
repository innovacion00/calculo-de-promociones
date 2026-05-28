'use client';

import { ReconciliationRecord } from '@/lib/reconciliationEngine';
import { formatCOP } from '@/lib/prepurchaseSettings';

interface Props {
  records: ReconciliationRecord[];
}

export default function GEHNotInPriceTable({ records }: Props) {
  const filtered = records.filter((r) => r.reconciliationStatus === 'GEH_NOT_PRICE');

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No hay reservas de GEH sin correspondencia en Price
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        {filtered.length.toLocaleString('es-CO')} reservas en GEH que no aparecen en Price
      </p>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2 text-left font-semibold text-gray-700">ID</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Hotel GEH</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Huésped GEH</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Check-In</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Check-Out</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">Valor GEH</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Notas</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Recomendación</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 bg-gray-50">
                <td className="px-3 py-2 font-mono">{r.id}</td>
                <td className="px-3 py-2">{r.gehHotel}</td>
                <td className="px-3 py-2">{r.gehGuest}</td>
                <td className="px-3 py-2">
                  {r.gehCheckIn ? r.gehCheckIn.toLocaleDateString('es-CO') : '—'}
                </td>
                <td className="px-3 py-2">
                  {r.gehCheckOut ? r.gehCheckOut.toLocaleDateString('es-CO') : '—'}
                </td>
                <td className="px-3 py-2 text-right font-semibold">{formatCOP(r.gehAmount)}</td>
                <td className="px-3 py-2 text-gray-500">{r.gehNotes}</td>
                <td className="px-3 py-2 text-gray-500">{r.recommendation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
