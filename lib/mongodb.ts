import { MongoClient, type Db, type Collection, type Document } from "mongodb";

const dbName = process.env.MONGODB_DB_NAME ?? "mongodb_dx_copilot";

/**
 * Prefer `MONGODB_URI` when set.
 * Otherwise build from `MONGODB_USER`, `MONGODB_PASSWORD`, `MONGODB_HOST`
 * (password is URL-encoded for special characters).
 */
export function resolveMongoConnectionString(): string {
  const full = process.env.MONGODB_URI?.trim();
  if (full) return full;

  const user = process.env.MONGODB_USER?.trim();
  const pass = process.env.MONGODB_PASSWORD ?? "";
  const host = process.env.MONGODB_HOST?.trim();

  if (user && host) {
    const u = encodeURIComponent(user);
    const p = encodeURIComponent(pass);
    const path = encodeURIComponent(dbName);
    return `mongodb+srv://${u}:${p}@${host}/${path}?retryWrites=true&w=majority`;
  }

  throw new Error(
    "MongoDB is not configured: set MONGODB_URI, or MONGODB_USER + MONGODB_PASSWORD + MONGODB_HOST (and optional MONGODB_DB_NAME)."
  );
}

declare global {
  // eslint-disable-next-line no-var -- reuse across HMR / warm invocations
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  const uri = resolveMongoConnectionString();
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
