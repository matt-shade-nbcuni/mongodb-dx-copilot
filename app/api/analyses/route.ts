import { NextResponse } from "next/server";
import { listRecentAnalyses } from "@/lib/analysisRepository";

export async function GET() {
  try {
    const items = await listRecentAnalyses(20);
    return NextResponse.json({ analyses: items });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to list analyses";
    return NextResponse.json(
      { error: "Could not load recent analyses. Is MongoDB configured?", detail: msg },
      { status: 503 }
    );
  }
}
