'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ReconciliationResult, ReconciliationStatus } from '@/lib/reconciliationEngine';
import { formatCOP } from '@/lib/prepurchaseSettings';

const STATUS_LABELS: Record<ReconciliationStatus, string> = {
  CONCILIADA: 'Conciliada',
  PRICE_NOT_GEH: 'Price/GEH',
  GEH_NOT_PRICE: 'GEH/Price',
  DIFF_VALOR: 'Dif.Valor',
  DIFF_HOTEL: 'Dif.Hotel',
  DIFF_FECHA: 'Dif.Fecha',
  DIFF_HUESPED: 'Dif.Huésped',
  CANCELLED_PRICE_ACTIVE_GEH: 'Canc./Activa',
  DUPLICADO_PRICE: 'Dup.Price',
  DUPLICADO_GEH: 'Dup.GEH',
  REVISION_MANUAL: 'Rev.Manual',
};

const STATUS_COLORS: Record<ReconciliationStatus, string> = {
  CONCILIADA: '#16a34a',
  PRICE_NOT_GEH: '#6b7280',
  GEH_NOT_PRICE: '#9ca3af',
  DIFF_VALOR: '#d97706',
  DIFF_HOTEL: '#f59e0b',
  DIFF_FECHA: '#eab308',
  DIFF_HUESPED: '#ca8a04',
  CANCELLED_PRICE_ACTIVE_GEH: '#dc2626',
  DUPLICADO_PRICE: '#b91c1c',
  DUPLICADO_GEH: '#ef4444',
  REVISION_MANUAL: '#8b5cf6',
};

interface Props {
  result: ReconciliationResult;
}

export default function ReconciliationCharts({ result }: Props) {
  const { masterTable } = result;

  // Chart 1: count per status
  const statusCounts = new Map<ReconciliationStatus, number>();
  for (const r of masterTable) {
    statusCounts.set(r.reconciliationStatus, (statusCounts.get(r.reconciliationStatus) ?? 0) + 1);
  }
  const statusData = Array.from(statusCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => ({
      name: STATUS_LABELS[status] ?? status,
      count,
      fill: STATUS_COLORS[status] ?? '#c8920a',
    }));

  // Chart 2: differences per hotel (top 10)
  const hotelDiffs = new Map<string, number>();
  for (const r of masterTable) {
    if (r.reconciliationStatus !== 'CONCILIADA') {
      const hotel = r.priceHotelNormalized || r.gehHotel || 'Desconocido';
      hotelDiffs.set(hotel, (hotelDiffs.get(hotel) ?? 0) + 1);
    }
  }
  const hotelDiffData = Array.from(hotelDiffs.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([hotel, count]) => ({ hotel, count }));

  // Chart 3: price value vs GEH value per hotel (top 10)
  const hotelValues = new Map<string, { price: number; geh: number }>();
  for (const r of masterTable) {
    const hotel = r.priceHotelNormalized || r.gehHotel || 'Desconocido';
    const existing = hotelValues.get(hotel) ?? { price: 0, geh: 0 };
    existing.price += r.priceNeto;
    existing.geh += r.gehAmount;
    hotelValues.set(hotel, existing);
  }
  const hotelValueData = Array.from(hotelValues.entries())
    .sort((a, b) => (b[1].price + b[1].geh) - (a[1].price + a[1].geh))
    .slice(0, 10)
    .map(([hotel, vals]) => ({ hotel, price: vals.price, geh: vals.geh }));

  // Chart 4: monthly evolution of differences
  const monthlyDiffs = new Map<string, number>();
  for (const r of masterTable) {
    if (r.reconciliationStatus !== 'CONCILIADA' && r.priceArrival) {
      const month = r.priceArrival.toISOString().slice(0, 7);
      monthlyDiffs.set(month, (monthlyDiffs.get(month) ?? 0) + 1);
    }
  }
  const monthlyData = Array.from(monthlyDiffs.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => ({ month, count }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Chart 1 */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">Registros por Estado</h4>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={statusData} margin={{ top: 0, right: 10, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="count" name="Registros" fill="#c8920a" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 2 */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">Diferencias por Hotel (Top 10)</h4>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={hotelDiffData}
            layout="vertical"
            margin={{ top: 0, right: 20, left: 60, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis dataKey="hotel" type="category" tick={{ fontSize: 9 }} width={60} />
            <Tooltip />
            <Bar dataKey="count" name="Diferencias" fill="#c8920a" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 3 */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">Valor Price vs GEH por Hotel (Top 10)</h4>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={hotelValueData} margin={{ top: 0, right: 10, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="hotel" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} />
            <Tooltip formatter={(v) => formatCOP(Number(v))} />
            <Legend />
            <Bar dataKey="price" name="Price" fill="#c8920a" />
            <Bar dataKey="geh" name="GEH" fill="#1d4ed8" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 4 */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">Evolución Mensual de Diferencias</h4>
        {monthlyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" name="Diferencias" fill="#c8920a" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
            Sin datos de fechas disponibles
          </div>
        )}
      </div>
    </div>
  );
}
