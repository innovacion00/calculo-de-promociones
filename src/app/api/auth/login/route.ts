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

  console.log(`[login] intento: ${email}`);

  let user;
  try {
    user = await findByEmail(email);
  } catch (e) {
    console.error(`[login] error al buscar usuario: ${e}`);
    return NextResponse.json({ ok: false, error: 'Error de base de datos.' }, { status: 500 });
  }

  if (!user) {
    console.warn(`[login] usuario no encontrado: ${email}`);
    return NextResponse.json({ ok: false, error: 'Correo o contraseña incorrectos.' }, { status: 401 });
  }

  console.log(`[login] usuario encontrado: ${user.id} | estado: ${user.status} | hashType: ${user.passwordHash?.slice(0, 10)}`);

  if (user.status === 'inactive') {
    console.warn(`[login] usuario inactivo: ${email}`);
    return NextResponse.json({ ok: false, error: 'Usuario desactivado. Contacte al administrador.' }, { status: 403 });
  }

  if (user.allowedProviders.length > 0 && !user.allowedProviders.includes('email')) {
    console.warn(`[login] proveedor no permitido para: ${email}`);
    return NextResponse.json({ ok: false, error: 'Este usuario no puede iniciar sesión con contraseña. Use Google Sign-In.' }, { status: 403 });
  }

  const passwordOk = verifyPassword(password, user.passwordHash);
  console.log(`[login] verificación de contraseña: ${passwordOk ? '✅ correcta' : '❌ incorrecta'}`);

  if (!passwordOk) {
    return NextResponse.json({ ok: false, error: 'Correo o contraseña incorrectos.' }, { status: 401 });
  }

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

  const session: SessionPayload = {
    userId: user.id,
    userName: user.name,
    email: user.email,
    role: user.role,
    permissions: [...new Set([...(DEFAULT_ROLE_PERMISSIONS[user.role] ?? []), ...user.permissions])],
    hotelAccess: user.hotelAccess,
    activeHotelId: null,
    authProvider: 'email',
    createdAt: now,
    lastActivityAt: now,
    expiresAt,
  };

  await setSession(session);
  await updateUser(user.id, { lastLoginAt: now, authProvider: 'email' });

  console.log(`[login] ✅ sesión creada para: ${user.email} (${user.role})`);
  return NextResponse.json({ ok: true, session, user: toPublicUser(user) });
}
