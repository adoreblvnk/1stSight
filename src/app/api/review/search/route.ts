import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateStructuredStrict } from "@/lib/ai/model";
import { runtimeEvidenceSearchSchema } from "@/lib/ai/schemas";
import { getRuntimeIncident } from "@/lib/scenario";

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
  incidentId: z.string().min(1),
  query: z.string().min(1),
  evidence: z.array(evidenceSchema).min(1),
});

function formatEvidenceCatalog(evidence: z.infer<typeof evidenceSchema>[]) {
  return evidence
    .map((item) => {
      const boxLabels = item.boxes.map((box) => box.label).join(", ") || "none";
      const tags = item.tags.join(", ") || "none";

      return `frameId=${item.frameId}; source=${item.sourceResponder}; time=${item.timestampLabel}; order=${item.order}; name=${item.name}; description=${item.description}; tags=${tags}; boxes=${boxLabels}`;
    })
    .join("\n");
}

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json({ error: "Run post-incident analysis first, then search with the latest runtime evidence payload." }, { status: 400 });
  }

  const body = parsed.data;
  const { incident } = getRuntimeIncident(body.incidentId);

  if (!incident) {
    return NextResponse.json({ error: "Incident was not found." }, { status: 404 });
  }

  if (!incident.supportsRuntimeAnalysis) {
    return NextResponse.json({ error: incident.unavailableReason ?? "Evidence search is unavailable for this incident." }, { status: 400 });
  }

  const evidenceCatalog = formatEvidenceCatalog(body.evidence);

  try {
    const result = await generateStructuredStrict({
      schema: runtimeEvidenceSearchSchema,
      prefer: "text",
      outputName: "runtimeEvidenceSearchResult",
      outputDescription: "Search result object, not an evidence catalog item.",
      prompt: `Return exactly one JSON object with keys query, intent, answer, reason, and evidenceFrameIds. Do not return, copy, or wrap any evidence catalog row. Use only frameId values from the evidence catalog for evidenceFrameIds. Query: ${body.query}\nEvidence catalog rows:\n${evidenceCatalog}`,
    });

    const validFrameIds = new Set(body.evidence.map((item) => item.frameId));

    return NextResponse.json({
      ...result,
      query: body.query,
      evidenceFrameIds: result.evidenceFrameIds.filter((frameId) => validFrameIds.has(frameId)),
    });
  } catch (error) {
    console.error("runtime evidence search unavailable", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Runtime evidence search is unavailable. Check the server model/API configuration." }, { status: 502 });
  }
}
