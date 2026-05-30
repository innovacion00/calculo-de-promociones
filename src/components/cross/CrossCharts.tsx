'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { CrossSummary } from '@/lib/crossEngine';
import { formatCOP } from '@/lib/prepurchaseSettings';

interface Props {
  summary: CrossSummary;
}

const GOLD = '#c8920a';
const GREEN = '#22c55e';
const RED = '#ef4444';
const ORANGE = '#f97316';
const YELLOW = '#eab308';

export default function CrossCharts({ summary }: Props) {
  const countData = [
    { name: 'Coincidentes', value: summary.coincidentes, fill: GREEN },
    { name: 'Price no GEH', value: summary.enPriceNoGEH, fill: ORANGE },
    { name: 'GEH no Price', value: summary.enGEHNoPrice, fill: RED },
    { name: 'Dup. Price', value: summary.duplicadosPrice, fill: YELLOW },
    { name: 'Dup. GEH', value: summary.duplicadosGEH, fill: GOLD },
  ];

  const valueData = [
    { name: 'Price no GEH', value: summary.valorEnPriceNoGEH },
    { name: 'GEH no Price', value: summary.valorEnGEHNoPrice },
    { name: 'Coincidentes', value: summary.valorCoincidentes },
  ];

  const pieData = [
    { name: 'Coincidentes', value: summary.coincidentes },
    { name: 'Price no GEH', value: summary.enPriceNoGEH },
    { name: 'GEH no Price', value: summary.enGEHNoPrice },
    { name: 'Dup. Price', value: summary.duplicadosPrice },
    { name: 'Dup. GEH', value: summary.duplicadosGEH },
  ].filter((d) => d.value > 0);

  const PIE_COLORS = [GREEN, ORANGE, RED, YELLOW, GOLD];

  const cardClass = 'bg-white rounded-xl border border-gray-200 p-5';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Chart 1: Counts */}
      <div className={cardClass}>
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Conteo por Categoría</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={countData}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" name="Registros">
              {countData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 2: Values */}
      <div className={cardClass}>
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Valor Económico por Categoría</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={valueData}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatCOP(v).replace('$', '$').slice(0, 10)} />
            <Tooltip formatter={(v) => formatCOP(Number(v ?? 0))} />
            <Bar dataKey="value" name="Valor" fill={GOLD} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 3: By date */}
      {summary.byDate.length > 0 && (
        <div className={cardClass}>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Diferencias por Período</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={summary.byDate}>
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="enPriceNoGEH" name="Price no GEH" fill={ORANGE} />
              <Bar dataKey="enGEHNoPrice" name="GEH no Price" fill={RED} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Chart 4: Pie */}
      {pieData.length > 0 && (
        <div className={cardClass}>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Distribución %</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ percent }: { percent?: number }) => `${((percent ?? 0) * 100).toFixed(1)}%`}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
