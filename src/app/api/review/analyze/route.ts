import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { execa } from "execa";
import { z } from "zod";
import { generateStructuredStrict } from "@/lib/ai/model";
import { postIncidentAnalysisSchema } from "@/lib/ai/schemas";
import { buildPunggolFireDemoFrames, buildWoodlandsDemoFrames, isDemoFireIncident, isDemoWoodlandsIncident, type DemoEvidenceFrame } from "@/lib/demo-evidence";
import { getRuntimeIncident } from "@/lib/scenario";

export const runtime = "nodejs";

const bodySchema = z.object({
  incidentId: z.string().min(1),
  feedIds: z.array(z.string()).default([]),
});

const candidateRatios = [0.18, 0.5, 0.82];

function formatTimestamp(seconds: number) {
  const roundedSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(roundedSeconds / 60);
  const remainingSeconds = String(roundedSeconds % 60).padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

async function getVideoDurationSeconds(videoPath: string) {
  // ffprobe CLI: https://ffmpeg.org/ffprobe.html
  const { stdout } = await execa("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", videoPath]);
  const duration = Number.parseFloat(stdout.trim());

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`Unable to determine video duration for ${videoPath}`);
  }

  return duration;
}

function getCandidateSeconds(durationSeconds: number, incidentType: "fire" | "medical") {
  const incidentCues = incidentType === "medical" ? [21.5, 22, 22.5] : [76, 76.5, 77];
  return [...new Set([...incidentCues, ...candidateRatios.map((ratio) => Math.max(1, Math.min(durationSeconds - 0.5, Math.round(durationSeconds * ratio))))])]
    .map((seconds) => Math.min(seconds, Math.max(1, durationSeconds - 0.5)))
    .filter((seconds) => Number.isFinite(seconds) && seconds > 0)
    .slice(0, 5);
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Math.round(value * 10) / 10));
}

function insetBox(box: { x: number; y: number; width: number; height: number; label: string }) {
  const inset = 2;
  const maxBoxSpan = 72;
  const width = Math.min(clampPercent(box.width), maxBoxSpan);
  const height = Math.min(clampPercent(box.height), maxBoxSpan);
  const x = Math.min(100 - inset - width, Math.max(inset, clampPercent(box.x)));
  const y = Math.min(100 - inset - height, Math.max(inset, clampPercent(box.y)));

  return {
    ...box,
    x,
    y,
    width,
    height,
  };
}

function isSupportedRecommendation(recommendation: { title: string; reason: string }) {
  const text = `${recommendation.title} ${recommendation.reason}`;

  if (/enhanced task force/i.test(text)) {
    return /uncontrolled|large fire|rapid escalation|beyond initial attack|multiple compartments|resource escalation|defensive operations/i.test(text);
  }

  return /raise alarm|alarm level|hazmat|ambulance|staging|aerial|resource support|additional resource|blocked access|collapse/i.test(text);
}

function incidentPromptContext(incident: { title: string; location: string; summary: string; tags: string[] }) {
  const tags = incident.tags.length ? incident.tags.join(", ") : "incident operations";

  return `${incident.title} at ${incident.location}. Caller/context summary: ${incident.summary}. Incident tags: ${tags}.`;
}

function incidentAnalysisInstructions(incident: { type: "fire" | "medical" }) {
  if (incident.type === "medical") {
    return "Medical/responder-safety priorities: patient distress, responder approach, crowding, obstruction, unsafe proximity, sudden movement toward responder, possible physical contact with responder, crew intervention, and patient movement or transfer. Distinguish confirmed, probable, and unclear evidence; do not overclaim intent or assault from a single frame.";
  }

  return "Fire priorities: smoke, flame growth, sudden fire burst, visibility loss, blocked access, unsafe entry, entry-control issues, and resource escalation cues. Enhanced Task Force language must be framed as Ground Commander consideration, not Ops Centre approval or a direct deployment order.";
}

