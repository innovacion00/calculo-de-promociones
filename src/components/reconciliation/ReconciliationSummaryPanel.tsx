'use client';

import { ReconciliationSummary } from '@/lib/reconciliationEngine';
import { formatCOP } from '@/lib/prepurchaseSettings';

interface KPICardProps {
  label: string;
  value: string | number;
  color?: string;
  bgColor?: string;
}

function KPICard({ label, value, color = '#111827', bgColor = '#f9fafb' }: KPICardProps) {
  return (
    <div
      className="rounded-xl p-4 border border-gray-200"
      style={{ backgroundColor: bgColor }}
    >
      <p className="text-xs text-gray-500 mb-1 truncate">{label}</p>
      <p className="text-xl font-bold truncate" style={{ color }}>
        {typeof value === 'number' ? value.toLocaleString('es-CO') : value}
      </p>
    </div>
  );
}

interface Props {
  summary: ReconciliationSummary;
}

export default function ReconciliationSummaryPanel({ summary }: Props) {
  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold text-gray-800">Resumen de Conciliación</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Total IDs Price" value={summary.totalPrice} />
        <KPICard label="Total IDs GEH" value={summary.totalGEH} />
        <KPICard label="Conciliadas" value={summary.conciliadas} color="#16a34a" bgColor="#f0fdf4" />
        <KPICard label="IDs inválidos Price" value={summary.invalidIdsPrice} color="#6b7280" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Price no en GEH" value={summary.priceNotGEH} color="#6b7280" bgColor="#f9fafb" />
        <KPICard label="GEH no en Price" value={summary.gehNotPrice} color="#6b7280" bgColor="#f9fafb" />
        <KPICard label="Dif. de Valor" value={summary.diffValor} color="#d97706" bgColor="#fffbeb" />
        <KPICard label="Dif. de Hotel" value={summary.diffHotel} color="#d97706" bgColor="#fffbeb" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Dif. de Fecha" value={summary.diffFecha} color="#d97706" bgColor="#fffbeb" />
        <KPICard label="Dif. de Huésped" value={summary.diffHuesped} color="#d97706" bgColor="#fffbeb" />
        <KPICard label="Canceladas Price / Activas GEH" value={summary.cancelledPriceActiveGEH} color="#dc2626" bgColor="#fef2f2" />
        <KPICard label="IDs inválidos GEH" value={summary.invalidIdsGEH} color="#6b7280" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Duplicados Price" value={summary.duplicadosPrice} color="#dc2626" bgColor="#fef2f2" />
        <KPICard label="Duplicados GEH" value={summary.duplicadosGEH} color="#dc2626" bgColor="#fef2f2" />
        <KPICard label="Dif. valor favor Price" value={formatCOP(summary.valorDiffFavorPrice)} color="#16a34a" bgColor="#f0fdf4" />
        <KPICard label="Dif. valor favor GEH" value={formatCOP(summary.valorDiffFavorGEH)} color="#dc2626" bgColor="#fef2f2" />
      </div>

      {summary.hotelMasDiferencias && (
        <div
          className="p-4 rounded-xl border"
          style={{ backgroundColor: 'rgba(200,146,10,0.06)', borderColor: 'rgba(200,146,10,0.3)' }}
        >
          <p className="text-sm text-gray-600">
            <span className="font-semibold" style={{ color: '#c8920a' }}>Hotel con más diferencias: </span>
            {summary.hotelMasDiferencias}
          </p>
        </div>
      )}
    </div>
  );
}
