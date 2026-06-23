import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { reviewRecommendation } from "@/lib/ai/pipelines";
import { getDecisionReviews, saveDecisionReview } from "@/lib/decision-store";

export const runtime = "nodejs";

const bodySchema = z.object({
  decision: z.enum(["approved", "rejected", "edited"]),
  incidentId: z.string().optional(),
  recommendation: z.object({
    id: z.string(),
    title: z.string(),
    reason: z.string(),
    evidence: z.string(),
    sourceTimestamp: z.string(),
  }),
});

export async function GET(request: NextRequest) {
  const incidentId = request.nextUrl.searchParams.get("incidentId") ?? undefined;

  return NextResponse.json({ decisions: getDecisionReviews(incidentId) });
}

export async function POST(request: NextRequest) {
  const body = bodySchema.parse(await request.json());
  const result = await reviewRecommendation(body.decision, body.recommendation);
  const saved = saveDecisionReview({ ...result, id: `${body.incidentId ?? "incident"}-${result.recommendationId}-${result.decision}`, incidentId: body.incidentId });

  return NextResponse.json(saved);
}
