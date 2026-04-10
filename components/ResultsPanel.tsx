"use client";

import type { AnalysisOutput } from "@/lib/schemas";
import { SectionCard } from "./SectionCard";
import { CodeBlock } from "./CodeBlock";
import { StatusBadge } from "./StatusBadge";

type Props = {
  output: AnalysisOutput | null;
  proposedChange?: string;
  loading: boolean;
  emptyHint?: string;
};

export function ResultsPanel({
  output,
  proposedChange,
  loading,
  emptyHint = "Run an architecture review to generate a decision-ready report for schema, indexing, and migration safety.",
}: Props) {
  if (loading) {
    return (
      <div className="glass-panel flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300/35 p-8 text-center text-sm text-slate-300">
        <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-emerald-300 border-t-transparent" />
        Running deterministic architecture checks…
      </div>
    );
  }

  if (!output) {
    return (
      <div className="glass-panel flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300/35 p-8 text-center text-sm text-slate-300">
        {emptyHint}
      </div>
    );
  }

  const riskCount = output.migrationRisks.length;
  const warns = output.deterministicWarnings.join(" \n ").toLowerCase();
  const hasHotDoc = /hot mutable array|write amplification|unbounded|bloat/.test(warns);
  const hasSplitProposal = /move|split|separate collection|dual-write|backfill|cutover/i.test(
    proposedChange ?? ""
  );

  const readLatencyDelta = hasSplitProposal ? "Improves" : "Unknown";
  const writeCostDelta = hasSplitProposal ? "Improves" : hasHotDoc ? "Regresses" : "Unknown";
  const migrationRiskDelta = riskCount >= 5 ? "Regresses" : riskCount >= 3 ? "Unknown" : "Improves";
  const opsComplexityDelta = hasSplitProposal ? "Regresses" : "Unknown";

  function toneForDelta(v: string): "success" | "danger" | "neutral" {
    if (v === "Improves") return "success";
    if (v === "Regresses") return "danger";
    return "neutral";
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionCard title="Summary">
        <p className="whitespace-pre-wrap leading-relaxed text-slate-100/95">
          {output.summary}
        </p>
      </SectionCard>

      {proposedChange?.trim() && (
        <SectionCard title="Before vs After Comparison">
          <div className="rounded-xl border border-slate-400/20 bg-slate-900/25 p-3 text-xs text-slate-200/90">
            <p className="font-semibold uppercase tracking-[0.12em] text-slate-100">
              Data used for comparison
            </p>
            <p className="mt-1">
              Before = observed risks and findings from current samples + access patterns. After =
              proposed change impact modeled through migration risks, rollout steps, rollback guidance,
              and index posture.
            </p>
          </div>
          <p className="text-slate-200/90">
            Proposed change: <span className="font-medium text-slate-100">{proposedChange}</span>
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="glass-panel-soft rounded-xl p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                Before (Current Model)
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-slate-100/90">
                {output.deterministicWarnings.slice(0, 4).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
                {output.deterministicWarnings.length === 0 && (
                  <li>No major deterministic risks detected.</li>
                )}
              </ul>
            </div>
            <div className="glass-panel-soft rounded-xl p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-200">
                After (Proposed Model)
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-slate-100/90">
                {output.rolloutPlan.slice(0, 4).map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-emerald-300/30 bg-emerald-400/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-200">
              Delta Summary
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-slate-100/90">
              <li>
                Migration complexity:{" "}
                <span className="font-medium text-slate-100">
                  {output.migrationRisks.length >= 5 ? "High" : output.migrationRisks.length >= 3 ? "Medium" : "Low"}
                </span>
              </li>
              <li>
                Index posture:{" "}
                <span className="font-medium text-slate-100">
                  {output.indexRecommendations.length} recommendation(s) identified for target state.
                </span>
              </li>
              <li>
                Rollback readiness:{" "}
                <span className="font-medium text-slate-100">
                  {output.rollbackGuidance.length >= 4
                    ? "Strong, with explicit triggers and reversal steps."
                    : "Baseline guidance present; add tighter trigger thresholds."}
                </span>
              </li>
            </ul>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="glass-panel-soft rounded-lg p-2.5 text-sm text-slate-100/95">
                Read latency profile:{" "}
                <StatusBadge tone={toneForDelta(readLatencyDelta)}>
                  {readLatencyDelta}
                </StatusBadge>
              </div>
              <div className="glass-panel-soft rounded-lg p-2.5 text-sm text-slate-100/95">
                Write cost profile:{" "}
                <StatusBadge tone={toneForDelta(writeCostDelta)}>
                  {writeCostDelta}
                </StatusBadge>
              </div>
              <div className="glass-panel-soft rounded-lg p-2.5 text-sm text-slate-100/95">
                Migration risk profile:{" "}
                <StatusBadge tone={toneForDelta(migrationRiskDelta)}>
                  {migrationRiskDelta}
                </StatusBadge>
              </div>
              <div className="glass-panel-soft rounded-lg p-2.5 text-sm text-slate-100/95">
                Operational complexity:{" "}
                <StatusBadge tone={toneForDelta(opsComplexityDelta)}>
                  {opsComplexityDelta}
                </StatusBadge>
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      <SectionCard title="Deterministic warnings" variant="warning">
        {output.deterministicWarnings.length === 0 ? (
          <p className="text-slate-300">No deterministic warnings.</p>
        ) : (
          <ul className="list-inside list-disc space-y-2 text-slate-100/90">
            {output.deterministicWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Schema findings">
        <div className="space-y-4">
          {output.schemaFindings.map((sf) => (
            <div key={sf.collection}>
              <div className="mb-2 flex items-center gap-2">
                <StatusBadge tone="neutral">{sf.collection}</StatusBadge>
              </div>
              {sf.findings.length === 0 ? (
                <p className="text-slate-300">No findings for this collection.</p>
              ) : (
                <ul className="list-inside list-disc space-y-1.5 text-slate-100/90">
                  {sf.findings.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Index recommendations">
        <div className="space-y-5">
          {output.indexRecommendations.map((rec, idx) => (
            <div
              key={`${rec.collection}-${idx}`}
              className="glass-panel-soft rounded-xl p-3"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <StatusBadge tone="success">{rec.collection}</StatusBadge>
              </div>
              <CodeBlock code={JSON.stringify(rec.index, null, 2)} />
              <p className="mt-2 text-slate-100/95">{rec.reason}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-300/85">
                Tradeoffs
              </p>
              <ul className="mt-1 list-inside list-disc text-slate-200/90">
                {rec.tradeoffs.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          ))}
          {output.indexRecommendations.length === 0 && (
            <p className="text-slate-300">No index recommendations.</p>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Migration risks" variant="risk">
        <ul className="list-inside list-disc space-y-2">
          {output.migrationRisks.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Rollout plan">
        <ol className="list-inside list-decimal space-y-2">
          {output.rolloutPlan.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </SectionCard>

      <SectionCard title="Rollback guidance">
        <ul className="list-inside list-disc space-y-2">
          {output.rollbackGuidance.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
