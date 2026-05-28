'use client';

import { useState, useMemo } from 'react';
import { usePrepurchase } from '@/context/PrepurchaseContext';
import { formatCOP } from '@/lib/prepurchaseSettings';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  buildDailyData,
  buildWeeklyData,
  buildMonthlyData,
  buildAccumulatedData,
  buildBalanceData,
  buildReservationDistribution,
  buildRealVsProjected,
} from '@/lib/chartDataTransformers';
import { calcCupoTotal } from '@/lib/prepurchaseSettings';

const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#ef4444', '#8b5cf6', '#06b6d4', '#eab308'];

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function CopFormatter(value: number) {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ color?: string; name?: string; value?: number | string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? formatCOP(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

type ViewMode = 'diario' | 'semanal' | 'mensual';

export default function StatisticalChartsTab() {
  const { classifiedRows, config, summary, hotelSummaries, chartData: ctxChartData } = usePrepurchase();

  // Filters
  const [viewMode, setViewMode] = useState<ViewMode>('diario');
  const [includeOC, setIncludeOC] = useState(true);
  const [includeNeg, setIncludeNeg] = useState(true);
  const [includeReview, setIncludeReview] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [hotelFilter, setHotelFilter] = useState('all');
  const [consumptionType, setConsumptionType] = useState<'bruto' | 'neto'>('bruto');

  const hotels = useMemo(() => {
    const set = new Set(classifiedRows.map((r) => r.hotelBase).filter(Boolean));
    return Array.from(set).sort();
  }, [classifiedRows]);

  // Apply filters to rows
  const filteredRows = useMemo(() => {
    return classifiedRows.filter((r) => {
      if (!includeOC && r.status === 'overCommission') return false;
      if (!includeNeg && r.amount < 0) return false;
      if (!includeReview && r.status === 'review') return false;
      if (hotelFilter !== 'all' && r.hotelBase !== hotelFilter) return false;
      if (dateFrom && r.date && r.date < new Date(dateFrom)) return false;
      if (dateTo && r.date && r.date > new Date(dateTo)) return false;
      return true;
    });
  }, [classifiedRows, includeOC, includeNeg, includeReview, hotelFilter, dateFrom, dateTo]);

  const cupoTotal = calcCupoTotal(config);

  const dailyData = useMemo(() => buildDailyData(filteredRows), [filteredRows]);
  const weeklyData = useMemo(() => buildWeeklyData(filteredRows), [filteredRows]);
  const monthlyData = useMemo(() => buildMonthlyData(filteredRows, cupoTotal), [filteredRows, cupoTotal]);
  const accumulatedData = useMemo(() => buildAccumulatedData(dailyData, cupoTotal), [dailyData, cupoTotal]);
  const balanceData = useMemo(() => buildBalanceData(dailyData, cupoTotal, config.valorPrecompra), [dailyData, cupoTotal, config.valorPrecompra]);
  const distributionData = useMemo(() => buildReservationDistribution(filteredRows), [filteredRows]);
  const realVsProjected = useMemo(
    () => buildRealVsProjected(dailyData, summary?.promedioDiario ?? 0),
    [dailyData, summary]
  );

  const timeKey = consumptionType === 'bruto' ? 'ventaBruta' : 'consumoNeto';

  // Subsample for large datasets
  function subsample<T>(data: T[], maxPoints = 60): T[] {
    if (data.length <= maxPoints) return data;
    const step = Math.ceil(data.length / maxPoints);
    return data.filter((_, i) => i % step === 0);
  }

  const dailySampled = subsample(dailyData, 60);
  const accSampled = subsample(accumulatedData, 60);
  const balanceSampled = subsample(balanceData, 60);
  const rvpSampled = subsample(realVsProjected, 60);

  return (
    <div className="p-6 space-y-5">
      {/* Filters Panel */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Filtros de análisis</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Vista</label>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              {(['diario', 'semanal', 'mensual'] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    viewMode === v ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipo consumo</label>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              {([['bruto', 'Bruto'], ['neto', 'Neto']] as const).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setConsumptionType(v)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    consumptionType === v ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Hotel</label>
            <select
              value={hotelFilter}
              onChange={(e) => setHotelFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs"
            >
              <option value="all">Todos</option>
              {hotels.map((h) => (
                <option key={h} value={h}>{h.replace('Hotel ', '').replace(' By Geh Suites', '').replace(' By GEH Suites', '')}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Desde</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hasta</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs" />
          </div>

          <div className="flex items-center gap-4 ml-2">
            {[
              { id: 'oc', label: 'Over-Commission', val: includeOC, set: setIncludeOC },
              { id: 'neg', label: 'Ajustes negativos', val: includeNeg, set: setIncludeNeg },
              { id: 'rev', label: 'En revisión', val: includeReview, set: setIncludeReview },
            ].map((opt) => (
              <label key={opt.id} className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={opt.val}
                  onChange={(e) => opt.set(e.target.checked)}
                  className="rounded"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* 1. Consumo acumulado */}
        <ChartCard title="1. Consumo Acumulado de la Precompra">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={accSampled}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={CopFormatter} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="acumulado" name="Acumulado" stroke="#3b82f6" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="cupoTotal" name="Cupo Total" stroke="#22c55e" dot={false} strokeWidth={1.5} strokeDasharray="5 5" />
              <Line type="monotone" dataKey="saldo" name="Saldo" stroke="#ef4444" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 2. Consumo diario / semanal / mensual */}
        <ChartCard title={`2. Consumo ${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}`}>
          <ResponsiveContainer width="100%" height={280}>
            {viewMode === 'diario' ? (
              <BarChart data={dailySampled}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={CopFormatter} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey={timeKey} name={consumptionType === 'bruto' ? 'Venta Bruta' : 'Consumo Neto'} fill="#3b82f6" radius={[2, 2, 0, 0]} />
              </BarChart>
            ) : viewMode === 'semanal' ? (
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="semana" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={CopFormatter} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="ventaBruta" name="Venta Bruta" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="overCommission" name="Over-Commission" fill="#f97316" radius={[2, 2, 0, 0]} />
              </BarChart>
            ) : (
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={CopFormatter} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="ventaBruta" name="Venta Bruta" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="consumoNeto" name="Consumo Neto" fill="#22c55e" radius={[2, 2, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </ChartCard>

        {/* 3. Participación por hotel */}
        <ChartCard title="3. Participación por Hotel (Top 10)">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              layout="vertical"
              data={hotelSummaries.slice(0, 10).map((h) => ({
                ...h,
                shortName: h.hotel.replace(/Hotel\s+/i, '').replace(/\s+By\s+Geh Suites/i, '').replace(/\s+By\s+GEH Suites/i, '').trim().slice(0, 22),
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={CopFormatter} />
              <YAxis type="category" dataKey="shortName" tick={{ fontSize: 10 }} width={120} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload as typeof hotelSummaries[0] & { shortName: string };
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs">
                      <p className="font-semibold mb-1">{d.hotel}</p>
                      <p>Venta: {formatCOP(d.ventaEfectiva)}</p>
                      <p>Reservas: {d.numReservas}</p>
                      <p>Participación: {(d.participacion * 100).toFixed(1)}%</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="ventaEfectiva" name="Venta Efectiva" fill="#3b82f6" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 4. Evolución del saldo restante */}
        <ChartCard title="4. Evolución del Saldo Restante">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={balanceSampled}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={CopFormatter} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="saldoComercial" name="Saldo Comercial" stroke="#3b82f6" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="saldoNeto" name="Saldo Neto Prepago" stroke="#8b5cf6" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 5. Consumo real vs proyectado */}
        <ChartCard title="5. Consumo Real vs. Proyectado">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={rvpSampled}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={CopFormatter} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="real" name="Consumo Real" stroke="#3b82f6" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="proyectado" name="Consumo Proyectado" stroke="#f97316" dot={false} strokeWidth={2} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 6. Distribución de reservas */}
        <ChartCard title="6. Distribución de Reservas">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={distributionData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine
              >
                {distributionData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [Number(value).toLocaleString('es-CO'), String(name)]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 7. Top hoteles ranking */}
        <ChartCard title="7. Ranking Top Hoteles por Consumo">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-2 pr-3 text-left text-gray-500 font-medium">#</th>
                  <th className="py-2 pr-3 text-left text-gray-500 font-medium">Hotel</th>
                  <th className="py-2 pr-3 text-right text-gray-500 font-medium">Venta</th>
                  <th className="py-2 pr-3 text-right text-gray-500 font-medium">Reservas</th>
                  <th className="py-2 pr-3 text-right text-gray-500 font-medium">Ticket Prom.</th>
                  <th className="py-2 text-right text-gray-500 font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {hotelSummaries.slice(0, 10).map((h, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 pr-3 font-bold text-gray-400">{i + 1}</td>
                    <td className="py-2 pr-3 text-gray-800 max-w-[180px] truncate">
                      {h.hotel.replace(/Hotel\s+/i, '').replace(/\s+By\s+(Geh|GEH) Suites/i, '')}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-blue-700">{formatCOP(h.ventaEfectiva)}</td>
                    <td className="py-2 pr-3 text-right">{h.numReservas.toLocaleString('es-CO')}</td>
                    <td className="py-2 pr-3 text-right font-mono">{formatCOP(h.ticketPromedio)}</td>
                    <td className="py-2 text-right font-medium text-gray-600">{(h.participacion * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        {/* 8. Consumo mensual con % */}
        <ChartCard title="8. Consumo Mensual (Venta + % Cupo)">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={CopFormatter} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="ventaBruta" name="Venta Bruta" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              <Bar dataKey="overCommission" name="Over-Commission" fill="#f97316" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>
    </div>
  );
}
