// Módulo Gestión Financiera: pestañas Conciliaciones / Saldos / Abonos.
// Port del pane #module-financial de index.html (finSwitchTab).
import { useState } from 'react';
import ReconciliationsTab from './ReconciliationsTab.jsx';
import BalancesTab from './BalancesTab.jsx';
import AbonosTab from './AbonosTab.jsx';

const TABS = [
  { id: 'reconciliations', label: '🏦 Conciliaciones' },
  { id: 'balances', label: '💳 Saldos Pendientes' },
  { id: 'abonos', label: '💸 Abonos' },
];

export default function FinancialModule() {
  const [tab, setTab] = useState('reconciliations');

  return (
    <div>
      <div className="fin-header">
        <h2>💰 Gestión Financiera</h2>
      </div>
      <div className="fin-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`fin-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        <button className="fin-tab" disabled title="Disponible en Plan 3">📋 Cuentas por Cobrar</button>
      </div>

      {/* Cada pestaña se monta al activarse; así el PMS (lento) no se consulta hasta abrir Saldos. */}
      {tab === 'reconciliations' && <ReconciliationsTab />}
      {tab === 'balances' && <BalancesTab />}
      {tab === 'abonos' && <AbonosTab />}
    </div>
  );
}
