import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { reviewRecommendation } from "@/lib/ai/pipelines";

export const runtime = "nodejs";

const bodySchema = z.object({
  decision: z.enum(["approved", "rejected", "edited"]),
  recommendation: z.object({
    id: z.string(),
    title: z.string(),
    reason: z.string(),
    evidence: z.string(),
    sourceTimestamp: z.string(),
  }),
});

export async function POST(request: NextRequest) {
  const body = bodySchema.parse(await request.json());
  const result = await reviewRecommendation(body.decision, body.recommendation);

  return NextResponse.json(result);
}
