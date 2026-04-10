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
  emptyHint,
}: Props) {
  const defaultEmpty = (
    <div className="max-w-md text-center">
      <p className="text-base font-medium text-slate-100">Nothing to show yet</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        Fill in the form on the left and run a review. You will get a readable
        checklist—summary first, then warnings, schema notes, index ideas, and
        migration guidance.
      </p>
      <ul className="mt-5 space-y-2 text-left text-xs text-slate-500">
        <li className="flex gap-2">
          <span className="text-emerald-400/90">✓</span>
          Works from samples only—no need to connect a database to generate the report.
        </li>
        <li className="flex gap-2">
          <span className="text-emerald-400/90">✓</span>
          Use &ldquo;Try an example&rdquo; if you want to see a full result instantly.
        </li>
      </ul>
    </div>
  );

  if (loading) {
    return (
      <div className="glass-panel flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-400/25 bg-emerald-950/10 p-10 text-center">
        <div
          className="mb-4 h-9 w-9 animate-spin rounded-full border-2 border-emerald-300/80 border-t-transparent"
          aria-hidden
        />
        <p className="text-sm font-medium text-slate-100">
          Reviewing your samples and query patterns…
        </p>
        <p className="mt-2 max-w-xs text-xs leading-relaxed text-slate-400">
          This usually takes a few seconds. We run consistent checks—not a
          probabilistic chat—so you get the same kind of structure every time.
        </p>
      </div>
    );
  }

  if (!output) {
    return (
      <div className="glass-panel flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-400/30 p-8 sm:p-10">
        {emptyHint ?? defaultEmpty}
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
      <p className="rounded-xl border border-emerald-400/20 bg-emerald-950/20 px-3 py-2 text-xs leading-relaxed text-emerald-100/90">
        <span className="font-medium text-emerald-200">Tip:</span> Read the summary
        first, then scroll for detail. Sections mirror how teams often review schema
        changes in order.
      </p>

      <SectionCard
        title="Summary"
        hint="Short takeaways you can share with a lead or in a design doc."
      >
        <p className="whitespace-pre-wrap leading-relaxed text-slate-100/95">
          {output.summary}
        </p>
      </SectionCard>

      {proposedChange?.trim() && (
        <SectionCard
          title="Before vs after"
          hint="Side-by-side view when you told us about a possible structural change."
        >
          <div className="rounded-xl border border-slate-400/20 bg-slate-900/25 p-3 text-xs text-slate-200/90">
            <p className="font-medium text-slate-100">What we are comparing</p>
            <p className="mt-1 leading-relaxed">
              <span className="text-slate-300">Before</span> is grounded in your
              samples and query lines. <span className="text-slate-300">After</span>{" "}
              adds your proposed change—rollout ideas, rollback notes, and how heavy
              the migration might be.
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

      <SectionCard
        title="Things to watch"
        variant="warning"
        hint="Automated checks on your sample—fast and repeatable, not a black-box guess."
      >
        {output.deterministicWarnings.length === 0 ? (
          <p className="text-slate-300">No issues flagged by the automated checks.</p>
        ) : (
          <ul className="list-inside list-disc space-y-2 text-slate-100/90">
            {output.deterministicWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title="Schema findings"
        hint="Shape, nesting, and consistency we noticed across your example documents."
      >
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

      <SectionCard
        title="Index ideas"
        hint="Suggested indexes tied to the query patterns you described."
      >
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

      <SectionCard
        title="Migration risks"
        variant="risk"
        hint="What could get expensive, brittle, or surprising when you change the model."
      >
        <ul className="list-inside list-disc space-y-2">
          {output.migrationRisks.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        title="Rollout plan"
        hint="A sensible order of steps—adapt to your release process."
      >
        <ol className="list-inside list-decimal space-y-2">
          {output.rolloutPlan.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </SectionCard>

      <SectionCard
        title="Rollback guidance"
        hint="How to back out or limit damage if something goes wrong in production."
      >
        <ul className="list-inside list-disc space-y-2">
          {output.rollbackGuidance.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
