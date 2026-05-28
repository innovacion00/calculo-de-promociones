'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { usePrepurchase } from '@/context/PrepurchaseContext';
import { parseExcelFile } from '@/lib/excelParser';

export default function FileUpload() {
  const { setRawRows, setFileName } = usePrepurchase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        setError('Solo se aceptan archivos Excel (.xlsx o .xls)');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const buffer = await file.arrayBuffer();
        const rows = parseExcelFile(buffer);
        if (rows.length === 0) {
          setError('No se encontraron datos en el archivo. Verifique el formato.');
          setLoading(false);
          return;
        }
        setRawRows(rows);
        setFileName(file.name);
      } catch (e) {
        setError('Error al procesar el archivo: ' + (e instanceof Error ? e.message : String(e)));
      } finally {
        setLoading(false);
      }
    },
    [setRawRows, setFileName]
  );

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: '#0d0d0d' }}>
      <div className="w-full max-w-lg">

        {/* Header — Logo */}
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/geh-logo.svg"
            alt="GEH Suites Hotels"
            width={320}
            height={128}
            priority
            className="mb-4"
          />
          <p className="text-sm" style={{ color: '#9ca3af' }}>
            Control de Precompra · Price / PriceTravel
          </p>
        </div>

        {/* Upload Card */}
        <div className="rounded-2xl shadow-2xl p-8" style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}>
          <h2 className="text-lg font-semibold text-white mb-4">Cargar archivo de precompra</h2>

          <div
            className="border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer"
            style={{
              borderColor: dragging ? '#c8920a' : '#3a3a3a',
              backgroundColor: dragging ? 'rgba(200,146,10,0.08)' : 'transparent',
            }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
            onMouseEnter={(e) => {
              if (!dragging) (e.currentTarget as HTMLDivElement).style.borderColor = '#c8920a';
            }}
            onMouseLeave={(e) => {
              if (!dragging) (e.currentTarget as HTMLDivElement).style.borderColor = '#3a3a3a';
            }}
          >
            <input
              id="file-input"
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFile}
            />

            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: '#c8920a', borderTopColor: 'transparent' }} />
                <p className="font-medium" style={{ color: '#c8920a' }}>Procesando archivo...</p>
                <p className="text-sm" style={{ color: '#6b7280' }}>Esto puede tomar unos segundos</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <svg className="w-12 h-12" style={{ color: '#c8920a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <div>
                  <p className="text-white font-medium">Arrastre su archivo aquí</p>
                  <p className="text-sm mt-1" style={{ color: '#6b7280' }}>o haga clic para seleccionar</p>
                </div>
                <span className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: '#2a2a2a', color: '#9ca3af' }}>
                  Formatos aceptados: .xlsx, .xls
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-lg border" style={{ backgroundColor: '#1f0a0a', borderColor: '#7f1d1d' }}>
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Info */}
          <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: 'rgba(200,146,10,0.08)', border: '1px solid rgba(200,146,10,0.2)' }}>
            <h3 className="text-sm font-semibold mb-2" style={{ color: '#c8920a' }}>Formato esperado del archivo:</h3>
            <ul className="text-xs space-y-1" style={{ color: '#d4b483' }}>
              <li>• Exportación de reservas Price / PriceTravel para GEH Suites</li>
              <li>• Columnas: ID Reserva, Hotel, Cliente, Fecha, Monto, Moneda</li>
              <li>• El archivo se detecta y procesa automáticamente</li>
              <li>• Los datos quedan solo en su navegador (sin subida a servidor)</li>
            </ul>
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: '#4b5563' }}>
          Procesamiento local — sus datos no se envían a ningún servidor
        </p>
      </div>
    </div>
  );
}
