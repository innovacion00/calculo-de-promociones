// Router de gestión de usuarios. Se monta en /api/users.

import { Router } from 'express';
import { requirePermission } from '../../middleware/requirePermission.js';
import { requireAuth } from '../../middleware/session.js';
import { getUsers, createUserHandler, updateUserHandler } from './users.controller.js';

export const usersRouter = Router();

// Listar: canManageUsers o canViewAuditLog (gate flexible → se valida en línea).
usersRouter.get('/', requireAuth, (req, res, next) => {
  // @ts-expect-error — session la adjunta attachSession
  const p = req.session.permissions;
  if (!p.includes('canManageUsers') && !p.includes('canViewAuditLog')) {
    res.status(403).json({ ok: false, error: 'Sin permisos.' });
    return;
  }
  next();
}, getUsers);

usersRouter.post('/', requireAuth, createUserHandler);
usersRouter.patch('/:id', requireAuth, updateUserHandler);
