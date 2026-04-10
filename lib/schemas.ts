import { z } from "zod";

export const collectionInputSchema = z.object({
  name: z.string().min(1, "Collection name is required"),
  sampleDocuments: z
    .array(z.record(z.string(), z.unknown()))
    .min(1, "At least one sample document is required"),
});

export const analysisInputSchema = z.object({
  collections: z.array(collectionInputSchema).min(1),
  queryPatterns: z
    .array(z.string().min(1))
    .min(1, "At least one query pattern is required"),
  proposedChange: z.string().optional(),
});

export type CollectionInput = z.infer<typeof collectionInputSchema>;
export type AnalysisInput = z.infer<typeof analysisInputSchema>;

export const schemaFindingSchema = z.object({
  collection: z.string(),
  findings: z.array(z.string()),
});

export const indexRecommendationSchema = z.object({
  collection: z.string(),
  index: z.record(z.union([z.literal(1), z.literal(-1)])),
  reason: z.string(),
  tradeoffs: z.array(z.string()),
});

export const analysisOutputSchema = z.object({
  summary: z.string(),
  deterministicWarnings: z.array(z.string()),
  schemaFindings: z.array(schemaFindingSchema),
  indexRecommendations: z.array(indexRecommendationSchema),
  migrationRisks: z.array(z.string()),
  rolloutPlan: z.array(z.string()),
  rollbackGuidance: z.array(z.string()),
});

export type SchemaFinding = z.infer<typeof schemaFindingSchema>;
export type IndexRecommendation = z.infer<typeof indexRecommendationSchema>;
export type AnalysisOutput = z.infer<typeof analysisOutputSchema>;

export const analysisListItemSchema = z.object({
  _id: z.string(),
  createdAt: z.string(),
  collectionNames: z.array(z.string()),
  summaryPreview: z.string(),
});

export type AnalysisListItem = z.infer<typeof analysisListItemSchema>;

export const savedAnalysisSchema = z.object({
  _id: z.string(),
  createdAt: z.string(),
  input: analysisInputSchema,
  output: analysisOutputSchema,
});

export type SavedAnalysis = z.infer<typeof savedAnalysisSchema>;
