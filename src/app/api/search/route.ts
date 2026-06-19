import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateStructuredStrict } from "@/lib/ai/model";
import { runtimeEvidenceSearchSchema } from "@/lib/ai/schemas";

export const runtime = "nodejs";

const runtimeBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  label: z.string(),
});

const runtimeEvidenceSchema = z.object({
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
  boxes: z.array(runtimeBoxSchema),
});

const bodySchema = z.object({
  query: z.string().min(1),
  evidence: z.array(runtimeEvidenceSchema).min(1),
});

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json({ error: "Run post-incident analysis first, then search with the latest runtime evidence payload." }, { status: 400 });
  }

  const evidenceCatalog = parsed.data.evidence.map((item) => ({
    frameId: item.frameId,
    sourceVideo: item.sourceVideo,
    sourceResponder: item.sourceResponder,
    timestampLabel: item.timestampLabel,
    rank: item.rank,
    name: item.name,
    description: item.description,
    confidence: item.confidence,
    tags: item.tags,
    boxes: item.boxes.map((box) => box.label),
  }));

  try {
    const result = await generateStructuredStrict({
      schema: runtimeEvidenceSearchSchema,
      prefer: "text",
      prompt: `Answer this post-incident natural-language search using only the runtime-analyzed evidence catalog. Query: ${parsed.data.query}\nEvidence catalog JSON:\n${JSON.stringify(evidenceCatalog)}`,
    });

    const validFrameIds = new Set(parsed.data.evidence.map((item) => item.frameId));

    return NextResponse.json({
      ...result,
      query: parsed.data.query,
      evidenceFrameIds: result.evidenceFrameIds.filter((frameId) => validFrameIds.has(frameId)),
    });
  } catch (error) {
    console.error("runtime evidence search unavailable", error);
    return NextResponse.json({ error: "Runtime evidence search is unavailable. Check the server model/API configuration." }, { status: 502 });
  }
}
