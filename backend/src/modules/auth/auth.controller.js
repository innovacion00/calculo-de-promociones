// Controladores de autenticación. Port de src/app/api/auth/{login,google,me,logout}.
// La lógica de negocio es idéntica; solo cambia el I/O (req/res de Express en vez de
// NextRequest/NextResponse y cookies() de next/headers).

import { findByEmail, findById, updateUser, DEFAULT_ROLE_PERMISSIONS, toPublicUser } from '../../models/user.js';
import { verifyPassword } from './password.js';
import { COOKIE_NAME, SESSION_COOKIE_OPTIONS, serializeSession } from './session.js';

/**
 * Construye el SessionPayload combinando permisos por rol + permisos propios.
 * @param {import('../../models/user.js').User} user
 * @param {'email'|'google'} provider
 * @returns {import('./session.js').SessionPayload}
 */
function buildSession(user, provider) {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  return {
    userId: user.id,
    userName: user.name,
    email: user.email,
    role: user.role,
    permissions: [...new Set([...(DEFAULT_ROLE_PERMISSIONS[user.role] ?? []), ...user.permissions])],
    hotelAccess: user.hotelAccess,
    activeHotelId: null,
    authProvider: provider,
    createdAt: now,
    lastActivityAt: now,
    expiresAt,
  };
}

/**
 * POST /api/auth/login  — email + contraseña.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function login(req, res) {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ ok: false, error: 'Correo y contraseña son requeridos.' });
    return;
  }

  console.log(`[login] intento: ${email}`);

  let user;
  try {
    user = await findByEmail(email);
  } catch (e) {
    console.error(`[login] error al buscar usuario: ${e}`);
    res.status(500).json({ ok: false, error: 'Error de base de datos.' });
    return;
  }

  if (!user) {
    console.warn(`[login] usuario no encontrado: ${email}`);
    res.status(401).json({ ok: false, error: 'Correo o contraseña incorrectos.' });
    return;
  }

  if (user.status === 'inactive') {
    res.status(403).json({ ok: false, error: 'Usuario desactivado. Contacte al administrador.' });
    return;
  }

  if (user.allowedProviders.length > 0 && !user.allowedProviders.includes('email')) {
    res.status(403).json({ ok: false, error: 'Este usuario no puede iniciar sesión con contraseña. Use Google Sign-In.' });
    return;
  }

  if (!verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ ok: false, error: 'Correo o contraseña incorrectos.' });
    return;
  }

  const session = buildSession(user, 'email');
  res.cookie(COOKIE_NAME, serializeSession(session), SESSION_COOKIE_OPTIONS);
  await updateUser(user.id, { lastLoginAt: session.createdAt, authProvider: 'email' });

  console.log(`[login] ✅ sesión creada para: ${user.email} (${user.role})`);
  res.json({ ok: true, session, user: toPublicUser(user) });
}

/**
 * POST /api/auth/google  — Body: { credential } (JWT de Google One Tap).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function googleLogin(req, res) {
  const { credential } = req.body ?? {};
  if (!credential) {
    res.status(400).json({ ok: false, error: 'Token de Google requerido.' });
    return;
  }

  /** @type {{ email: string, name?: string, email_verified?: string|boolean, aud?: string }} */
  let payload;
  try {
    const verifyRes = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${encodeURIComponent(credential)}`,
      { cache: 'no-store' },
    );
    const data = await verifyRes.json();
    if (!verifyRes.ok || !data.email) {
      const parts = credential.split('.');
      if (parts.length === 3) {
        const decoded = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
        if (decoded.email && decoded.email_verified !== false) {
          payload = decoded;
        } else {
          res.status(401).json({ ok: false, error: 'Token de Google inválido o expirado.' });
          return;
        }
      } else {
        res.status(401).json({ ok: false, error: 'Token de Google inválido o expirado.' });
        return;
      }
    } else {
      payload = data;
    }
  } catch (e) {
    console.error('[auth/google] error verificando token:', e);
    res.status(500).json({ ok: false, error: 'No se pudo verificar el token de Google.' });
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (clientId && payload.aud !== clientId) {
    res.status(401).json({ ok: false, error: 'Token no válido para esta aplicación.' });
    return;
  }

  let user;
  try {
    user = await findByEmail(payload.email);
  } catch (e) {
    console.error(`[auth/google] error al buscar usuario: ${e}`);
    res.status(500).json({ ok: false, error: 'Error de base de datos.' });
    return;
  }

  if (!user) {
    res.status(401).json({ ok: false, error: 'Tu correo no está autorizado para acceder al sistema. Contacta al administrador.' });
    return;
  }
  if (user.status === 'inactive') {
    res.status(403).json({ ok: false, error: 'Usuario desactivado. Contacte al administrador.' });
    return;
  }
  if (user.allowedProviders.length > 0 && !user.allowedProviders.includes('google')) {
    res.status(403).json({ ok: false, error: 'Este usuario no tiene habilitado el acceso con Google. Use correo y contraseña.' });
    return;
  }

  const session = buildSession(user, 'google');
  res.cookie(COOKIE_NAME, serializeSession(session), SESSION_COOKIE_OPTIONS);
  await updateUser(user.id, { lastLoginAt: session.createdAt, authProvider: 'google' });

  console.log(`[auth/google] ✅ sesión creada: ${user.email} (${user.role})`);
  res.json({ ok: true, session, user: toPublicUser(user) });
}

/**
 * GET /api/auth/me  — devuelve la sesión actual y datos frescos del usuario.
 * Refresca lastActivityAt y reemite la cookie.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function me(req, res) {
  // @ts-expect-error — session la adjunta attachSession
  const session = req.session;
  if (!session) {
    res.status(401).json({ ok: false, error: 'No autenticado.' });
    return;
  }

  const refreshed = { ...session, lastActivityAt: new Date().toISOString() };
  res.cookie(COOKIE_NAME, serializeSession(refreshed), SESSION_COOKIE_OPTIONS);

  const user = await findById(session.userId).catch(() => null);
  res.json({
    ok: true,
    session: refreshed,
    userId: session.userId,
    user: user
      ? { id: user.id, name: user.name, email: user.email, role: user.role, permissions: user.permissions, hotelAccess: user.hotelAccess, status: user.status }
      : null,
  });
}

/**
 * POST /api/auth/logout  — limpia la cookie de sesión.
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
export async function logout(_req, res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
}
