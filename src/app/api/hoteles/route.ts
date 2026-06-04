import { NextResponse } from 'next/server';
import { listHoteles } from '../../../lib/db/models/hotel';

// GET /api/hoteles — lista pública de nombres de hoteles
export async function GET() {
  try {
    const hoteles = await listHoteles();
    const nombres = hoteles.map(h => h.nombre);
    return NextResponse.json({ ok: true, nombres });
  } catch (e) {
    console.error('[api/hoteles GET]', e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
