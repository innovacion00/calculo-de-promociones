// Shell autenticado (isla React): header + sidebar + gate de sesión.
// Consulta /api/auth/me; si no hay sesión redirige a /login. El contenido de cada
// página Astro se pasa como children (slot) y se monta en .content-area.
import Sidebar from './Sidebar.jsx';
import { useSession } from './useSession.js';
import { logout } from '../../lib/session.js';

const ROLE_LABELS = {
  master_admin: 'Master Admin',
  admin: 'Admin',
  revenue_manager: 'Revenue Manager',
  revenue_assistant: 'Revenue Auxiliar',
  operations: 'Operaciones',
  viewer: 'Solo Lectura',
  reservas: 'Reservas',
};

/**
 * @param {{ activeModule?: string, children?: import('react').ReactNode | ((session: any) => import('react').ReactNode) }} props
 */
export default function AppChrome({ activeModule, children }) {
  const { session, loading } = useSession();

  if (loading) {
    return <div className="app-loading">Cargando…</div>;
  }
  if (!session) {
    if (typeof window !== 'undefined') window.location.href = '/login';
    return <div className="app-loading">Redirigiendo al inicio de sesión…</div>;
  }

  const onLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-brand">
          <div className="app-header-title">
            <h1>GEH Suites · Revenue Management</h1>
            <p>Panel ejecutivo</p>
          </div>
        </div>
        <div className="app-header-user">
          <div className="app-header-user-info">
            <div className="app-header-user-name">{session.userName}</div>
            <div className="app-header-user-role">{ROLE_LABELS[session.role] ?? session.role}</div>
          </div>
          <button className="app-logout-btn" onClick={onLogout}>Salir</button>
        </div>
      </header>
      <div className="app-body">
        <Sidebar session={session} activeModule={activeModule} />
        <main className="content-area">{typeof children === 'function' ? children(session) : children}</main>
      </div>
    </div>
  );
}
