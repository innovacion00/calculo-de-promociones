import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth/session';
import { findById, updateUser, toPublicUser, DEFAULT_ROLE_PERMISSIONS, UserRole } from '../../../../lib/db/models/user';
import { hashPassword } from '../../../../lib/auth/password';

// PATCH /api/users/[id] — update user fields
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
  if (!session.permissions.includes('canEditUsers') && !session.permissions.includes('canManageUsers')) {
    return NextResponse.json({ ok: false, error: 'Sin permisos para editar usuarios.' }, { status: 403 });
  }

  const { id } = await params;
  const existing = await findById(id);
  if (!existing) return NextResponse.json({ ok: false, error: 'Usuario no encontrado.' }, { status: 404 });

  // Only master_admin can edit another master_admin
  if (existing.role === 'master_admin' && session.role !== 'master_admin') {
    return NextResponse.json({ ok: false, error: 'Solo un Master Admin puede editar a otro Master Admin.' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: 'Cuerpo inválido.' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim();
  if (typeof body.status === 'string' && ['active', 'inactive'].includes(body.status)) {
    if (!session.permissions.includes('canDisableUsers') && !session.permissions.includes('canManageUsers')) {
      return NextResponse.json({ ok: false, error: 'Sin permisos para cambiar estado de usuarios.' }, { status: 403 });
    }
    updates.status = body.status;
  }
  if (typeof body.role === 'string') {
    if (body.role === 'master_admin' && session.role !== 'master_admin') {
      return NextResponse.json({ ok: false, error: 'Solo un Master Admin puede asignar el rol master_admin.' }, { status: 403 });
    }
    updates.role = body.role;
    // Reset permissions to role defaults when role changes (unless permissions are also provided)
    if (!body.permissions) {
      updates.permissions = DEFAULT_ROLE_PERMISSIONS[body.role as UserRole] ?? [];
    }
  }
  if (Array.isArray(body.permissions)) updates.permissions = body.permissions;
  if (Array.isArray(body.hotelAccess)) updates.hotelAccess = body.hotelAccess;
  if (Array.isArray(body.allowedProviders)) updates.allowedProviders = body.allowedProviders;
  if (typeof body.password === 'string' && body.password.length >= 8) {
    updates.passwordHash = hashPassword(body.password);
  }

  const updated = await updateUser(id, updates as never);
  if (!updated) return NextResponse.json({ ok: false, error: 'Error al actualizar.' }, { status: 500 });

  return NextResponse.json({ ok: true, user: toPublicUser(updated) });
}
