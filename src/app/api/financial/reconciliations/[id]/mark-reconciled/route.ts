import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../../../lib/auth/session';
import { findById, updateRecord } from '../../../../../../lib/db/models/financialReconciliation';
import { insertAuditLog } from '../../../../../../lib/db/models/financialAuditLog';
import { randomUUID } from 'crypto';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
  if (!session.permissions.includes('canMarkReconciled')) {
    return NextResponse.json({ ok: false, error: 'Sin permisos.' }, { status: 403 });
  }

  const { id } = await params;
  const existing = await findById(id);
  if (!existing) return NextResponse.json({ ok: false, error: 'Registro no encontrado.' }, { status: 404 });

  try {
    const updated = await updateRecord(id, { reconciledStatus: 'reconciled' }, session.userId);
    await insertAuditLog({
      id: randomUUID(),
      userId: session.userId,
      userName: session.userName,
      module: 'reconciliations',
      entityType: 'reconciliation',
      entityId: id,
      action: 'mark_reconciled',
      previousValue: { reconciledStatus: existing.reconciledStatus },
      newValue: { reconciledStatus: 'reconciled' },
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, data: updated });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
