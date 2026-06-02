import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI no está definido en las variables de entorno');

const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
    global._mongoClientPromise
      .then(c => console.log(`[MongoDB] ✅ Conectado a "${c.db(parseDbName(uri)).databaseName}"`))
      .catch(e => console.error(`[MongoDB] ❌ Error de conexión: ${e.message}`));
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
  clientPromise
    .then(c => console.log(`[MongoDB] ✅ Conectado a "${c.db(parseDbName(uri)).databaseName}"`))
    .catch(e => console.error(`[MongoDB] ❌ Error de conexión: ${e.message}`));
}

export default clientPromise;

function parseDbName(connectionUri: string): string {
  const match = connectionUri.match(/\/([^/?]+)(\?|$)/);
  return match?.[1] ?? 'calculo-promociones';
}

export async function getDb(dbName?: string): Promise<Db> {
  const c = await clientPromise;
  return c.db(dbName ?? parseDbName(uri!));
}
