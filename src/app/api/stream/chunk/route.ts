import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { execa } from "execa";
import { z } from "zod";
import { generateStructuredStrict } from "@/lib/ai/model";
import { streamChunkAnalysisSchema } from "@/lib/ai/schemas";
import { hasVideoStream, noVideoStreamChunkMessage, parseFfprobeJson } from "@/lib/stream-chunk-probe";
import { appendStreamEvents, getStreamSession, setStreamError, updateStreamBodycam, type StreamEvent } from "@/lib/stream-store";

export const runtime = "nodejs";

const frameIntervalSeconds = 0.5;

const fieldsSchema = z.object({
  bodycamId: z.string().min(1),
  chunkStartedAt: z.string().min(1),
});

function extensionForMediaType(mediaType: string) {
  if (mediaType.includes("mp4")) return "mp4";
  if (mediaType.includes("webm")) return "webm";
  return "webm";
}

function timestampLabel(startedAt: string, offsetSeconds: number) {
  const startMs = Date.parse(startedAt);
  const timestamp = Number.isFinite(startMs) ? new Date(startMs + offsetSeconds * 1000) : new Date();
  return timestamp.toISOString();
}

function serializableFrame(frame: { frameId: string; imageUrl: string; timestampSeconds: number; timestampWithinChunkSeconds: number }) {
  return {
    frameId: frame.frameId,
    imageUrl: frame.imageUrl,
    timestampSeconds: frame.timestampSeconds,
    timestampWithinChunkSeconds: frame.timestampWithinChunkSeconds,
  };
}

function incidentPrompt(incidentType: "fire" | "medical") {
  if (incidentType === "fire") {
    return "Prioritize smoke, flame growth, sudden fire burst, visibility loss, blocked access, unsafe entry, entry-control issues, and resource escalation cues. For a large fire burst or rapid fire growth, use high severity and, only when evidence supports it, recommend: Flag Enhanced Task Force consideration for Ground Commander. Do not say Ops Centre approves, deploys, or orders reinforcement.";
  }

  return "Prioritize patient distress, responder approach, crowding, obstruction, unsafe proximity, sudden movement toward responder, physical contact, crew intervention, and patient movement or transfer. For possible contact with a responder, distinguish confirmed, probable, or unclear from the temporal frame sequence, and prefer careful wording such as Possible physical contact with responder.";
}

function normalizedRecommendation(event: z.infer<typeof streamChunkAnalysisSchema>["events"][number], incidentType: "fire" | "medical") {
  if (!event.recommendation.shouldRecommend) return undefined;

  if (incidentType === "fire" && /enhanced task force/i.test(`${event.recommendation.title} ${event.recommendation.action}`)) {
    return {
      title: "Flag Enhanced Task Force consideration for Ground Commander",
      action: "Flag Enhanced Task Force consideration for Ground Commander",
      reason: event.recommendation.reason || event.evidence,
    };
  }

  return {
    title: event.recommendation.title,
    action: event.recommendation.action,
    reason: event.recommendation.reason,
  };
}

