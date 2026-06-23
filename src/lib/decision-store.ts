import type { DecisionReview } from "@/lib/domain";

type DecisionStoreGlobal = typeof globalThis & {
  __1stsightDecisionReviews?: DecisionReview[];
};

const decisionStoreGlobal = globalThis as DecisionStoreGlobal;

// 1stSight runtime store: generated for officer-reviewed recommendation persistence.
const decisionReviews = decisionStoreGlobal.__1stsightDecisionReviews ?? [];
decisionStoreGlobal.__1stsightDecisionReviews = decisionReviews;

export function saveDecisionReview(review: DecisionReview) {
  const index = decisionReviews.findIndex((item) => item.incidentId === review.incidentId && item.recommendationId === review.recommendationId);

  if (index >= 0) {
    decisionReviews[index] = review;
    return review;
  }

  decisionReviews.push(review);
  return review;
}

export function getDecisionReviews(incidentId?: string) {
  return incidentId ? decisionReviews.filter((review) => review.incidentId === incidentId) : [...decisionReviews];
}
