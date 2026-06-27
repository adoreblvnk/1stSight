import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { execa } from "execa";
import { z } from "zod";
import { generateStructuredStrict } from "@/lib/ai/model";
import { liveAnalysisSchema } from "@/lib/ai/schemas";
import { buildPunggolFireDemoFrames, buildWoodlandsDemoFrames, isDemoFireIncident, isDemoWoodlandsIncident, type DemoEvidenceFrame } from "@/lib/demo-evidence";
import { getRuntimeIncident } from "@/lib/scenario";

export const runtime = "nodejs";

const chunkDurationSeconds = 5;
const frameIntervalSeconds = 0.5;
const enhancedTaskForceEvidencePattern = /uncontrolled|large fire|rapid escalation|rapid fire growth|beyond initial attack|multiple compartments|resource escalation|resource escalation cues|defensive operations|fire burst|overhead flames?|flames? visible above|flame growth|sustained (?:interior|overhead|ceiling|intense) flames?|(?:interior|overhead|ceiling|intense) flames?.{0,60}(?:near|above|over|around) crew|ceiling flames?|intense flames?/i;

const bodySchema = z.object({
  incidentId: z.string().min(1),
  feeds: z.array(
    z.object({
      responderId: z.string(),
      videoSrc: z.string(),
      currentTime: z.number(),
    }),
  ).min(1),
  operatorEvidenceSupport: z.boolean().optional(),
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
  return /flame|fire|smoke|escalat|spread|hazmat|chemical|gas|spill|collapse|blocked|entry|access|casualty|ambulance|aerial|resource|alarm|patient|distress|responder safety|unsafe proximity|physical contact|strike|contact|aggression|obstruction|crew intervention|patient movement/i.test(text);
}

function opsCentreRecommendation(events: Array<{ title: string; evidence: string }>) {
  const eventText = events.map((event) => `${event.title} ${event.evidence}`).join(" ");

  if (/hazmat|chemical|gas|spill|unknown container/i.test(eventText)) return "Notify HazMat and ambulance staging";
  if (enhancedTaskForceEvidencePattern.test(eventText)) return "Flag Enhanced Task Force consideration for Ground Commander";
  if (/roof|upper|height|aerial|window/i.test(eventText)) return "Request additional aerial support";
  if (/blocked|entry|access|collapse|debris/i.test(eventText)) return "Request additional resource support";

  return "";
}

function incidentCategory(title: string, evidence: string) {
  const text = `${title} ${evidence}`;

  if (/hazmat|chemical|gas|spill/i.test(text)) return "hazmat";
  if (/responder safety|physical contact|strike|unsafe proximity|crew intervention|aggression/i.test(text)) return "responder safety";
  if (/casualty|ambulance|medical|injur/i.test(text)) return "medical";
  if (/civil|crowd|public order|evacuat/i.test(text)) return "civil";
  if (/fire|flame|smoke|burn|hose/i.test(text)) return "fire";
  if (/collapse|debris|blocked|entry|access/i.test(text)) return "hazard";

  return "incident";
}

function supportsEnhancedTaskForce(title: string, action: string, reason: string, evidence: string) {
  return /enhanced task force/i.test(`${title} ${action}`)
    && enhancedTaskForceEvidencePattern.test(`${reason} ${evidence}`);
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

function supportsMedicalOpsRecommendation(title: string, action: string, reason: string, evidence: string) {
  const recommendationText = `${title} ${action}`;
  const supportText = `${reason} ${evidence}`;

  if (!/additional|backup|staging|resource|ambulance|hazmat|access|crowd|police/i.test(recommendationText)) return false;
  return /medical|casualty|injur|blocked|access|crowd|hazmat|chemical|gas|resource/i.test(supportText);
}

function onePhrase(text: string) {
  return text.replace(/\s+/g, " ").split(/[.!?]/)[0].trim();
}

function emptyRecommendation() {
  return {
    shouldRecommend: false,
    id: "",
    title: "",
    action: "",
    reason: "",
    evidence: "",
    evidenceFrameId: "",
    evidenceImageUrl: "",
    sourceTimestamp: "",
    reviewState: "system-created" as const,
  };
}

function seededFireEscalationRecommendation(frame: DemoEvidenceFrame) {
  return {
    shouldRecommend: true,
    id: "seeded-fire-escalation-enhanced-task-force",
    title: "Flag Enhanced Task Force consideration for Ground Commander",
    action: "Flag Enhanced Task Force consideration for Ground Commander",
    reason: "Bodycam B shows escalating fire conditions and sustained flame growth near crew",
    evidence: "Bodycam B shows escalating fire conditions and sustained flame growth near crew",
    evidenceFrameId: frame.frameId,
    evidenceImageUrl: frame.imageUrl,
    sourceTimestamp: frame.timestampLabel,
    reviewState: "system-created" as const,
  };
}

function latestFrame<TFrame extends { timestampSeconds: number }>(frames: TFrame[]) {
  return frames.reduce((latest, frame) => (frame.timestampSeconds > latest.timestampSeconds ? frame : latest), frames[0]);
}

function seededCueCovered(event: { timestamp: string; source: string; title: string; evidence: string }, frame: Pick<DemoEvidenceFrame, "frameId" | "timestampLabel" | "sourceResponder" | "tags">) {
  const text = `${event.timestamp} ${event.source} ${event.title} ${event.evidence}`.toLowerCase();
  const sourceResponder = frame.sourceResponder.toLowerCase();
  const cuePattern = frame.tags.some((tag) => /responder safety|physical contact|unsafe proximity|crew intervention/i.test(tag))
    ? /responder safety|physical contact|unsafe proximity|crew intervention|strike|contact|aggression|obstruction/i
    : /fire|flame|smoke|escalat|growth/i;

  return cuePattern.test(text)
    && (text.includes(frame.frameId.toLowerCase()) || text.includes(frame.timestampLabel.toLowerCase()) || text.includes(sourceResponder) || text.includes("bodycam b") || text.includes("bodycam w1"));
}

function incidentPromptContext(incident: { title: string; location: string; summary: string; tags: string[] }) {
  const tags = incident.tags.length ? incident.tags.join(", ") : "incident operations";

  return `${incident.title} at ${incident.location}. Caller/context summary: ${incident.summary}. Incident tags: ${tags}.`;
}

function incidentAnalysisInstructions(incident: { type: "fire" | "medical" }) {
  if (incident.type === "medical") {
    return "Medical/responder-safety analysis priorities: patient distress, responder approach, crowding, obstruction, unsafe proximity, sudden movement toward responder, possible physical contact, crew intervention, and patient movement or transfer. Create evidence events for responder-safety changes, but recommend only when there is a new command-level support need such as additional resources, staging, blocked access, HazMat, or ambulance support. Distinguish confirmed, probable, or unclear evidence instead of overclaiming from a single frame.";
  }

  return "Fire analysis priorities: smoke, flame growth, sudden fire burst, visibility loss, blocked access, unsafe entry, entry-control issues, and resource escalation cues. For a large fire burst or rapid fire growth, flag Enhanced Task Force consideration for Ground Commander only when supported by visible evidence; do not say Ops Centre approves, deploys, or orders reinforcement.";
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
  const allowedSourcesByResponder = new Map(incidentResponders.map((responder) => [responder.id, new Set([responder.videoSrc, ...(responder.reviewVideoSrcs ?? [])])]));
  const feeds = body.feeds.flatMap((feed) => {
    const responder = responderById.get(feed.responderId);
    const allowedSources = allowedSourcesByResponder.get(feed.responderId);

    if (!responder || !allowedSources?.has(feed.videoSrc)) return [];

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
        const frameCount = Math.ceil(chunkDurationSeconds / frameIntervalSeconds);
        const frameSeconds = Array.from({ length: frameCount }, (_, index) => chunkStartSeconds + index * frameIntervalSeconds)
          .map((seconds) => Math.min(Math.max(0, seconds), Math.max(0, durationSeconds - 0.5)))
          .filter((seconds, index, values) => values.indexOf(seconds) === index);

        return Promise.all(
          frameSeconds.map(async (timestampSeconds) => {
            const safeSource = path.basename(feed.videoSrc, path.extname(feed.videoSrc)).replace(/[^a-zA-Z0-9_-]/g, "-");
            const frameId = `${feed.responder.id}-${safeSource}-${String(timestampSeconds).replace(/\./g, "_")}s`;
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
              text: `Analyze this live 5-second responder-video chunk as a temporal frame sequence for operationally significant incident events. Incident context: ${incidentPromptContext(incident)} ${incidentAnalysisInstructions(incident)} Use only visible evidence in the images and describe what changed across frames. Create events only from major observed changes. Do not create events for unclear, dark, or low-signal frames. Keep every event title, recommendation title, action, reason, and evidence concise but specific. Recommendations are evidence-linked considerations for the Ground Commander through Ops Centre, not Ops Centre approvals or direct deployment orders. Supported C&C recommendations include raise alarm level consideration, notify HazMat or ambulance staging, request aerial support, request additional resource support, or flag Enhanced Task Force consideration for Ground Commander. Derive any recommendation from those returned events and their evidence; if no strong C&C action is supported, return recommendation.shouldRecommend false with empty strings for recommendation text fields. Set recommendation.evidenceFrameId to one listed frame id and leave recommendation.evidenceImageUrl empty. Do not infer facts from the scenario brief. Available frame ids:\n${frameCatalog}`,
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
    const visibleThroughSecondsBySource = Object.fromEntries(feeds.map((feed) => [feed.videoSrc, Math.max(0, feed.currentTime)]));
    const operatorEvidenceSupport = body.operatorEvidenceSupport === true;
    const seededFrames = operatorEvidenceSupport && isDemoFireIncident(incident)
      ? await buildPunggolFireDemoFrames(cacheDir, incidentResponders, visibleThroughSecondsBySource)
      : operatorEvidenceSupport && isDemoWoodlandsIncident(incident)
      ? await buildWoodlandsDemoFrames(cacheDir, incidentResponders, visibleThroughSecondsBySource)
      : [];
    const seededEvents = seededFrames
      .filter((frame) => !supportedEvents.some((event) => seededCueCovered(event, frame)))
      .map((frame) => ({
        id: frame.frameId,
        timestamp: frame.timestampLabel,
        title: frame.title,
        source: `${frame.sourceResponder} / ${frame.timestampLabel}`,
        sourceResponder: frame.sourceResponder,
        evidence: frame.description,
        evidenceImageUrl: frame.imageUrl,
        boxes: frame.boxes,
        category: frame.tags.some((tag) => /responder safety|physical contact|unsafe proximity|crew intervention/i.test(tag)) ? "responder safety" : "fire escalation",
        reviewState: "pending-review" as const,
      }));
    const frameById = new Map(frames.map((frame) => [frame.frameId, frame]));
    const fallbackFrame = latestFrame(frames);
    const selectedFrame = frameById.get(analysis.recommendation.evidenceFrameId) ?? fallbackFrame;
    const seededFireEscalationFrame = seededFrames.find((frame) => frame.frameId === "demo-fire-b-76_5s-escalation-etf");
    const fallbackRecommendationTitle = opsCentreRecommendation(supportedEvents);
    const modelRecommendationAllowed = supportsOpsCentreRecommendation(analysis.recommendation.title, analysis.recommendation.action, analysis.recommendation.reason, analysis.recommendation.evidence);
    const conservativeRecommendationAllowed = incident.type === "medical"
      ? supportsMedicalOpsRecommendation(analysis.recommendation.title, analysis.recommendation.action, analysis.recommendation.reason, analysis.recommendation.evidence)
      : modelRecommendationAllowed;
    const hasFireFallbackRecommendation = incident.type !== "medical" && fallbackRecommendationTitle.length > 0 && supportedEvents.length > 0;
    const shouldRecommend = (analysis.recommendation.shouldRecommend && supportedEvents.length > 0 && (conservativeRecommendationAllowed || hasFireFallbackRecommendation)) || hasFireFallbackRecommendation;
    const fallbackIsEnhancedTaskForce = /enhanced task force/i.test(fallbackRecommendationTitle);
    const recommendationTitle = shouldRecommend && fallbackIsEnhancedTaskForce
      ? fallbackRecommendationTitle
      : shouldRecommend && (modelRecommendationAllowed || conservativeRecommendationAllowed)
      ? onePhrase(analysis.recommendation.title)
      : fallbackRecommendationTitle;
    const gcRecommendationTitle = /enhanced task force/i.test(recommendationTitle) ? "Flag Enhanced Task Force consideration for Ground Commander" : recommendationTitle;
    const recommendationReason = onePhrase(analysis.recommendation.reason || analysis.recommendation.evidence || supportedEvents[0]?.title || "supported by current live frames");
    const recommendation = seededFireEscalationFrame
      ? seededFireEscalationRecommendation(seededFireEscalationFrame)
      : shouldRecommend
      ? {
          ...analysis.recommendation,
          shouldRecommend,
          title: gcRecommendationTitle,
          action: gcRecommendationTitle,
          reason: recommendationReason,
          evidence: recommendationReason,
          evidenceFrameId: selectedFrame.frameId,
          evidenceImageUrl: `data:image/png;base64,${selectedFrame.image.toString("base64")}`,
          sourceTimestamp: selectedFrame.timestampLabel,
        }
      : emptyRecommendation();

    return NextResponse.json({
      ...analysis,
      incidentId: incident.id,
      incidentTitle: incident.title,
      events: [
        ...supportedEvents.map((event) => {
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
        ...seededEvents,
      ],
      recommendation,
      generatedFrom: `request-time ffmpeg extraction for ${incident.title}`,
      chunkStartSeconds,
      chunkDurationSeconds,
    });
  } catch (error) {
    console.error("live analysis unavailable", error);
    return NextResponse.json({ error: "Live analysis is unavailable. Check the server model/API configuration and frame extraction logs." }, { status: 502 });
  }
}
