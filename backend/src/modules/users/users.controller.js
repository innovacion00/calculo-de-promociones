// Controladores de gestión de usuarios. Port de src/app/api/users/* + auth/register.
// La creación se expone como POST /api/users (antes era POST /api/auth/register).

import { hashPassword } from '../auth/password.js';
import {
  listUsers, findByEmail, findById, createUser, updateUser,
  toPublicUser, DEFAULT_ROLE_PERMISSIONS,
} from '../../models/user.js';

/** @type {import('../../models/user.js').UserRole[]} */
const VALID_ROLES = ['master_admin', 'admin', 'revenue_manager', 'revenue_assistant', 'operations', 'viewer', 'reservas'];

/**
 * GET /api/users — lista de usuarios.
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
export async function getUsers(_req, res) {
  const users = await listUsers();
  res.json({ ok: true, users: users.map(toPublicUser) });
}

/**
 * POST /api/users — crea un usuario.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function createUserHandler(req, res) {
  // @ts-expect-error — session la adjunta attachSession
  const session = req.session;
  const canCreate = session.permissions.includes('canManageUsers') || session.permissions.includes('canCreateUsers');
  if (!canCreate) {
    res.status(403).json({ ok: false, error: 'Sin permisos para crear usuarios.' });
    return;
  }

  const { name, email, password, role, hotelAccess, permissions, allowedProviders } = req.body ?? {};

  if (!name?.trim()) { res.status(400).json({ ok: false, error: 'El nombre es requerido.' }); return; }
  if (!email?.trim()) { res.status(400).json({ ok: false, error: 'El correo es requerido.' }); return; }
  if (!password || password.length < 8) { res.status(400).json({ ok: false, error: 'La contraseña debe tener mínimo 8 caracteres.' }); return; }
  if (!role || !VALID_ROLES.includes(role)) {
    res.status(400).json({ ok: false, error: `Rol inválido. Opciones: ${VALID_ROLES.join(', ')}` });
    return;
  }
  if (role === 'master_admin' && session.role !== 'master_admin') {
    res.status(403).json({ ok: false, error: 'Solo un Master Admin puede crear otro Master Admin.' });
    return;
  }

  const existing = await findByEmail(email).catch(() => null);
  if (existing) { res.status(409).json({ ok: false, error: 'Ya existe un usuario con ese correo.' }); return; }

  const now = new Date().toISOString();
  const user = await createUser({
    id: 'u_' + Date.now(),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash: hashPassword(password),
    role,
    status: 'active',
    allowedProviders: allowedProviders ?? ['email', 'google'],
    authProvider: null,
    hotelAccess: hotelAccess ?? [],
    permissions: permissions ?? DEFAULT_ROLE_PERMISSIONS[role] ?? [],
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
    createdBy: session.userId,
  });

  res.status(201).json({ ok: true, user: toPublicUser(user) });
}

/**
 * PATCH /api/users/:id — actualiza campos de un usuario.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function updateUserHandler(req, res) {
  // @ts-expect-error — session la adjunta attachSession
  const session = req.session;
  if (!session.permissions.includes('canEditUsers') && !session.permissions.includes('canManageUsers')) {
    res.status(403).json({ ok: false, error: 'Sin permisos para editar usuarios.' });
    return;
  }

  const { id } = req.params;
  const existing = await findById(id);
  if (!existing) { res.status(404).json({ ok: false, error: 'Usuario no encontrado.' }); return; }

  if (existing.role === 'master_admin' && session.role !== 'master_admin') {
    res.status(403).json({ ok: false, error: 'Solo un Master Admin puede editar a otro Master Admin.' });
    return;
  }

  const body = req.body ?? {};
  /** @type {Record<string, unknown>} */
  const updates = {};

  if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim();
  if (typeof body.status === 'string' && ['active', 'inactive'].includes(body.status)) {
    if (!session.permissions.includes('canDisableUsers') && !session.permissions.includes('canManageUsers')) {
      res.status(403).json({ ok: false, error: 'Sin permisos para cambiar estado de usuarios.' });
      return;
    }
    updates.status = body.status;
  }
  if (typeof body.role === 'string') {
    if (body.role === 'master_admin' && session.role !== 'master_admin') {
      res.status(403).json({ ok: false, error: 'Solo un Master Admin puede asignar el rol master_admin.' });
      return;
    }
    updates.role = body.role;
    if (!body.permissions) updates.permissions = DEFAULT_ROLE_PERMISSIONS[body.role] ?? [];
  }
  if (Array.isArray(body.permissions)) updates.permissions = body.permissions;
  if (Array.isArray(body.hotelAccess)) updates.hotelAccess = body.hotelAccess;
  if (Array.isArray(body.allowedProviders)) updates.allowedProviders = body.allowedProviders;
  if (typeof body.password === 'string' && body.password.length >= 8) {
    updates.passwordHash = hashPassword(body.password);
  }

  const updated = await updateUser(id, updates);
  if (!updated) { res.status(500).json({ ok: false, error: 'Error al actualizar.' }); return; }
  res.json({ ok: true, user: toPublicUser(updated) });
}
