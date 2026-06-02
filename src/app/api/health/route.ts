import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/db/mongodb';

export async function GET() {
  const uri = process.env.MONGODB_URI;
  const uriSet = !!uri;
  const uriType = !uri ? 'not_set'
    : uri.startsWith('mongodb+srv://') ? 'srv'
    : uri.startsWith('mongodb://') ? 'direct'
    : 'unknown';

  // Mask credentials in URI for logging
  const uriSafe = uri
    ? uri.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@')
    : '(not set)';

  const start = Date.now();
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    const ms = Date.now() - start;

    console.log(`[health] ✅ MongoDB OK — ${db.databaseName} (${ms}ms) — ${uriType}`);

    return NextResponse.json({
      ok: true,
      db: db.databaseName,
      uriType,
      latencyMs: ms,
    });
  } catch (e) {
    const ms = Date.now() - start;
    const error = String(e);

    console.error(`[health] ❌ MongoDB FAIL (${ms}ms) — ${uriType} — ${error}`);

    return NextResponse.json({
      ok: false,
      uriSet,
      uriType,
      uriSafe,
      latencyMs: ms,
      error,
    }, { status: 500 });
  }
}
