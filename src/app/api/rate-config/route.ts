import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../lib/auth/session';
import { getRateConfig, upsertRateConfig } from '../../../lib/db/models/rateConfig';

// GET /api/rate-config?hotelId=X
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });

  const hotelId = new URL(req.url).searchParams.get('hotelId');
  if (!hotelId) return NextResponse.json({ ok: false, error: 'hotelId es requerido.' }, { status: 400 });

  // Users can only read configs for their accessible hotels
  const canAccess = session.role === 'master_admin'
    || session.hotelAccess.length === 0
    || session.hotelAccess.includes(hotelId);
  if (!canAccess) return NextResponse.json({ ok: false, error: 'Sin acceso a este hotel.' }, { status: 403 });

  try {
    const config = await getRateConfig(hotelId);
    return NextResponse.json({ ok: true, config });
  } catch (e) {
    console.error('[api/rate-config GET]', e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

// POST /api/rate-config  — upsert config for one hotel
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
  if (!session.permissions.includes('canEditRateSimulator')) {
    return NextResponse.json({ ok: false, error: 'Sin permisos para editar el simulador.' }, { status: 403 });
  }

  let body: { hotelId?: string; rawBaseInputs?: unknown; rawPlanPcts?: unknown; rawPaisPcts?: unknown; promoVals?: unknown; titleOverrides?: unknown; labelOverrides?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }

  const { hotelId, rawBaseInputs, rawPlanPcts, rawPaisPcts, promoVals, titleOverrides, labelOverrides } = body;
  if (!hotelId) return NextResponse.json({ ok: false, error: 'hotelId es requerido.' }, { status: 400 });

  // Users can only write configs for their accessible hotels
  const canAccess = session.role === 'master_admin'
    || session.hotelAccess.length === 0
    || session.hotelAccess.includes(hotelId);
  if (!canAccess) return NextResponse.json({ ok: false, error: 'Sin acceso a este hotel.' }, { status: 403 });

  try {
    await upsertRateConfig({
      hotelId,
      updatedAt: new Date().toISOString(),
      updatedBy: session.userId,
      rawBaseInputs:  (rawBaseInputs  as Record<string, Record<string, number>>) ?? {},
      rawPlanPcts:    (rawPlanPcts    as Record<string, Record<string, number>>) ?? {},
      rawPaisPcts:    (rawPaisPcts    as Record<string, Record<string, number>>) ?? {},
      promoVals:      (promoVals      as Record<string, Record<string, number>>) ?? {},
      titleOverrides: (titleOverrides as Record<string, string>) ?? {},
      labelOverrides: (labelOverrides as Record<string, string>) ?? {},
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[api/rate-config POST]', e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
