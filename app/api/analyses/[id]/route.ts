import { NextResponse } from "next/server";
import { getAnalysisById } from "@/lib/analysisRepository";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  context: { params: { id: string } }
) {
  const { id } = context.params;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const doc = await getAnalysisById(id);
    if (!doc) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }
    return NextResponse.json({
      _id: String(doc._id),
      createdAt: doc.createdAt.toISOString(),
      input: doc.input,
      output: doc.output,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load analysis";
    return NextResponse.json(
      { error: "Could not load analysis", detail: msg },
      { status: 503 }
    );
  }
}
