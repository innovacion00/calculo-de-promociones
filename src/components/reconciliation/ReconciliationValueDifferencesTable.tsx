'use client';

import { ReconciliationRecord } from '@/lib/reconciliationEngine';
import { formatCOP } from '@/lib/prepurchaseSettings';

interface Props {
  records: ReconciliationRecord[];
}

export default function ReconciliationValueDifferencesTable({ records }: Props) {
  const filtered = records.filter((r) => r.reconciliationStatus === 'DIFF_VALOR');

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No hay diferencias de valor entre Price y GEH
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        {filtered.length.toLocaleString('es-CO')} reservas con diferencias de valor
      </p>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2 text-left font-semibold text-gray-700">ID</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Hotel</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Huésped Price</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">Bruto Price</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">Over-Comm</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">Neto Price</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">Valor GEH</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">Diferencia</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">Dif. %</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Recomendación</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 bg-yellow-50">
                <td className="px-3 py-2 font-mono">{r.id}</td>
                <td className="px-3 py-2">{r.priceHotelNormalized || r.priceHotel}</td>
                <td className="px-3 py-2">{r.priceGuest}</td>
                <td className="px-3 py-2 text-right">{formatCOP(r.priceBruto)}</td>
                <td className="px-3 py-2 text-right">{formatCOP(r.priceOverComm)}</td>
                <td className="px-3 py-2 text-right font-semibold">{formatCOP(r.priceNeto)}</td>
                <td className="px-3 py-2 text-right font-semibold">{formatCOP(r.gehAmount)}</td>
                <td
                  className="px-3 py-2 text-right font-semibold"
                  style={{ color: r.valueDiff > 0 ? '#16a34a' : '#dc2626' }}
                >
                  {formatCOP(r.valueDiff)}
                </td>
                <td
                  className="px-3 py-2 text-right"
                  style={{ color: r.valueDiff > 0 ? '#16a34a' : '#dc2626' }}
                >
                  {r.valueDiffPct.toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-gray-500">{r.recommendation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
