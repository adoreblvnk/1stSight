import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { execa } from "execa";
import { z } from "zod";
import { generateStructuredStrict } from "@/lib/ai/model";
import { postIncidentAnalysisSchema } from "@/lib/ai/schemas";
import { getScenarioState } from "@/lib/scenario";

export const runtime = "nodejs";

const bodySchema = z.object({
  feedIds: z.array(z.string()).default([]),
});

const sampleRatios = [0.18, 0.5, 0.82];

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

function getCandidateSeconds(durationSeconds: number) {
  return [...new Set(sampleRatios.map((ratio) => Math.max(1, Math.min(durationSeconds - 0.5, Math.round(durationSeconds * ratio)))))]
    .filter((seconds) => Number.isFinite(seconds) && seconds > 0)
    .slice(0, 3);
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

export async function POST(request: Request) {
  const body = bodySchema.parse(await request.json().catch(() => ({})));
  const state = getScenarioState();
  const requestedFeedIds = new Set(body.feedIds);
  const responders = state.responders.filter((responder) => requestedFeedIds.size === 0 || requestedFeedIds.has(responder.id));

  if (responders.length === 0) {
    return NextResponse.json({ error: "No matching responder feeds were found for analysis." }, { status: 400 });
  }

  const cacheDir = path.join(process.cwd(), ".next", "cache", "1stsight-review-frames");
  await mkdir(cacheDir, { recursive: true });

  try {
    const nestedFrames = await Promise.all(
      responders.map(async (responder) => {
        const videoPath = path.join(process.cwd(), "public", responder.videoSrc.replace(/^\//, ""));
        const durationSeconds = await getVideoDurationSeconds(videoPath);
        const candidateSeconds = getCandidateSeconds(durationSeconds);

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
              text: `Analyze these extracted fire-response bodycam frame candidates for post-incident review. Use only visible evidence in the images. Select only evidence-worthy real frame ids from the candidate set. Keep each evidence description short and action-oriented. Use incident-level tags such as fire escalation, ground operations, entry approach, smoke spread, or visibility; do not use tiny object tags. Return no more than 3 bounding boxes per selected frame. Recommendations are only for SCDF HQ Ops Centre Command and Control officers. Do not create a recommendation unless evidence strongly supports a C&C action such as raising alarm level, HazMat or ambulance staging, aerial support, additional resource support, or blocked-access/collapse escalation. Deploy Enhanced Task Force only for uncontrollable or large fire, rapid escalation beyond initial attack, or equivalent resource escalation evidence. If evidence is not strong, return an empty recommendations array. Do not claim abuse, assault, medical emergency, owner contact, push, or punch unless visible in the frames. Available frame ids:\n${frameCatalog}`,
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
      generatedFrom: "request-time ffmpeg extraction from public/videos/fire",
      evidence: normalizedEvidence.map(({ rank, ...item }) => ({ ...item, order: rank })),
      recommendations: normalizedRecommendations.map(({ rank, ...item }) => ({ ...item, order: rank })),
    });
  } catch (error) {
    console.error("post-incident analysis unavailable", error);
    return NextResponse.json({ error: "Post-incident analysis is unavailable. Check the server model/API configuration and frame extraction logs." }, { status: 502 });
  }
}
