'use client';

import { useState } from 'react';
import { useReconciliation } from '@/context/ReconciliationContext';
import { exportReconciliation } from '@/lib/reconciliationExport';
import GEHFileUploader from './GEHFileUploader';
import ReconciliationSummaryPanel from './ReconciliationSummaryPanel';
import ReconciliationMasterTable from './ReconciliationMasterTable';
import PriceNotInGEHTable from './PriceNotInGEHTable';
import GEHNotInPriceTable from './GEHNotInPriceTable';
import ReconciliationValueDifferencesTable from './ReconciliationValueDifferencesTable';
import ReconciliationOperationalDifferencesTable from './ReconciliationOperationalDifferencesTable';
import ReconciliationDuplicatesTable from './ReconciliationDuplicatesTable';
import ReconciliationCharts from './ReconciliationCharts';
import HotelMappingSettings from './HotelMappingSettings';

type SubTab =
  | 'resumen'
  | 'general'
  | 'priceNotGEH'
  | 'gehNotPrice'
  | 'valores'
  | 'operativas'
  | 'duplicados'
  | 'graficos'
  | 'configuracion';

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'general', label: 'Tabla General' },
  { id: 'priceNotGEH', label: 'Price sin GEH' },
  { id: 'gehNotPrice', label: 'GEH sin Price' },
  { id: 'valores', label: 'Dif. Valor' },
  { id: 'operativas', label: 'Dif. Operativas' },
  { id: 'duplicados', label: 'Duplicados' },
  { id: 'graficos', label: 'Gráficos' },
  { id: 'configuracion', label: 'Configuración' },
];

export default function ReconciliationTab() {
  const {
    gehRows,
    setGehRows,
    gehFileName,
    setGehFileName,
    reconciliationResult,
    hotelMapping,
    reconciliationConfig,
  } = useReconciliation();

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('resumen');

  if (gehRows.length === 0) {
    return <GEHFileUploader />;
  }

  if (!reconciliationResult) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p className="text-sm">
          Cargue también el archivo Price para activar la conciliación.
        </p>
        <p className="text-xs text-gray-400 mt-1">Archivo GEH cargado: {gehFileName}</p>
        <button
          onClick={() => { setGehRows([]); setGehFileName(''); }}
          className="mt-4 text-xs text-gray-400 hover:text-red-500 underline"
        >
          Cambiar archivo GEH
        </button>
      </div>
    );
  }

  const handleExport = () => {
    exportReconciliation(reconciliationResult, hotelMapping, reconciliationConfig);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tab bar */}
      <div className="border-b border-gray-200 bg-white px-4 flex items-center gap-1 overflow-x-auto flex-shrink-0">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className="px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors"
            style={
              activeSubTab === tab.id
                ? { borderColor: '#c8920a', color: '#c8920a' }
                : { borderColor: 'transparent', color: '#6b7280' }
            }
          >
            {tab.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2 flex-shrink-0 pl-4">
          <span className="text-xs text-gray-400">{gehFileName}</span>
          <button
            onClick={() => { setGehRows([]); setGehFileName(''); }}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200 transition-colors"
          >
            Cambiar archivo GEH
          </button>
          <button
            onClick={handleExport}
            className="text-xs px-3 py-1.5 rounded-lg text-white transition-colors"
            style={{ backgroundColor: '#c8920a' }}
          >
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeSubTab === 'resumen' && (
          <div className="space-y-8">
            <ReconciliationSummaryPanel summary={reconciliationResult.summary} />
          </div>
        )}

        {activeSubTab === 'general' && (
          <ReconciliationMasterTable records={reconciliationResult.masterTable} />
        )}

        {activeSubTab === 'priceNotGEH' && (
          <PriceNotInGEHTable records={reconciliationResult.masterTable} />
        )}

        {activeSubTab === 'gehNotPrice' && (
          <GEHNotInPriceTable records={reconciliationResult.masterTable} />
        )}

        {activeSubTab === 'valores' && (
          <ReconciliationValueDifferencesTable records={reconciliationResult.masterTable} />
        )}

        {activeSubTab === 'operativas' && (
          <ReconciliationOperationalDifferencesTable records={reconciliationResult.masterTable} />
        )}

        {activeSubTab === 'duplicados' && (
          <ReconciliationDuplicatesTable records={reconciliationResult.masterTable} />
        )}

        {activeSubTab === 'graficos' && (
          <ReconciliationCharts result={reconciliationResult} />
        )}

        {activeSubTab === 'configuracion' && (
          <HotelMappingSettings />
        )}
      </div>
    </div>
  );
}
