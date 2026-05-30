'use client';

import { DuplicateRecord } from '@/lib/crossEngine';
import { formatCOP } from '@/lib/prepurchaseSettings';

interface Props {
  duplicates: DuplicateRecord[];
}

export default function CrossDuplicatesTable({ duplicates }: Props) {
  const price = duplicates.filter((d) => d.source === 'Price');
  const geh = duplicates.filter((d) => d.source === 'GEH Suites');

  const Section = ({ title, items }: { title: string; items: DuplicateRecord[] }) => (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title} ({items.length})</h3>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-black text-left">
              {['Archivo', 'ID', 'Veces', 'Nombres', 'Valor Acumulado'].map((h) => (
                <th key={h} className="px-3 py-2.5 font-medium whitespace-nowrap" style={{ color: '#c8920a' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((d, i) => (
              <tr key={i} className="border-b border-yellow-100" style={{ backgroundColor: 'rgba(234,179,8,0.08)' }}>
                <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{d.source}</td>
                <td className="px-3 py-2 font-mono text-gray-800">{d.id}</td>
                <td className="px-3 py-2 text-gray-700 font-bold">{d.count}</td>
                <td className="px-3 py-2 text-gray-600 max-w-[300px] truncate">{d.names.join(', ') || '—'}</td>
                <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{formatCOP(d.totalValue)}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">Sin duplicados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (duplicates.length === 0) {
    return <p className="text-sm text-gray-500">No se encontraron duplicados en ningún archivo.</p>;
  }

  return (
    <div className="space-y-8">
      {price.length > 0 && <Section title="Duplicados en Price" items={price} />}
      {geh.length > 0 && <Section title="Duplicados en GEH Suites" items={geh} />}
    </div>
  );
}
