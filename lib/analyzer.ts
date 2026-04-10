import type { AnalysisInput, AnalysisOutput } from "./schemas";
import { runDeterministicAnalysis } from "./deterministicChecks";
import { uniqueStrings } from "./utils";

function buildSummary(input: AnalysisInput, detWarnings: string[], indexCount: number): string {
  const collectionNames = input.collections.map((c) => c.name).join(", ");
  const hotDocRisk = detWarnings.some((w) =>
    /hot mutable array|unbounded|bloat|write amplification/i.test(w)
  );
  const migrationRisk = detWarnings.some((w) =>
    /migrat|split|move|backfill|dual-write/i.test(w)
  );

  const parts = [
    `Deterministic review completed for ${input.collections.length} collection(s): ${collectionNames}.`,
    `Generated ${detWarnings.length} warning(s) and ${indexCount} index recommendation(s) from sample documents and declared access patterns.`,
  ];

  if (hotDocRisk) {
    parts.push(
      "Primary concern: potential hot-document growth from embedded mutable arrays that may increase write amplification."
    );
  }
  if (migrationRisk) {
    parts.push(
      "Proposed schema migration introduces rollout complexity; use phased cutover, validation checks, and rollback guardrails."
    );
  }

  parts.push(
    "Use these findings as an architecture baseline, then confirm with explain plans and production telemetry."
  );
  return parts.join(" ");
}

function detectScenario(input: AnalysisInput, detWarnings: string[]): {
  hasSplitMigration: boolean;
  hasHotDocRisk: boolean;
  hasSortHeavyReads: boolean;
  hasTagFilters: boolean;
  hasStatusFilters: boolean;
  hasLargeIndexPlan: boolean;
} {
  const q = input.queryPatterns.join(" \n ").toLowerCase();
  const pc = (input.proposedChange ?? "").toLowerCase();
  return {
    hasSplitMigration:
      /\bmove\b|\bsplit\b|separate collection|dual-write|backfill|cutover|migrat/i.test(
        pc
      ) ||
      detWarnings.some((w) => /migrat|split|move|dual-write|backfill/i.test(w)),
    hasHotDocRisk: detWarnings.some((w) =>
      /hot mutable array|unbounded|bloat|write amplification|embedded documents/i.test(
        w
      )
    ),
    hasSortHeavyReads:
      /\bsort\b|sorted|order by|desc|asc|latest|recent|timeline/i.test(q),
    hasTagFilters: /\btag|tags|label|categor/i.test(q),
    hasStatusFilters: /\bstatus|draft|published|state/i.test(q),
    hasLargeIndexPlan: /\bcompound|filter\+sort|author|team|createdat|updatedat/i.test(q),
  };
}

function buildMigrationRisks(input: AnalysisInput, detWarnings: string[]): string[] {
  const scenario = detectScenario(input, detWarnings);
  const risks = [
    ...detWarnings.filter((w) => /migrat|split|move|backfill|dual-write/i.test(w)),
    "Index creation timing can impact read latency and cache behavior during rollout windows.",
  ];

  if (scenario.hasSplitMigration) {
    risks.push(
      "Dual-write divergence risk: old and new write paths can drift without strict idempotency and reconciliation checks."
    );
    risks.push(
      "Cutover risk: reader services may observe partial backfill state unless read-path gating is coordinated per endpoint."
    );
  }
  if (scenario.hasHotDocRisk) {
    risks.push(
      "Hot-document contention risk: frequent array updates can increase document rewrite pressure and tail latency."
    );
  }
  if (scenario.hasTagFilters || scenario.hasSortHeavyReads) {
    risks.push(
      "Query-plan regression risk: multikey and sort-heavy workloads can degrade if compound index order is misaligned with filter shape."
    );
  }

  return uniqueStrings(risks);
}

function buildRolloutPlan(input: AnalysisInput, detWarnings: string[]): string[] {
  const scenario = detectScenario(input, detWarnings);
  const plan = [
    "Define rollout success gates before release: p95 latency, error rate, and data parity thresholds by endpoint.",
    "Build required indexes first in a controlled window, then verify explain plans for top query patterns.",
    "Run pre-production replay or synthetic load against production-shaped data to validate query and write amplification behavior.",
  ];

  if (scenario.hasSplitMigration) {
    plan.push(
      "Execute backfill in bounded batches with checkpoints (counts, hash spot-checks, lag metrics) and pause/resume controls."
    );
    plan.push(
      "Enable dual-write behind a feature flag, then compare old/new path parity continuously before read cutover."
    );
    plan.push(
      "Cut over reads incrementally (internal traffic, then low-risk cohorts, then full traffic) with automatic rollback hooks."
    );
  } else {
    plan.push(
      "Roll out read-path changes progressively by service tier and monitor query planner stability after each step."
    );
  }

  if (scenario.hasStatusFilters) {
    plan.push(
      "Validate status/state transitions under load to ensure no lifecycle-state query regressions in critical dashboards."
    );
  }

  return uniqueStrings(plan);
}

function buildRollbackGuidance(input: AnalysisInput, detWarnings: string[]): string[] {
  const scenario = detectScenario(input, detWarnings);
  const guidance = [
    "Maintain feature flags for write and read paths independently so cutover can be reversed without redeploy.",
    "Predefine rollback triggers (e.g. p95 latency +20%, error rate > SLO budget, parity mismatch > threshold) and assign on-call owners.",
    "Keep restore points and reversible migration scripts ready for each rollout stage, not only final cutover.",
  ];

  if (scenario.hasSplitMigration) {
    guidance.push(
      "If parity checks fail, disable new read path first, then disable dual-write; continue writing to source-of-truth path only."
    );
    guidance.push(
      "Preserve migration audit logs (batch ids, offsets, timestamps) to support deterministic rewind and replay."
    );
  }
  if (scenario.hasLargeIndexPlan || scenario.hasSortHeavyReads) {
    guidance.push(
      "If query plans regress, pin critical indexes temporarily and revert planner-affecting changes before retrying rollout."
    );
  }

  return uniqueStrings(guidance);
}

function deterministicOutput(
  input: AnalysisInput,
  detWarnings: string[],
  indexCount: number
): Pick<
  AnalysisOutput,
  "summary" | "migrationRisks" | "rolloutPlan" | "rollbackGuidance"
> {
  return {
    summary: buildSummary(input, detWarnings, indexCount),
    migrationRisks: buildMigrationRisks(input, detWarnings),
    rolloutPlan: buildRolloutPlan(input, detWarnings),
    rollbackGuidance: buildRollbackGuidance(input, detWarnings),
  };
}

export async function analyzeRequest(
  input: AnalysisInput
): Promise<{ output: AnalysisOutput }> {
  const deterministic = runDeterministicAnalysis(input);
  const base = deterministicOutput(
    input,
    deterministic.warnings,
    deterministic.preliminaryIndexRecommendations.length
  );

  return {
    output: {
      summary: base.summary,
      deterministicWarnings: uniqueStrings(deterministic.warnings),
      schemaFindings: deterministic.preliminarySchemaFindings,
      indexRecommendations: deterministic.preliminaryIndexRecommendations,
      migrationRisks: base.migrationRisks,
      rolloutPlan: base.rolloutPlan,
      rollbackGuidance: base.rollbackGuidance,
    },
  };
}
