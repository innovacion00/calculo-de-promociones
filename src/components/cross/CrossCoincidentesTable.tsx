'use client';

import { useState } from 'react';
import { CrossRecord } from '@/lib/crossEngine';
import { formatCOP } from '@/lib/prepurchaseSettings';

interface Props {
  records: CrossRecord[];
}

const PAGE_SIZE = 50;

export default function CrossCoincidentesTable({ records }: Props) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(records.length / PAGE_SIZE);
  const pageData = records.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{records.length.toLocaleString('es-CO')} registros coincidentes</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-black text-left">
              {['ID', 'Nombre Price', 'Nombre GEH', 'Valor Price', 'Valor GEH', 'Fecha Price', 'Fecha GEH'].map((h) => (
                <th key={h} className="px-3 py-2.5 font-medium whitespace-nowrap" style={{ color: '#c8920a' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((r, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-green-50">
                <td className="px-3 py-2 font-mono text-gray-800">{r.id}</td>
                <td className="px-3 py-2 text-gray-700 max-w-[180px] truncate">{r.priceName ?? '—'}</td>
                <td className="px-3 py-2 text-gray-700 max-w-[180px] truncate">{r.gehName ?? '—'}</td>
                <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{r.priceValue !== undefined ? formatCOP(r.priceValue) : '—'}</td>
                <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{r.gehValue !== undefined ? formatCOP(r.gehValue) : '—'}</td>
                <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{r.priceDateStr || '—'}</td>
                <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{r.gehDateStr || '—'}</td>
              </tr>
            ))}
            {pageData.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-400">Sin registros coincidentes</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-end text-xs">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40">Anterior</button>
          <span className="text-gray-500">Página {page + 1} de {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40">Siguiente</button>
        </div>
      )}
    </div>
  );
}
