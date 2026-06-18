import { ObjectId, Collection } from 'mongodb';
import { getDb } from '../mongodb';

export type UserRole =
  | 'master_admin'
  | 'admin'
  | 'revenue_manager'
  | 'revenue_assistant'
  | 'operations'
  | 'viewer'
  | 'reservas';

export type UserStatus = 'active' | 'inactive';

export interface User {
  _id?: ObjectId;
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  allowedProviders: ('email' | 'google')[];
  authProvider: 'email' | 'google' | null;
  hotelAccess: string[];
  permissions: string[];
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  createdBy: string;
}

export type PublicUser = Omit<User, '_id' | 'passwordHash'>;

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
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

async function getCollection(): Promise<Collection<User>> {
  const db = await getDb();
  return db.collection<User>('users');
}

export async function ensureIndexes(): Promise<void> {
  const col = await getCollection();
  await col.createIndex({ email: 1 }, { unique: true });
  await col.createIndex({ id: 1 }, { unique: true });
}

export async function findByEmail(email: string): Promise<User | null> {
  const col = await getCollection();
  return col.findOne({ email: email.toLowerCase().trim() });
}

export async function findById(id: string): Promise<User | null> {
  const col = await getCollection();
  return col.findOne({ id });
}

export async function createUser(data: Omit<User, '_id'>): Promise<User> {
  const col = await getCollection();
  const user = { ...data, email: data.email.toLowerCase().trim() };
  const result = await col.insertOne(user as User);
  return { ...user, _id: result.insertedId };
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  const col = await getCollection();
  const { _id, ...safe } = updates as User;
  void _id;
  const result = await col.findOneAndUpdate(
    { id },
    { $set: { ...safe, updatedAt: new Date().toISOString() } },
    { returnDocument: 'after' },
  );
  return result ?? null;
}

export async function listUsers(): Promise<User[]> {
  const col = await getCollection();
  return col.find({}).toArray();
}

export async function countUsers(): Promise<number> {
  const col = await getCollection();
  return col.countDocuments();
}

export function toPublicUser(user: User): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, passwordHash, ...pub } = user;
  return pub;
}
