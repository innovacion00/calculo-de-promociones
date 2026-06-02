/**
 * Lista todos los usuarios en MongoDB.
 * Uso: node scripts/list-users.mjs
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

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('❌  MONGODB_URI no definido en .env'); process.exit(1); }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(parseDbName(uri));
    const users = await db.collection('users').find({}, {
      projection: { passwordHash: 0 }
    }).toArray();

    if (users.length === 0) {
      console.log('⚠️  No hay usuarios en la base de datos.');
      console.log('   Ejecuta: node scripts/seed-master.mjs "Nombre" "email" "contraseña"');
      return;
    }

    console.log(`✅  ${users.length} usuario(s) en "${db.databaseName}":\n`);
    users.forEach(u => {
      console.log(`  • ${u.name} <${u.email}> — rol: ${u.role} — estado: ${u.status}`);
    });
  } finally {
    await client.close();
  }
}

main().catch(err => { console.error('❌  Error:', err.message); process.exit(1); });
