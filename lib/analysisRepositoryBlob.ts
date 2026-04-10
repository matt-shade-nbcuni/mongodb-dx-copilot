import { getStore } from "@netlify/blobs";
import { ObjectId } from "mongodb";
import type { AnalysisInput, AnalysisOutput, AnalysisListItem } from "./schemas";
import type { SavedAnalysisDoc } from "./savedAnalysisTypes";
import { truncate } from "./utils";

const PREFIX = "analysis/";

function store() {
  return getStore({ name: "mongodb-dx-analyses", consistency: "strong" });
}

type BlobDoc = {
  _id: string;
  createdAt: string;
  input: AnalysisInput;
  output: AnalysisOutput;
};

export async function saveAnalysisBlob(
  input: AnalysisInput,
  output: AnalysisOutput
): Promise<SavedAnalysisDoc> {
  const oid = new ObjectId();
  const id = oid.toString();
  const createdAt = new Date();
  const doc: BlobDoc = {
    _id: id,
    createdAt: createdAt.toISOString(),
    input,
    output,
  };
  await store().setJSON(`${PREFIX}${id}.json`, doc);
  return {
    _id: oid,
    createdAt,
    input,
    output,
  };
}

export async function listRecentAnalysesBlob(
  limit = 20
): Promise<AnalysisListItem[]> {
  const { blobs } = await store().list({ prefix: PREFIX });
  const sorted = [...blobs].sort((a, b) => b.key.localeCompare(a.key));
  const slice = sorted.slice(0, limit);
  const out: AnalysisListItem[] = [];
  for (const b of slice) {
    const raw = await store().get(b.key, { type: "json" });
    if (!raw || typeof raw !== "object") continue;
    const doc = raw as BlobDoc;
    const input = doc.input as AnalysisInput;
    const names = input.collections.map((c) => c.name);
    const summary = doc.output?.summary ?? "";
    out.push({
      _id: doc._id,
      createdAt: doc.createdAt,
      collectionNames: names,
      summaryPreview: truncate(summary, 140),
    });
  }
  return out;
}

export async function getAnalysisByIdBlob(
  id: string
): Promise<SavedAnalysisDoc | null> {
  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return null;
  }
  const key = `${PREFIX}${oid.toString()}.json`;
  const raw = await store().get(key, { type: "json" });
  if (!raw || typeof raw !== "object") return null;
  const doc = raw as BlobDoc;
  return {
    _id: new ObjectId(doc._id),
    createdAt: new Date(doc.createdAt),
    input: doc.input,
    output: doc.output,
  };
}
