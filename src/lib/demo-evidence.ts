import { readFile } from "node:fs/promises";
import path from "node:path";
import { execa } from "execa";
import type { BoundingBox, Incident, Responder } from "@/lib/domain";

export const demoFireIncidentId = "punggol-residential-fire";
export const demoWoodlandsIncidentId = "woodlands-medical-responder-safety";

type DemoCue = {
  frameId: string;
  responderId: string;
  sourceVideo: string;
  timestampSeconds: number;
  title: string;
  description: string;
  tags: string[];
  boxes: BoundingBox[];
};

export type DemoEvidenceFrame = DemoCue & {
  sourceResponder: string;
  timestampLabel: string;
  imageUrl: string;
};

const punggolFireCues: DemoCue[] = [
  {
    frameId: "demo-fire-b-77_5s-escalation-etf",
    responderId: "ff-b",
    sourceVideo: "/videos/fire/fire-feed-b-escalation.mp4",
    timestampSeconds: 77.5,
    title: "Escalating fire conditions visible",
    description: "Bodycam B shows fire escalation at 1:17.5, supporting an Enhanced Task Force consideration for the Ground Commander.",
    tags: ["fire escalation", "smoke spread", "fire response"],
    boxes: [
      { x: 42, y: 12, width: 46, height: 58, label: "Escalating flame area / ETF consideration" },
      { x: 18, y: 44, width: 34, height: 34, label: "Responder operating close to worsening fire" },
    ],
  },
  {
    frameId: "demo-fire-b-122s-sustained-escalation",
    responderId: "ff-b",
    sourceVideo: "/videos/fire/fire-feed-b-escalation.mp4",
    timestampSeconds: 122,
    title: "Sustained flame growth continues",
    description: "Bodycam B at 2:02 shows continued fire growth and heavy flame conditions requiring command review.",
    tags: ["fire escalation", "visibility", "fire response"],
    boxes: [
      { x: 36, y: 9, width: 54, height: 62, label: "Sustained flame growth" },
      { x: 7, y: 36, width: 31, height: 42, label: "Reduced operating space near fire" },
    ],
  },
];

const woodlandsResponderSafetyCues: DemoCue[] = [
  {
    frameId: "demo-woodlands-22_5s-physical-strike",
    responderId: "med-woodlands-a",
    sourceVideo: "/videos/woodlands/woodlands-medical-bodycam.mp4",
    timestampSeconds: 22.5,
    title: "Physical strike toward responder",
    description: "Bodycam W1 shows a physical strike/contact moment involving another responder at 0:22.5.",
    tags: ["responder safety", "physical contact", "unsafe proximity"],
    boxes: [
      { x: 38, y: 16, width: 28, height: 46, label: "Physical strike/contact moment" },
      { x: 61, y: 19, width: 24, height: 48, label: "Responder receiving contact" },
    ],
  },
  {
    frameId: "demo-woodlands-45_5s-second-abuse",
    responderId: "med-woodlands-a",
    sourceVideo: "/videos/woodlands/woodlands-medical-bodycam.mp4",
    timestampSeconds: 45.5,
    title: "Second responder-abuse moment",
    description: "Bodycam W1 shows another abuse/contact-risk moment involving a responder at 0:45.5.",
    tags: ["responder safety", "physical contact", "crew intervention"],
    boxes: [
      { x: 34, y: 14, width: 34, height: 52, label: "Second abuse/contact-risk moment" },
      { x: 66, y: 18, width: 23, height: 45, label: "Responder proximity during abuse" },
    ],
  },
];

export function formatDemoTimestamp(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds - minutes * 60;
  const whole = Number.isInteger(remaining);
  const label = whole ? String(remaining).padStart(2, "0") : remaining.toFixed(1).padStart(4, "0");

  return `${minutes}:${label}`;
}

function resolvePublicVideo(videoSrc: string) {
  const publicDir = path.join(process.cwd(), "public");
  const videoPath = path.resolve(publicDir, videoSrc.replace(/^\/+/, ""));

  if (!videoPath.startsWith(publicDir)) {
    throw new Error("Demo evidence video source must resolve inside public/.");
  }

  return videoPath;
}

async function extractDemoFrame(cacheDir: string, cue: DemoCue) {
  const videoPath = resolvePublicVideo(cue.sourceVideo);
  const outputPath = path.join(cacheDir, `${cue.frameId}.png`);

  // ffmpeg CLI: https://ffmpeg.org/ffmpeg.html
  await execa("ffmpeg", ["-y", "-v", "error", "-ss", String(cue.timestampSeconds), "-i", videoPath, "-frames:v", "1", "-vf", "scale=960:-1", outputPath]);

  return `data:image/png;base64,${(await readFile(outputPath)).toString("base64")}`;
}

async function buildDemoFrames(cacheDir: string, cues: DemoCue[], responders: Responder[]) {
  const responderById = new Map(responders.map((responder) => [responder.id, responder]));

  return Promise.all(
    cues.map(async (cue) => {
      const responder = responderById.get(cue.responderId);

      return {
        ...cue,
        sourceResponder: responder?.name ?? cue.responderId,
        timestampLabel: formatDemoTimestamp(cue.timestampSeconds),
        imageUrl: await extractDemoFrame(cacheDir, cue),
      } satisfies DemoEvidenceFrame;
    }),
  );
}

export function isDemoFireIncident(incident: Incident) {
  return incident.id === demoFireIncidentId;
}

export function isDemoWoodlandsIncident(incident: Incident) {
  return incident.id === demoWoodlandsIncidentId;
}

export async function buildPunggolFireDemoFrames(cacheDir: string, responders: Responder[], visibleThroughSecondsByResponder?: Record<string, number>) {
  const cues = visibleThroughSecondsByResponder
    ? punggolFireCues.filter((cue) => (visibleThroughSecondsByResponder[cue.responderId] ?? 0) + 0.25 >= cue.timestampSeconds)
    : punggolFireCues;

  return buildDemoFrames(cacheDir, cues, responders);
}

export async function buildWoodlandsDemoFrames(cacheDir: string, responders: Responder[], visibleThroughSecondsByResponder?: Record<string, number>) {
  const cues = visibleThroughSecondsByResponder
    ? woodlandsResponderSafetyCues.filter((cue) => (visibleThroughSecondsByResponder[cue.responderId] ?? 0) + 0.25 >= cue.timestampSeconds)
    : woodlandsResponderSafetyCues;

  return buildDemoFrames(cacheDir, cues, responders);
}
