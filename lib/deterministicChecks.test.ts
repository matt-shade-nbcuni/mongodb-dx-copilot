import { describe, expect, it } from "vitest";
import { runDeterministicAnalysis } from "./deterministicChecks";
import type { AnalysisInput } from "./schemas";

describe("runDeterministicAnalysis", () => {
  it("flags hot mutable arrays and proposes relevant indexes", () => {
    const input: AnalysisInput = {
      collections: [
        {
          name: "posts",
          sampleDocuments: [
            {
              _id: "p1",
              authorId: "a1",
              createdAt: "2026-01-01T00:00:00.000Z",
              tags: ["mongodb", "dx"],
              comments: [
                {
                  _id: "c1",
                  text: "hello",
                  createdAt: "2026-01-02T00:00:00.000Z",
                },
              ],
            },
          ],
        },
      ],
      queryPatterns: [
        "Fetch a post by id with latest 20 comments",
        "List posts by author sorted by createdAt desc",
        "Search posts by tag",
      ],
      proposedChange:
        "Move comments into a separate collection and dual-write during rollout.",
    };

    const result = runDeterministicAnalysis(input);

    expect(
      result.warnings.some((w) => w.includes("hot mutable array"))
    ).toBe(true);
    expect(
      result.preliminarySchemaFindings[0]?.findings.some((f) =>
        f.includes("Embedded documents under")
      )
    ).toBe(true);
    expect(
      result.preliminaryIndexRecommendations.some(
        (r) => r.collection === "posts" && r.index.authorId === 1 && r.index.createdAt === -1
      )
    ).toBe(true);
    expect(
      result.preliminaryIndexRecommendations.some(
        (r) => r.collection === "posts" && r.index.tags === 1
      )
    ).toBe(true);
  });

  it("detects inconsistent field presence and shape", () => {
    const input: AnalysisInput = {
      collections: [
        {
          name: "users",
          sampleDocuments: [
            { _id: "u1", age: 29, profile: { city: "Austin" } },
            { _id: "u2", age: "29", tags: ["new"] },
          ],
        },
      ],
      queryPatterns: ["Fetch user by id"],
    };

    const result = runDeterministicAnalysis(input);

    expect(
      result.warnings.some((w) => w.includes('Field "age" has inconsistent shapes'))
    ).toBe(true);
    expect(
      result.warnings.some((w) => w.includes('Field "profile" is present in only'))
    ).toBe(true);
  });
});

