import { recommendationReviewSchema, type RecommendationReviewOutput } from "@/lib/ai/schemas";
import { generateStructured } from "@/lib/ai/model";

type RecommendationReviewContext = {
  id: string;
  title: string;
  reason: string;
  evidence: string;
  sourceTimestamp: string;
};

export async function reviewRecommendation(decision: "approved" | "rejected" | "edited", recommendation: RecommendationReviewContext): Promise<RecommendationReviewOutput> {
  const fallback: RecommendationReviewOutput = {
    recommendationId: recommendation.id,
    decision,
    reviewer: "Ops Centre Officer",
    reason:
      decision === "approved"
        ? `Officer marked ${recommendation.title} for Ground Commander consideration: ${recommendation.reason}. Evidence: ${recommendation.evidence}.`
        : `Officer kept ${recommendation.title} out of the Ground Commander summary. Evidence reviewed: ${recommendation.evidence}.`,
    timestamp: recommendation.sourceTimestamp,
  };

  const generated = await generateStructured({
    schema: recommendationReviewSchema,
    prefer: "text",
    fallback,
    prompt: `Generate a concise human review record for recommendation ${recommendation.id} with decision ${decision}. Recommendation title: ${recommendation.title}. Reason: ${recommendation.reason}. Evidence: ${recommendation.evidence}. Source timestamp: ${recommendation.sourceTimestamp}.`,
  });

  return {
    ...generated,
    recommendationId: fallback.recommendationId,
    decision: fallback.decision,
    reviewer: fallback.reviewer,
    timestamp: fallback.timestamp,
    reason: fallback.reason,
  };
}
