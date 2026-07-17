// Middleware que lee la cookie rmd_session y adjunta el payload a req.session.
// No bloquea: si no hay sesión válida, req.session queda null (los gates deciden).

import { COOKIE_NAME, parseSession } from '../modules/auth/session.js';

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} next
 */
export function attachSession(req, _res, next) {
  const raw = req.cookies?.[COOKIE_NAME];
  // @ts-expect-error — augmentamos Request con session en runtime
  req.session = parseSession(raw);
  next();
}

/**
 * Gate duro: exige sesión válida.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function requireAuth(req, res, next) {
  // @ts-expect-error — session la adjunta attachSession
  if (!req.session) {
    res.status(401).json({ ok: false, error: 'No autenticado.' });
    return;
  }
  next();
}
