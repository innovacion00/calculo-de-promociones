'use client';

import { useState } from 'react';
import { useCross } from '@/context/CrossContext';
import { exportCrossResult } from '@/lib/crossExport';
import CrossFileUploader from './CrossFileUploader';
import CrossDashboard from './CrossDashboard';
import CrossDifferencesTable from './CrossDifferencesTable';
import CrossCoincidentesTable from './CrossCoincidentesTable';
import CrossDuplicatesTable from './CrossDuplicatesTable';
import CrossColumnMapper from './CrossColumnMapper';

type SubTab = 'upload' | 'resumen' | 'diferencias' | 'priceNoGEH' | 'gehNoPrice' | 'coincidentes' | 'duplicados' | 'config';

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'upload', label: 'Archivos' },
  { id: 'resumen', label: 'Resumen' },
  { id: 'diferencias', label: 'Todas las diferencias' },
  { id: 'priceNoGEH', label: 'Price sin GEH' },
  { id: 'gehNoPrice', label: 'GEH sin Price' },
  { id: 'coincidentes', label: 'Coincidentes' },
  { id: 'duplicados', label: 'Duplicados' },
  { id: 'config', label: 'Configuración' },
];

export default function CrossTab() {
  const { priceResult, gehResult, crossResult, priceFileName, gehFileName } = useCross();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('upload');

  const bothLoaded = !!priceResult && !!gehResult;

  const handleExport = () => {
    if (!priceResult || !gehResult || !crossResult) return;
    exportCrossResult(priceResult, gehResult, crossResult);
  };

  if (!bothLoaded && !crossResult) {
    return <CrossFileUploader />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tab bar */}
      <div className="border-b border-gray-200 bg-white px-4 flex items-center gap-1 overflow-x-auto flex-shrink-0">
        {SUB_TABS.map((tab) => {
          const disabled = !crossResult && !['upload', 'config'].includes(tab.id);
          return (
            <button
              key={tab.id}
              onClick={() => !disabled && setActiveSubTab(tab.id)}
              disabled={disabled}
              className="px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors disabled:opacity-40"
              style={
                activeSubTab === tab.id
                  ? { borderColor: '#c8920a', color: '#c8920a' }
                  : { borderColor: 'transparent', color: '#6b7280' }
              }
            >
              {tab.label}
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-2 flex-shrink-0 pl-4 py-1">
          {priceFileName && (
            <span className="text-xs text-gray-400 hidden md:block truncate max-w-[120px]" title={priceFileName}>{priceFileName}</span>
          )}
          {gehFileName && (
            <span className="text-xs text-gray-400 hidden md:block truncate max-w-[120px]" title={gehFileName}>{gehFileName}</span>
          )}
          {crossResult && (
            <button
              onClick={handleExport}
              className="text-xs px-3 py-1.5 rounded-lg text-white transition-colors whitespace-nowrap"
              style={{ backgroundColor: '#c8920a' }}
            >
              Exportar Excel
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeSubTab === 'upload' && <CrossFileUploader />}

        {activeSubTab === 'resumen' && crossResult && (
          <CrossDashboard crossResult={crossResult} />
        )}

        {activeSubTab === 'diferencias' && crossResult && (
          <CrossDifferencesTable records={crossResult.masterTable} />
        )}

        {activeSubTab === 'priceNoGEH' && crossResult && (
          <CrossDifferencesTable
            records={crossResult.masterTable}
            filterType="IN_PRICE_NOT_GEH"
          />
        )}

        {activeSubTab === 'gehNoPrice' && crossResult && (
          <CrossDifferencesTable
            records={crossResult.masterTable}
            filterType="IN_GEH_NOT_PRICE"
          />
        )}

        {activeSubTab === 'coincidentes' && crossResult && (
          <CrossCoincidentesTable
            records={crossResult.masterTable.filter((r) => r.differenceType === 'COINCIDE')}
          />
        )}

        {activeSubTab === 'duplicados' && crossResult && (
          <CrossDuplicatesTable duplicates={crossResult.duplicates} />
        )}

        {activeSubTab === 'config' && <CrossColumnMapper />}
      </div>
    </div>
  );
}
