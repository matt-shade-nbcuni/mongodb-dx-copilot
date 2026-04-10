import type { AnalysisInput } from "./schemas";
import type { SchemaFinding, IndexRecommendation } from "./schemas";
import { uniqueStrings } from "./utils";

const HOT_ARRAY_NAMES =
  /comments|events|logs|history|messages|activity|items|revisions|versions|audit|timeline/i;

const TAG_LIKE = /tags|labels|categories|topics/i;

type FieldShape = "missing" | "null" | "string" | "number" | "boolean" | "array" | "object" | "date" | "other";

function shapeOf(v: unknown): FieldShape {
  if (v === undefined) return "missing";
  if (v === null) return "null";
  if (typeof v === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return "date";
    return "string";
  }
  if (typeof v === "number" || typeof v === "bigint") return "number";
  if (typeof v === "boolean") return "boolean";
  if (Array.isArray(v)) return "array";
  if (typeof v === "object") return "object";
  return "other";
}

function maxDepth(obj: unknown, depth = 0): number {
  if (obj === null || typeof obj !== "object") return depth;
  if (Array.isArray(obj)) {
    let m = depth;
    for (const el of obj) {
      m = Math.max(m, maxDepth(el, depth + 1));
    }
    return m;
  }
  let m = depth;
  for (const v of Object.values(obj as Record<string, unknown>)) {
    m = Math.max(m, maxDepth(v, depth + 1));
  }
  return m;
}

function analyzeFieldConsistency(docs: Record<string, unknown>[]): {
  missing: string[];
  inconsistent: string[];
} {
  const missing: string[] = [];
  const inconsistent: string[] = [];
  const allKeys = new Set<string>();
  for (const d of docs) {
    for (const k of Object.keys(d)) allKeys.add(k);
  }
  for (const key of allKeys) {
    const shapes = new Set<FieldShape>();
    let presentCount = 0;
    for (const d of docs) {
      if (!(key in d)) continue;
      presentCount++;
      shapes.add(shapeOf(d[key]));
    }
    if (presentCount > 0 && presentCount < docs.length) {
      missing.push(
        `Field "${key}" is present in only ${presentCount} of ${docs.length} sample document(s).`
      );
    }
    if (shapes.size > 1) {
      inconsistent.push(
        `Field "${key}" has inconsistent shapes across samples: ${[...shapes].join(", ")}.`
      );
    }
  }
  return { missing, inconsistent };
}

function arrayInsights(
  path: string,
  arr: unknown[],
  collection: string,
  warnings: string[],
  findings: string[],
  indexHints: IndexRecommendation[]
): void {
  if (arr.length === 0) return;
  const hasEmbeddedDocs = arr.some(
    (x) => x !== null && typeof x === "object" && !Array.isArray(x)
  );
  if (hasEmbeddedDocs) {
    warnings.push(
      `Collection "${collection}": array at "${path}" contains embedded documents — unbounded growth can bloat parent documents and increase write amplification when updating nested items.`
    );
    findings.push(
      `Embedded documents under "${path}" may warrant a separate collection if the array grows per user-facing activity.`
    );
  }
  if (arr.length > 20 || HOT_ARRAY_NAMES.test(path)) {
    warnings.push(
      `Collection "${collection}": "${path}" looks like a hot mutable array (name or size heuristic) — risk of large documents and relocation on growth.`
    );
  }
  if (TAG_LIKE.test(path)) {
    indexHints.push({
      collection,
      index: { [path.split(".").pop() ?? path]: 1 },
      reason: `Multikey index candidate on "${path}" for tag/label filters (verify cardinality and query selectivity).`,
      tradeoffs: [
        "Multikey indexes can be larger than single-field indexes.",
        "Compound ordering with sort fields may require careful index design.",
      ],
    });
  }
}

