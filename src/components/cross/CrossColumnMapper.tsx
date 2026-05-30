'use client';

import { useState } from 'react';
import { useCross } from '@/context/CrossContext';
import { ColOverrides } from '@/lib/universalParser';

interface FileMapperProps {
  label: string;
  headers: string[];
  currentOverrides: ColOverrides;
  onApply: (o: ColOverrides) => void;
  detectedIdIdx: number | null;
  detectedNameIdx: number | null;
  detectedValueIdx: number | null;
  detectedDateIdx: number | null;
}

function FileMapper({
  label, headers, currentOverrides, onApply,
  detectedIdIdx, detectedNameIdx, detectedValueIdx, detectedDateIdx,
}: FileMapperProps) {
  const [idCol, setIdCol] = useState<string>(
    currentOverrides.idCol !== undefined ? String(currentOverrides.idCol) : (detectedIdIdx !== null ? String(detectedIdIdx) : '')
  );
  const [nameCol, setNameCol] = useState<string>(
    currentOverrides.nameCol !== undefined ? String(currentOverrides.nameCol) : (detectedNameIdx !== null ? String(detectedNameIdx) : '')
  );
  const [valueCol, setValueCol] = useState<string>(
    currentOverrides.valueCol !== undefined ? String(currentOverrides.valueCol) : (detectedValueIdx !== null ? String(detectedValueIdx) : '')
  );
  const [dateCol, setDateCol] = useState<string>(
    currentOverrides.dateCol !== undefined ? String(currentOverrides.dateCol) : (detectedDateIdx !== null ? String(detectedDateIdx) : '')
  );

  const handleApply = () => {
    const o: ColOverrides = {};
    if (idCol !== '') o.idCol = Number(idCol);
    if (nameCol !== '') o.nameCol = Number(nameCol);
    if (valueCol !== '') o.valueCol = Number(valueCol);
    if (dateCol !== '') o.dateCol = Number(dateCol);
    onApply(o);
  };

  const options = [
    <option key="" value="">— Sin asignar —</option>,
    ...headers.map((h, i) => <option key={i} value={i}>{i}: {h}</option>),
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex-1">
      <h3 className="font-semibold text-gray-800 mb-4">{label}</h3>

      <div className="mb-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-black text-left">
              <th className="px-3 py-2" style={{ color: '#c8920a' }}>Índice</th>
              <th className="px-3 py-2" style={{ color: '#c8920a' }}>Columna</th>
            </tr>
          </thead>
          <tbody>
            {headers.map((h, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-1.5 text-gray-400">{i}</td>
                <td className="px-3 py-1.5 text-gray-700">{h}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: 'Columna ID', value: idCol, set: setIdCol },
          { label: 'Columna Nombre', value: nameCol, set: setNameCol },
          { label: 'Columna Valor', value: valueCol, set: setValueCol },
          { label: 'Columna Fecha', value: dateCol, set: setDateCol },
        ].map(({ label: l, value, set }) => (
          <div key={l}>
            <label className="text-xs font-medium text-gray-600 block mb-1">{l}</label>
            <select
              value={value}
              onChange={(e) => set(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700"
            >
              {options}
            </select>
          </div>
        ))}
      </div>

      <button
        onClick={handleApply}
        className="w-full text-sm py-2 rounded-lg text-white font-medium transition-colors"
        style={{ backgroundColor: '#c8920a' }}
      >
        Aplicar y recalcular
      </button>
    </div>
  );
}

export default function CrossColumnMapper() {
  const { priceResult, gehResult, priceColOverrides, gehColOverrides, setPriceColOverrides, setGehColOverrides } = useCross();

  if (!priceResult && !gehResult) {
    return <p className="text-sm text-gray-500 p-6">Cargue los archivos primero.</p>;
  }

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {priceResult && (
        <FileMapper
          label="Archivo Price"
          headers={priceResult.headers}
          currentOverrides={priceColOverrides}
          onApply={setPriceColOverrides}
          detectedIdIdx={priceResult.detectedColumns.id?.index ?? null}
          detectedNameIdx={priceResult.detectedColumns.name?.index ?? null}
          detectedValueIdx={priceResult.detectedColumns.value?.index ?? null}
          detectedDateIdx={priceResult.detectedColumns.date?.index ?? null}
        />
      )}
      {gehResult && (
        <FileMapper
          label="Archivo GEH Suites"
          headers={gehResult.headers}
          currentOverrides={gehColOverrides}
          onApply={setGehColOverrides}
          detectedIdIdx={gehResult.detectedColumns.id?.index ?? null}
          detectedNameIdx={gehResult.detectedColumns.name?.index ?? null}
          detectedValueIdx={gehResult.detectedColumns.value?.index ?? null}
          detectedDateIdx={gehResult.detectedColumns.date?.index ?? null}
        />
      )}
    </div>
  );
}
