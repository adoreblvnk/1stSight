import { z } from "zod";

export const recommendationReviewSchema = z.object({
  recommendationId: z.string(),
  decision: z.enum(["approved", "rejected", "edited"]),
  reviewer: z.string(),
  reason: z.string(),
  timestamp: z.string(),
});

export const searchResultSchema = z.object({
  query: z.string(),
  intent: z.string(),
  incidentIds: z.array(z.string()),
  evidenceIds: z.array(z.string()),
  answer: z.string(),
  reason: z.string(),
});

export const reportPlanSchema = z.object({
  reportTitle: z.string(),
  incidentIds: z.array(z.string()),
  evidenceIds: z.array(z.string()),
  conciseAnalysis: z.string(),
  claims: z.array(
    z.object({
      text: z.string(),
      reason: z.string(),
      evidence: z.string(),
    }),
  ),
});

export const postIncidentAnalysisSchema = z.object({
  incidentId: z.string(),
  incidentTitle: z.string(),
  summary: z.string(),
  evidence: z.array(
    z.object({
      frameId: z.string(),
      sourceVideo: z.string(),
      responderId: z.string(),
      sourceResponder: z.string(),
      frameTimestampSeconds: z.number(),
      timestampLabel: z.string(),
      rank: z.number(),
      name: z.string(),
      description: z.string(),
      confidence: z.number(),
      tags: z.array(z.string()),
      boxes: z.array(
        z.object({
          x: z.number(),
          y: z.number(),
          width: z.number(),
          height: z.number(),
          label: z.string(),
        }),
      ),
    }),
  ).min(1),
  recommendations: z.array(
    z.object({
      id: z.string(),
      rank: z.number(),
      title: z.string(),
      reason: z.string(),
      evidenceFrameIds: z.array(z.string()),
    }),
  ),
});

export const liveAnalysisSchema = z.object({
  generatedAt: z.string(),
  chunkStartSeconds: z.number(),
  chunkDurationSeconds: z.number(),
  events: z.array(
    z.object({
      id: z.string(),
      timestamp: z.string(),
      title: z.string(),
      source: z.string(),
      evidence: z.string(),
      reviewState: z.enum(["system-created", "pending-review", "approved", "rejected", "selected"]),
    }),
  ),
  recommendation: z.object({
    shouldRecommend: z.boolean(),
    id: z.string(),
    title: z.string(),
    action: z.string(),
    reason: z.string(),
    evidence: z.string(),
    evidenceFrameId: z.string(),
    evidenceImageUrl: z.string(),
    sourceTimestamp: z.string(),
    reviewState: z.enum(["system-created", "pending-review", "approved", "rejected", "selected"]),
  }),
});

export const runtimeEvidenceSearchSchema = z.object({
  query: z.string(),
  intent: z.string(),
  answer: z.string(),
  reason: z.string(),
  evidenceFrameIds: z.array(z.string()),
});

export type RecommendationReviewOutput = z.infer<typeof recommendationReviewSchema>;
export type SearchResultOutput = z.infer<typeof searchResultSchema>;
export type ReportPlanOutput = z.infer<typeof reportPlanSchema>;
export type PostIncidentAnalysisOutput = z.infer<typeof postIncidentAnalysisSchema>;
export type LiveAnalysisOutput = z.infer<typeof liveAnalysisSchema>;
export type RuntimeEvidenceSearchOutput = z.infer<typeof runtimeEvidenceSearchSchema>;
