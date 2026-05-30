'use client';

import { useState, useRef, useCallback } from 'react';
import { useCross } from '@/context/CrossContext';

interface UploadZoneProps {
  label: string;
  fileName: string;
  rowCount: number | null;
  idColumn: string | null;
  onFile: (buffer: ArrayBuffer, fileName: string) => void;
  onClear: () => void;
}

function UploadZone({ label, fileName, rowCount, idColumn, onFile, onClear }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setError('Solo se aceptan archivos .xlsx o .xls');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      onFile(buffer, file.name);
    } catch {
      setError('Error al leer el archivo');
    } finally {
      setLoading(false);
    }
  }, [onFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const loaded = !!fileName;

  return (
    <div
      className={`flex-1 rounded-xl border-2 border-dashed p-6 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer min-h-[200px]`}
      style={{
        borderColor: dragging ? '#c8920a' : loaded ? '#22c55e' : '#d1d5db',
        backgroundColor: dragging ? 'rgba(200,146,10,0.05)' : loaded ? 'rgba(34,197,94,0.05)' : '#fafafa',
      }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !loaded && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleChange}
      />
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>

      {loading && (
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-yellow-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Procesando...</p>
        </div>
      )}

      {!loading && loaded && (
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-2xl">✅</span>
          <p className="text-sm font-medium text-gray-800">{fileName}</p>
          <p className="text-xs text-gray-500">{rowCount?.toLocaleString('es-CO')} filas válidas</p>
          {idColumn && <p className="text-xs text-gray-400">Columna ID: <span className="font-medium">{idColumn}</span></p>}
          <button
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="mt-2 text-xs text-gray-400 hover:text-red-500 underline"
          >
            Cambiar archivo
          </button>
        </div>
      )}

      {!loading && !loaded && (
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-3xl text-gray-300">📂</span>
          <p className="text-sm text-gray-500">Arrastre su archivo aquí</p>
          <p className="text-xs text-gray-400">o haga clic para seleccionar</p>
          <p className="text-xs text-gray-300">.xlsx / .xls</p>
        </div>
      )}

      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
    </div>
  );
}

export default function CrossFileUploader() {
  const {
    priceResult, priceFileName, gehResult, gehFileName,
    loadPriceFile, loadGEHFile, clearPriceFile, clearGEHFile,
  } = useCross();

  const bothLoaded = !!priceResult && !!gehResult;

  return (
    <div className="p-6 flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-1">Conciliación Avanzada</h2>
        <p className="text-sm text-gray-500">
          Cargue dos archivos Excel para cruzarlos automáticamente por columna de ID/localizador.
        </p>
      </div>

      {bothLoaded && (
        <div className="rounded-lg px-4 py-3 text-sm font-medium" style={{ backgroundColor: 'rgba(34,197,94,0.1)', color: '#16a34a', border: '1px solid #86efac' }}>
          ✅ Ambos archivos cargados — navegue a las pestañas para ver los resultados.
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        <UploadZone
          label="Archivo Price"
          fileName={priceFileName}
          rowCount={priceResult?.rows.length ?? null}
          idColumn={priceResult?.detectedColumns.id?.header ?? null}
          onFile={loadPriceFile}
          onClear={clearPriceFile}
        />
        <UploadZone
          label="Archivo GEH Suites"
          fileName={gehFileName}
          rowCount={gehResult?.rows.length ?? null}
          idColumn={gehResult?.detectedColumns.id?.header ?? null}
          onFile={loadGEHFile}
          onClear={clearGEHFile}
        />
      </div>
    </div>
  );
}
