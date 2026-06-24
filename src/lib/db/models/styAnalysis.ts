import { ObjectId, Collection } from 'mongodb';
import { getDb } from '../mongodb';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StyPickupRow {
  day?: number;
  stayDate?: string;
  beforeDate?: string;
  afterDate?: string;
  occBefore?: number | null;
  occAfter?: number | null;
  pickup?: number | null;
  pctChange?: number | null;
  status?: string;
  roomsBefore?: number | null;
  roomsAfter?: number | null;
  roomPickup?: number | null;
  totalesBefore?: number | null;
  totalesAfter?: number | null;
  velocityHabs?: number | null;
  velocityPP?: number | null;
  adrBefore?: number | null;
  adrAfter?: number | null;
  revparBefore?: number | null;
  revparAfter?: number | null;
}

export interface StyMetrics {
  total: number;
  up: number;
  down: number;
  stable: number;
  avgPickup: number | null;
  totalRoomPickup: number | null;
  general: string;
  avgOcc: number | null;
  avgAdr: number | null;
  avgRevpar: number | null;
  avgOccBefore?: number | null;
  avgAdrBefore?: number | null;
  avgRevparBefore?: number | null;
  bestDay: StyPickupRow | null;
  worstDay: StyPickupRow | null;
}

export interface StyAnalysis {
  _id?: ObjectId;
  id: string;

  // Context
  hotelId: string;
  hotelNombre?: string;
  createdBy: string;
  createdAt: string;

  // Analysis parameters
  month: string;
  cutoffBefore: string | null;
  cutoffAfter: string | null;
  mode: string;
  sourceBefore: string;
  sourceAfter: string;

  // Level 1 — snapshot
  metrics: StyMetrics;
  weeklyMetrics: object[] | null;
  date: string;

  // Level 2 — daily comparison
  comparison: StyPickupRow[];
}

export type StyAnalysisSummary = Omit<StyAnalysis, '_id' | 'comparison'>;

// ── Collection helper ─────────────────────────────────────────────────────────

async function getCollection(): Promise<Collection<StyAnalysis>> {
  const db = await getDb();
  return db.collection<StyAnalysis>('sty_analyses');
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function createStyAnalysis(data: Omit<StyAnalysis, '_id'>): Promise<StyAnalysis> {
  const col = await getCollection();
  await col.insertOne(data as StyAnalysis);
  return data as StyAnalysis;
}

export async function listStyAnalyses(
  hotelId?: string,
  hotelNombre?: string,
  limit = 50
): Promise<StyAnalysisSummary[]> {
  const col = await getCollection();
  let filter: object = {};
  if (hotelId && hotelNombre) {
    filter = { $or: [{ hotelId }, { hotelId: hotelNombre }, { hotelNombre }] };
  } else if (hotelId) {
    filter = { hotelId };
  } else if (hotelNombre) {
    filter = { $or: [{ hotelId: hotelNombre }, { hotelNombre }] };
  }
  const docs = await col
    .find(filter, { projection: { comparison: 0 } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map(({ _id, ...rest }) => rest as StyAnalysisSummary);
}

export async function getStyAnalysis(id: string): Promise<StyAnalysis | null> {
  const col = await getCollection();
  const doc = await col.findOne({ id });
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest as StyAnalysis;
}

export async function deleteStyAnalysis(id: string): Promise<boolean> {
  const col = await getCollection();
  const result = await col.deleteOne({ id });
  return result.deletedCount === 1;
}
