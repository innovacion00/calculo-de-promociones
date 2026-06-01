'use client';

import type { GBPStatusResponse } from '../../types/googleBusiness';

interface Props {
  status: GBPStatusResponse | null;
  loading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export default function GoogleBusinessStatusCard({ status, loading, onConnect, onDisconnect }: Props) {
  if (loading) return <div className="gbp-status-card loading">Verificando conexión...</div>;

  const connected = status?.connected ?? false;

  return (
    <div className={`gbp-status-card ${connected ? 'connected' : 'disconnected'}`}>
      <div className="gbp-status-indicator">
        <span className={`gbp-dot ${connected ? 'green' : 'red'}`} />
        <strong>{connected ? 'Conectado' : 'No conectado'}</strong>
      </div>
      {connected && status && (
        <div className="gbp-status-details">
          <span>Cuenta: {status.connectedEmail ?? '—'}</span>
          <span>Desde: {status.connectedAt ? new Date(status.connectedAt).toLocaleDateString('es-MX') : '—'}</span>
          <span>Token: {status.tokenStatus === 'active' ? '✅ Activo' : '⚠️ ' + status.tokenStatus}</span>
        </div>
      )}
      <div className="gbp-status-actions">
        {connected
          ? <button className="gbp-btn danger" onClick={onDisconnect}>Desconectar</button>
          : <button className="gbp-btn primary" onClick={onConnect}>Conectar Google Business Profile</button>
        }
      </div>
    </div>
  );
}
