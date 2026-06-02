import { NextResponse } from 'next/server';
import { getSession, setSession } from '../../../../lib/auth/session';
import { findById } from '../../../../lib/db/models/user';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
  }

  // Refresh lastActivityAt on each visit
  const now = new Date().toISOString();
  const refreshed = { ...session, lastActivityAt: now };
  await setSession(refreshed);

  // Return fresh user data from DB (permissions may have changed)
  const user = await findById(session.userId).catch(() => null);

  return NextResponse.json({ ok: true, session: refreshed, userId: session.userId, user: user ? { id: user.id, name: user.name, email: user.email, role: user.role, permissions: user.permissions, hotelAccess: user.hotelAccess, status: user.status } : null });
}
