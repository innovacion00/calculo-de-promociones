'use client';

import { usePrepurchase } from '@/context/PrepurchaseContext';
import { formatCOP, formatPct, formatNumber } from '@/lib/prepurchaseSettings';
import { riskBg } from '@/lib/riskClassifier';
import {
  exportReservasEfectivas,
  exportReservasCanceladas,
  exportInconsistencias,
  exportDuplicados,
  exportResumenEjecutivo,
} from '@/lib/exportService';

function KpiCard({
  label,
  value,
  sub,
  color = 'blue',
}: {
  label: string;
  value: string;
  sub?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
}) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800',
    gray: 'bg-gray-50 border-gray-200 text-gray-800',
  };

  return (
    <div className={`border rounded-xl p-4 ${colors[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-xl font-bold mt-1 leading-tight">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { summary, config, hotelSummaries, forecastScenarios, classifiedRows } = usePrepurchase();

  if (!summary) {
    return (
      <div className="p-6 text-center text-gray-500">
        No hay datos disponibles.
      </div>
    );
  }

  const topHotel = hotelSummaries[0];
  const bestForecast = forecastScenarios.find((s) => s.escenario.startsWith('Medio'));

  // Monthly summary
  const monthConsumption = new Map<string, number>();
  for (const r of classifiedRows) {
    if (r.status !== 'effective' || !r.date) continue;
    const key = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, '0')}`;
    monthConsumption.set(key, (monthConsumption.get(key) ?? 0) + r.amount);
  }
  const maxMonth = Array.from(monthConsumption.entries()).sort((a, b) => b[1] - a[1])[0];

  const weekConsumption = new Map<string, number>();
  for (const r of classifiedRows) {
    if (r.status !== 'effective' || !r.date) continue;
    const d = r.date;
    const startOfWeek = new Date(d);
    startOfWeek.setDate(d.getDate() - d.getDay());
    const key = startOfWeek.toISOString().slice(0, 10);
    weekConsumption.set(key, (weekConsumption.get(key) ?? 0) + r.amount);
  }
  const maxWeek = Array.from(weekConsumption.entries()).sort((a, b) => b[1] - a[1])[0];

  const handleExport = (type: string) => {
    if (type === 'efectivas') exportReservasEfectivas(classifiedRows);
    if (type === 'canceladas') exportReservasCanceladas(classifiedRows);
    if (type === 'inconsistencias') exportInconsistencias(classifiedRows);
    if (type === 'duplicados') exportDuplicados(classifiedRows);
    if (type === 'resumen') exportResumenEjecutivo(summary, config, forecastScenarios);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Financial Summary */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Resumen Financiero de la Precompra
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <KpiCard label="Cupo Comercial Total" value={formatCOP(summary.cupoTotal)} color="blue" />
          <KpiCard label="Venta Bruta Efectiva" value={formatCOP(summary.ventaBrutaEfectiva)} color="green" />
          <KpiCard label="Over-Commission" value={formatCOP(summary.overCommissionEfectiva)} sub="Valor negativo descontado" color="yellow" />
          <KpiCard label="Consumo Neto" value={formatCOP(summary.consumoNeto)} color="purple" />
          <KpiCard
            label="Saldo Comercial Disponible"
            value={formatCOP(summary.saldoComercialDisponible)}
            sub={`${formatPct(summary.porcentajeDisponible)} disponible`}
            color="green"
          />
          <KpiCard
            label="Saldo Neto vs Prepago"
            value={formatCOP(summary.saldoNetoContraPrepago)}
            color={summary.saldoNetoContraPrepago < 0 ? 'red' : 'blue'}
          />
          <KpiCard
            label="% Consumido"
            value={formatPct(summary.porcentajeConsumido)}
            sub={`${formatPct(summary.porcentajeDisponible)} disponible`}
            color={summary.porcentajeConsumido > 0.9 ? 'red' : 'blue'}
          />
          <KpiCard label="Valor Precompra" value={formatCOP(config.valorPrecompra)} sub={`+${formatPct(config.porcentajeAdicional)} adicional`} color="gray" />
        </div>
      </section>

      {/* Progress bar */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">Consumo de la bolsa de precompra</span>
          <span className="text-sm font-bold text-blue-700">{formatPct(summary.porcentajeConsumido)}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
          <div
            className={`h-4 rounded-full transition-all ${
              summary.porcentajeConsumido > 0.9
                ? 'bg-red-500'
                : summary.porcentajeConsumido > 0.7
                ? 'bg-yellow-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(100, summary.porcentajeConsumido * 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>COP $0</span>
          <span>{formatCOP(summary.ventaBrutaEfectiva)} consumido</span>
          <span>{formatCOP(summary.cupoTotal)}</span>
        </div>
      </section>

      {/* Averages */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Promedios de Consumo
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <KpiCard label="Promedio Diario" value={formatCOP(summary.promedioDiario)} color="blue" />
          <KpiCard label="Promedio Semanal" value={formatCOP(summary.promedioSemanal)} color="blue" />
          <KpiCard label="Promedio Mensual" value={formatCOP(summary.promedioMensual)} color="blue" />
          <KpiCard label="Ticket Promedio/Reserva" value={formatCOP(summary.ticketPromedio)} color="gray" />
        </div>
      </section>

      {/* Forecast Quick */}
      {bestForecast && (
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Pronóstico Más Probable (Escenario Medio)</h2>
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-xs text-gray-500">Fecha estimada de agotamiento</p>
              <p className="text-xl font-bold text-gray-900">
                {bestForecast.fechaEstimada
                  ? bestForecast.fechaEstimada.toLocaleDateString('es-CO', { dateStyle: 'long' })
                  : 'N/D'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Días restantes</p>
              <p className="text-xl font-bold text-gray-900">{formatNumber(bestForecast.diasRestantes)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Semanas restantes</p>
              <p className="text-xl font-bold text-gray-900">{formatNumber(bestForecast.semanasRestantes, 1)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Nivel de riesgo</p>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold mt-1 ${riskBg(bestForecast.nivelRiesgo)}`}>
                {bestForecast.nivelRiesgo.toUpperCase()}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Reservation stats */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Estado de Reservas
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Reservas Efectivas" value={formatNumber(summary.numReservasEfectivas)} color="green" />
          <KpiCard label="Reservas Canceladas" value={formatNumber(summary.numReservasCanceladas)} color="red" />
          <KpiCard label="Duplicadas" value={formatNumber(summary.numDuplicados)} color="yellow" />
          <KpiCard label="En Revisión" value={formatNumber(summary.numEnRevision)} color="gray" />
        </div>
      </section>

      {/* Highlights */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Destacados
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {topHotel && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Hotel con mayor consumo</p>
              <p className="font-semibold text-gray-900 text-sm leading-tight">{topHotel.hotel}</p>
              <p className="text-blue-700 font-bold mt-1">{formatCOP(topHotel.ventaEfectiva)}</p>
              <p className="text-xs text-gray-500">{formatNumber(topHotel.numReservas)} reservas · {formatPct(topHotel.participacion)} del total</p>
            </div>
          )}
          {maxMonth && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Mes de mayor consumo</p>
              <p className="font-semibold text-gray-900">{maxMonth[0]}</p>
              <p className="text-blue-700 font-bold mt-1">{formatCOP(maxMonth[1])}</p>
            </div>
          )}
          {maxWeek && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Semana de mayor consumo</p>
              <p className="font-semibold text-gray-900">{maxWeek[0]}</p>
              <p className="text-blue-700 font-bold mt-1">{formatCOP(maxWeek[1])}</p>
            </div>
          )}
        </div>
      </section>

      {/* Exports */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Exportar Datos
        </h2>
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'resumen', label: '📊 Resumen Ejecutivo (Excel)' },
            { key: 'efectivas', label: '✅ Reservas Efectivas' },
            { key: 'canceladas', label: '❌ Reservas Canceladas' },
            { key: 'inconsistencias', label: '⚠️ Inconsistencias' },
            { key: 'duplicados', label: '🔁 Duplicados' },
          ].map((exp) => (
            <button
              key={exp.key}
              onClick={() => handleExport(exp.key)}
              className="px-4 py-2 bg-white border border-gray-200 text-sm rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
            >
              {exp.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