function demoEvidenceItem(frame: DemoEvidenceFrame, index: number) {
  return {
    frameId: frame.frameId,
    sourceVideo: frame.sourceVideo,
    responderId: frame.responderId,
    sourceResponder: frame.sourceResponder,
    frameTimestampSeconds: frame.timestampSeconds,
    timestampLabel: frame.timestampLabel,
    rank: index + 1,
    order: index + 1,
    name: frame.title,
    description: frame.description,
    confidence: 0.98,
    tags: frame.tags,
    boxes: frame.boxes,
    imageUrl: frame.imageUrl,
  };
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json({ error: "Post-incident analysis requires an incident ID and current feed IDs." }, { status: 400 });
  }

  const body = parsed.data;
  const { incident, responders: incidentResponders } = getRuntimeIncident(body.incidentId);

  if (!incident) {
    return NextResponse.json({ error: "Incident was not found." }, { status: 404 });
  }

  if (!incident.supportsRuntimeAnalysis || incidentResponders.length === 0) {
    return NextResponse.json({ error: incident.unavailableReason ?? "Post-incident analysis is unavailable for this incident." }, { status: 400 });
  }

  const requestedFeedIds = new Set(body.feedIds);
  const responders = incidentResponders.filter((responder) => requestedFeedIds.size === 0 || requestedFeedIds.has(responder.id));

  if (responders.length === 0) {
    return NextResponse.json({ error: "No matching responder feeds were found for analysis." }, { status: 400 });
  }

  const cacheDir = path.join(process.cwd(), ".next", "cache", "1stsight-review-frames");
  await mkdir(cacheDir, { recursive: true });

  try {
    if (isDemoFireIncident(incident) || isDemoWoodlandsIncident(incident)) {
      const frames = isDemoFireIncident(incident)
        ? await buildPunggolFireDemoFrames(cacheDir, incidentResponders)
        : await buildWoodlandsDemoFrames(cacheDir, incidentResponders);
      const evidence = frames.map(demoEvidenceItem);
      const recommendation = isDemoFireIncident(incident)
        ? [{
            id: "demo-fire-etf-review-recommendation",
            rank: 1,
            order: 1,
            title: "Flag Enhanced Task Force consideration for Ground Commander",
            reason: "Fire escalation at 1:17.5 on Bodycam B supports command review for ETF escalation.",
            evidenceFrameIds: [frames[0].frameId],
          }]
        : [{
            id: "demo-woodlands-responder-safety-review",
            rank: 1,
            order: 1,
            title: "Review responder-safety controls and scene positioning",
            reason: "The AAR should include the 0:22.5 physical strike and the 0:45.5 second abuse/contact-risk moment.",
            evidenceFrameIds: frames.map((frame) => frame.frameId),
          }];

      return NextResponse.json({
        incidentId: incident.id,
        incidentTitle: incident.title,
        summary: isDemoFireIncident(incident)
          ? "Deterministic demo analysis selected the two Bodycam B fire-escalation moments requested for the Punggol incident timeline."
          : "Deterministic demo analysis selected the two Woodlands responder-safety abuse/contact moments requested for AAR export.",
        generatedFrom: "Current BWC evidence selection",
        evidence,
        recommendations: recommendation,
      });
    }

    const nestedFrames = await Promise.all(
      responders.map(async (responder) => {
        const videoPath = path.join(process.cwd(), "public", responder.videoSrc.replace(/^\//, ""));
        const durationSeconds = await getVideoDurationSeconds(videoPath);
        const candidateSeconds = getCandidateSeconds(durationSeconds, incident.type);

        return Promise.all(
          candidateSeconds.map(async (timestampSeconds) => {
            const frameId = `${responder.id}-${timestampSeconds}s`;
            const outputPath = path.join(cacheDir, `${frameId}.png`);

            // ffmpeg CLI: https://ffmpeg.org/ffmpeg.html
            await execa("ffmpeg", ["-y", "-ss", String(timestampSeconds), "-i", videoPath, "-frames:v", "1", "-vf", "scale=960:-1", outputPath]);

            const image = readFileSync(outputPath);

            return {
              frameId,
              responderId: responder.id,
              sourceResponder: responder.name,
              sourceVideo: responder.videoSrc,
              frameTimestampSeconds: timestampSeconds,
              timestampLabel: formatTimestamp(timestampSeconds),
              image,
              imageDataUrl: `data:image/png;base64,${image.toString("base64")}`,
            };
          }),
        );
      }),
    );
    const frames = nestedFrames.flat();

    const frameCatalog = frames
      .map((frame) => `${frame.frameId}: ${frame.sourceResponder}, ${frame.sourceVideo}, ${frame.timestampLabel}`)
      .join("\n");

    const analysis = await generateStructuredStrict({
      schema: postIncidentAnalysisSchema,
      prefer: "vision",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze these extracted responder-video frame candidates for post-incident review. Incident context: ${incidentPromptContext(incident)} ${incidentAnalysisInstructions(incident)} Use only visible evidence in the images. Select only evidence-worthy real frame ids from the candidate set. Keep each evidence description short and action-oriented. Use incident-level tags such as escalation, operations, access, hazard, medical assistance, responder safety, physical contact, unsafe proximity, crew intervention, smoke spread, or visibility; do not use tiny object tags. Return no more than 3 bounding boxes per selected frame. Recommendations are evidence-linked considerations for the Ground Commander through Ops Centre, not Ops Centre approvals or direct deployment orders. Do not create a recommendation unless evidence strongly supports a C&C action such as raising alarm level consideration, HazMat or ambulance staging, aerial support, additional resource support, or blocked-access/collapse escalation. Flag Enhanced Task Force consideration for Ground Commander only for uncontrollable or large fire, rapid escalation beyond initial attack, or equivalent resource escalation evidence. If evidence is not strong, return an empty recommendations array. Do not claim abuse, assault, medical emergency, owner contact, push, or punch unless visible in the frames. Available frame ids:\n${frameCatalog}`,
            },
            ...frames.flatMap((frame) => [
              {
                type: "text" as const,
                text: `Candidate frame ${frame.frameId}: ${frame.sourceResponder}, ${frame.sourceVideo}, ${frame.timestampLabel}`,
              },
              {
                // AI SDK image input: https://ai-sdk.dev/docs/foundations/prompts#image-parts
                type: "image" as const,
                image: frame.image,
                mediaType: "image/png",
              },
            ]),
          ],
        },
      ],
    });

    const frameById = new Map(frames.map((frame) => [frame.frameId, frame]));
    const normalizedEvidence = analysis.evidence.flatMap((item) => {
      const frame = frameById.get(item.frameId);

      if (!frame) return [];

      return [{
        ...item,
        frameId: frame.frameId,
        sourceVideo: frame.sourceVideo,
        responderId: frame.responderId,
        sourceResponder: frame.sourceResponder,
        frameTimestampSeconds: frame.frameTimestampSeconds,
        timestampLabel: frame.timestampLabel,
        imageUrl: frame.imageDataUrl,
        confidence: Math.min(1, Math.max(0, item.confidence)),
        boxes: item.boxes.slice(0, 3).map(insetBox),
      }];
    });

    if (normalizedEvidence.length === 0) {
      throw new Error("Model did not return any valid candidate frame ids.");
    }

    const validEvidenceFrameIds = new Set(normalizedEvidence.map((item) => item.frameId));
    const normalizedRecommendations = analysis.recommendations
      .filter(isSupportedRecommendation)
      .map((recommendation) => ({
        ...recommendation,
        evidenceFrameIds: recommendation.evidenceFrameIds.filter((frameId) => validEvidenceFrameIds.has(frameId)),
      }))
      .filter((recommendation) => recommendation.evidenceFrameIds.length > 0);

    return NextResponse.json({
      ...analysis,
      incidentId: incident.id,
      incidentTitle: incident.title,
      generatedFrom: `request-time ffmpeg extraction for ${incident.title}`,
      evidence: normalizedEvidence.map(({ rank, ...item }) => ({ ...item, order: rank })),
      recommendations: normalizedRecommendations.map(({ rank, ...item }) => ({ ...item, order: rank })),
    });
  } catch (error) {
    console.error("post-incident analysis unavailable", error);
    return NextResponse.json({ error: "Post-incident analysis is unavailable. Check the server model/API configuration and frame extraction logs." }, { status: 502 });
  }
}
