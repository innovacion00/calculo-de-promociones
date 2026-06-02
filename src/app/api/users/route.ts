import { NextResponse } from 'next/server';
import { getSession } from '../../../lib/auth/session';
import { listUsers, toPublicUser } from '../../../lib/db/models/user';

// GET /api/users — list all users (requires canManageUsers)
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
  if (!session.permissions.includes('canManageUsers') && !session.permissions.includes('canViewAuditLog')) {
    return NextResponse.json({ ok: false, error: 'Sin permisos.' }, { status: 403 });
  }

  try {
    const users = await listUsers();
    return NextResponse.json({ ok: true, users: users.map(toPublicUser) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
