import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { execa } from "execa";
import { getScenarioState } from "@/lib/scenario";
import {
  fireEscalationSchema,
  recommendationReviewSchema,
  type FireEscalationOutput,
  type RecommendationReviewOutput,
} from "@/lib/ai/schemas";
import { generateStructured, generateStructuredStrict } from "@/lib/ai/model";

type FireEscalationRequest = {
  videoSrc?: string;
  timestampSeconds?: number;
  source?: string;
};

function formatVideoCue(seconds: number) {
  const roundedSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(roundedSeconds / 60);
  const remainingSeconds = String(roundedSeconds % 60).padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

async function extractVideoCueFrame(videoSrc: string, timestampSeconds: number) {
  const publicDir = path.join(process.cwd(), "public");
  const videoPath = path.resolve(publicDir, videoSrc.replace(/^\/+/, ""));

  if (!videoPath.startsWith(publicDir)) {
    throw new Error("Video source must resolve inside public/.");
  }

  const cacheDir = path.join(process.cwd(), ".next", "cache", "1stsight-live-frames");
  await mkdir(cacheDir, { recursive: true });

  const frameId = `${path.basename(videoSrc, path.extname(videoSrc))}-${Math.round(timestampSeconds)}s`.replace(/[^a-zA-Z0-9_-]/g, "-");
  const outputPath = path.join(cacheDir, `${frameId}.png`);

  // ffmpeg CLI: https://ffmpeg.org/ffmpeg.html
  await execa("ffmpeg", ["-y", "-v", "error", "-ss", String(timestampSeconds), "-i", videoPath, "-frames:v", "1", "-vf", "scale=960:-1", outputPath]);

  return readFileSync(outputPath);
}

export async function analyzeFireEscalation(request: FireEscalationRequest = {}): Promise<FireEscalationOutput> {
  const state = getScenarioState();
  const recommendation = state.recommendations[0];
  const videoSrc = request.videoSrc ?? "/videos/fire/fire-feed-b-escalation.mp4";
  const timestampSeconds = request.timestampSeconds ?? 78;
  const source = request.source ?? "Firefighter B bodycam";
  const cueLabel = formatVideoCue(timestampSeconds);
  const frame = await extractVideoCueFrame(videoSrc, timestampSeconds);

  const generated = await generateStructuredStrict({
    schema: fireEscalationSchema,
    prefer: "vision",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze this real extracted live bodycam frame for fire-escalation detection in ${state.title}. Source cue: ${source}, ${videoSrc}, ${cueLabel}. Use only visible evidence in the frame. Return structured evidence with a concise summary, reason, evidence string, source timestamp, and recommended next action. If escalation is uncertain, say so in the summary/reason instead of inventing evidence.`,
          },
          {
            // AI SDK image input: https://ai-sdk.dev/docs/foundations/prompts#image-parts
            type: "image",
            image: frame,
            mediaType: "image/png",
          },
        ],
      },
    ],
  });

  return {
    ...generated,
    incidentId: "inc-fire-escalation",
    title: generated.title || "Fire Escalation",
    videoSrc,
    timestampSeconds,
    analysisBoundary: "server route extracts a real video frame at the requested cue and calls the configured vision model endpoint",
    sourceTimestamp: recommendation.sourceTimestamp,
    recommendation: generated.recommendation || recommendation.title,
    reviewState: "pending-review",
  };
}

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
        ? `Officer accepted ${recommendation.title}: ${recommendation.reason}. Evidence: ${recommendation.evidence}.`
        : `Officer kept ${recommendation.title} out of the active deployment record. Evidence reviewed: ${recommendation.evidence}.`,
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
