import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth/session';
import { createStyAnalysis, listStyAnalyses, StyAnalysis } from '../../../../lib/db/models/styAnalysis';
import { getHotelByNombre } from '../../../../lib/db/models/hotel';

// GET /api/sty/analyses?hotelId=X&limit=50
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
  if (!session.permissions.includes('canEditOtb') && !session.permissions.includes('canViewDashboard')) {
    return NextResponse.json({ ok: false, error: 'Sin permisos.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const hotelNombreParam = searchParams.get('hotelId') ?? undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);

  const effectiveNombre = session.role === 'master_admin'
    ? hotelNombreParam
    : (hotelNombreParam ?? session.hotelAccess[0]);

  try {
    let hotelObjectId: string | undefined;
    if (effectiveNombre) {
      const hotel = await getHotelByNombre(effectiveNombre);
      hotelObjectId = hotel?._id?.toString();
    }

    const analyses = await listStyAnalyses(hotelObjectId, effectiveNombre, limit);
    return NextResponse.json({ ok: true, analyses });
  } catch (e) {
    console.error('[api/sty/analyses GET]', e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

// POST /api/sty/analyses
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
  if (!session.permissions.includes('canEditOtb') && !session.permissions.includes('canUploadOtbFiles')) {
    return NextResponse.json({ ok: false, error: 'Sin permisos para guardar análisis STY.' }, { status: 403 });
  }

  let body: Partial<StyAnalysis>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }

  const { hotelId: hotelNombreBody, month, cutoffBefore, cutoffAfter, mode, sourceBefore, sourceAfter, metrics, weeklyMetrics, comparison, date } = body;

  if (!hotelNombreBody) return NextResponse.json({ ok: false, error: 'hotelId es requerido.' }, { status: 400 });
  if (!month)           return NextResponse.json({ ok: false, error: 'month es requerido.' }, { status: 400 });
  if (!metrics)         return NextResponse.json({ ok: false, error: 'metrics es requerido.' }, { status: 400 });

  const hotelDoc = await getHotelByNombre(hotelNombreBody);
  const resolvedHotelId = hotelDoc?._id?.toString() ?? hotelNombreBody;

  const now = new Date().toISOString();
  try {
    const analysis = await createStyAnalysis({
      id: `sty_${Date.now()}`,
      hotelId:     resolvedHotelId,
      hotelNombre: hotelNombreBody,
      createdBy: session.userId,
      createdAt: now,
      month,
      cutoffBefore: cutoffBefore ?? null,
      cutoffAfter:  cutoffAfter  ?? null,
      mode:         mode         ?? 'exactDate',
      sourceBefore: sourceBefore ?? 'unknown',
      sourceAfter:  sourceAfter  ?? 'unknown',
      metrics,
      weeklyMetrics: weeklyMetrics ?? null,
      comparison:    comparison   ?? [],
      date:          date         ?? now.slice(0, 10),
    });
    return NextResponse.json({ ok: true, analysis }, { status: 201 });
  } catch (e) {
    console.error('[api/sty/analyses POST]', e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
