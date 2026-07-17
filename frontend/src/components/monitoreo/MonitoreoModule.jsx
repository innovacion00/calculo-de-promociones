// Módulo Monitoreo (estado Bitrix Timeman en tiempo real). Port de monInit/monRender.
// Auto-refresca cada 30s, como el original.
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../lib/api.js';

const STATUS_LABEL = { OPENED: 'Activo', PAUSED: 'En pausa', CLOSED: 'Cerrado' };
const REFRESH_MS = 30000;

/** @param {string} nombre */
function initials(nombre) {
  return (nombre || '').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

export default function MonitoreoModule() {
  const [users, setUsers] = useState(/** @type {any[]} */ ([]));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(/** @type {any} */ (null));

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/status/users-status');
      setUsers(res.users ?? []);
      setError('');
    } catch {
      setError('No fue posible cargar los usuarios en tiempo real.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, REFRESH_MS);
    return () => clearInterval(intervalRef.current);
  }, [load]);

  const total = users.length;
  const opened = users.filter((u) => u.status === 'OPENED').length;
  const paused = users.filter((u) => u.status === 'PAUSED').length;
  const closed = users.filter((u) => u.status === 'CLOSED').length;

  return (
    <div>
      <div className="mon-module-header">
        <div>
          <span className="mon-module-title">🖥️ Monitoreo Bitrix24</span>
          <span className="mon-module-subtitle"> — Estado en tiempo real de usuarios</span>
        </div>
        <button className="mon-refresh-btn" onClick={load} title="Actualizar">↺ Actualizar</button>
      </div>

      <div className="mon-stats-grid">
        {[['Total', total], ['Activos', opened], ['En pausa', paused], ['Cerrados', closed]].map(([label, value]) => (
          <div className="mon-stat-card" key={label}>
            <div className="mon-stat-label">{label}</div>
            <div className="mon-stat-value">{value}</div>
          </div>
        ))}
      </div>

      {error && <div className="mon-msg error">{error}</div>}
      {loading && !users.length && <div className="mon-msg">Cargando…</div>}

      <div className="mon-users-grid">
        {users.map((u) => {
          const statusClass = (u.status || '').toLowerCase();
          return (
            <div className="mon-user-card" key={u.id}>
              <div className="mon-user-head">
                <div className="mon-user-avatar">{initials(u.nombre)}</div>
                <div>
                  <div className="mon-user-name">{u.nombre}</div>
                  <div className="mon-user-id">ID de usuario: {u.id}</div>
                </div>
              </div>
              <div className={`mon-user-status ${statusClass}`}>
                <span className="mon-dot"></span>{STATUS_LABEL[u.status] ?? u.status}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
