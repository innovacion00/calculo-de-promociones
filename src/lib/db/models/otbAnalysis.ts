import { ObjectId, Collection } from 'mongodb';
import { getDb } from '../mongodb';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OtbPickupRow {
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

export interface OtbMetrics {
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
  bestDay: OtbPickupRow | null;
  worstDay: OtbPickupRow | null;
}

export interface OtbAnalysis {
  _id?: ObjectId;
  id: string;

  // Context
  hotelId: string;     // _id.toString() del documento en la colección hoteles
  hotelNombre?: string; // nombre denormalizado para display sin join
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
  metrics: OtbMetrics;
  weeklyMetrics: object[] | null;
  date: string;  // localized display date

  // Level 2 — daily comparison
  comparison: OtbPickupRow[];
}

export type OtbAnalysisSummary = Omit<OtbAnalysis, '_id' | 'comparison'>;

// ── Collection helper ─────────────────────────────────────────────────────────

async function getCollection(): Promise<Collection<OtbAnalysis>> {
  const db = await getDb();
  return db.collection<OtbAnalysis>('otb_analyses');
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function createOtbAnalysis(data: Omit<OtbAnalysis, '_id'>): Promise<OtbAnalysis> {
  const col = await getCollection();
  await col.insertOne(data as OtbAnalysis);
  return data as OtbAnalysis;
}

export async function listOtbAnalyses(
  hotelId?: string,
  hotelNombre?: string,
  limit = 50
): Promise<OtbAnalysisSummary[]> {
  const col = await getCollection();
  let filter: object = {};
  if (hotelId && hotelNombre) {
    // Busca por ObjectId (documentos nuevos) O por nombre en hotelId/hotelNombre (documentos legacy)
    filter = { $or: [{ hotelId }, { hotelId: hotelNombre }, { hotelNombre }] };
  } else if (hotelId) {
    filter = { hotelId };
  } else if (hotelNombre) {
    // No se pudo resolver el ObjectId del hotel (p.ej. nombre no encontrado en
    // la colección "hoteles"): filtrar igual por nombre para no devolver el
    // histórico de TODOS los hoteles.
    filter = { $or: [{ hotelId: hotelNombre }, { hotelNombre }] };
  }
  const docs = await col
    .find(filter, { projection: { comparison: 0 } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map(({ _id, ...rest }) => rest as OtbAnalysisSummary);
}

export async function getOtbAnalysis(id: string): Promise<OtbAnalysis | null> {
  const col = await getCollection();
  const doc = await col.findOne({ id });
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest as OtbAnalysis;
}

export async function deleteOtbAnalysis(id: string): Promise<boolean> {
  const col = await getCollection();
  const result = await col.deleteOne({ id });
  return result.deletedCount === 1;
}