function walkDocument(
  obj: Record<string, unknown>,
  collection: string,
  basePath: string,
  warnings: string[],
  findings: string[],
  indexHints: IndexRecommendation[]
): void {
  for (const [k, v] of Object.entries(obj)) {
    const path = basePath ? `${basePath}.${k}` : k;
    if (Array.isArray(v)) {
      if (v.length > 100) {
        warnings.push(
          `Collection "${collection}": array "${path}" has ${v.length} elements in sample — may be unbounded in production.`
        );
      } else if (v.length > 30 || HOT_ARRAY_NAMES.test(path) || TAG_LIKE.test(path)) {
        warnings.push(
          `Collection "${collection}": array "${path}" may grow without a hard cap — plan for document size and index implications.`
        );
      }
      arrayInsights(path, v, collection, warnings, findings, indexHints);
    } else if (v !== null && typeof v === "object") {
      walkDocument(v as Record<string, unknown>, collection, path, warnings, findings, indexHints);
    }
  }
}

function parseQueryHeuristics(
  patterns: string[],
  collectionNames: string[]
): IndexRecommendation[] {
  const out: IndexRecommendation[] = [];
  const text = patterns.join(" \n ").toLowerCase();

  for (const name of collectionNames) {
    if (/\bby id\b|_id|findbyid|fetch.*\bid\b/i.test(text)) {
      out.push({
        collection: name,
        index: { _id: 1 },
        reason: "Point lookups by _id are covered by the default _id index; ensure API uses _id and not redundant filters.",
        tradeoffs: ["Redundant indexes on unique _id are unnecessary."],
      });
    }
    if (/\bauthor\b|authorid|user id|userid/i.test(text) && /\bsort\b|sorted|desc|asc|createdat|created_at/i.test(text)) {
      out.push({
        collection: name,
        index: { authorId: 1, createdAt: -1 },
        reason:
          "Query pattern suggests filtering by author and sorting by recency — compound index supports the common filter+sort shape.",
        tradeoffs: [
          "Index key order must match equality fields first, then sort range.",
          "Writes update all index entries for indexed fields.",
        ],
      });
    }
    if (/\btag\b|tags\b|label/i.test(text)) {
      out.push({
        collection: name,
        index: { tags: 1, createdAt: -1 },
        reason:
          "Tag search plus recency often needs a compound index starting with the tag field (multikey) and a sort key.",
        tradeoffs: [
          "Multikey + sort compounds can be memory-heavy for large arrays.",
          "Consider tag cardinality before relying solely on multikey scans.",
        ],
      });
    }
    if (/\bsort\b|sorted|order by|descending|ascending/i.test(text) && /createdat|updatedat|timestamp/i.test(text)) {
      out.push({
        collection: name,
        index: { createdAt: -1 },
        reason: "Sort-heavy recent-item feeds may need a dedicated index on the sort field (often combined with filters).",
        tradeoffs: ["Standalone sort indexes help only when the query can use them without conflicting filter order."],
      });
    }
  }
  return out;
}

function queryDrivenFindings(patterns: string[], collection: string): string[] {
  const out: string[] = [];
  const text = patterns.join(" \n ").toLowerCase();
  if (/\bby id\b|_id|findbyid|fetch.*\bid\b/i.test(text)) {
    out.push(
      `Access patterns include point reads by id for "${collection}". Keep payload lean on hot read paths and avoid oversized embedded arrays.`
    );
  }
  if (/\btag\b|tags\b|label|categor/i.test(text)) {
    out.push(
      "Tag/category filtering appears frequently; model array cardinality and multikey index growth as content scales."
    );
  }
  if (
    /\bsort\b|sorted|order by|descending|ascending/i.test(text) &&
    /createdat|updatedat|timestamp/i.test(text)
  ) {
    out.push(
      "Feed-style sorted reads are present; preserve monotonic timestamp fields and align sort order with compound indexes."
    );
  }
  if (/\bdraft\b|status\b|published\b/i.test(text)) {
    out.push(
      "Lifecycle/state filters (draft/published/status) are in use; keep status modeling consistent to avoid fragmented query plans."
    );
  }
  return out;
}

export type DeterministicResult = {
  warnings: string[];
  preliminarySchemaFindings: SchemaFinding[];
  preliminaryIndexRecommendations: IndexRecommendation[];
};

