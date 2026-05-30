'use client';

import { CrossResult } from '@/lib/crossEngine';
import { formatCOP } from '@/lib/prepurchaseSettings';
import CrossCharts from './CrossCharts';

interface Props {
  crossResult: CrossResult;
}

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}

function KpiCard({ label, value, sub, accent }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-1">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold" style={{ color: accent ? '#c8920a' : '#111827' }}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export default function CrossDashboard({ crossResult }: Props) {
  const { summary } = crossResult;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Filas en Price" value={summary.totalPrice.toLocaleString('es-CO')} />
        <KpiCard label="Filas en GEH Suites" value={summary.totalGEH.toLocaleString('es-CO')} />
        <KpiCard label="Coincidentes" value={summary.coincidentes.toLocaleString('es-CO')} accent />
        <KpiCard label="% Coincidencia" value={`${summary.pctCoincidencia.toFixed(1)}%`} accent />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Price no en GEH" value={summary.enPriceNoGEH.toLocaleString('es-CO')} />
        <KpiCard label="GEH no en Price" value={summary.enGEHNoPrice.toLocaleString('es-CO')} />
        <KpiCard label="Duplicados Price" value={summary.duplicadosPrice.toLocaleString('es-CO')} />
        <KpiCard label="Duplicados GEH" value={summary.duplicadosGEH.toLocaleString('es-CO')} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          label="Valor Coincidentes"
          value={formatCOP(summary.valorCoincidentes)}
          sub="Registros en ambos archivos"
        />
        <KpiCard
          label="Valor Price no GEH"
          value={formatCOP(summary.valorEnPriceNoGEH)}
          sub="Valor de registros no cruzados"
        />
        <KpiCard
          label="Valor GEH no Price"
          value={formatCOP(summary.valorEnGEHNoPrice)}
          sub="Valor de registros no cruzados"
        />
      </div>

      <CrossCharts summary={summary} />
    </div>
  );
}
