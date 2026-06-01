'use client';

import type { GoogleBusinessLocation } from '../../types/googleBusiness';

interface Props {
  locations: GoogleBusinessLocation[];
  selectedId: string | null;
  onSelect: (id: string, name: string) => void;
  loading: boolean;
  error?: string | null;
}

export default function GoogleBusinessLocationSelector({ locations, selectedId, onSelect, loading, error }: Props) {
  if (loading) return <div className="gbp-selector-loading">Cargando ubicaciones...</div>;
  if (error) return <div className="gbp-error-msg">{error}</div>;
  if (locations.length === 0) return (
    <div className="gbp-empty-msg">No se encontraron ubicaciones disponibles para esta cuenta.</div>
  );

  return (
    <div className="gbp-selector">
      <label className="gbp-label">Ubicación / Hotel</label>
      <select
        className="gbp-select"
        value={selectedId ?? ''}
        onChange={e => {
          const loc = locations.find(l => l.locationId === e.target.value);
          if (loc) onSelect(loc.locationId, loc.locationName);
        }}
      >
        <option value="">— Seleccionar ubicación —</option>
        {locations.map(l => (
          <option key={l.locationId} value={l.locationId}>{l.locationName}{l.address ? ` — ${l.address}` : ''}</option>
        ))}
      </select>
    </div>
  );
}
