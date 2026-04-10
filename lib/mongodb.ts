import dns from "node:dns";
import {
  MongoClient,
  type Db,
  type Collection,
  type Document,
  type MongoClientOptions,
} from "mongodb";

const dbName = process.env.MONGODB_DB_NAME ?? "mongodb_dx_copilot";

// mongodb+srv uses DNS; Node’s default can prefer IPv6 first and Atlas+OpenSSL
// sometimes fails with "tlsv1 alert internal error". Prefer IPv4 for resolution order.
if (process.env.MONGODB_DNS_ORDER !== "verbatim") {
  try {
    dns.setDefaultResultOrder("ipv4first");
  } catch {
    /* Node < 17 */
  }
}

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
    // Do not put dbName in the URI path: for SCRAM, that path is often used as
    // authSource; Atlas users authenticate via `admin`. We select the app DB in getDb().
    const authSource =
      process.env.MONGODB_AUTH_SOURCE?.trim() || "admin";
    const a = encodeURIComponent(authSource);
    return `mongodb+srv://${u}:${p}@${host}/?retryWrites=true&w=majority&authSource=${a}`;
  }

  throw new Error(
    "MongoDB is not configured: set MONGODB_URI, or MONGODB_USER + MONGODB_PASSWORD + MONGODB_HOST (and optional MONGODB_DB_NAME)."
  );
}

declare global {
  // eslint-disable-next-line no-var -- reuse across HMR / warm invocations
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

/**
 * Atlas + Node OpenSSL: prefer IPv4 on the socket unless opted out.
 * Set MONGODB_DNS_FAMILY=auto for local Mongo on IPv6-only localhost.
 */
function resolveDnsSocketOptions():
  | Pick<MongoClientOptions, "family" | "autoSelectFamily">
  | undefined {
  const raw = process.env.MONGODB_DNS_FAMILY?.trim().toLowerCase();
  if (raw === "auto") return undefined;
  if (raw === "6") return { family: 6, autoSelectFamily: false };
  return { family: 4, autoSelectFamily: false };
}

function mongoClientOptions(): MongoClientOptions {
  const dnsOpts = resolveDnsSocketOptions();
  return {
    ...dnsOpts,
    // Fail fast in serverless; allow a bit more time for TLS + cold SRV
    serverSelectionTimeoutMS: 15_000,
    connectTimeoutMS: 15_000,
    socketTimeoutMS: 20_000,
    maxPoolSize: 5,
    minPoolSize: 0,
  };
}

function getClientPromise(): Promise<MongoClient> {
  const uri = resolveMongoConnectionString();
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, mongoClientOptions());
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
