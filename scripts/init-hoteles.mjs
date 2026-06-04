/**
 * Crea la colección hoteles en MongoDB con su índice.
 * Uso: node scripts/init-hoteles.mjs
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

function parseDbName(uri) {
  const match = uri.match(/\/([^/?]+)(\?|$)/);
  return match?.[1] ?? 'calculo-promociones';
}

async function main() {
  loadEnv();

  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('❌  MONGODB_URI no definido en .env'); process.exit(1); }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(parseDbName(uri));
    console.log(`\n🔌  Conectado a "${db.databaseName}"\n`);

    const cols = await db.listCollections({ name: 'hoteles' }).toArray();
    if (cols.length === 0) {
      await db.createCollection('hoteles');
      console.log('✅  Colección "hoteles" creada.');
    } else {
      console.log('ℹ️   Colección "hoteles" ya existía.');
    }

    const col = db.collection('hoteles');

    await col.createIndex({ nombre: 1 }, { unique: true, name: 'idx_nombre' });
    console.log('✅  Índice único en "nombre"');

    const count = await col.countDocuments();
    const indexes = await col.indexes();
    console.log(`\n📊  Documentos actuales: ${count}`);
    console.log(`📋  Índices (${indexes.length}):`);
    indexes.forEach(idx => console.log(`     • ${idx.name}: ${JSON.stringify(idx.key)}`));
    console.log('\n✅  Inicialización completada.\n');

  } finally {
    await client.close();
  }
}

main().catch(err => { console.error('❌  Error:', err.message); process.exit(1); });
