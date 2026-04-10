"use client";

import { demoAnalysisInput } from "@/lib/sampleData";
import type { AnalysisInput } from "@/lib/schemas";

export type FormValues = {
  collectionName: string;
  sampleDocumentsJson: string;
  queryPatternsText: string;
  proposedChange: string;
};

type Props = {
  values: FormValues;
  onChange: (next: FormValues) => void;
  onSubmit: (input: AnalysisInput) => void;
  onValidationError: (errors: Record<string, string>) => void;
  loading: boolean;
  errors: Record<string, string>;
};

function buildAnalysisInput(values: FormValues): {
  ok: true;
  data: AnalysisInput;
} | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const name = values.collectionName.trim();
  if (!name) errors.collectionName = "Collection name is required";

  let parsed: unknown;
  try {
    parsed = JSON.parse(values.sampleDocumentsJson || "[]");
  } catch {
    errors.sampleDocumentsJson = "Sample documents must be valid JSON";
    return { ok: false, errors };
  }

  if (!Array.isArray(parsed)) {
    errors.sampleDocumentsJson = "Sample documents must be a JSON array";
    return { ok: false, errors };
  }

  const sampleDocuments: Record<string, unknown>[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const el = parsed[i];
    if (el === null || typeof el !== "object" || Array.isArray(el)) {
      errors.sampleDocumentsJson = `Element ${i} must be a JSON object`;
      return { ok: false, errors };
    }
    sampleDocuments.push(el as Record<string, unknown>);
  }

  if (sampleDocuments.length === 0) {
    errors.sampleDocumentsJson = "Provide at least one sample document";
  }

  const queryPatterns = values.queryPatternsText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (queryPatterns.length === 0) {
    errors.queryPatternsText = "Add at least one query pattern (one per line)";
  }

  if (Object.keys(errors).length) return { ok: false, errors };

  const input: AnalysisInput = {
    collections: [{ name, sampleDocuments }],
    queryPatterns,
    proposedChange: values.proposedChange.trim() || undefined,
  };

  return { ok: true, data: input };
}

export function AnalysisForm({
  values,
  onChange,
  onSubmit,
  onValidationError,
  loading,
  errors,
}: Props) {
  function update<K extends keyof FormValues>(key: K, v: FormValues[K]) {
    onChange({ ...values, [key]: v });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = buildAnalysisInput(values);
    if (!res.ok) {
      onValidationError(res.errors);
      return;
    }
    onSubmit(res.data);
  }

  function loadSample() {
    const c = demoAnalysisInput.collections[0]!;
    onChange({
      collectionName: c.name,
      sampleDocumentsJson: JSON.stringify(c.sampleDocuments, null, 2),
      queryPatternsText: demoAnalysisInput.queryPatterns.join("\n"),
      proposedChange: demoAnalysisInput.proposedChange ?? "",
    });
  }

  function clearForm() {
    onChange({
      collectionName: "",
      sampleDocumentsJson: "[]",
      queryPatternsText: "",
      proposedChange: "",
    });
  }

  const built = buildAnalysisInput(values);
  const canSubmit = built.ok && !loading;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
          Collection name
        </label>
        <input
          type="text"
          className="glass-input w-full rounded-xl px-3 py-2 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] outline-none ring-emerald-400/30 transition focus:border-emerald-300/70 focus:ring-2"
          placeholder="e.g. orders, subscriptions, tickets"
          value={values.collectionName}
          onChange={(e) => update("collectionName", e.target.value)}
          disabled={loading}
        />
        {errors.collectionName && (
          <p className="mt-1 text-xs text-rose-300">{errors.collectionName}</p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
          Sample documents (JSON array)
        </label>
        <textarea
          className="glass-input min-h-[200px] w-full rounded-xl px-3 py-2 font-mono text-xs leading-relaxed shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] outline-none ring-emerald-400/30 transition focus:border-emerald-300/70 focus:ring-2"
          placeholder='[ { "_id": "...", "authorId": "...", "createdAt": "...", "comments": [] } ]'
          value={values.sampleDocumentsJson}
          onChange={(e) => update("sampleDocumentsJson", e.target.value)}
          disabled={loading}
        />
        {errors.sampleDocumentsJson && (
          <p className="mt-1 text-xs text-rose-300">{errors.sampleDocumentsJson}</p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
          Query patterns (one per line)
        </label>
        <textarea
          className="glass-input min-h-[120px] w-full rounded-xl px-3 py-2 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] outline-none ring-emerald-400/30 transition focus:border-emerald-300/70 focus:ring-2"
          placeholder="List posts by author sorted by createdAt desc"
          value={values.queryPatternsText}
          onChange={(e) => update("queryPatternsText", e.target.value)}
          disabled={loading}
        />
        {errors.queryPatternsText && (
          <p className="mt-1 text-xs text-rose-300">{errors.queryPatternsText}</p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
          Proposed schema change{" "}
          <span className="font-normal text-slate-400/90">(optional)</span>
        </label>
        <textarea
          className="glass-input min-h-[88px] w-full rounded-xl px-3 py-2 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] outline-none ring-emerald-400/30 transition focus:border-emerald-300/70 focus:ring-2"
          placeholder="e.g. Move embedded comments into comments collection keyed by postId"
          value={values.proposedChange}
          onChange={(e) => update("proposedChange", e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-xl border border-emerald-200/40 bg-gradient-to-br from-[#00ed64] to-[#13aa52] px-4 py-2 text-sm font-semibold text-[#061621] shadow-[0_10px_24px_rgba(0,237,100,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Running review…" : "Run architecture review"}
        </button>
        <button
          type="button"
          onClick={loadSample}
          disabled={loading}
          className="glass-panel-soft rounded-xl px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700/30 disabled:opacity-50"
        >
          Load Sample Data
        </button>
        <button
          type="button"
          onClick={clearForm}
          disabled={loading}
          className="rounded-xl border border-transparent px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-500/40 hover:bg-slate-700/20 hover:text-slate-100 disabled:opacity-50"
        >
          Clear form
        </button>
      </div>
    </form>
  );
}

export function validateFormClient(values: FormValues): {
  ok: boolean;
  errors: Record<string, string>;
  data?: AnalysisInput;
} {
  const res = buildAnalysisInput(values);
  if (!res.ok) return { ok: false, errors: res.errors };
  return { ok: true, errors: {}, data: res.data };
}
