import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { execa } from "execa";
import { z } from "zod";
import { generateStructuredStrict } from "@/lib/ai/model";
import { liveAnalysisSchema } from "@/lib/ai/schemas";
import { getRuntimeIncident } from "@/lib/scenario";

export const runtime = "nodejs";

const chunkDurationSeconds = 5;

const bodySchema = z.object({
  incidentId: z.string().min(1),
  feeds: z.array(
    z.object({
      responderId: z.string(),
      videoSrc: z.string(),
      currentTime: z.number(),
    }),
  ).min(1),
});

function formatTimestamp(seconds: number) {
  const roundedSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(roundedSeconds / 60);
  const remainingSeconds = String(roundedSeconds % 60).padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

function isSupportedLiveEvent(title: string, evidence: string) {
  const text = `${title} ${evidence}`;

  if (/obscured|dark view|unclear|no clear|low light|blocked lens/i.test(text)) return false;
  return /flame|fire|smoke|escalat|spread|hazmat|chemical|gas|spill|collapse|blocked|entry|access|casualty|ambulance|aerial|resource|alarm/i.test(text);
}

function opsCentreRecommendation(events: Array<{ title: string; evidence: string }>) {
  const eventText = events.map((event) => `${event.title} ${event.evidence}`).join(" ");

  if (/hazmat|chemical|gas|spill|unknown container/i.test(eventText)) return "Notify HazMat and ambulance staging";
  if (/uncontrolled|large fire|rapid escalation|beyond initial attack|multiple compartments|resource escalation|defensive operations/i.test(eventText)) return "Deploy Enhanced Task Force";
  if (/roof|upper|height|aerial|window/i.test(eventText)) return "Request additional aerial support";
  if (/blocked|entry|access|collapse|debris/i.test(eventText)) return "Request additional resource support";

  return "";
}

function incidentCategory(title: string, evidence: string) {
  const text = `${title} ${evidence}`;

  if (/hazmat|chemical|gas|spill/i.test(text)) return "hazmat";
  if (/casualty|ambulance|medical|injur/i.test(text)) return "medical";
  if (/civil|crowd|public order|evacuat/i.test(text)) return "civil";
  if (/fire|flame|smoke|burn|hose/i.test(text)) return "fire";
  if (/collapse|debris|blocked|entry|access/i.test(text)) return "hazard";

  return "incident";
}

function supportsEnhancedTaskForce(title: string, action: string, reason: string, evidence: string) {
  return /enhanced task force/i.test(`${title} ${action}`)
    && /uncontrolled|large fire|rapid escalation|beyond initial attack|multiple compartments|resource escalation|defensive operations/i.test(`${reason} ${evidence}`);
}

function supportsOpsCentreRecommendation(title: string, action: string, reason: string, evidence: string) {
  const recommendationText = `${title} ${action}`;
  const supportText = `${reason} ${evidence}`;

  if (supportsEnhancedTaskForce(title, action, reason, evidence)) return true;
  if (/hazmat|ambulance|staging/i.test(recommendationText)) return /hazmat|chemical|gas|spill|casualty|medical|injur/i.test(supportText);
  if (/aerial/i.test(recommendationText)) return /roof|upper|height|aerial|window|vertical/i.test(supportText);
  if (/resource support|additional resource/i.test(recommendationText)) return /blocked|entry|access|collapse|debris|resource escalation/i.test(supportText);
  if (/raise alarm|alarm level/i.test(recommendationText)) return /uncontrolled|large fire|rapid escalation|beyond initial attack|multiple compartments|hazmat|resource escalation/i.test(supportText);

  return false;
}

function onePhrase(text: string) {
  return text.replace(/\s+/g, " ").split(/[.!?]/)[0].trim();
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

function resolvePublicVideo(videoSrc: string) {
  const publicDir = path.join(process.cwd(), "public");
  const videoPath = path.resolve(publicDir, videoSrc.replace(/^\/+/, ""));

  if (!videoPath.startsWith(publicDir)) {
    throw new Error("Video source must resolve inside public/.");
  }

  return videoPath;
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json({ error: "Live analysis requires at least one current feed cue." }, { status: 400 });
  }

  const body = parsed.data;
  const { incident, responders: incidentResponders } = getRuntimeIncident(body.incidentId);

  if (!incident) {
    return NextResponse.json({ error: "Incident was not found." }, { status: 404 });
  }

  if (!incident.supportsRuntimeAnalysis || incidentResponders.length === 0) {
    return NextResponse.json({ error: incident.unavailableReason ?? "Live analysis is unavailable for this incident." }, { status: 400 });
  }

  const responderById = new Map(incidentResponders.map((responder) => [responder.id, responder]));
  const allowedSources = new Set(incidentResponders.map((responder) => responder.videoSrc));
  const feeds = body.feeds.flatMap((feed) => {
    const responder = responderById.get(feed.responderId);

    if (!responder || responder.videoSrc !== feed.videoSrc || !allowedSources.has(feed.videoSrc)) return [];

    return [{ ...feed, responder }];
  });

  if (feeds.length === 0) {
    return NextResponse.json({ error: "No matching live feeds were found for analysis." }, { status: 400 });
  }

  const cacheDir = path.join(process.cwd(), ".next", "cache", "1stsight-live-chunks");
  await mkdir(cacheDir, { recursive: true });

  try {
    const nestedFrames = await Promise.all(
      feeds.map(async (feed) => {
        const videoPath = resolvePublicVideo(feed.videoSrc);
        const durationSeconds = await getVideoDurationSeconds(videoPath);
        const chunkStartSeconds = Math.max(0, Math.floor(Math.max(0, feed.currentTime) / chunkDurationSeconds) * chunkDurationSeconds);
        const sampleSeconds = [chunkStartSeconds + 2]
          .map((seconds) => Math.min(Math.max(0, seconds), Math.max(0, durationSeconds - 0.5)))
          .filter((seconds, index, values) => values.indexOf(seconds) === index);

        return Promise.all(
          sampleSeconds.map(async (timestampSeconds) => {
            const safeSource = path.basename(feed.videoSrc, path.extname(feed.videoSrc)).replace(/[^a-zA-Z0-9_-]/g, "-");
            const frameId = `${feed.responder.id}-${safeSource}-${Math.round(timestampSeconds)}s`;
            const outputPath = path.join(cacheDir, `${frameId}.png`);

            // ffmpeg CLI: https://ffmpeg.org/ffmpeg.html
            await execa("ffmpeg", ["-y", "-v", "error", "-ss", String(timestampSeconds), "-i", videoPath, "-frames:v", "1", "-vf", "scale=768:-1", outputPath]);

            return {
              frameId,
              responderId: feed.responder.id,
              sourceResponder: feed.responder.name,
              sourceVideo: feed.videoSrc,
              timestampSeconds,
              timestampLabel: formatTimestamp(timestampSeconds),
              image: readFileSync(outputPath),
            };
          }),
        );
      }),
    );
    const frames = nestedFrames.flat();
    const chunkStartSeconds = Math.min(...frames.map((frame) => frame.timestampSeconds));
    const frameCatalog = frames
      .map((frame) => `${frame.frameId}: ${frame.sourceResponder}, ${frame.sourceVideo}, ${frame.timestampLabel}`)
      .join("\n");

    const analysis = await generateStructuredStrict({
      schema: liveAnalysisSchema,
      prefer: "vision",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this live 5-second bodycam chunk for operationally significant fire-response events. Use only visible evidence in the images. Create events only from major observed changes such as fire escalation, smoke spread, hazardous material cues, blocked access, casualty risk, or resource escalation. Do not create events for unclear, dark, or low-signal frames. Keep every event title, recommendation title, action, reason, and evidence concise but specific. Recommendations are only for SCDF HQ Ops Centre Command and Control officers. Supported C&C actions include raise alarm level, notify HazMat or ambulance staging, request aerial support, request additional resource support, or deploy Enhanced Task Force. Deploy Enhanced Task Force only for uncontrollable or large fire, rapid escalation beyond initial attack, or equivalent resource escalation evidence. Avoid field-team tactical instructions. Derive any recommendation from those returned events and their evidence; if no strong C&C action is supported, return recommendation.shouldRecommend false with empty strings for recommendation text fields. Set recommendation.evidenceFrameId to one listed frame id and leave recommendation.evidenceImageUrl empty. Do not infer facts from the scenario brief. Available frame ids:\n${frameCatalog}`,
            },
            ...frames.flatMap((frame) => [
              {
                type: "text" as const,
                text: `Live frame ${frame.frameId}: ${frame.sourceResponder}, ${frame.sourceVideo}, ${frame.timestampLabel}`,
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

    const supportedEvents = analysis.events.filter((event) => isSupportedLiveEvent(event.title, event.evidence));
    const frameById = new Map(frames.map((frame) => [frame.frameId, frame]));
    const fallbackFrame = frames[0];
    const selectedFrame = frameById.get(analysis.recommendation.evidenceFrameId) ?? fallbackFrame;
    const fallbackRecommendationTitle = opsCentreRecommendation(supportedEvents);
    const modelRecommendationAllowed = supportsOpsCentreRecommendation(analysis.recommendation.title, analysis.recommendation.action, analysis.recommendation.reason, analysis.recommendation.evidence);
    const shouldRecommend = analysis.recommendation.shouldRecommend && supportedEvents.length > 0 && (modelRecommendationAllowed || fallbackRecommendationTitle.length > 0);
    const recommendationTitle = shouldRecommend && modelRecommendationAllowed
      ? onePhrase(analysis.recommendation.title)
      : fallbackRecommendationTitle;
    const recommendationReason = onePhrase(analysis.recommendation.reason || analysis.recommendation.evidence || supportedEvents[0]?.title || "supported by current live frames");

    return NextResponse.json({
      ...analysis,
      incidentId: incident.id,
      incidentTitle: incident.title,
      events: supportedEvents.map((event) => {
        const sourceFrame = frames.find((frame) => event.source.includes(frame.frameId) || event.source.includes(frame.sourceResponder)) ?? fallbackFrame;

        return {
          ...event,
          title: onePhrase(event.title),
          evidence: onePhrase(event.evidence),
          category: incidentCategory(event.title, event.evidence),
          sourceResponder: sourceFrame.sourceResponder,
          evidenceImageUrl: `data:image/png;base64,${sourceFrame.image.toString("base64")}`,
        };
      }),
      recommendation: {
        ...analysis.recommendation,
        shouldRecommend,
        title: recommendationTitle,
        action: recommendationTitle,
        reason: shouldRecommend ? recommendationReason : "",
        evidence: shouldRecommend ? recommendationReason : "",
        evidenceFrameId: selectedFrame.frameId,
        evidenceImageUrl: `data:image/png;base64,${selectedFrame.image.toString("base64")}`,
      },
      generatedFrom: "request-time ffmpeg extraction from public/videos/fire",
      chunkStartSeconds,
      chunkDurationSeconds,
    });
  } catch (error) {
    console.error("live analysis unavailable", error);
    return NextResponse.json({ error: "Live analysis is unavailable. Check the server model/API configuration and frame extraction logs." }, { status: 502 });
  }
}
