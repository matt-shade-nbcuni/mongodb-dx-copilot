"use client";

import { useMemo, useState } from "react";
import type { AnalysisOutput } from "@/lib/schemas";

type Props = {
  output: AnalysisOutput;
};

function top(items: string[], count: number): string[] {
  return items.slice(0, count);
}

export function ExecutiveBrief({ output }: Props) {
  const [open, setOpen] = useState(false);

  const keyIndexes = useMemo(
    () =>
      output.indexRecommendations.slice(0, 3).map((rec) => ({
        label: `${rec.collection}: ${JSON.stringify(rec.index)}`,
        reason: rec.reason,
      })),
    [output.indexRecommendations]
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-emerald-300/40 bg-emerald-400/12 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-100 transition hover:bg-emerald-400/25"
      >
        Executive brief
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/70 p-4 backdrop-blur-sm sm:p-8">
          <div className="glass-panel max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">
                  MongoDB DX Copilot
                </p>
                <h3 className="text-2xl font-semibold text-slate-50">
                  Executive Architecture Brief
                </h3>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-xl border border-emerald-300/35 bg-emerald-400/15 px-3 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/25"
                >
                  Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-slate-400/35 bg-slate-700/25 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700/40"
                >
                  Close
                </button>
              </div>
            </div>

            <section className="glass-panel-soft rounded-xl p-4">
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                Executive Summary
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-100/95">
                {output.summary}
              </p>
            </section>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <section className="glass-panel-soft rounded-xl p-4">
                <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-200">
                  Top Risks
                </h4>
                <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-slate-100/95">
                  {top(output.migrationRisks, 4).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </section>

              <section className="glass-panel-soft rounded-xl p-4">
                <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-200">
                  Deterministic Alerts
                </h4>
                <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-slate-100/95">
                  {top(output.deterministicWarnings, 4).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </section>
            </div>

            <section className="mt-4 glass-panel-soft rounded-xl p-4">
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-200">
                Priority Index Recommendations
              </h4>
              <ul className="mt-2 space-y-2 text-sm text-slate-100/95">
                {keyIndexes.length === 0 && (
                  <li>No index recommendations generated in this run.</li>
                )}
                {keyIndexes.map((idx, i) => (
                  <li key={i} className="rounded-lg border border-slate-400/20 bg-slate-900/35 p-2.5">
                    <p className="font-mono text-xs text-emerald-200">{idx.label}</p>
                    <p className="mt-1 text-slate-200/95">{idx.reason}</p>
                  </li>
                ))}
              </ul>
            </section>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <section className="glass-panel-soft rounded-xl p-4">
                <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-200">
                  Recommended Rollout
                </h4>
                <ol className="mt-2 list-inside list-decimal space-y-1.5 text-sm text-slate-100/95">
                  {top(output.rolloutPlan, 4).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ol>
              </section>

              <section className="glass-panel-soft rounded-xl p-4">
                <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-green-200">
                  Rollback Position
                </h4>
                <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-slate-100/95">
                  {top(output.rollbackGuidance, 4).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

