/**
 * Recalcula el campo "month" de los análisis OTB existentes a partir de
 * sus fechas de corte (cutoffAfter, o cutoffBefore si no hay cutoffAfter).
 * Los registros sin ninguna fecha de corte quedan sin cambios.
 *
 * Uso:
 *   node scripts/migrate-otb-month.mjs           (aplica los cambios)
 *   node scripts/migrate-otb-month.mjs --dry-run (solo muestra qué cambiaría)
 */
import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const content = readFileSync(resolve(__dirname, '..', '.env'), 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* rely on system env */ }
}

loadEnv();

function parseDbName(uri) {
  const match = uri.match(/\/([^/?]+)(\?|$)/);
  return match?.[1] ?? 'calculo-promociones';
}

function monthFromCutoff(cutoffAfter, cutoffBefore) {
  const cutoff = cutoffAfter || cutoffBefore;
  if (!cutoff) return null;
  const d = new Date(cutoff + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('❌  MONGODB_URI no definido en .env'); process.exit(1); }

  const dryRun = process.argv.includes('--dry-run');

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(parseDbName(uri));
    const col = db.collection('otb_analyses');
    console.log(`\n🔌  Conectado a "${db.databaseName}"${dryRun ? '  (modo --dry-run, sin cambios)' : ''}\n`);

    const docs = await col.find({}, { projection: { id: 1, hotelNombre: 1, hotelId: 1, month: 1, cutoffBefore: 1, cutoffAfter: 1, date: 1 } }).toArray();
    console.log(`📊  ${docs.length} análisis encontrados.\n`);

    let updated = 0, skippedNoCutoff = 0, skippedNoChange = 0;

    for (const doc of docs) {
      const newMonth = monthFromCutoff(doc.cutoffAfter, doc.cutoffBefore);
      if (!newMonth) {
        skippedNoCutoff++;
        continue;
      }
      if (newMonth === doc.month) {
        skippedNoChange++;
        continue;
      }

      const label = `${doc.hotelNombre || doc.hotelId} · ${doc.date || doc.id}`;
      console.log(`  ${doc.month || '(sin mes)'} → ${newMonth}   [${label}]`);

      if (!dryRun) {
        await col.updateOne({ id: doc.id }, { $set: { month: newMonth } });
      }
      updated++;
    }

    console.log(`\n✅  ${dryRun ? 'Se actualizarían' : 'Actualizados'}: ${updated}`);
    console.log(`ℹ️   Sin cambios (ya correctos): ${skippedNoChange}`);
    console.log(`ℹ️   Sin fechas de corte (sin tocar): ${skippedNoCutoff}\n`);

    if (dryRun && updated > 0) {
      console.log('Ejecuta sin --dry-run para aplicar estos cambios.\n');
    }
  } finally {
    await client.close();
  }
}

main().catch(err => { console.error('❌  Error:', err.message); process.exit(1); });
