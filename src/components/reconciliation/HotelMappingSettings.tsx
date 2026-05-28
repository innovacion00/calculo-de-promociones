'use client';

import { useState } from 'react';
import { useReconciliation } from '@/context/ReconciliationContext';
import { HotelMapping } from '@/lib/hotelNormalizer';

export default function HotelMappingSettings() {
  const { hotelMapping, setHotelMapping, reconciliationConfig, setReconciliationConfig } = useReconciliation();

  const [entries, setEntries] = useState<[string, string][]>(Object.entries(hotelMapping));
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const mapping: HotelMapping = {};
    for (const [k, v] of entries) {
      if (k.trim()) mapping[k.trim()] = v.trim();
    }
    setHotelMapping(mapping);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAdd = () => {
    if (newKey.trim()) {
      setEntries((prev) => [...prev, [newKey.trim(), newVal.trim()]]);
      setNewKey('');
      setNewVal('');
    }
  };

  const handleDelete = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: 0 | 1, value: string) => {
    setEntries((prev) => {
      const next = [...prev];
      next[index] = [
        field === 0 ? value : next[index][0],
        field === 1 ? value : next[index][1],
      ];
      return next;
    });
  };

  return (
    <div className="space-y-8">
      {/* Reconciliation config */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Parámetros de Conciliación</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Tolerancia valor (COP)</label>
            <input
              type="number"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full"
              value={reconciliationConfig.toleranciaValorCOP}
              onChange={(e) =>
                setReconciliationConfig({
                  ...reconciliationConfig,
                  toleranciaValorCOP: Number(e.target.value),
                })
              }
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Tolerancia fecha (días)</label>
            <input
              type="number"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full"
              value={reconciliationConfig.toleranciaFechaDias}
              onChange={(e) =>
                setReconciliationConfig({
                  ...reconciliationConfig,
                  toleranciaFechaDias: Number(e.target.value),
                })
              }
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Umbral similitud huésped (0–1)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full"
              value={reconciliationConfig.umbralSimilitudHuesped}
              onChange={(e) =>
                setReconciliationConfig({
                  ...reconciliationConfig,
                  umbralSimilitudHuesped: Number(e.target.value),
                })
              }
            />
          </div>
        </div>
      </div>

      {/* Hotel mapping */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Mapeo de Nombres de Hotel</h4>
        <p className="text-xs text-gray-500 mb-3">
          Asigne un nombre corto (GEH interno) a cada nombre largo que aparece en el archivo Price.
        </p>

        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Nombre Price</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Nombre GEH (interno)</th>
                <th className="px-3 py-2 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([k, v], i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="px-3 py-1.5">
                    <input
                      className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
                      value={k}
                      onChange={(e) => handleChange(i, 0, e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
                      value={v}
                      onChange={(e) => handleChange(i, 1, e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <button
                      onClick={() => handleDelete(i)}
                      className="text-red-400 hover:text-red-600 text-sm"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="border-b border-gray-100 bg-gray-50">
                <td className="px-3 py-1.5">
                  <input
                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
                    placeholder="Nombre completo Price..."
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
                    placeholder="Nombre corto GEH..."
                    value={newVal}
                    onChange={(e) => setNewVal(e.target.value)}
                  />
                </td>
                <td className="px-3 py-1.5 text-center">
                  <button
                    onClick={handleAdd}
                    className="text-green-500 hover:text-green-700 text-sm font-bold"
                  >
                    +
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: '#c8920a' }}
          >
            Guardar mapeo
          </button>
          {saved && <span className="text-xs text-green-600">¡Guardado!</span>}
        </div>
      </div>
    </div>
  );
}
