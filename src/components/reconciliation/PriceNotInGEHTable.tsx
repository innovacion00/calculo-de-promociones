'use client';

import { ReconciliationRecord } from '@/lib/reconciliationEngine';
import { formatCOP } from '@/lib/prepurchaseSettings';

interface Props {
  records: ReconciliationRecord[];
}

export default function PriceNotInGEHTable({ records }: Props) {
  const filtered = records.filter((r) => r.reconciliationStatus === 'PRICE_NOT_GEH');

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No hay reservas de Price sin correspondencia en GEH
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        {filtered.length.toLocaleString('es-CO')} reservas en Price que no aparecen en GEH
      </p>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2 text-left font-semibold text-gray-700">ID</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Hotel Price</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Hotel Norm.</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Huésped</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Fecha Llegada</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">Bruto</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">Over-Comm</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">Neto</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Estado</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">Recomendación</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 bg-gray-50">
                <td className="px-3 py-2 font-mono">{r.id}</td>
                <td className="px-3 py-2">{r.priceHotel}</td>
                <td className="px-3 py-2">{r.priceHotelNormalized}</td>
                <td className="px-3 py-2">{r.priceGuest}</td>
                <td className="px-3 py-2">
                  {r.priceArrival ? r.priceArrival.toLocaleDateString('es-CO') : '—'}
                </td>
                <td className="px-3 py-2 text-right">{formatCOP(r.priceBruto)}</td>
                <td className="px-3 py-2 text-right">{formatCOP(r.priceOverComm)}</td>
                <td className="px-3 py-2 text-right font-semibold">{formatCOP(r.priceNeto)}</td>
                <td className="px-3 py-2">{r.priceStatus}</td>
                <td className="px-3 py-2 text-gray-500">{r.recommendation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
