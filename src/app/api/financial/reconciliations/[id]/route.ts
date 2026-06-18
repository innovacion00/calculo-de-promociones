import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth/session';
import { findById, updateRecord } from '../../../../../lib/db/models/financialReconciliation';
import { insertAuditLog } from '../../../../../lib/db/models/financialAuditLog';
import { randomUUID } from 'crypto';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
  if (!session.permissions.includes('canEditReconciliations')) {
    return NextResponse.json({ ok: false, error: 'Sin permisos.' }, { status: 403 });
  }

  const { id } = await params;
  const existing = await findById(id);
  if (!existing) return NextResponse.json({ ok: false, error: 'Registro no encontrado.' }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Body JSON inválido.' }, { status: 400 });
  }

  const allowed = ['notes', 'hotelId', 'hotelName', 'reconciledStatus', 'operationType'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  try {
    const updated = await updateRecord(id, updates, session.userId);
    await insertAuditLog({
      id: randomUUID(),
      userId: session.userId,
      userName: session.userName,
      module: 'reconciliations',
      entityType: 'reconciliation',
      entityId: id,
      action: 'edit',
      previousValue: Object.fromEntries(
        Object.keys(updates).map(k => [k, (existing as unknown as Record<string, unknown>)[k]]),
      ),
      newValue: updates,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, data: updated });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
