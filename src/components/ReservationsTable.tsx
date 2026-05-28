'use client';

import { useState, useMemo } from 'react';
import { usePrepurchase } from '@/context/PrepurchaseContext';
import { ClassifiedRow, ReservationStatus } from '@/lib/reservationClassifier';
import { formatCOP } from '@/lib/prepurchaseSettings';

const GOLD = '#c8920a';
const BLACK = '#0d0d0d';

const STATUS_LABELS: Record<ReservationStatus, string> = {
  effective: 'Efectiva',
  cancelled: 'Cancelada',
  overCommission: 'Over-Commission',
  overCommissionCancellation: 'OC Cancelación',
  modification: 'Modificación',
  duplicate: 'Duplicada',
  review: 'En Revisión',
};

const STATUS_COLORS: Record<ReservationStatus, string> = {
  effective: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  overCommission: 'bg-yellow-100 text-yellow-800',
  overCommissionCancellation: 'bg-orange-100 text-orange-800',
  modification: 'bg-blue-100 text-blue-800',
  duplicate: 'bg-orange-100 text-orange-800',
  review: 'bg-gray-100 text-gray-700',
};

const PAGE_SIZE = 50;

export default function ReservationsTable() {
  const { classifiedRows } = usePrepurchase();
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'all'>('all');
  const [hotelFilter, setHotelFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const hotels = useMemo(() => {
    const set = new Set(classifiedRows.map((r) => r.hotelBase).filter(Boolean));
    return Array.from(set).sort();
  }, [classifiedRows]);

  const filtered = useMemo(() => {
    return classifiedRows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (hotelFilter !== 'all' && r.hotelBase !== hotelFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.reservationId.toLowerCase().includes(q) &&
          !r.hotelBase.toLowerCase().includes(q) &&
          !(r.colE?.toLowerCase().includes(q))
        ) return false;
      }
      return true;
    });
  }, [classifiedRows, statusFilter, hotelFilter, search]);

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const inputStyle = {
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
      e.currentTarget.style.borderColor = GOLD;
      e.currentTarget.style.boxShadow = '0 0 0 2px rgba(200,146,10,0.2)';
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
      e.currentTarget.style.borderColor = '#d1d5db';
      e.currentTarget.style.boxShadow = 'none';
    },
  };

  return (
    <div className="p-6 space-y-4">

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Buscar por ID, hotel o cliente..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none w-64"
          {...inputStyle}
        />
        <select value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as ReservationStatus | 'all'); setPage(0); }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
          {...inputStyle}>
          <option value="all">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={hotelFilter}
          onChange={(e) => { setHotelFilter(e.target.value); setPage(0); }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
          {...inputStyle}>
          <option value="all">Todos los hoteles</option>
          {hotels.map((h) => (
            <option key={h} value={h}>
              {h.replace(/Hotel\s+/i, '').replace(/\s+By\s+(Geh|GEH) Suites/i, '')}
            </option>
          ))}
        </select>
        <span className="ml-auto text-sm font-semibold" style={{ color: GOLD }}>
          {filtered.length.toLocaleString('es-CO')} registros
        </span>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: BLACK }}>
                {['ID Reserva', 'Hotel', 'Cliente', 'Fecha', 'Monto', 'Estado'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap text-xs uppercase tracking-wide"
                    style={{ color: GOLD }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500 whitespace-nowrap">{row.reservationId}</td>
                  <td className="px-4 py-2.5 text-gray-800 max-w-xs truncate">
                    {row.hotelBase.replace(/Hotel\s+/i, '').replace(/\s+By\s+(Geh|GEH) Suites/i, '')}
                  </td>
                  <td className="px-4 py-2.5 text-gray-700 max-w-xs truncate">{row.colE ?? '—'}</td>
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                    {row.date ? row.date.toLocaleDateString('es-CO') : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">
                    <span style={{ color: row.amount < 0 ? '#ef4444' : row.amount > 0 ? GOLD : '#374151' }}>
                      {formatCOP(row.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[row.status]}`}>
                      {STATUS_LABELS[row.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
            className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-white transition-colors">
            ← Anterior
          </button>
          <span className="text-sm text-gray-600">
            Página <strong>{page + 1}</strong> de <strong>{totalPages || 1}</strong>
          </span>
          <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-white transition-colors">
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
}
