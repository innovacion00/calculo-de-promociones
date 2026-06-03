import { NextRequest, NextResponse } from 'next/server';
import { findByEmail, updateUser, DEFAULT_ROLE_PERMISSIONS, toPublicUser } from '../../../../lib/db/models/user';
import { setSession, SessionPayload } from '../../../../lib/auth/session';

interface GoogleTokenPayload {
  email: string;
  name?: string;
  email_verified?: string;
  aud: string;
  exp: string;
}

// POST /api/auth/google
// Body: { credential: string } — Google One Tap JWT
export async function POST(req: NextRequest) {
  let body: { credential?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }

  const { credential } = body;
  if (!credential) {
    return NextResponse.json({ ok: false, error: 'Token de Google requerido.' }, { status: 400 });
  }

  // Verify the Google JWT via Google's tokeninfo endpoint
  let payload: GoogleTokenPayload;
  try {
    const verifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`,
      { cache: 'no-store' },
    );
    const data = await verifyRes.json();
    if (!verifyRes.ok || !data.email) {
      console.warn('[auth/google] token inválido:', data);
      return NextResponse.json({ ok: false, error: 'Token de Google inválido o expirado.' }, { status: 401 });
    }
    payload = data;
  } catch (e) {
    console.error('[auth/google] error verificando token:', e);
    return NextResponse.json({ ok: false, error: 'No se pudo verificar el token de Google.' }, { status: 500 });
  }

  // Verify the token belongs to this app
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (clientId && payload.aud !== clientId) {
    console.warn(`[auth/google] aud mismatch: ${payload.aud} !== ${clientId}`);
    return NextResponse.json({ ok: false, error: 'Token no válido para esta aplicación.' }, { status: 401 });
  }

  console.log(`[auth/google] intento: ${payload.email}`);

  // Find user in MongoDB
  let user;
  try {
    user = await findByEmail(payload.email);
  } catch (e) {
    console.error(`[auth/google] error al buscar usuario: ${e}`);
    return NextResponse.json({ ok: false, error: 'Error de base de datos.' }, { status: 500 });
  }

  if (!user) {
    console.warn(`[auth/google] correo no autorizado: ${payload.email}`);
    return NextResponse.json({
      ok: false,
      error: 'Tu correo no está autorizado para acceder al sistema. Contacta al administrador.',
    }, { status: 401 });
  }

  if (user.status === 'inactive') {
    return NextResponse.json({ ok: false, error: 'Usuario desactivado. Contacte al administrador.' }, { status: 403 });
  }

  if (user.allowedProviders.length > 0 && !user.allowedProviders.includes('google')) {
    return NextResponse.json({
      ok: false,
      error: 'Este usuario no tiene habilitado el acceso con Google. Use correo y contraseña.',
    }, { status: 403 });
  }

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

  const session: SessionPayload = {
    userId: user.id,
    userName: user.name,
    email: user.email,
    role: user.role,
    permissions: user.permissions.length > 0 ? user.permissions : (DEFAULT_ROLE_PERMISSIONS[user.role] ?? []),
    hotelAccess: user.hotelAccess,
    activeHotelId: null,
    authProvider: 'google',
    createdAt: now,
    lastActivityAt: now,
    expiresAt,
  };

  await setSession(session);
  await updateUser(user.id, { lastLoginAt: now, authProvider: 'google' });

  console.log(`[auth/google] ✅ sesión creada: ${user.email} (${user.role})`);
  return NextResponse.json({ ok: true, session, user: toPublicUser(user) });
}
