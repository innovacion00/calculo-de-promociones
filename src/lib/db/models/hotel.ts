import { ObjectId, Collection } from 'mongodb';
import { getDb } from '../mongodb';

export interface Hotel {
  _id?: ObjectId;
  nombre: string;
}

async function getCollection(): Promise<Collection<Hotel>> {
  const db = await getDb();
  return db.collection<Hotel>('hoteles');
}

export async function listHoteles(): Promise<Hotel[]> {
  const col = await getCollection();
  return col.find({}).sort({ nombre: 1 }).toArray();
}

export async function getHotel(id: string): Promise<Hotel | null> {
  const col = await getCollection();
  return col.findOne({ _id: new ObjectId(id) });
}

export async function createHotel(nombre: string): Promise<Hotel> {
  const col = await getCollection();
  const result = await col.insertOne({ nombre });
  return { _id: result.insertedId, nombre };
}

export async function updateHotel(id: string, nombre: string): Promise<boolean> {
  const col = await getCollection();
  const result = await col.updateOne({ _id: new ObjectId(id) }, { $set: { nombre } });
  return result.matchedCount === 1;
}

export async function deleteHotel(id: string): Promise<boolean> {
  const col = await getCollection();
  const result = await col.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}

export async function getHotelByNombre(nombre: string): Promise<Hotel | null> {
  const col = await getCollection();
  return col.findOne({ nombre });
}
