// Modelo de usuarios (colección `users`). Port de src/lib/db/models/user.ts.
// La forma de los documentos NO cambia (misma BD Mongo). Los tipos TS se expresan como JSDoc.

import { getDb } from '../config/db.js';

/**
 * @typedef {'master_admin'|'admin'|'revenue_manager'|'revenue_assistant'|'operations'|'viewer'|'reservas'} UserRole
 * @typedef {'active'|'inactive'} UserStatus
 * @typedef {'email'|'google'} AuthProvider
 */

/**
 * @typedef {Object} User
 * @property {import('mongodb').ObjectId} [_id]
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {string} passwordHash
 * @property {UserRole} role
 * @property {UserStatus} status
 * @property {AuthProvider[]} allowedProviders
 * @property {AuthProvider|null} authProvider
 * @property {string[]} hotelAccess
 * @property {string[]} permissions
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string|null} lastLoginAt
 * @property {string} createdBy
 */

/** @type {Record<UserRole, string[]>} */
export const DEFAULT_ROLE_PERMISSIONS = {
  master_admin: [
    'canViewDashboard', 'canViewAllHotels', 'canManageUsers', 'canCreateUsers',
    'canEditUsers', 'canDisableUsers', 'canAssignHotels', 'canManageRoles',
    'canManagePermissions', 'canViewAuditLog', 'canEditRateSimulator',
    'canEditPromotions', 'canEditBookingConfig', 'canEditOtb', 'canUploadOtbFiles',
    'canCreateNotes', 'canEditOwnNotes', 'canEditAllNotes', 'canDeleteNotes',
    'canExportReports', 'canRestoreConfigurations', 'canManageGlobalSettings',
    'canViewAllActivity', 'canManageAgenda', 'canManageOfficialHotelConfig',
    'canManageHotelAssignments', 'canManageGoogleBusiness', 'canViewGoogleBusinessReviews',
    'canViewFinancialModule', 'canImportReconciliations', 'canEditReconciliations',
    'canMarkReconciled', 'canViewCheckoutBalances', 'canEditCheckoutBalances',
    'canViewAccountsReceivable', 'canUploadReceivableProof', 'canMarkReceivablePaid',
    'canExportFinancialReports', 'canViewFinancialAudit',
  ],
  admin: [
    'canViewDashboard', 'canViewAllHotels', 'canEditRateSimulator', 'canEditPromotions',
    'canEditBookingConfig', 'canEditOtb', 'canUploadOtbFiles', 'canCreateNotes',
    'canEditOwnNotes', 'canEditAllNotes', 'canDeleteNotes', 'canExportReports',
    'canManageAgenda', 'canViewAuditLog', 'canManageGoogleBusiness', 'canViewGoogleBusinessReviews',
    'canViewFinancialModule', 'canImportReconciliations', 'canEditReconciliations',
    'canMarkReconciled', 'canViewCheckoutBalances', 'canEditCheckoutBalances',
    'canViewAccountsReceivable', 'canUploadReceivableProof', 'canMarkReceivablePaid',
    'canExportFinancialReports', 'canViewFinancialAudit',
  ],
  revenue_manager: [
    'canViewDashboard', 'canViewAllHotels', 'canEditRateSimulator', 'canEditPromotions',
    'canEditBookingConfig', 'canEditOtb', 'canUploadOtbFiles', 'canCreateNotes',
    'canEditOwnNotes', 'canExportReports', 'canManageAgenda', 'canViewGoogleBusinessReviews',
    'canViewFinancialModule', 'canViewCheckoutBalances', 'canViewAccountsReceivable',
    'canExportFinancialReports',
  ],
  revenue_assistant: [
    'canViewDashboard', 'canViewAllHotels', 'canCreateNotes', 'canEditOwnNotes',
    'canEditOtb', 'canManageAgenda',
    'canViewFinancialModule',
  ],
  operations: [
    'canViewDashboard', 'canViewAllHotels', 'canCreateNotes', 'canEditOwnNotes', 'canManageAgenda',
    'canViewFinancialModule', 'canViewCheckoutBalances',
  ],
  viewer: ['canViewDashboard', 'canViewAllHotels'],
  reservas: ['canViewMonitoreo'],
};

/** @returns {Promise<import('mongodb').Collection<User>>} */
async function getCollection() {
  const db = await getDb();
  return db.collection('users');
}

/**
 * @param {string} email
 * @returns {Promise<User|null>}
 */
export async function findByEmail(email) {
  const col = await getCollection();
  return col.findOne({ email: email.toLowerCase().trim() });
}

/**
 * @param {string} id
 * @returns {Promise<User|null>}
 */
export async function findById(id) {
  const col = await getCollection();
  return col.findOne({ id });
}

/**
 * @param {Omit<User, '_id'>} data
 * @returns {Promise<User>}
 */
export async function createUser(data) {
  const col = await getCollection();
  const user = { ...data, email: data.email.toLowerCase().trim() };
  const result = await col.insertOne(/** @type {User} */ (user));
  return { ...user, _id: result.insertedId };
}

/**
 * @param {string} id
 * @param {Partial<User>} updates
 * @returns {Promise<User|null>}
 */
export async function updateUser(id, updates) {
  const col = await getCollection();
  const { _id, ...safe } = /** @type {User} */ (updates);
  void _id;
  const result = await col.findOneAndUpdate(
    { id },
    { $set: { ...safe, updatedAt: new Date().toISOString() } },
    { returnDocument: 'after' },
  );
  return result ?? null;
}

/** @returns {Promise<User[]>} */
export async function listUsers() {
  const col = await getCollection();
  return col.find({}).toArray();
}

/**
 * Quita campos sensibles/internos antes de enviar al cliente.
 * @param {User} user
 * @returns {Omit<User, '_id'|'passwordHash'>}
 */
export function toPublicUser(user) {
  const { _id, passwordHash, ...pub } = user;
  void _id;
  void passwordHash;
  return pub;
}
