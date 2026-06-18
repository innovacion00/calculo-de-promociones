import { ObjectId, Collection } from 'mongodb';
import { getDb } from '../mongodb';

export interface FinancialAuditLog {
  _id?: ObjectId;
  id: string;
  userId: string;
  userName: string;
  module: 'reconciliations' | 'balances' | 'accounts_receivable';
  entityType: string;
  entityId: string;
  action: string;
  previousValue?: unknown;
  newValue?: unknown;
  notes?: string;
  createdAt: string;
}

const COL = 'financial_audit_logs';

async function getCollection(): Promise<Collection<FinancialAuditLog>> {
  const db = await getDb();
  return db.collection<FinancialAuditLog>(COL);
}

export async function ensureIndexes(): Promise<void> {
  const col = await getCollection();
  await col.createIndex({ entityId: 1 });
  await col.createIndex({ userId: 1 });
  await col.createIndex({ createdAt: -1 });
  await col.createIndex({ module: 1 });
}

export async function insertAuditLog(
  entry: Omit<FinancialAuditLog, '_id'>,
): Promise<void> {
  const col = await getCollection();
  await col.insertOne(entry as FinancialAuditLog);
}

export async function listByEntity(entityId: string): Promise<FinancialAuditLog[]> {
  const col = await getCollection();
  return col.find({ entityId }).sort({ createdAt: -1 }).toArray();
}
