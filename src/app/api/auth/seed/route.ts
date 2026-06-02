import { NextRequest, NextResponse } from 'next/server';
import { countUsers, createUser, DEFAULT_ROLE_PERMISSIONS } from '../../../../lib/db/models/user';
import { hashPassword } from '../../../../lib/auth/password';

/**
 * POST /api/auth/seed
 * Creates the initial master_admin user only if no users exist in the DB.
 * Body: { name, email, password }
 * This endpoint is public but only works once (idempotent guard).
 */
export async function POST(req: NextRequest) {
  const count = await countUsers().catch(() => -1);
  if (count === -1) {
    return NextResponse.json({ ok: false, error: 'Error al conectar con la base de datos.' }, { status: 500 });
  }
  if (count > 0) {
    return NextResponse.json({ ok: false, error: 'La base de datos ya tiene usuarios. El seed solo funciona una vez.' }, { status: 409 });
  }

  let body: { name?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }

  const { name, email, password } = body;
  if (!name?.trim()) return NextResponse.json({ ok: false, error: 'El nombre es requerido.' }, { status: 400 });
  if (!email?.trim()) return NextResponse.json({ ok: false, error: 'El correo es requerido.' }, { status: 400 });
  if (!password || password.length < 8) return NextResponse.json({ ok: false, error: 'La contraseña debe tener mínimo 8 caracteres.' }, { status: 400 });

  const now = new Date().toISOString();
  const user = await createUser({
    id: 'u_master',
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash: hashPassword(password),
    role: 'master_admin',
    status: 'active',
    allowedProviders: ['email', 'google'],
    authProvider: null,
    hotelAccess: [],
    permissions: DEFAULT_ROLE_PERMISSIONS.master_admin,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
    createdBy: 'system',
  });

  return NextResponse.json({ ok: true, message: 'Usuario master creado exitosamente.', userId: user.id }, { status: 201 });
}
