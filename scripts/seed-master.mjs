/**
 * Crea el usuario master_admin en MongoDB.
 * Uso: node scripts/seed-master.mjs "Nombre" "email@dominio.com" "contraseña"
 */
import { MongoClient } from 'mongodb';
import { scryptSync, randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Carga .env manualmente (no depende de dotenv) ─────────────────
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '..', '.env');
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env not found, rely on system env
  }
}

loadEnv();

// ── Extrae el nombre de la base de datos del URI multi-host ───────
function parseDbName(uri) {
  const match = uri.match(/\/([^/?]+)(\?|$)/);
  return match?.[1] ?? 'calculo-promociones';
}

// ── Hash scrypt (mismo algoritmo que src/lib/auth/password.ts) ───
function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

const MASTER_PERMISSIONS = [
  'canViewDashboard', 'canViewAllHotels', 'canManageUsers', 'canCreateUsers',
  'canEditUsers', 'canDisableUsers', 'canAssignHotels', 'canManageRoles',
  'canManagePermissions', 'canViewAuditLog', 'canEditRateSimulator',
  'canEditPromotions', 'canEditBookingConfig', 'canEditOtb', 'canUploadOtbFiles',
  'canCreateNotes', 'canEditOwnNotes', 'canEditAllNotes', 'canDeleteNotes',
  'canExportReports', 'canRestoreConfigurations', 'canManageGlobalSettings',
  'canViewAllActivity', 'canManageAgenda', 'canManageOfficialHotelConfig',
  'canManageHotelAssignments', 'canManageGoogleBusiness', 'canViewGoogleBusinessReviews',
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌  MONGODB_URI no está definido en .env');
    process.exit(1);
  }

  const [, , name, email, password] = process.argv;

  if (!name || !email || !password) {
    console.error('Uso: node scripts/seed-master.mjs "Nombre" "email@dominio.com" "contraseña"');
    console.error('Ejemplo: node scripts/seed-master.mjs "Alejandro" "alejandro@gehsuites.com" "MiClave2024"');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌  La contraseña debe tener mínimo 8 caracteres.');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('✅  Conectado a MongoDB');

    const db = client.db(parseDbName(uri));
    const col = db.collection('users');

    const count = await col.countDocuments();
    if (count > 0) {
      console.error(`❌  Ya existen ${count} usuario(s) en la base de datos.`);
      console.error('    El seed solo funciona cuando la colección "users" está vacía.');
      process.exit(1);
    }

    // Crear índices únicos
    await col.createIndex({ email: 1 }, { unique: true });
    await col.createIndex({ id: 1 }, { unique: true });

    const now = new Date().toISOString();
    const user = {
      id: 'u_master',
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: hashPassword(password),
      role: 'master_admin',
      status: 'active',
      allowedProviders: ['email', 'google'],
      authProvider: null,
      hotelAccess: [],
      permissions: MASTER_PERMISSIONS,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
      createdBy: 'system',
    };

    await col.insertOne(user);
    console.log(`✅  Usuario master creado:`);
    console.log(`    Nombre : ${user.name}`);
    console.log(`    Correo : ${user.email}`);
    console.log(`    Rol    : master_admin`);
    console.log('');
    console.log('Ahora puedes iniciar sesión en el dashboard con ese correo y contraseña.');
  } finally {
    await client.close();
  }
}

main().catch(err => {
  console.error('❌  Error:', err.message);
  process.exit(1);
});