function streamAnalysisErrorMessage(error: unknown) {
  const stderr = typeof error === "object" && error && "stderr" in error && typeof error.stderr === "string" ? error.stderr : "";
  const message = error instanceof Error ? error.message : "Stream analysis failed.";
  const combined = `${message}\n${stderr}`;

  if (/EBML header parsing failed|Invalid data found when processing input/i.test(combined)) {
    return "Uploaded browser chunk was not a complete decodable video segment. Restart the bodycam stream and try again.";
  }

  return message;
}

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return NextResponse.json({ error: "Chunk upload must use multipart form data." }, { status: 400 });
  }

  const fields = fieldsSchema.safeParse({
    bodycamId: formData.get("bodycamId"),
    chunkStartedAt: formData.get("chunkStartedAt"),
  });
  const chunk = formData.get("chunk");

  if (!fields.success || !(chunk instanceof Blob) || chunk.size === 0) {
    return NextResponse.json({ error: "Chunk upload requires bodycamId, chunkStartedAt, and a non-empty video chunk." }, { status: 400 });
  }

  const session = getStreamSession();
  const bodycam = session?.bodycams.find((item) => item.id === fields.data.bodycamId && item.status === "connected");

  if (!session || !bodycam) {
    return NextResponse.json({ error: "Bodycam stream session was not found. Start bodycam again." }, { status: 404 });
  }

  if (session.analysisPaused) {
    return NextResponse.json({ error: "Automatic analysis is paused by Ops Centre.", paused: true, session }, { status: 409 });
  }

  const chunkId = `chunk-${Date.now()}-${randomUUID()}`;
  const cacheDir = path.join(process.cwd(), ".next", "cache", "1stsight-stream-chunks", chunkId);
  const videoPath = path.join(cacheDir, `upload.${extensionForMediaType(chunk.type)}`);
  const framePattern = path.join(cacheDir, "frame-%03d.png");

  try {
    await mkdir(cacheDir, { recursive: true });
    await writeFile(videoPath, Buffer.from(await chunk.arrayBuffer()));
    // ffprobe CLI: https://ffmpeg.org/ffprobe.html
    const probe = parseFfprobeJson((await execa("ffprobe", ["-v", "error", "-print_format", "json", "-show_streams", videoPath])).stdout);

    if (!hasVideoStream(probe)) {
      const result = updateStreamBodycam(bodycam.id, { lastChunkId: chunkId, lastError: noVideoStreamChunkMessage });
      const nextSession = result?.session ?? session;
      nextSession.lastError = undefined;
      return NextResponse.json({ session: nextSession, chunkId, events: [], warning: noVideoStreamChunkMessage }, { status: 202 });
    }

    // ffmpeg CLI: https://ffmpeg.org/ffmpeg.html
    await execa("ffmpeg", ["-y", "-v", "error", "-i", videoPath, "-vf", `fps=1/${frameIntervalSeconds},scale=768:-1`, framePattern]);

    const frameFiles = (await readdir(cacheDir)).filter((file) => /^frame-\d+\.png$/.test(file)).sort().slice(0, 10);

    if (frameFiles.length === 0) {
      throw new Error("ffmpeg did not extract frames from the uploaded chunk.");
    }

    const frames = await Promise.all(
      frameFiles.map(async (file, index) => {
        const image = await readFile(path.join(cacheDir, file));
        const timestampWithinChunkSeconds = index * frameIntervalSeconds;
        return {
          frameId: `${chunkId}-frame-${String(index + 1).padStart(2, "0")}`,
          image,
          imageUrl: `data:image/png;base64,${image.toString("base64")}`,
          timestampSeconds: timestampWithinChunkSeconds,
          timestampWithinChunkSeconds,
        };
      }),
    );

    const frameCatalog = frames.map((frame) => `${frame.frameId}: +${frame.timestampWithinChunkSeconds.toFixed(1)}s`).join("\n");
    const analysis = await generateStructuredStrict({
      schema: streamChunkAnalysisSchema,
      prefer: "vision",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this live bodycam frame sequence as a temporal 5-second video chunk, not isolated stills. Incident type: ${session.incidentType}. Incident: ${session.title}. Caller context: ${session.callerContext}. Bodycam: ${bodycam.displayName}, slot ${bodycam.slotId}. Location status: ${bodycam.locationStatus}. ${incidentPrompt(session.incidentType)} Explain what changed across frames, create only visible evidence-linked events, and select the single frame id that best supports each event. Use exact frame ids only. If nothing operationally relevant changed, return an empty events array. Available frame ids:\n${frameCatalog}`,
            },
            ...frames.flatMap((frame) => [
              {
                type: "text" as const,
                text: `Stream frame ${frame.frameId}: +${frame.timestampWithinChunkSeconds.toFixed(1)}s in chunk ${chunkId}`,
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
    const events: StreamEvent[] = analysis.events.flatMap((event) => {
      const bestFrame = frameById.get(event.bestEvidenceFrameId);
      if (!bestFrame) return [];

      return [{
        id: `${chunkId}-${event.id}`,
        incidentId: session.incidentId,
        incidentType: session.incidentType,
        bodycamId: bodycam.id,
        bodycamDisplayName: bodycam.displayName,
        bodycamSlotId: bodycam.slotId,
        sourceChunkId: chunkId,
        timestamp: timestampLabel(fields.data.chunkStartedAt, bestFrame.timestampWithinChunkSeconds),
        title: event.title,
        evidence: event.evidence,
        severity: event.severity,
        tags: event.tags,
        confidence: event.confidence,
        locationStatus: bodycam.locationStatus,
        bestEvidenceFrame: serializableFrame(bestFrame),
        supportingFrames: event.supportingFrameIds.flatMap((frameId) => {
          const frame = frameById.get(frameId);
          return frame ? [serializableFrame(frame)] : [];
        }),
        recommendation: normalizedRecommendation(event, session.incidentType),
      }];
    });

    const nextSession = appendStreamEvents(events);
    updateStreamBodycam(bodycam.id, { lastChunkId: chunkId, previewDataUrl: frames.at(-1)?.imageUrl, lastError: undefined });

    return NextResponse.json({ session: nextSession, chunkId, events });
  } catch (error) {
    const message = streamAnalysisErrorMessage(error);
    const nextSession = setStreamError(message, bodycam.id);
    console.error("stream chunk analysis unavailable", { message });
    return NextResponse.json({ error: `Stream analysis unavailable: ${message}`, session: nextSession }, { status: 502 });
  }
}