function dedupeIndexes(items: IndexRecommendation[]): IndexRecommendation[] {
  const seen = new Set<string>();
  const out: IndexRecommendation[] = [];
  for (const r of items) {
    const key = `${r.collection}:${JSON.stringify(r.index)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

export function runDeterministicAnalysis(input: AnalysisInput): DeterministicResult {
  const warnings: string[] = [];
  const preliminarySchemaFindings: SchemaFinding[] = [];
  const preliminaryIndexRecommendations: IndexRecommendation[] = [];

  const collectionNames = input.collections.map((c) => c.name);

  for (const col of input.collections) {
    const docs = col.sampleDocuments;
    const { missing, inconsistent } = analyzeFieldConsistency(docs);
    const depth = Math.max(...docs.map((d) => maxDepth(d)));
    const findings: string[] = [];
    if (depth >= 4) {
      warnings.push(
        `Collection "${col.name}": deeply nested structures (depth ~${depth}) — harder to index selectively and more brittle for migrations.`
      );
      findings.push(
        `Observed nesting depth (~${depth}) suggests complex document traversal; consider flattening frequently queried fields.`
      );
    }
    for (const m of missing) warnings.push(`${col.name}: ${m}`);
    for (const i of inconsistent) warnings.push(`${col.name}: ${i}`);
    if (missing.length) {
      findings.push(
        `Optional-field variance detected (${missing.length} field(s) not consistently present). Define defaults or tighten write contracts for predictable query behavior.`
      );
    }
    if (inconsistent.length) {
      findings.push(
        `Inconsistent field shapes detected (${inconsistent.length} field(s)). Standardize types before indexing to reduce query planner ambiguity.`
      );
    }

    let repeatedNested = false;
    let embeddedArrayCount = 0;
    for (const d of docs) {
      walkDocument(d, col.name, "", warnings, findings, preliminaryIndexRecommendations);
      for (const [k, v] of Object.entries(d)) {
        if (Array.isArray(v) && v.length > 1) {
          const first = v[0];
          if (first && typeof first === "object" && !Array.isArray(first)) {
            const keys = Object.keys(first as object);
            if (keys.length >= 2) repeatedNested = true;
            embeddedArrayCount++;
          }
        }
      }
    }
    if (repeatedNested) {
      findings.push(
        "Repeated array of subdocuments may represent an entity that could be normalized into its own collection for independent indexing and lifecycle."
      );
    }
    if (embeddedArrayCount > 0) {
      findings.push(
        `Found ${embeddedArrayCount} repeated embedded subdocument array pattern(s) in samples; validate whether update frequency justifies referencing for write-heavy paths.`
      );
    }
    findings.push(...queryDrivenFindings(input.queryPatterns, col.name));

    preliminarySchemaFindings.push({
      collection: col.name,
      findings: uniqueStrings(findings),
    });
  }

  preliminaryIndexRecommendations.push(
    ...parseQueryHeuristics(input.queryPatterns, collectionNames)
  );

  if (input.proposedChange?.trim()) {
    const pc = input.proposedChange.toLowerCase();
    if (/\bmove\b.*\bcomments?\b|\bsplit\b.*\barray\b|separate collection/i.test(input.proposedChange)) {
      warnings.push(
        "Proposed split of embedded arrays implies a migration window: backfill, dual-write, or batch copy with validation."
      );
      preliminaryIndexRecommendations.push({
        collection: collectionNames[0] ?? "posts",
        index: { postId: 1, createdAt: -1 },
        reason:
          "If comments move to their own collection, index by postId for parent-scoped reads and createdAt for latest-N pagination.",
        tradeoffs: [
          "Two collections increase application join/lookup complexity versus a single document read.",
          "Orphan cleanup and referential integrity become application-level concerns unless enforced elsewhere.",
        ],
      });
    }
    if (pc.includes("rollback") || pc.includes("risk")) {
      /* noop — LLM handles narrative; we only flag migration */
    }
  }

  return {
    warnings: uniqueStrings(warnings),
    preliminarySchemaFindings,
    preliminaryIndexRecommendations: dedupeIndexes(preliminaryIndexRecommendations),
  };
}
