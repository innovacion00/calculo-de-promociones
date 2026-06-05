import { ObjectId, Collection } from 'mongodb';
import { getDb } from '../mongodb';

export interface RateConfig {
  _id?: ObjectId;
  hotelId: string;      // _id.toString() del documento en la colección hoteles
  hotelNombre?: string; // nombre denormalizado para display
  updatedAt: string;
  updatedBy: string;
  // All hotelBaseInputs entries matching this hotel (key = hotel or hotel||roomType)
  rawBaseInputs: Record<string, Record<string, number>>;
  // All hotelPlanPcts entries matching this hotel
  rawPlanPcts:   Record<string, Record<string, number>>;
  // All hotelPaisPcts entries matching this hotel
  rawPaisPcts:   Record<string, Record<string, number>>;
  // Promo % per section: {secId: {hotelKey: pct}}
  promoVals:     Record<string, Record<string, number>>;
  // Custom section titles: {secId: string}
  titleOverrides: Record<string, string>;
  // Custom row labels: {`${secId}_${rowsKey}_${ri}`: string}
  labelOverrides: Record<string, string>;
  // Extra sections created via add-promo: {channelKey: sectionData[]}
  extraSections: Record<string, unknown[]>;
  // Section IDs explicitly deleted per channel: {channelKey: secId[]}
  deletedSectionIds: Record<string, string[]>;
}

async function getCollection(): Promise<Collection<RateConfig>> {
  const db = await getDb();
  return db.collection<RateConfig>('rate_configs');
}

export async function getRateConfig(hotelId: string): Promise<RateConfig | null> {
  const col = await getCollection();
  const doc = await col.findOne({ hotelId });
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest as RateConfig;
}

export async function upsertRateConfig(data: Omit<RateConfig, '_id'>): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { hotelId: data.hotelId },
    { $set: data },
    { upsert: true }
  );
}

export async function listRateConfigs(): Promise<Pick<RateConfig, 'hotelId' | 'updatedAt'>[]> {
  const col = await getCollection();
  const docs = await col
    .find({}, { projection: { _id: 0, hotelId: 1, updatedAt: 1 } })
    .toArray();
  return docs as Pick<RateConfig, 'hotelId' | 'updatedAt'>[];
}
