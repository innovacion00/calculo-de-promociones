import { NextRequest, NextResponse } from 'next/server';
import { findByEmail, updateUser, DEFAULT_ROLE_PERMISSIONS, toPublicUser } from '../../../../lib/db/models/user';
import { verifyPassword } from '../../../../lib/auth/password';
import { setSession, SessionPayload } from '../../../../lib/auth/session';

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ ok: false, error: 'Correo y contraseña son requeridos.' }, { status: 400 });
  }

  const user = await findByEmail(email).catch(() => null);

  // Generic error to avoid user enumeration
  const invalidMsg = 'Correo o contraseña incorrectos.';

  if (!user) {
    return NextResponse.json({ ok: false, error: invalidMsg }, { status: 401 });
  }
  if (user.status === 'inactive') {
    return NextResponse.json({ ok: false, error: 'Usuario desactivado. Contacte al administrador.' }, { status: 403 });
  }
  if (user.allowedProviders.length > 0 && !user.allowedProviders.includes('email')) {
    return NextResponse.json({ ok: false, error: 'Este usuario no puede iniciar sesión con contraseña. Use Google Sign-In.' }, { status: 403 });
  }
  if (!verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ ok: false, error: invalidMsg }, { status: 401 });
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
    authProvider: 'email',
    createdAt: now,
    lastActivityAt: now,
    expiresAt,
  };

  await setSession(session);
  await updateUser(user.id, { lastLoginAt: now, authProvider: 'email' });

  return NextResponse.json({ ok: true, session, user: toPublicUser(user) });
}
