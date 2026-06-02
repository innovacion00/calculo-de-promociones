import { NextRequest, NextResponse } from 'next/server';
import { findByEmail, createUser, DEFAULT_ROLE_PERMISSIONS, toPublicUser, UserRole } from '../../../../lib/db/models/user';
import { hashPassword } from '../../../../lib/auth/password';
import { getSession } from '../../../../lib/auth/session';

const VALID_ROLES: UserRole[] = ['master_admin', 'admin', 'revenue_manager', 'revenue_assistant', 'operations', 'viewer'];

export async function POST(req: NextRequest) {
  // Only authenticated users with canManageUsers or canCreateUsers can register new users
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
  }
  const canCreate = session.permissions.includes('canManageUsers') || session.permissions.includes('canCreateUsers');
  if (!canCreate) {
    return NextResponse.json({ ok: false, error: 'Sin permisos para crear usuarios.' }, { status: 403 });
  }

  let body: {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
    hotelAccess?: string[];
    permissions?: string[];
    allowedProviders?: ('email' | 'google')[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }

  const { name, email, password, role, hotelAccess, permissions, allowedProviders } = body;

  if (!name?.trim()) return NextResponse.json({ ok: false, error: 'El nombre es requerido.' }, { status: 400 });
  if (!email?.trim()) return NextResponse.json({ ok: false, error: 'El correo es requerido.' }, { status: 400 });
  if (!password || password.length < 8) return NextResponse.json({ ok: false, error: 'La contraseña debe tener mínimo 8 caracteres.' }, { status: 400 });
  if (!role || !VALID_ROLES.includes(role as UserRole)) {
    return NextResponse.json({ ok: false, error: `Rol inválido. Opciones: ${VALID_ROLES.join(', ')}` }, { status: 400 });
  }

  // Only master_admin can assign master_admin role
  if (role === 'master_admin' && session.role !== 'master_admin') {
    return NextResponse.json({ ok: false, error: 'Solo un Master Admin puede crear otro Master Admin.' }, { status: 403 });
  }

  const existing = await findByEmail(email).catch(() => null);
  if (existing) {
    return NextResponse.json({ ok: false, error: 'Ya existe un usuario con ese correo.' }, { status: 409 });
  }

  const now = new Date().toISOString();
  const userRole = role as UserRole;

  const user = await createUser({
    id: 'u_' + Date.now(),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash: hashPassword(password),
    role: userRole,
    status: 'active',
    allowedProviders: allowedProviders ?? ['email'],
    authProvider: null,
    hotelAccess: hotelAccess ?? [],
    permissions: permissions ?? DEFAULT_ROLE_PERMISSIONS[userRole] ?? [],
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
    createdBy: session.userId,
  });

  return NextResponse.json({ ok: true, user: toPublicUser(user) }, { status: 201 });
}
