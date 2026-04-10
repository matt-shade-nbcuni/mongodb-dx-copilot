import { ObjectId } from "mongodb";
import type { AnalysisInput, AnalysisOutput, AnalysisListItem } from "./schemas";
import { getAnalysesCollection } from "./mongodb";
import { truncate } from "./utils";

export type SavedAnalysisDoc = {
  _id: ObjectId;
  createdAt: Date;
  input: AnalysisInput;
  output: AnalysisOutput;
};

export async function saveAnalysis(
  input: AnalysisInput,
  output: AnalysisOutput
): Promise<SavedAnalysisDoc> {
  const col = await getAnalysesCollection();
  const doc = {
    createdAt: new Date(),
    input,
    output,
  };
  const res = await col.insertOne(doc);
  const inserted = await col.findOne({ _id: res.insertedId });
  if (!inserted) {
    throw new Error("Failed to read inserted analysis");
  }
  return inserted as unknown as SavedAnalysisDoc;
}

export async function listRecentAnalyses(limit = 20): Promise<AnalysisListItem[]> {
  const col = await getAnalysesCollection();
  const cursor = col
    .find(
      {},
      {
        projection: {
          createdAt: 1,
          input: 1,
          "output.summary": 1,
        },
      }
    )
    .sort({ createdAt: -1 })
    .limit(limit);

  const rows = await cursor.toArray();
  return rows.map((r) => {
    const input = r.input as AnalysisInput;
    const names = input.collections.map((c) => c.name);
    const out = r.output as { summary?: string } | undefined;
    const summary = out?.summary ?? "";
    return {
      _id: String(r._id),
      createdAt:
        r.createdAt instanceof Date
          ? r.createdAt.toISOString()
          : new Date(String(r.createdAt)).toISOString(),
      collectionNames: names,
      summaryPreview: truncate(summary, 140),
    };
  });
}

export async function getAnalysisById(
  id: string
): Promise<SavedAnalysisDoc | null> {
  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return null;
  }
  const col = await getAnalysesCollection();
  const doc = await col.findOne({ _id: oid });
  if (!doc) return null;
  return doc as unknown as SavedAnalysisDoc;
}
