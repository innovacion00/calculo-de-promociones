/**
 * Crea un usuario en MongoDB.
 * Uso: node scripts/create-user.mjs "Nombre" "email@dominio.com" "contraseña" "rol"
 * Roles: master_admin | admin | revenue_manager | revenue_assistant | operations | viewer | reservas
 * Ejemplo: node scripts/create-user.mjs "Maria" "maria@gehsuites.com" "Clave2024" "admin"
 */
import { MongoClient } from 'mongodb';
import { scryptSync, randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
  } catch { /* rely on system env */ }
}

loadEnv();

function parseDbName(uri) {
  const match = uri.match(/\/([^/?]+)(\?|$)/);
  return match?.[1] ?? 'calculo-promociones';
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

const ROLE_PERMISSIONS = {
  master_admin: [
    'canViewDashboard','canViewAllHotels','canManageUsers','canCreateUsers','canEditUsers',
    'canDisableUsers','canAssignHotels','canManageRoles','canManagePermissions','canViewAuditLog',
    'canEditRateSimulator','canEditPromotions','canEditBookingConfig','canEditOtb','canUploadOtbFiles',
    'canCreateNotes','canEditOwnNotes','canEditAllNotes','canDeleteNotes','canExportReports',
    'canRestoreConfigurations','canManageGlobalSettings','canViewAllActivity','canManageAgenda',
    'canManageOfficialHotelConfig','canManageHotelAssignments','canManageGoogleBusiness','canViewGoogleBusinessReviews',
  ],
  admin: [
    'canViewDashboard','canViewAllHotels','canEditRateSimulator','canEditPromotions','canEditBookingConfig',
    'canEditOtb','canUploadOtbFiles','canCreateNotes','canEditOwnNotes','canEditAllNotes','canDeleteNotes',
    'canExportReports','canManageAgenda','canViewAuditLog','canManageGoogleBusiness','canViewGoogleBusinessReviews',
  ],
  revenue_manager: [
    'canViewDashboard','canViewAllHotels','canEditRateSimulator','canEditPromotions','canEditBookingConfig',
    'canEditOtb','canUploadOtbFiles','canCreateNotes','canEditOwnNotes','canExportReports','canManageAgenda',
    'canViewGoogleBusinessReviews',
  ],
  revenue_assistant: ['canViewDashboard','canViewAllHotels','canCreateNotes','canEditOwnNotes','canEditOtb','canManageAgenda'],
  operations: ['canViewDashboard','canViewAllHotels','canCreateNotes','canEditOwnNotes','canManageAgenda'],
  viewer: ['canViewDashboard','canViewAllHotels'],
  reservas: ['canViewMonitoreo'],
};

const VALID_ROLES = Object.keys(ROLE_PERMISSIONS);

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('❌  MONGODB_URI no definido en .env'); process.exit(1); }

  const [,, name, email, password, role = 'revenue_manager'] = process.argv;

  if (!name || !email || !password) {
    console.error('Uso: node scripts/create-user.mjs "Nombre" "email@dominio.com" "contraseña" "rol"');
    console.error(`Roles válidos: ${VALID_ROLES.join(' | ')}`);
    process.exit(1);
  }
  if (password.length < 8) { console.error('❌  La contraseña debe tener mínimo 8 caracteres.'); process.exit(1); }
  if (!VALID_ROLES.includes(role)) {
    console.error(`❌  Rol inválido: "${role}". Opciones: ${VALID_ROLES.join(', ')}`);
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(parseDbName(uri));
    const col = db.collection('users');

    const existing = await col.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      console.error(`❌  Ya existe un usuario con el correo "${email}".`);
      process.exit(1);
    }

    await col.createIndex({ email: 1 }, { unique: true }).catch(() => {});
    await col.createIndex({ id: 1 }, { unique: true }).catch(() => {});

    const now = new Date().toISOString();
    const user = {
      id: 'u_' + Date.now(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: hashPassword(password),
      role,
      status: 'active',
      allowedProviders: ['email', 'google'],
      authProvider: null,
      hotelAccess: [],
      permissions: ROLE_PERMISSIONS[role],
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
      createdBy: 'system',
    };

    await col.insertOne(user);
    console.log('✅  Usuario creado:');
    console.log(`    Nombre : ${user.name}`);
    console.log(`    Correo : ${user.email}`);
    console.log(`    Rol    : ${user.role}`);
  } finally {
    await client.close();
  }
}

main().catch(err => { console.error('❌  Error:', err.message); process.exit(1); });
