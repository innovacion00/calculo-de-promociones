// Helpers de sesión en el cliente. Hablan con /api/auth/* (a través del proxy).
// getAvailableModules es port de getAvailableModulesForUser() de index.html.

import { apiFetch } from './api.js';

/**
 * @typedef {import('./session.types').Session} Session
 * @typedef {Object} Session
 * @property {string} userId
 * @property {string} userName
 * @property {string} email
 * @property {string} role
 * @property {string[]} permissions
 * @property {string[]} hotelAccess
 * @property {string|null} activeHotelId
 */

/**
 * Devuelve la sesión actual o null si no hay (401).
 * @returns {Promise<Session|null>}
 */
export async function fetchSession() {
  try {
    const res = await apiFetch('/auth/me');
    return res.session ?? null;
  } catch {
    return null;
  }
}

/**
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ ok: true, session: Session }>}
 */
export async function login(email, password) {
  return apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

/**
 * @param {string} credential  JWT de Google One Tap
 * @returns {Promise<{ ok: true, session: Session }>}
 */
export async function loginGoogle(credential) {
  return apiFetch('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) });
}

/** @returns {Promise<void>} */
export async function logout() {
  await apiFetch('/auth/logout', { method: 'POST' });
}

/**
 * @param {Session|null} session
 * @param {string} permission
 * @returns {boolean}
 */
export function hasPermission(session, permission) {
  if (!session) return false;
  if (session.role === 'master_admin') return true;
  return session.permissions.includes(permission);
}

/**
 * Grupos de módulos visibles según rol/permisos. Port de index.html.
 * @param {Session|null} session
 * @returns {{ group: string, items: { id: string, icon: string, label: string, future?: boolean }[] }[]}
 */
export function getAvailableModules(session) {
  if (session && session.role === 'reservas') {
    return [{ group: 'Monitoreo', items: [{ id: 'monitoreo', icon: '🖥️', label: 'Monitoreo' }] }];
  }
  const isRevenueManager = session && session.role === 'revenue_manager';
  const modules = [
    { group: 'Revenue Management', items: [
      { id: 'simulator', icon: '📊', label: 'Simulador de Tarifas' },
      { id: 'otb', icon: '📈', label: 'Comparativa OTB' },
      { id: 'sty', icon: '📊', label: 'Comparativa STY' },
    ] },
  ];
  if (!isRevenueManager) {
    modules.push({ group: 'Monitoreo', items: [{ id: 'monitoreo', icon: '🖥️', label: 'Monitoreo' }] });
  }
  if (hasPermission(session, 'canViewFinancialModule')) {
    modules.push({ group: 'Finanzas', items: [{ id: 'financial', icon: '💰', label: 'Gestión Financiera' }] });
  }
  const isAdmin = session && (session.role === 'master_admin' || hasPermission(session, 'canManageUsers'));
  if (isAdmin) {
    modules.push({ group: 'Administración', items: [{ id: 'users', icon: '👤', label: 'Usuarios' }] });
  }
  modules.push({ group: 'Próximamente', items: [
    { id: 'agenda', icon: '📋', label: 'Agenda Revenue', future: true },
    { id: 'reputation', icon: '🏆', label: 'Reputación IA', future: true },
    { id: 'google-business', icon: '🔗', label: 'Google Business', future: true },
    { id: 'forecast', icon: '🔮', label: 'Forecast', future: true },
    { id: 'reportes', icon: '📑', label: 'Reportes', future: true },
    { id: 'configuracion', icon: '⚙', label: 'Configuración', future: true },
  ] });
  return modules;
}

/** Ruta de cada módulo en el frontend nuevo (una página Astro por módulo). */
export const MODULE_ROUTES = {
  simulator: '/simulator',
  otb: '/otb',
  sty: '/sty',
  agenda: '/agenda',
  reputation: '/reputation',
  monitoreo: '/monitoreo',
  'google-business': '/google-business',
  financial: '/financial',
  users: '/users',
};
