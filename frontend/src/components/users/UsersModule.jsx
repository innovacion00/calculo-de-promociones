// Módulo Gestión de Usuarios. Port de initUsersModule/usersRender* de index.html.
// Tabla + KPIs + modal de alta/edición. Backend: /api/users (GET/POST/PATCH) + /api/hoteles.
import { useEffect, useMemo, useState } from 'react';
import KpiRow from '../shared/KpiRow.jsx';
import { apiFetch } from '../../lib/api.js';
import { hasPermission } from '../../lib/session.js';
import { ROLE_LABELS, ROLE_OPTIONS } from '../../lib/roles.js';

const EMPTY_FORM = { name: '', email: '', password: '', role: 'revenue_manager', hotelAccess: [] };

/** @param {{ session: import('../../lib/session.js').Session }} props */
export default function UsersModule({ session }) {
  const [users, setUsers] = useState(/** @type {any[]} */ ([]));
  const [hoteles, setHoteles] = useState(/** @type {string[]} */ ([]));
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(/** @type {string|null} */ (null));
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const canCreate = hasPermission(session, 'canCreateUsers') || hasPermission(session, 'canManageUsers');
  const canEdit = hasPermission(session, 'canEditUsers') || hasPermission(session, 'canManageUsers');
  const canDisable = hasPermission(session, 'canDisableUsers') || hasPermission(session, 'canManageUsers');

  const load = async () => {
    setLoading(true);
    try {
      const [u, h] = await Promise.all([apiFetch('/users'), apiFetch('/hoteles')]);
      setUsers(u.users ?? []);
      setHoteles(h.nombres ?? []);
    } catch { /* mantener estado */ } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const kpis = useMemo(() => {
    const active = users.filter((u) => u.status === 'active').length;
    const roleCount = {};
    users.forEach((u) => { roleCount[u.role] = (roleCount[u.role] ?? 0) + 1; });
    return [
      { label: 'Total usuarios', value: String(users.length) },
      { label: 'Activos', value: String(active), tone: 'ok' },
      { label: 'Inactivos', value: String(users.length - active), tone: 'bad' },
      { label: 'Master Admin', value: String(roleCount.master_admin ?? 0) },
      { label: 'Revenue Manager', value: String(roleCount.revenue_manager ?? 0) },
      { label: 'Solo Lectura', value: String(roleCount.viewer ?? 0) },
    ];
  }, [users]);

  const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setFormError(''); setModalOpen(true); };
  const openEdit = (u) => {
    setEditingId(u.id);
    setForm({ name: u.name ?? '', email: u.email ?? '', password: '', role: u.role ?? 'revenue_manager', hotelAccess: u.hotelAccess ?? [] });
    setFormError('');
    setModalOpen(true);
  };

  const toggleHotel = (name) => {
    setForm((f) => ({
      ...f,
      hotelAccess: f.hotelAccess.includes(name) ? f.hotelAccess.filter((h) => h !== name) : [...f.hotelAccess, name],
    }));
  };

  const save = async () => {
    const name = form.name.trim();
    const email = form.email.trim();
    if (!name || (!editingId && !email)) { setFormError('Nombre y correo son obligatorios.'); return; }
    if (!editingId && form.password.length < 8) { setFormError('La contraseña debe tener mínimo 8 caracteres.'); return; }
    setSaving(true);
    setFormError('');
    try {
      if (editingId) {
        const body = { name, role: form.role, hotelAccess: form.hotelAccess };
        if (form.password) body.password = form.password;
        await apiFetch(`/users/${editingId}`, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        await apiFetch('/users', { method: 'POST', body: JSON.stringify({ name, email, password: form.password, role: form.role, hotelAccess: form.hotelAccess }) });
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (u, newStatus) => {
    const msg = newStatus === 'inactive' ? '¿Desactivar este usuario?' : '¿Reactivar este usuario?';
    if (!window.confirm(msg)) return;
    try {
      await apiFetch(`/users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Error al cambiar estado.');
    }
  };

  const hotelsLabel = (u) => {
    if (!u.hotelAccess || u.hotelAccess.length === 0) return <em style={{ color: 'var(--gray3)' }}>Todos</em>;
    return u.hotelAccess.slice(0, 2).join(', ') + (u.hotelAccess.length > 2 ? ` +${u.hotelAccess.length - 2}` : '');
  };

  return (
    <div>
      <div className="users-header">
        <div>
          <div className="users-header-title">👤 Gestión de Usuarios</div>
          <div className="users-header-sub">Roles · Permisos · Hoteles asignados</div>
        </div>
        {canCreate && <button className="fin-action-btn primary" onClick={openCreate}>+ Nuevo usuario</button>}
      </div>

      <KpiRow kpis={kpis} />

      <div className="fin-table-wrap">
        <table className="fin-table">
          <thead>
            <tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Hoteles</th><th>Último acceso</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="fin-empty">Cargando…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7} className="fin-empty">Sin usuarios.</td></tr>
            ) : users.map((u) => {
              const isMaster = u.id === 'u_master';
              return (
                <tr key={u.id}>
                  <td style={{ fontWeight: 700 }}>{u.name}</td>
                  <td style={{ fontSize: '0.72rem' }}>{u.email}</td>
                  <td><span className={`badge-role ${u.role}`}>{ROLE_LABELS[u.role] ?? u.role}</span></td>
                  <td><span className={u.status === 'active' ? 'badge-active' : 'badge-inactive'}>{u.status === 'active' ? 'Activo' : 'Inactivo'}</span></td>
                  <td style={{ fontSize: '0.7rem', maxWidth: 200 }}>{hotelsLabel(u)}</td>
                  <td style={{ fontSize: '0.68rem', color: 'var(--gray3)' }}>{u.lastLoginAt ? u.lastLoginAt.slice(0, 10) : 'Nunca'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {!isMaster && canEdit && <button className="users-row-btn" onClick={() => openEdit(u)}>✏ Editar</button>}
                    {!isMaster && canDisable && u.status === 'active' && <button className="users-row-btn danger" onClick={() => toggleStatus(u, 'inactive')}>Desactivar</button>}
                    {!isMaster && canDisable && u.status === 'inactive' && <button className="users-row-btn ok" onClick={() => toggleStatus(u, 'active')}>Activar</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="um-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="um-modal">
            <div className="um-header"><div className="um-title">{editingId ? 'Editar usuario' : 'Nuevo usuario'}</div></div>
            <div className="um-body">
              {formError && <div className="um-error">{formError}</div>}
              <div className="um-field">
                <label>Nombre</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="um-field">
                <label>Correo</label>
                <input type="email" value={form.email} disabled={!!editingId}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="um-field">
                <label>Contraseña {editingId && <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--gray3)' }}>(dejar vacío para no cambiar)</span>}</label>
                <input type="password" value={form.password} autoComplete="new-password"
                  onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="um-field">
                <label>Rol</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {ROLE_OPTIONS.filter((r) => r.value !== 'master_admin' || session.role === 'master_admin')
                    .map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="um-field">
                <label>Hoteles asignados <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--gray3)' }}>(vacío = todos)</span></label>
                <div className="um-hotels-grid">
                  {hoteles.map((h) => (
                    <label key={h}>
                      <input type="checkbox" checked={form.hotelAccess.includes(h)} onChange={() => toggleHotel(h)} /> {h}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="um-footer">
              <button className="fin-action-btn" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="fin-action-btn primary" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
