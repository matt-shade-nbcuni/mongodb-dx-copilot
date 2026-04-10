import dns from "node:dns";
import tls from "node:tls";
import {
  MongoClient,
  type Db,
  type Collection,
  type Document,
  type MongoClientOptions,
} from "mongodb";

const dbName = process.env.MONGODB_DB_NAME ?? "mongodb_dx_copilot";

// Tighten TLS defaults for Atlas (some serverless OpenSSL stacks negotiate poorly).
if (process.env.MONGODB_TLS_MIN_VERSION !== "default") {
  tls.DEFAULT_MIN_VERSION = "TLSv1.2";
}

// mongodb+srv uses DNS; Node’s default can prefer IPv6 first and Atlas+OpenSSL
// sometimes fails with "tlsv1 alert internal error". Prefer IPv4 for resolution order.
if (process.env.MONGODB_DNS_ORDER !== "verbatim") {
  try {
    dns.setDefaultResultOrder("ipv4first");
  } catch {
    /* Node < 17 */
  }
}

function normalizeEnvString(raw: string): string {
  let s = raw.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function assertNoPasswordPlaceholder(uri: string): void {
  if (
    /<[^>]*password[^>]*>/i.test(uri) ||
    /\{\{\s*password\s*\}\}/i.test(uri) ||
    /\[password\]/i.test(uri)
  ) {
    throw new Error(
      "MONGODB_URI contains a password placeholder—paste the real Atlas database user password (URL-encode special characters if needed)."
    );
  }
}

function normalizeSeedHosts(raw: string): string {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(",");
}

/**
 * 1) `MONGODB_URI` — prefer Atlas **standard** `mongodb://host:27017,…` (not `mongodb+srv`) on Netlify.
 * 2) `MONGODB_SEED_HOSTS` + `MONGODB_REPLICA_SET` + user/pass — builds standard URI (no SRV DNS).
 * 3) `MONGODB_USER` + `MONGODB_PASSWORD` + `MONGODB_HOST` — `mongodb+srv` (last resort).
 */
export function resolveMongoConnectionString(): string {
  const fullRaw = process.env.MONGODB_URI?.trim();
  if (fullRaw) {
    const full = normalizeEnvString(fullRaw);
    assertNoPasswordPlaceholder(full);
    return full;
  }

  const user = process.env.MONGODB_USER?.trim();
  const pass = process.env.MONGODB_PASSWORD ?? "";
  const seedsRaw = process.env.MONGODB_SEED_HOSTS?.trim();
  const replicaSet = process.env.MONGODB_REPLICA_SET?.trim();

  if (user && seedsRaw && replicaSet) {
    const u = encodeURIComponent(user);
    const p = encodeURIComponent(pass);
    const hosts = normalizeSeedHosts(seedsRaw);
    const rs = encodeURIComponent(replicaSet);
    const authSource = encodeURIComponent(
      process.env.MONGODB_AUTH_SOURCE?.trim() || "admin"
    );
    return `mongodb://${u}:${p}@${hosts}/?tls=true&replicaSet=${rs}&authSource=${authSource}&retryWrites=true&w=majority`;
  }

  const host = process.env.MONGODB_HOST?.trim();

  if (user && host) {
    const u = encodeURIComponent(user);
    const p = encodeURIComponent(pass);
    const authSource =
      process.env.MONGODB_AUTH_SOURCE?.trim() || "admin";
    const a = encodeURIComponent(authSource);
    return `mongodb+srv://${u}:${p}@${host}/?retryWrites=true&w=majority&authSource=${a}`;
  }

  throw new Error(
    "MongoDB is not configured: set MONGODB_URI (standard mongodb://… recommended), or MONGODB_SEED_HOSTS + MONGODB_REPLICA_SET + MONGODB_USER + MONGODB_PASSWORD, or MONGODB_USER + MONGODB_PASSWORD + MONGODB_HOST."
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
  const insecure =
    process.env.MONGODB_TLS_INSECURE_DIAGNOSTIC?.trim() === "1";
  return {
    ...dnsOpts,
    ...(insecure
      ? {
          tlsAllowInvalidCertificates: true,
          tlsAllowInvalidHostnames: true,
        }
      : {}),
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
