'use client';

import { useState } from 'react';
import { usePrepurchase } from '@/context/PrepurchaseContext';
import Dashboard from './Dashboard';
import ReservationsTable from './ReservationsTable';
import PrepurchaseSettings from './PrepurchaseSettings';
import StatisticalChartsTab from './StatisticalChartsTab';
import ForecastTab from './ForecastTab';

type Tab = 'dashboard' | 'reservations' | 'settings' | 'charts' | 'forecast';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'reservations', label: 'Datos de Reservas', icon: '📋' },
  { id: 'settings', label: 'Configuración', icon: '⚙️' },
  { id: 'charts', label: 'Análisis Gráfico', icon: '📈' },
  { id: 'forecast', label: 'Pronóstico', icon: '🔮' },
];

export default function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { fileName, setRawRows, setFileName, rawRows, maxFileDate } = usePrepurchase();

  const today = new Date();
  const showWarning = maxFileDate && maxFileDate < today;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-gray-900 text-white transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-16'
        } flex-shrink-0`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-700">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold">G</span>
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">GEH Suites</p>
              <p className="text-xs text-gray-400 truncate">Control Precompra</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span className="text-base flex-shrink-0">{tab.icon}</span>
              {sidebarOpen && <span className="truncate">{tab.label}</span>}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-700 space-y-2">
          {sidebarOpen && fileName && (
            <p className="text-xs text-gray-500 truncate px-1" title={fileName}>
              📁 {fileName}
            </p>
          )}
          <button
            onClick={() => {
              setRawRows([]);
              setFileName('');
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors`}
          >
            <span>🔄</span>
            {sidebarOpen && <span>Cargar nuevo archivo</span>}
          </button>
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="w-full flex items-center justify-center py-2 text-gray-500 hover:text-white"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h1>
            {maxFileDate && (
              <p className="text-xs text-gray-500">
                Datos hasta: {maxFileDate.toLocaleDateString('es-CO', { dateStyle: 'medium' })} ·{' '}
                {rawRows.length.toLocaleString('es-CO')} filas procesadas
              </p>
            )}
          </div>
          {showWarning && (
            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs px-3 py-2 rounded-lg">
              <span>⚠️</span>
              <span>
                Archivo con información hasta{' '}
                {maxFileDate!.toLocaleDateString('es-CO')}. El análisis puede
                estar desactualizado.
              </span>
            </div>
          )}
        </header>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'reservations' && <ReservationsTable />}
          {activeTab === 'settings' && <PrepurchaseSettings />}
          {activeTab === 'charts' && <StatisticalChartsTab />}
          {activeTab === 'forecast' && <ForecastTab />}
        </div>
      </main>
    </div>
  );
}
