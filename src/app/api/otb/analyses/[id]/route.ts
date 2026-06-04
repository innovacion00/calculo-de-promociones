import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth/session';
import { getOtbAnalysis, deleteOtbAnalysis } from '../../../../../lib/db/models/otbAnalysis';

// GET /api/otb/analyses/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
  if (!session.permissions.includes('canEditOtb') && !session.permissions.includes('canViewDashboard')) {
    return NextResponse.json({ ok: false, error: 'Sin permisos.' }, { status: 403 });
  }

  const { id } = await params;
  try {
    const analysis = await getOtbAnalysis(id);
    if (!analysis) return NextResponse.json({ ok: false, error: 'Análisis no encontrado.' }, { status: 404 });
    return NextResponse.json({ ok: true, analysis });
  } catch (e) {
    console.error('[api/otb/analyses/[id] GET]', e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

// DELETE /api/otb/analyses/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
  if (!session.permissions.includes('canEditOtb') && !session.permissions.includes('canDeleteNotes')) {
    return NextResponse.json({ ok: false, error: 'Sin permisos para eliminar.' }, { status: 403 });
  }

  const { id } = await params;
  try {
    const isMaster = session.role === 'master_admin';
    const deleted = await deleteOtbAnalysis(id, session.userId, isMaster);
    if (!deleted) return NextResponse.json({ ok: false, error: 'No encontrado o sin permisos para eliminarlo.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[api/otb/analyses/[id] DELETE]', e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
