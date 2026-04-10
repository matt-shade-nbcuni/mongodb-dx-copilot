import { NextResponse } from "next/server";
import { analysisInputSchema } from "@/lib/schemas";
import { analyzeRequest } from "@/lib/analyzer";
import { saveAnalysis } from "@/lib/analysisRepository";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = analysisInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const { output } = await analyzeRequest(parsed.data);
    try {
      const saved = await saveAnalysis(parsed.data, output);
      return NextResponse.json({
        _id: String(saved._id),
        createdAt: saved.createdAt.toISOString(),
        input: saved.input,
        output: saved.output,
      });
    } catch (dbErr) {
      const msg =
        dbErr instanceof Error ? dbErr.message : "Database error";
      return NextResponse.json(
        {
          error:
            "Analysis completed but could not be saved. Check MongoDB connection and env (MONGODB_URI or MONGODB_USER/MONGODB_PASSWORD/MONGODB_HOST).",
          detail: msg,
          result: { input: parsed.data, output },
        },
        { status: 503 }
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Analysis failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
