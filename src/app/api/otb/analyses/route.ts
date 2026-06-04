import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth/session';
import { createOtbAnalysis, listOtbAnalyses, OtbAnalysis } from '../../../../lib/db/models/otbAnalysis';
import { getHotelByNombre } from '../../../../lib/db/models/hotel';

// GET /api/otb/analyses?hotelId=X&limit=50
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
  if (!session.permissions.includes('canEditOtb') && !session.permissions.includes('canViewDashboard')) {
    return NextResponse.json({ ok: false, error: 'Sin permisos.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const hotelNombreParam = searchParams.get('hotelId') ?? undefined; // frontend siempre envía el nombre
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);

  // Non-master users can only see analyses for their own hotels
  const effectiveNombre = session.role === 'master_admin'
    ? hotelNombreParam
    : (hotelNombreParam ?? session.hotelAccess[0]);

  try {
    // Resuelve nombre → ObjectId para buscar documentos nuevos; el $or en listOtbAnalyses
    // también encuentra documentos legacy que guardaron el nombre directamente en hotelId
    let hotelObjectId: string | undefined;
    if (effectiveNombre) {
      const hotel = await getHotelByNombre(effectiveNombre);
      hotelObjectId = hotel?._id?.toString();
    }

    const analyses = await listOtbAnalyses(hotelObjectId, effectiveNombre, limit);
    return NextResponse.json({ ok: true, analyses });
  } catch (e) {
    console.error('[api/otb/analyses GET]', e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

// POST /api/otb/analyses
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 });
  if (!session.permissions.includes('canEditOtb') && !session.permissions.includes('canUploadOtbFiles')) {
    return NextResponse.json({ ok: false, error: 'Sin permisos para guardar análisis OTB.' }, { status: 403 });
  }

  let body: Partial<OtbAnalysis>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
  }

  const { hotelId: hotelNombreBody, month, cutoffBefore, cutoffAfter, mode, sourceBefore, sourceAfter, metrics, weeklyMetrics, comparison, date } = body;

  if (!hotelNombreBody) return NextResponse.json({ ok: false, error: 'hotelId es requerido.' }, { status: 400 });
  if (!month)           return NextResponse.json({ ok: false, error: 'month es requerido.' }, { status: 400 });
  if (!metrics)         return NextResponse.json({ ok: false, error: 'metrics es requerido.' }, { status: 400 });

  // Resuelve el nombre del hotel a su _id en la colección hoteles
  const hotelDoc = await getHotelByNombre(hotelNombreBody);
  const resolvedHotelId = hotelDoc?._id?.toString() ?? hotelNombreBody;

  const now = new Date().toISOString();
  try {
    const analysis = await createOtbAnalysis({
      id: `otb_${Date.now()}`,
      hotelId:     resolvedHotelId,   // ObjectId string (o nombre si el hotel no existe en la colección)
      hotelNombre: hotelNombreBody,   // nombre denormalizado para display
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
    console.error('[api/otb/analyses POST]', e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
