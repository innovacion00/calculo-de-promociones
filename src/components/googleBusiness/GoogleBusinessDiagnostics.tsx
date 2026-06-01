'use client';

import type { GoogleBusinessDiagnostics } from '../../types/googleBusiness';

interface Props {
  diagnostics: GoogleBusinessDiagnostics | null;
}

export default function GoogleBusinessDiagnostics({ diagnostics }: Props) {
  if (!diagnostics) return null;

  const rows = [
    { label: 'Estado de conexión', value: diagnostics.connected ? '✅ Conectado' : '❌ No conectado' },
    { label: 'Token', value: diagnostics.tokenStatus === 'active' ? '✅ Activo' : `⚠️ ${diagnostics.tokenStatus}` },
    { label: 'Correo conectado', value: diagnostics.connectedEmail ?? '—' },
    { label: 'Conectado desde', value: diagnostics.connectedAt ? new Date(diagnostics.connectedAt).toLocaleString('es-MX') : '—' },
    { label: 'Cuentas detectadas', value: String(diagnostics.accountCount) },
    { label: 'Ubicaciones detectadas', value: String(diagnostics.locationCount) },
    { label: 'Reseñas cargadas', value: String(diagnostics.reviewCount) },
    { label: 'Verificado en', value: new Date(diagnostics.checkedAt).toLocaleString('es-MX') },
  ];

  return (
    <div className="gbp-diagnostics">
      <h4>Diagnóstico de conexión</h4>
      <table className="gbp-diag-table">
        <tbody>
          {rows.map(r => (
            <tr key={r.label}>
              <td className="gbp-diag-label">{r.label}</td>
              <td className="gbp-diag-value">{r.value}</td>
            </tr>
          ))}
          {diagnostics.lastError && (
            <tr>
              <td className="gbp-diag-label">Último error</td>
              <td className="gbp-diag-value gbp-diag-error">{diagnostics.lastError}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
