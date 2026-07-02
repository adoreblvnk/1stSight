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

const responderSafetySearchPattern = /drunk|intoxicat|abus|aggress|threat|violent|physical|physic|phsyic|contact|shove|strike|unsafe|proximity|responder safety|welfare|police|backup|support/i;

function directResponderSafetySearch(query: string, evidence: z.infer<typeof evidenceSchema>[]) {
  if (!responderSafetySearchPattern.test(query)) return null;

  const queryText = query.toLowerCase();
  const matches = evidence
    .map((item) => {
      const haystack = `${item.name} ${item.description} ${item.tags.join(" ")} ${item.boxes.map((box) => box.label).join(" ")}`.toLowerCase();
      let score = 0;

      if (/physical contact|hands? \/ arms? meet|hand contact|contact evidence/i.test(haystack)) score += 12;
      if (/unsafe proximity|close proximity|close-range|near responder|responder-side space/i.test(haystack)) score += 8;
      if (/crew intervention|spacing|recovery|withdrawal/i.test(haystack)) score += 7;
      if (/responder safety/i.test(haystack)) score += 2;
      if (/welfare|medical|person low|hydration/i.test(queryText) && /welfare|medical|person low|hydration/i.test(haystack)) score += 5;
      if (/police|backup|support/i.test(queryText) && /physical contact|unsafe proximity|crew intervention|responder safety/i.test(haystack)) score += 5;

      return { item, score };
    })
    .filter(({ score }) => score >= 7)
    .sort((a, b) => b.score - a.score || a.item.order - b.item.order)
    .map(({ item }) => item.frameId);

  return {
    query,
    intent: "Responder-safety evidence",
    answer: matches.length ? "Focused responder-safety evidence is available in the incident timeline." : "No matching responder-safety evidence found.",
    reason: "Matched the query to physical-contact, unsafe-proximity, recovery, and crew-spacing evidence from the analyzed timeline.",
    evidenceFrameIds: matches,
  };
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
  const directSearch = directResponderSafetySearch(body.query, body.evidence);

  if (directSearch) return NextResponse.json(directSearch);

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
