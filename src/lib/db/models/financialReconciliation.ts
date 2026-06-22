import { ObjectId, Collection } from 'mongodb';
import { getDb } from '../mongodb';

export type ReconciliationStatus =
  | 'reconciled'
  | 'unreconciled'
  | 'pending_review'
  | 'probable_duplicate'
  | 'requires_support'
  | 'no_hotel'
  | 'under_investigation'
  | 'adjusted';

export interface ReconciliationRecord {
  _id?: ObjectId;
  id: string;
  source: 'excel' | 'api';
  sourceFileName?: string;
  sourceSheet?: string;
  movementName?: string;
  hotelId?: string;
  hotelName?: string;
  companyName?: string;
  legalEntity?: string;
  operationType?: string;
  movementDate?: string;
  bank?: string;
  confirmationNumber?: string;
  reconciledStatus: ReconciliationStatus;
  netAmount?: number;
  receiptUrl?: string;
  transactionId?: string;
  authorizationCode?: string;
  issuer?: string;
  cardBrand?: string;
  terminal?: string;
  purchaseValue?: number;
  iva?: number;
  iac?: number;
  tip?: number;
  netPurchase?: number;
  commission?: number;
  withholdingTax?: number;
  reteIva?: number;
  reteIca?: number;
  duplicateFlag: boolean;
  inconsistencyFlags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface ReconciliationListOptions {
  hotelId?: string;
  hotelName?: string;
  status?: ReconciliationStatus;
  bank?: string;
  cardBrand?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

const COL = 'financial_reconciliations';

async function getCollection(): Promise<Collection<ReconciliationRecord>> {
  const db = await getDb();
  return db.collection<ReconciliationRecord>(COL);
}

export async function ensureIndexes(): Promise<void> {
  const col = await getCollection();
  await col.createIndex({ id: 1 }, { unique: true });
  await col.createIndex({ hotelId: 1 });
  await col.createIndex({ movementDate: -1 });
  await col.createIndex({ reconciledStatus: 1 });
  await col.createIndex({ bank: 1 });
  await col.createIndex({ confirmationNumber: 1 });
}

export async function insertMany(records: Omit<ReconciliationRecord, '_id'>[]): Promise<number> {
  if (records.length === 0) return 0;
  const col = await getCollection();
  const result = await col.insertMany(records as ReconciliationRecord[]);
  return result.insertedCount;
}

export async function deleteAll(): Promise<number> {
  const col = await getCollection();
  const result = await col.deleteMany({});
  return result.deletedCount;
}

export async function findById(id: string): Promise<ReconciliationRecord | null> {
  const col = await getCollection();
  return col.findOne({ id });
}

export async function updateRecord(
  id: string,
  updates: Partial<ReconciliationRecord>,
  updatedBy: string,
): Promise<ReconciliationRecord | null> {
  const col = await getCollection();
  const { _id, ...safe } = updates as ReconciliationRecord;
  void _id;
  return col.findOneAndUpdate(
    { id },
    { $set: { ...safe, updatedAt: new Date().toISOString(), updatedBy } },
    { returnDocument: 'after' },
  );
}

export async function listRecords(opts: ReconciliationListOptions = {}): Promise<{
  data: ReconciliationRecord[];
  total: number;
}> {
  const col = await getCollection();
  const { hotelId, hotelName, status, bank, cardBrand, dateFrom, dateTo, search, page = 1, pageSize = 18 } = opts;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};
  if (hotelId) filter.hotelId = hotelId;
  if (hotelName) filter.hotelName = hotelName;
  if (status) filter.reconciledStatus = status;
  if (bank) filter.bank = bank;
  if (cardBrand) filter.cardBrand = cardBrand;
  if (dateFrom || dateTo) {
    filter.movementDate = {};
    if (dateFrom) filter.movementDate.$gte = dateFrom;
    if (dateTo) filter.movementDate.$lte = dateTo;
  }
  if (search) {
    filter.$or = [
      { movementName: { $regex: search, $options: 'i' } },
      { hotelName: { $regex: search, $options: 'i' } },
      { confirmationNumber: { $regex: search, $options: 'i' } },
      { bank: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * pageSize;
  const [data, total] = await Promise.all([
    col.find(filter).sort({ movementDate: -1, createdAt: -1 }).skip(skip).limit(pageSize).toArray(),
    col.countDocuments(filter),
  ]);
  return { data, total };
}

export async function getStats(hotelId?: string): Promise<{
  total: number;
  totalAmount: number;
  reconciled: number;
  reconciledAmount: number;
  unreconciled: number;
  unreconciledAmount: number;
  noHotel: number;
  noReceipt: number;
  probableDuplicate: number;
  noConfirmation: number;
  requiresSupport: number;
}> {
  const col = await getCollection();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseFilter: Record<string, any> = hotelId ? { hotelId } : {};

  const [all, reconciled, unreconciledDocs] = await Promise.all([
    col.find(baseFilter).toArray(),
    col.find({ ...baseFilter, reconciledStatus: 'reconciled' }).toArray(),
    col.find({ ...baseFilter, reconciledStatus: { $ne: 'reconciled' } }).toArray(),
  ]);

  const sum = (arr: ReconciliationRecord[]) =>
    arr.reduce((acc, r) => acc + (r.netAmount ?? 0), 0);

  return {
    total: all.length,
    totalAmount: sum(all),
    reconciled: reconciled.length,
    reconciledAmount: sum(reconciled),
    unreconciled: unreconciledDocs.length,
    unreconciledAmount: sum(unreconciledDocs),
    noHotel: all.filter(r => r.inconsistencyFlags.includes('no_hotel')).length,
    noReceipt: all.filter(r => r.inconsistencyFlags.includes('no_receipt')).length,
    probableDuplicate: all.filter(r => r.inconsistencyFlags.includes('probable_duplicate')).length,
    noConfirmation: all.filter(r => r.inconsistencyFlags.includes('no_confirmation')).length,
    requiresSupport: all.filter(r => r.reconciledStatus === 'requires_support').length,
  };
}
