import { MongoClient, type Db, type Collection, type Document } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME ?? "mongodb_dx_copilot";

declare global {
  // eslint-disable-next-line no-var -- reuse across HMR / warm invocations
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, {
      // Fail fast in serverless environments so API routes can return
      // controlled JSON errors instead of timing out as a 502.
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 10000,
      maxPoolSize: 5,
      minPoolSize: 0,
    });
    global._mongoClientPromise = client.connect().catch((err) => {
      global._mongoClientPromise = undefined;
      throw err;
    });
  }
  return global._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(dbName);
}

export async function getAnalysesCollection(): Promise<
  Collection<Document>
> {
  const db = await getDb();
  return db.collection("analyses");
}
