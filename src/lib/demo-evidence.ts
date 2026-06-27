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
    frameId: "demo-fire-a-24s-initial-attack",
    responderId: "ff-a",
    sourceVideo: "/videos/fire/fire-feed-a.mp4",
    timestampSeconds: 24,
    title: "Initial attack line positioned",
    description: "Bodycam A shows responders positioning the attack line at the landed house fire.",
    tags: ["fire response", "ground operations", "entry approach"],
    boxes: [
      { x: 18, y: 36, width: 36, height: 38, label: "Attack line positioning" },
      { x: 52, y: 15, width: 34, height: 54, label: "Fire area at landed house" },
    ],
  },
  {
    frameId: "demo-fire-a-52s-smoke-spread",
    responderId: "ff-a",
    sourceVideo: "/videos/fire/fire-feed-a.mp4",
    timestampSeconds: 52,
    title: "Smoke spread reduces visibility",
    description: "Bodycam A shows smoke spread and reduced visibility at the landed house fire.",
    tags: ["smoke spread", "visibility", "fire response"],
    boxes: [
      { x: 20, y: 10, width: 58, height: 44, label: "Smoke spread reducing visibility" },
    ],
  },
  {
    frameId: "demo-fire-b-76_5s-escalation-etf",
    responderId: "ff-b",
    sourceVideo: "/videos/fire/fire-feed-b-escalation.mp4",
    timestampSeconds: 76.5,
    title: "Escalating fire conditions visible",
    description: "Bodycam B shows escalating fire conditions for Ground Commander review.",
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
    description: "Bodycam B shows continued fire growth and heavy flame conditions at 2:02.",
    tags: ["fire escalation", "visibility", "fire response"],
    boxes: [
      { x: 36, y: 9, width: 54, height: 62, label: "Sustained flame growth" },
      { x: 7, y: 36, width: 31, height: 42, label: "Reduced operating space near fire" },
    ],
  },
  {
    frameId: "demo-fire-c-64s-entry-control",
    responderId: "ff-c",
    sourceVideo: "/videos/fire/fire-feed-c.mp4",
    timestampSeconds: 64,
    title: "Entry-control conditions recorded",
    description: "Bodycam C records entry-control conditions at the landed house fire.",
    tags: ["entry approach", "ground operations", "smoke spread"],
    boxes: [
      { x: 14, y: 24, width: 34, height: 46, label: "Entry-control position" },
      { x: 50, y: 18, width: 38, height: 50, label: "Access point visibility" },
    ],
  },
  {
    frameId: "demo-punggol-post-fire-a-08s-sweep",
    responderId: "ff-a",
    sourceVideo: "/videos/fire/punggol-post-fire-wei-jie-pov.mp4",
    timestampSeconds: 8,
    title: "Post-fire sweep begins",
    description: "Tze Kai POV shows the post-fire sweep beside the adjacent building.",
    tags: ["fire response", "responder safety"],
    boxes: [
      { x: 22, y: 24, width: 52, height: 48, label: "Post-fire corridor sweep area" },
    ],
  },
  {
    frameId: "demo-punggol-post-fire-a-18s-welfare-check",
    responderId: "ff-a",
    sourceVideo: "/videos/fire/punggol-post-fire-wei-jie-pov.mp4",
    timestampSeconds: 18,
    title: "Welfare check interaction visible",
    description: "Tze Kai POV shows responders conducting a welfare-check interaction beside the building.",
    tags: ["responder safety", "medical assistance"],
    boxes: [
      { x: 32, y: 14, width: 34, height: 56, label: "Welfare-check interaction" },
      { x: 61, y: 20, width: 25, height: 48, label: "Responder proximity" },
    ],
  },
  {
    frameId: "demo-punggol-post-fire-a-31s-verbal-aggression",
    responderId: "ff-a",
    sourceVideo: "/videos/fire/punggol-post-fire-wei-jie-pov.mp4",
    timestampSeconds: 31,
    title: "Verbal aggression during welfare check",
    description: "Tze Kai POV captures a drunk/aggressive man during the welfare-check sequence.",
    tags: ["responder safety", "unsafe proximity"],
    boxes: [
      { x: 36, y: 10, width: 32, height: 58, label: "Drunk/aggressive man beside building" },
      { x: 63, y: 18, width: 26, height: 52, label: "Responder in close proximity" },
    ],
  },
  {
    frameId: "demo-punggol-post-fire-a-37s-physical-contact",
    responderId: "ff-a",
    sourceVideo: "/videos/fire/punggol-post-fire-wei-jie-pov.mp4",
    timestampSeconds: 37,
    title: "Physical contact / shove against Joseph",
    description: "Tze Kai POV shows the drunk/aggressive man making physical contact / shove against Joseph at 0:37.",
    tags: ["responder safety", "physical contact", "unsafe proximity", "abuse", "strike", "assault"],
    boxes: [
      { x: 34, y: 12, width: 36, height: 56, label: "Visible physical contact / shove" },
      { x: 61, y: 18, width: 25, height: 52, label: "Joseph receiving contact" },
    ],
  },
  {
    frameId: "demo-punggol-post-fire-b-37s-impact-recovery",
    responderId: "ff-b",
    sourceVideo: "/videos/fire/punggol-post-fire-hafiz-pov.mp4",
    timestampSeconds: 37,
    title: "Impact and recovery perspective",
    description: "Joseph POV shows the impact/recovery perspective at 0:37.",
    tags: ["responder safety", "physical contact", "crew intervention", "abuse", "strike", "assault"],
    boxes: [
      { x: 25, y: 20, width: 50, height: 52, label: "Impact / recovery view" },
    ],
  },
  {
    frameId: "demo-punggol-post-fire-b-40s-recovery",
    responderId: "ff-b",
    sourceVideo: "/videos/fire/punggol-post-fire-hafiz-pov.mp4",
    timestampSeconds: 40,
    title: "De-escalation and restraint / recovery",
    description: "Joseph POV shows recovery and crew de-escalation/restraint actions.",
    tags: ["responder safety", "crew intervention", "abuse"],
    boxes: [
      { x: 28, y: 18, width: 42, height: 54, label: "Recovery and de-escalation" },
      { x: 61, y: 22, width: 24, height: 46, label: "Crew intervention area" },
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

const demoCueToleranceSeconds = 1.5;

export function isDemoFireIncident(incident: Incident) {
  return incident.id === demoFireIncidentId;
}

export function isDemoWoodlandsIncident(incident: Incident) {
  return incident.id === demoWoodlandsIncidentId;
}

export async function buildPunggolFireDemoFrames(cacheDir: string, responders: Responder[], visibleThroughSecondsBySource?: Record<string, number>) {
  const cues = visibleThroughSecondsBySource
    ? punggolFireCues.filter((cue) => (visibleThroughSecondsBySource[cue.sourceVideo] ?? -Infinity) + demoCueToleranceSeconds >= cue.timestampSeconds)
    : punggolFireCues;

  return buildDemoFrames(cacheDir, cues, responders);
}

export async function buildWoodlandsDemoFrames(cacheDir: string, responders: Responder[], visibleThroughSecondsBySource?: Record<string, number>) {
  const cues = visibleThroughSecondsBySource
    ? woodlandsResponderSafetyCues.filter((cue) => (visibleThroughSecondsBySource[cue.sourceVideo] ?? -Infinity) + demoCueToleranceSeconds >= cue.timestampSeconds)
    : woodlandsResponderSafetyCues;

  return buildDemoFrames(cacheDir, cues, responders);
}
