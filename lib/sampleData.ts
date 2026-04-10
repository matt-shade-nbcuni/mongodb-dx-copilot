import type { AnalysisInput } from "./schemas";

export const demoAnalysisInput: AnalysisInput = {
  collections: [
    {
      name: "posts",
      sampleDocuments: [
        {
          _id: "507f1f77bcf86cd799439011",
          authorId: "user_01",
          teamId: "team_core_platform",
          title: "Indexing compound paths",
          body: "When you filter and sort, order matters…",
          createdAt: "2025-03-10T12:00:00.000Z",
          updatedAt: "2025-03-15T09:10:00.000Z",
          status: "published",
          tags: ["mongodb", "performance"],
          categories: ["database", "backend"],
          visibility: { type: "team", allowedTeamIds: ["team_core_platform"] },
          metrics: {
            views: 22455,
            uniqueViewers: 16832,
            bookmarks: 640,
          },
          seo: {
            slug: "indexing-compound-paths",
            canonicalUrl: "https://example.dev/blog/indexing-compound-paths",
          },
          reactions: [
            { type: "like", count: 182 },
            { type: "insightful", count: 47 },
          ],
          comments: [
            {
              _id: "c1",
              userId: "user_02",
              text: "Great write-up.",
              createdAt: "2025-03-10T14:22:00.000Z",
              reactions: { like: 4, laugh: 0 },
            },
            {
              _id: "c2",
              userId: "user_03",
              text: "How does this behave under heavy write load?",
              createdAt: "2025-03-11T09:01:00.000Z",
              edits: [
                {
                  editedAt: "2025-03-11T09:14:00.000Z",
                  reason: "Clarified question wording",
                },
              ],
            },
          ],
          moderationEvents: [
            {
              type: "automod_checked",
              at: "2025-03-10T12:00:04.000Z",
              score: 0.02,
            },
          ],
        },
        {
          _id: "507f1f77bcf86cd799439012",
          authorId: "user_01",
          teamId: "team_core_platform",
          title: "Embedding vs referencing",
          body: "Tradeoffs for one-to-many…",
          createdAt: "2025-03-12T08:30:00.000Z",
          updatedAt: "2025-03-16T13:40:00.000Z",
          status: "published",
          tags: ["schema", "mongodb"],
          categories: ["architecture"],
          visibility: { type: "public" },
          metrics: {
            views: 11902,
            uniqueViewers: 9120,
            bookmarks: 311,
          },
          reactions: [{ type: "like", count: 95 }],
          comments: [],
          moderationEvents: [],
        },
        {
          _id: "507f1f77bcf86cd799439013",
          authorId: "user_09",
          teamId: "team_data_experience",
          title: "Operational migration checklist",
          body: "How to dual-write safely and validate backfills.",
          createdAt: "2025-03-18T10:15:00.000Z",
          updatedAt: "2025-03-19T07:31:00.000Z",
          status: "draft",
          tags: ["migration", "operations", "mongodb"],
          categories: ["operations", "reliability"],
          visibility: {
            type: "team",
            allowedTeamIds: ["team_data_experience", "team_core_platform"],
          },
          metrics: {
            views: 1208,
            uniqueViewers: 1001,
            bookmarks: 86,
          },
          comments: [
            {
              _id: "c77",
              userId: "user_02",
              text: "Can we include rollback KPIs?",
              createdAt: "2025-03-18T11:41:00.000Z",
              status: "visible",
            },
            {
              _id: "c78",
              userId: "user_17",
              text: "Need guidance for partial backfill retries.",
              createdAt: "2025-03-18T12:12:00.000Z",
              status: "visible",
            },
          ],
          activityLog: [
            {
              actorId: "user_09",
              type: "draft_saved",
              at: "2025-03-18T10:20:00.000Z",
            },
            {
              actorId: "user_09",
              type: "draft_saved",
              at: "2025-03-18T10:43:00.000Z",
            },
            {
              actorId: "user_02",
              type: "comment_added",
              at: "2025-03-18T11:41:00.000Z",
            },
          ],
        },
      ],
    },
  ],
  queryPatterns: [
    "Fetch a post by id with latest 20 comments",
    "List posts by author sorted by createdAt desc",
    "List published posts for a team sorted by updatedAt desc",
    "Fetch drafts for a team sorted by updatedAt desc",
    "Search posts by tag",
    "Show most recent posts for a tag",
    "Filter posts by category and status",
    "Show posts with highest engagement in last 7 days",
  ],
  proposedChange:
    "Move comments and activityLog from embedded arrays on posts into separate collections keyed by postId, add dual-write for two weeks, and migrate feed reads to the new comment query path with cursor pagination.",
};
