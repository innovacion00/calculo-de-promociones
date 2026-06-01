'use client';

import type { GoogleBusinessAccount } from '../../types/googleBusiness';

interface Props {
  accounts: GoogleBusinessAccount[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  error?: string | null;
}

export default function GoogleBusinessAccountSelector({ accounts, selectedId, onSelect, loading, error }: Props) {
  if (loading) return <div className="gbp-selector-loading">Cargando cuentas...</div>;
  if (error) return <div className="gbp-error-msg">{error}</div>;
  if (accounts.length === 0) return (
    <div className="gbp-empty-msg">No se encontraron cuentas de Google Business asociadas a este usuario.</div>
  );

  return (
    <div className="gbp-selector">
      <label className="gbp-label">Cuenta de Google Business</label>
      <select
        className="gbp-select"
        value={selectedId ?? ''}
        onChange={e => onSelect(e.target.value)}
      >
        <option value="">— Seleccionar cuenta —</option>
        {accounts.map(a => (
          <option key={a.accountId} value={a.accountId}>{a.accountName}</option>
        ))}
      </select>
    </div>
  );
}
