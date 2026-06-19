import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateStructuredStrict } from "@/lib/ai/model";
import { runtimeEvidenceSearchSchema } from "@/lib/ai/schemas";

export const runtime = "nodejs";

const evidenceSchema = z.object({
  frameId: z.string(),
  sourceVideo: z.string(),
  responderId: z.string(),
  sourceResponder: z.string(),
  frameTimestampSeconds: z.number(),
  timestampLabel: z.string(),
  order: z.number(),
  name: z.string(),
  description: z.string(),
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
});

const bodySchema = z.object({
  query: z.string().min(1),
  evidence: z.array(evidenceSchema).min(1),
});

export async function POST(request: NextRequest) {
  const body = bodySchema.parse(await request.json());
  const evidenceCatalog = body.evidence.map((item) => ({
    frameId: item.frameId,
    sourceVideo: item.sourceVideo,
    sourceResponder: item.sourceResponder,
    timestampLabel: item.timestampLabel,
    order: item.order,
    name: item.name,
    description: item.description,
    tags: item.tags,
    boxes: item.boxes.map((box) => box.label),
  }));

  try {
    const result = await generateStructuredStrict({
      schema: runtimeEvidenceSearchSchema,
      prefer: "text",
      prompt: `Answer this post-incident natural-language search using only the runtime-analyzed evidence catalog. Query: ${body.query}\nEvidence catalog JSON:\n${JSON.stringify(evidenceCatalog)}`,
    });

    const validFrameIds = new Set(body.evidence.map((item) => item.frameId));

    return NextResponse.json({
      ...result,
      query: body.query,
      evidenceFrameIds: result.evidenceFrameIds.filter((frameId) => validFrameIds.has(frameId)),
    });
  } catch (error) {
    console.error("runtime evidence search unavailable", error);
    return NextResponse.json({ error: "Runtime evidence search is unavailable. Check the server model/API configuration." }, { status: 502 });
  }
}
