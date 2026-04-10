"use client";

import { useState } from "react";
import { AnalysisForm, type FormValues } from "@/components/AnalysisForm";
import { ResultsPanel } from "@/components/ResultsPanel";
import { demoAnalysisInput } from "@/lib/sampleData";
import type { AnalysisInput, AnalysisOutput } from "@/lib/schemas";

const sampleCollection = demoAnalysisInput.collections[0]!;
const initialForm: FormValues = {
  collectionName: sampleCollection.name,
  sampleDocumentsJson: JSON.stringify(sampleCollection.sampleDocuments, null, 2),
  queryPatternsText: demoAnalysisInput.queryPatterns.join("\n"),
  proposedChange: demoAnalysisInput.proposedChange ?? "",
};

export default function HomePage() {
  const [form, setForm] = useState<FormValues>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [output, setOutput] = useState<AnalysisOutput | null>(null);
  const [lastInput, setLastInput] = useState<AnalysisInput | null>(null);
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  async function submitAnalysis(input: AnalysisInput) {
    setFieldErrors({});
    setRequestError(null);
    setLoading(true);
    setLastInput(input);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.result?.output) {
          setOutput(data.result.output as AnalysisOutput);
          setRequestError(
            typeof data.error === "string"
              ? data.error
              : "Saved to database failed; showing analysis result."
          );
        } else {
          setRequestError(
            typeof data.error === "string"
              ? data.error
              : "Analysis failed."
          );
        }
        return;
      }
      setOutput(data.output as AnalysisOutput);
    } catch {
      setRequestError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="glass-panel mb-10 rounded-3xl p-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
          MongoDB DX Copilot
        </h1>
        <p className="mt-3 max-w-2xl text-slate-200/90">
          Production-grade MongoDB architecture analysis for schema design, index
          strategy, and migration safety, grounded in your real sample documents
          and access patterns.
        </p>
        <div className="mt-5 grid gap-2 text-xs sm:grid-cols-3">
          <div className="glass-panel-soft rounded-xl px-3 py-2 text-slate-200">
            <span className="font-semibold text-slate-100">Decision Quality:</span>{" "}
            surfaces tradeoffs for embedding vs referencing.
          </div>
          <div className="glass-panel-soft rounded-xl px-3 py-2 text-slate-200">
            <span className="font-semibold text-slate-100">Performance:</span>{" "}
            ties index recommendations to declared read patterns.
          </div>
          <div className="glass-panel-soft rounded-xl px-3 py-2 text-slate-200">
            <span className="font-semibold text-slate-100">Operational Safety:</span>{" "}
            highlights rollout and rollback risk before implementation.
          </div>
        </div>
      </header>

      {requestError && (
        <div className="mb-6 rounded-xl border border-amber-300/35 bg-amber-400/10 px-4 py-3 text-sm text-amber-100 backdrop-blur-sm">
          {requestError}
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <div className="glass-panel rounded-2xl p-6">
          <h2 className="mb-1 text-lg font-medium text-slate-50">
            Analysis Input
          </h2>
          <p className="mb-4 text-sm text-slate-300">
            Paste representative production-shaped samples and the highest-value
            query patterns used by your application.
          </p>
          <AnalysisForm
            values={form}
            onChange={(next) => {
              setForm(next);
              setFieldErrors({});
            }}
            onValidationError={setFieldErrors}
            onSubmit={(input) => void submitAnalysis(input)}
            loading={loading}
            errors={fieldErrors}
          />
        </div>

        <div>
          <h2 className="mb-1 text-lg font-medium text-slate-50">
            Architecture Review Output
          </h2>
          <p className="mb-4 text-sm text-slate-300">
            Structured findings designed for technical leadership reviews.
          </p>
          <div className="glass-panel-soft mb-4 rounded-xl p-3 text-xs text-slate-200">
            <p className="font-semibold uppercase tracking-[0.12em] text-slate-100">
              Comparison Data Basis
            </p>
            <p className="mt-1">
              <span className="font-medium text-slate-100">Before</span>: current sample documents
              and query patterns. <span className="font-medium text-slate-100">After</span>:
              proposed schema change plus rollout and rollback modeling from detected risks.
            </p>
          </div>
          <ResultsPanel
            output={output}
            proposedChange={lastInput?.proposedChange}
            loading={loading}
          />
        </div>
      </div>
    </main>
  );
}
