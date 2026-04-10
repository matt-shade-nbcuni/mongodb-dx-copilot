import { describe, expect, it } from "vitest";
import { analyzeRequest } from "./analyzer";
import type { AnalysisInput } from "./schemas";

describe("analyzeRequest", () => {
  it("builds scenario-aware rollout and rollback guidance", async () => {
    const input: AnalysisInput = {
      collections: [
        {
          name: "posts",
          sampleDocuments: [
            {
              _id: "p1",
              authorId: "a1",
              status: "published",
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-05T00:00:00.000Z",
              tags: ["mongodb"],
              comments: [
                {
                  _id: "c1",
                  text: "hello",
                  createdAt: "2026-01-03T00:00:00.000Z",
                },
              ],
              activityLog: [
                {
                  type: "edit",
                  at: "2026-01-04T00:00:00.000Z",
                },
              ],
            },
          ],
        },
      ],
      queryPatterns: [
        "Fetch a post by id with latest 20 comments",
        "List posts by author sorted by createdAt desc",
        "Filter posts by status and tags",
      ],
      proposedChange:
        "Move comments and activityLog into separate collections with dual-write and staged read cutover.",
    };

    const { output } = await analyzeRequest(input);

    expect(output.summary).toContain("Deterministic review completed");
    expect(
      output.rolloutPlan.some((s) => s.toLowerCase().includes("dual-write"))
    ).toBe(true);
    expect(
      output.rollbackGuidance.some((s) =>
        s.toLowerCase().includes("feature flags")
      )
    ).toBe(true);
    expect(output.migrationRisks.length).toBeGreaterThan(2);
  });
});

