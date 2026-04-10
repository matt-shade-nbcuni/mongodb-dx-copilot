"use client";

import { useState } from "react";
import { AnalysisForm, type FormValues } from "@/components/AnalysisForm";
import { ResultsPanel } from "@/components/ResultsPanel";
import type { AnalysisInput, AnalysisOutput } from "@/lib/schemas";

const EMPTY_FORM: FormValues = {
  collectionName: "",
  sampleDocumentsJson: "",
  queryPatternsText: "",
  proposedChange: "",
};

export default function HomePage() {
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
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
          const base =
            typeof data.error === "string"
              ? data.error
              : "Saved to database failed; showing analysis result.";
          const detail =
            typeof data.detail === "string" && data.detail.trim()
              ? `\n\nTechnical detail: ${data.detail}`
              : "";
          setRequestError(base + detail);
        } else {
          const base =
            typeof data.error === "string" ? data.error : "Analysis failed.";
          const detail =
            typeof data.detail === "string" && data.detail.trim()
              ? `\n\nTechnical detail: ${data.detail}`
              : "";
          setRequestError(base + detail);
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
      <header className="glass-panel mb-8 rounded-3xl p-8 sm:p-10">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-300/90">
          Design review for MongoDB
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
          MongoDB DX Copilot
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-200/95">
          This tool helps you stress-test a MongoDB data model{" "}
          <span className="text-slate-100">before</span> you commit engineering
          time. You paste a few example documents and describe how the product
          reads and writes them—we return a structured report: what to watch,
          which indexes match your patterns, and how risky a migration might be.
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
          You do not connect your own cluster here—just paste representative
          documents. The review runs from that input; storing a copy of results
          needs MongoDB configured in your deployment.
        </p>

        <ol className="mt-8 grid gap-3 sm:grid-cols-3">
          <li className="flex gap-3 rounded-2xl border border-slate-500/20 bg-slate-900/30 px-4 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-semibold text-emerald-200">
              1
            </span>
            <span className="text-sm leading-snug text-slate-200">
              <span className="font-medium text-slate-50">Describe</span> your
              collection and paste realistic sample documents.
            </span>
          </li>
          <li className="flex gap-3 rounded-2xl border border-slate-500/20 bg-slate-900/30 px-4 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-semibold text-emerald-200">
              2
            </span>
            <span className="text-sm leading-snug text-slate-200">
              <span className="font-medium text-slate-50">Explain</span> how the app
              queries the data—in plain language, one line per pattern.
            </span>
          </li>
          <li className="flex gap-3 rounded-2xl border border-slate-500/20 bg-slate-900/30 px-4 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-semibold text-emerald-200">
              3
            </span>
            <span className="text-sm leading-snug text-slate-200">
              <span className="font-medium text-slate-50">Review</span> the
              checklist: warnings, indexes, migration and rollout notes.
            </span>
          </li>
        </ol>
      </header>

      {requestError && (
        <div
          className="mb-8 whitespace-pre-wrap rounded-2xl border border-amber-300/35 bg-amber-400/10 px-4 py-3 text-sm text-amber-50 backdrop-blur-sm"
          role="alert"
        >
          {requestError}
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <div className="glass-panel rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-slate-50">
            Your input
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Start from a blank form, or use &ldquo;Try an example&rdquo; to see a
            full walkthrough with realistic blog-style data.
          </p>
          <div className="my-6 h-px bg-gradient-to-r from-transparent via-slate-500/35 to-transparent" />
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

        <div className="lg:sticky lg:top-8">
          <h2 className="text-lg font-semibold text-slate-50">
            Your review
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Output is organized so you can skim the summary first, then dig into
            warnings, indexes, and migration planning. If you add an optional
            &ldquo;proposed change,&rdquo; you will also see a simple before/after
            comparison.
          </p>
          <div className="glass-panel-soft mb-5 mt-5 rounded-xl border border-slate-500/20 p-4 text-xs leading-relaxed text-slate-300">
            <p className="font-medium text-slate-100">How we compare before & after</p>
            <p className="mt-2">
              <span className="text-slate-200">Before</span> reflects risks we see in
              your samples and query lines.{" "}
              <span className="text-slate-200">After</span> layers in your proposed
              change—rollout ideas, rollback notes, and how complex a migration might
              be—not a live diff against production.
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
