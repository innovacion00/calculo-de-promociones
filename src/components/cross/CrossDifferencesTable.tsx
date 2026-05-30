'use client';

import { useState, useMemo } from 'react';
import { CrossRecord, DifferenceType } from '@/lib/crossEngine';
import { formatCOP } from '@/lib/prepurchaseSettings';

interface Props {
  records: CrossRecord[];
  filterType?: DifferenceType;
}

const TYPE_LABELS: Record<DifferenceType, string> = {
  IN_PRICE_NOT_GEH: 'Price no GEH',
  IN_GEH_NOT_PRICE: 'GEH no Price',
  COINCIDE: 'Coincide',
  DUPLICADO_PRICE: 'Dup. Price',
  DUPLICADO_GEH: 'Dup. GEH',
};

const ROW_BG: Record<DifferenceType, string> = {
  IN_PRICE_NOT_GEH: 'rgba(249,115,22,0.08)',
  IN_GEH_NOT_PRICE: 'rgba(239,68,68,0.08)',
  COINCIDE: 'rgba(34,197,94,0.05)',
  DUPLICADO_PRICE: 'rgba(234,179,8,0.1)',
  DUPLICADO_GEH: 'rgba(200,146,10,0.1)',
};

const PAGE_SIZE = 50;

export default function CrossDifferencesTable({ records, filterType }: Props) {
  const [tipoFilter, setTipoFilter] = useState<string>(filterType ?? '');
  const [origenFilter, setOrigenFilter] = useState('');
  const [idSearch, setIdSearch] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (tipoFilter && r.differenceType !== tipoFilter) return false;
      if (origenFilter && r.origin !== origenFilter) return false;
      if (idSearch && !r.id.toLowerCase().includes(idSearch.toLowerCase())) return false;
      if (nameSearch && !r.name.toLowerCase().includes(nameSearch.toLowerCase())) return false;
      return true;
    });
  }, [records, tipoFilter, origenFilter, idSearch, nameSearch]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleFilter = () => setPage(0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {!filterType && (
          <select
            value={tipoFilter}
            onChange={(e) => { setTipoFilter(e.target.value); handleFilter(); }}
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700"
          >
            <option value="">Todos los tipos</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        )}
        <select
          value={origenFilter}
          onChange={(e) => { setOrigenFilter(e.target.value); handleFilter(); }}
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700"
        >
          <option value="">Todos los orígenes</option>
          <option value="Price">Price</option>
          <option value="GEH Suites">GEH Suites</option>
          <option value="Ambos">Ambos</option>
        </select>
        <input
          type="text"
          placeholder="Buscar ID..."
          value={idSearch}
          onChange={(e) => { setIdSearch(e.target.value); handleFilter(); }}
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 w-44"
        />
        <input
          type="text"
          placeholder="Buscar nombre..."
          value={nameSearch}
          onChange={(e) => { setNameSearch(e.target.value); handleFilter(); }}
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 w-44"
        />
        <span className="text-xs text-gray-400 self-center ml-auto">{filtered.length.toLocaleString('es-CO')} registros</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-black text-left">
              {['Tipo', 'Origen', 'ID / Localizador', 'Nombre', 'Valor', 'Fecha', 'Observaciones'].map((h) => (
                <th key={h} className="px-3 py-2.5 font-medium whitespace-nowrap" style={{ color: '#c8920a' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((r, i) => (
              <tr key={i} style={{ backgroundColor: ROW_BG[r.differenceType] }} className="border-b border-gray-100">
                <td className="px-3 py-2 font-medium text-gray-700 whitespace-nowrap">{TYPE_LABELS[r.differenceType]}</td>
                <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{r.origin}</td>
                <td className="px-3 py-2 font-mono text-gray-800">{r.id}</td>
                <td className="px-3 py-2 text-gray-700 max-w-[200px] truncate">{r.name}</td>
                <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{r.value ? formatCOP(r.value) : '—'}</td>
                <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{r.dateStr || '—'}</td>
                <td className="px-3 py-2 text-gray-500 max-w-[220px] truncate">{r.observations}</td>
              </tr>
            ))}
            {pageData.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-400">Sin registros</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-end text-xs">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-gray-500">Página {page + 1} de {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
