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
  liveOnly?: boolean;
};

export type DemoEvidenceFrame = DemoCue & {
  sourceResponder: string;
  timestampLabel: string;
  imageUrl: string;
};

const punggolFireCues: DemoCue[] = [
  // Joseph video review correction: Bodycam A early orange flashes are lights, not flame evidence.
  {
    frameId: "live-fire-a-2s-early-emergency-lights",
    responderId: "ff-a",
    sourceVideo: "/videos/fire/fire-feed-a.mp4",
    timestampSeconds: 2,
    title: "Early emergency lights visible",
    description: "Bodycam A shows bright emergency lighting while the first line is being set near the structure.",
    tags: ["fire response", "visibility"],
    boxes: [
      { x: 4, y: 12, width: 42, height: 58, label: "Emergency light reflection" },
      { x: 42, y: 28, width: 42, height: 42, label: "Responders near work area" },
    ],
    liveOnly: true,
  },
  {
    frameId: "live-fire-a-5_5s-front-yard-smoke-haze",
    responderId: "ff-a",
    sourceVideo: "/videos/fire/fire-feed-a.mp4",
    timestampSeconds: 5.5,
    title: "Front-yard visibility starts degrading",
    description: "Bodycam A shows smoke and haze spreading across the yard and house frontage while the crew works near the hose line.",
    tags: ["smoke spread", "visibility", "fire response"],
    boxes: [
      { x: 6, y: 10, width: 86, height: 60, label: "Smoke / haze across frontage" },
    ],
    liveOnly: true,
  },
  {
    frameId: "demo-fire-a-12s-line-position",
    responderId: "ff-a",
    sourceVideo: "/videos/fire/fire-feed-a.mp4",
    timestampSeconds: 12,
    title: "Hose line positioned near structure",
    description: "Bodycam A shows responders near the side of the house with a hose line visible on the ground.",
    tags: ["fire response", "ground operations", "entry approach"],
    boxes: [
      { x: 8, y: 48, width: 62, height: 18, label: "Visible hose line" },
      { x: 44, y: 22, width: 34, height: 42, label: "Responders near structure" },
    ],
  },
  {
    frameId: "live-fire-a-16_75s-crew-advance",
    responderId: "ff-a",
    sourceVideo: "/videos/fire/fire-feed-a.mp4",
    timestampSeconds: 16.75,
    title: "Crew advances through entry path",
    description: "Bodycam A shows responders moving through a darker corridor or threshold area with lights active.",
    tags: ["ground operations", "entry approach", "fire response"],
    boxes: [
      { x: 14, y: 10, width: 70, height: 66, label: "Crew movement through entry path" },
    ],
    liveOnly: true,
  },
  {
    frameId: "live-fire-a-30_5s-approach-visibility",
    responderId: "ff-a",
    sourceVideo: "/videos/fire/fire-feed-a.mp4",
    timestampSeconds: 30.5,
    title: "Approach path visibility recorded",
    description: "Bodycam A shows crew movement and light/smoke contrast along the approach path before the fire-escalation cue is raised.",
    tags: ["fire response", "ground operations", "visibility"],
    boxes: [
      { x: 18, y: 18, width: 64, height: 56, label: "Approach path visibility" },
    ],
    liveOnly: true,
  },
  {
    frameId: "live-fire-a-41_25s-entry-smoke-haze",
    responderId: "ff-a",
    sourceVideo: "/videos/fire/fire-feed-a.mp4",
    timestampSeconds: 41.25,
    title: "Entry area smoke increases",
    description: "Bodycam A shows smoke and haze around the entry structure while responders remain positioned near the work area.",
    tags: ["smoke spread", "entry approach", "visibility"],
    boxes: [
      { x: 10, y: 12, width: 78, height: 64, label: "Smoke / haze at entry area" },
    ],
    liveOnly: true,
  },
  {
    frameId: "live-fire-a-72_5s-smoke-layer",
    responderId: "ff-a",
    sourceVideo: "/videos/fire/fire-feed-a.mp4",
    timestampSeconds: 72.5,
    title: "Smoke layer visible along approach",
    description: "Bodycam A shows smoke or haze building along the approach path while crew movement continues.",
    tags: ["smoke spread", "visibility", "fire response"],
    boxes: [
      { x: 6, y: 12, width: 88, height: 64, label: "Smoke / haze along approach" },
    ],
    liveOnly: true,
  },
  {
    frameId: "live-fire-a-84_25s-flashlight-smoke-scan",
    responderId: "ff-a",
    sourceVideo: "/videos/fire/fire-feed-a.mp4",
    timestampSeconds: 84.25,
    title: "Flashlight scan through smoky room",
    description: "Bodycam A shows a bright beam cutting through a hazy low-visibility interior as the crew checks the space.",
    tags: ["smoke spread", "visibility", "ground operations"],
    boxes: [
      { x: 12, y: 18, width: 72, height: 56, label: "Flashlight through smoke" },
    ],
    liveOnly: true,
  },
  {
    frameId: "live-fire-a-141_5s-crew-visible-in-smoke",
    responderId: "ff-a",
    sourceVideo: "/videos/fire/fire-feed-a.mp4",
    timestampSeconds: 141.5,
    title: "Crew visible in smoky room",
    description: "Bodycam A shows an illuminated firefighter ahead in a smoky room, with interior positioning still visible through haze.",
    tags: ["ground operations", "smoke spread", "visibility"],
    boxes: [
      { x: 26, y: 16, width: 46, height: 58, label: "Firefighter visible through smoke" },
    ],
    liveOnly: true,
  },
  {
    frameId: "live-fire-a-191_5s-near-whiteout-smoke",
    responderId: "ff-a",
    sourceVideo: "/videos/fire/fire-feed-a.mp4",
    timestampSeconds: 191.5,
    title: "Near-whiteout smoke reduces visibility",
    description: "Bodycam A shows grey-white smoke or steam washing out the frame while responders remain in the operating area.",
    tags: ["smoke spread", "visibility", "fire response"],
    boxes: [
      { x: 4, y: 4, width: 90, height: 74, label: "Near-whiteout smoke / steam" },
    ],
    liveOnly: true,
  },
  {
    frameId: "demo-fire-a-196_75s-smoke-visibility",
    responderId: "ff-a",
    sourceVideo: "/videos/fire/fire-feed-a.mp4",
    timestampSeconds: 196.75,
    title: "Smoke and steam reduce visibility",
    description: "Bodycam A shows the scene heavily obscured by grey smoke or steam, with responder gear only partly visible.",
    tags: ["smoke spread", "visibility", "fire response"],
    boxes: [
      { x: 8, y: 8, width: 84, height: 72, label: "Reduced-visibility smoke / steam" },
    ],
  },
  // Joseph video review correction: 27.25s cue is emergency vehicle lighting.
  {
    frameId: "live-fire-b-27_25s-emergency-lights-apparatus",
    responderId: "ff-b",
    sourceVideo: "/videos/fire/fire-feed-b-escalation.mp4",
    timestampSeconds: 27.25,
    title: "Emergency lights near apparatus area",
    description: "Bodycam B shows emergency vehicle lights near the operating area and approach path.",
    tags: ["fire response", "visibility"],
    boxes: [
      { x: 46, y: 18, width: 40, height: 48, label: "Emergency lights near apparatus area" },
    ],
    liveOnly: true,
  },
  // Joseph video review correction: 32s cue is apparatus/emergency lighting, not flame evidence.
  {
    frameId: "live-fire-b-32s-emergency-lights-beside-apparatus",
    responderId: "ff-b",
    sourceVideo: "/videos/fire/fire-feed-b-escalation.mp4",
    timestampSeconds: 32,
    title: "Emergency lights beside apparatus",
    description: "Bodycam B shows emergency vehicle lighting beside the apparatus area before the crew moves into heavier smoke.",
    tags: ["fire response", "visibility"],
    boxes: [
      { x: 34, y: 8, width: 54, height: 62, label: "Emergency lights beside apparatus" },
      { x: 4, y: 36, width: 34, height: 38, label: "Apparatus / operating edge" },
    ],
    liveOnly: true,
  },
  {
    frameId: "live-fire-b-58_75s-first-flame-through-smoke",
    responderId: "ff-b",
    sourceVideo: "/videos/fire/fire-feed-b-escalation.mp4",
    timestampSeconds: 58.75,
    title: "First visible flame cue through smoke",
    description: "Bodycam B shows the first clear flame cue through smoke while interior suppression continues nearby.",
    tags: ["smoke spread", "fire response", "visibility"],
    boxes: [
      { x: 48, y: 8, width: 38, height: 58, label: "First visible flame cue" },
    ],
    liveOnly: true,
  },
  {
    frameId: "live-fire-b-64_75s-ceiling-flame-cue",
    responderId: "ff-b",
    sourceVideo: "/videos/fire/fire-feed-b-escalation.mp4",
    timestampSeconds: 64.75,
    title: "Small flame cue appears through smoke",
    description: "Bodycam B shows a small orange flame cue while crew lights cut through smoke.",
    tags: ["smoke spread", "visibility", "fire response"],
    boxes: [
      { x: 40, y: 4, width: 46, height: 36, label: "Small flame cue" },
    ],
    liveOnly: true,
  },
  {
    frameId: "demo-fire-b-76_5s-escalation-etf",
    responderId: "ff-b",
    sourceVideo: "/videos/fire/fire-feed-b-escalation.mp4",
    timestampSeconds: 76.5,
    title: "Early fire escalation cue visible",
    description: "Bodycam B shows flame growth beyond the caller brief for Ground Commander review.",
    tags: ["fire escalation", "smoke spread", "fire response"],
    boxes: [
      { x: 40, y: 14, width: 48, height: 54, label: "Visible flame growth" },
      { x: 16, y: 42, width: 36, height: 34, label: "Operating area near fire" },
    ],
  },
  {
    frameId: "live-fire-b-95_25s-active-flame-in-smoke",
    responderId: "ff-b",
    sourceVideo: "/videos/fire/fire-feed-b-escalation.mp4",
    timestampSeconds: 95.25,
    title: "Active flame reappears in smoke",
    description: "Bodycam B shows a distinct orange flame in heavy smoke as interior operations continue.",
    tags: ["fire escalation", "smoke spread", "fire response"],
    boxes: [
      { x: 48, y: 8, width: 36, height: 54, label: "Active flame through smoke" },
    ],
    liveOnly: true,
  },
  {
    frameId: "live-fire-b-107_5s-flame-front-reappears",
    responderId: "ff-b",
    sourceVideo: "/videos/fire/fire-feed-b-escalation.mp4",
    timestampSeconds: 107.5,
    title: "Flame front reappears near crew",
    description: "Bodycam B shows a bright flame front and sparks through smoke while crew members operate nearby.",
    tags: ["fire escalation", "smoke spread", "visibility"],
    boxes: [
      { x: 50, y: 8, width: 42, height: 52, label: "Reappearing flame front" },
      { x: 8, y: 36, width: 32, height: 40, label: "Crew operating nearby" },
    ],
    liveOnly: true,
  },
  {
    frameId: "live-fire-b-126_25s-flame-front",
    responderId: "ff-b",
    sourceVideo: "/videos/fire/fire-feed-b-escalation.mp4",
    timestampSeconds: 126.25,
    title: "Flame front expands near operating area",
    description: "Bodycam B shows a broad visible flame front before the later sustained escalation frame.",
    tags: ["fire escalation", "fire response", "visibility"],
    boxes: [
      { x: 34, y: 6, width: 58, height: 66, label: "Visible flame front" },
    ],
    liveOnly: true,
  },
  {
    frameId: "demo-fire-b-130_75s-sustained-escalation",
    responderId: "ff-b",
    sourceVideo: "/videos/fire/fire-feed-b-escalation.mp4",
    timestampSeconds: 130.75,
    title: "Sustained flame growth continues",
    description: "Bodycam B shows the strongest sustained flame-growth frame in the selected analysis window.",
    tags: ["fire escalation", "visibility", "fire response"],
    boxes: [
      { x: 38, y: 8, width: 54, height: 62, label: "Sustained flame growth" },
      { x: 5, y: 38, width: 34, height: 40, label: "Reduced operating space" },
    ],
  },
  {
    frameId: "live-fire-b-139_75s-active-fire-growth",
    responderId: "ff-b",
    sourceVideo: "/videos/fire/fire-feed-b-escalation.mp4",
    timestampSeconds: 139.75,
    title: "Fire growth remains active",
    description: "Bodycam B shows flame growth continuing in the later live window after the first escalation cue.",
    tags: ["fire escalation", "visibility", "fire response"],
    boxes: [
      { x: 44, y: 7, width: 48, height: 62, label: "Continuing flame growth" },
    ],
    liveOnly: true,
  },
  {
    frameId: "live-fire-b-149_25s-overhead-flame-proximity",
    responderId: "ff-b",
    sourceVideo: "/videos/fire/fire-feed-b-escalation.mp4",
    timestampSeconds: 149.25,
    title: "Overhead flame close to operating area",
    description: "Bodycam B shows sustained overhead flame while a firefighter remains close beneath the smoke layer.",
    tags: ["fire escalation", "smoke spread", "visibility"],
    boxes: [
      { x: 42, y: 4, width: 48, height: 46, label: "Overhead flame" },
      { x: 12, y: 38, width: 34, height: 38, label: "Crew near flame area" },
    ],
    liveOnly: true,
  },
  {
    frameId: "live-fire-b-163s-late-flame-front",
    responderId: "ff-b",
    sourceVideo: "/videos/fire/fire-feed-b-escalation.mp4",
    timestampSeconds: 163,
    title: "Late flame front remains visible",
    description: "Bodycam B shows a large orange flame front through smoke after the earlier escalation cue.",
    tags: ["fire escalation", "smoke spread", "fire response"],
    boxes: [
      { x: 36, y: 6, width: 54, height: 54, label: "Late visible flame front" },
    ],
    liveOnly: true,
  },
  {
    frameId: "live-fire-b-181_25s-fire-glow-spreads",
    responderId: "ff-b",
    sourceVideo: "/videos/fire/fire-feed-b-escalation.mp4",
    timestampSeconds: 181.25,
    title: "Fire glow spreads through smoke",
    description: "Bodycam B shows a broad orange fire glow spreading across the upper frame in heavy smoke.",
    tags: ["fire escalation", "smoke spread", "visibility"],
    boxes: [
      { x: 18, y: 4, width: 66, height: 54, label: "Broad fire glow through smoke" },
    ],
    liveOnly: true,
  },
  {
    frameId: "live-fire-c-3_5s-crew-at-fence-line",
    responderId: "ff-c",
    sourceVideo: "/videos/fire/fire-feed-c.mp4",
    timestampSeconds: 3.5,
    title: "Crew clusters at fence line",
    description: "Bodycam C shows multiple firefighters positioned at the fence or window line with equipment visible.",
    tags: ["ground operations", "entry approach", "fire response"],
    boxes: [
      { x: 18, y: 18, width: 66, height: 54, label: "Crew at fence / window line" },
    ],
    liveOnly: true,
  },
  {
    frameId: "live-fire-c-28_25s-corridor-smoke-lights",
    responderId: "ff-c",
    sourceVideo: "/videos/fire/fire-feed-c.mp4",
    timestampSeconds: 28.25,
    title: "Hazed corridor with emergency lights",
    description: "Bodycam C shows a smoky corridor with emergency lights diffused through haze as crews move along the railing.",
    tags: ["smoke spread", "visibility", "entry approach"],
    boxes: [
      { x: 8, y: 12, width: 84, height: 62, label: "Smoke-hazed corridor" },
    ],
    liveOnly: true,
  },
  {
    frameId: "live-fire-c-54_75s-flame-through-smoke",
    responderId: "ff-c",
    sourceVideo: "/videos/fire/fire-feed-c.mp4",
    timestampSeconds: 54.75,
    title: "Orange glow visible through entry smoke",
    description: "Bodycam C shows orange glow through smoke near the entry-control area after Bodycam B's first flame cue.",
    tags: ["smoke spread", "entry control", "visibility"],
    boxes: [
      { x: 52, y: 12, width: 36, height: 48, label: "Orange glow through smoke" },
    ],
    liveOnly: true,
  },
  {
    frameId: "demo-fire-c-63_25s-entry-control",
    responderId: "ff-c",
    sourceVideo: "/videos/fire/fire-feed-c.mp4",
    timestampSeconds: 63.25,
    title: "Entry-control conditions recorded",
    description: "Bodycam C shows smoke and haze around a bright access area, with responder markings and equipment visible through reduced visibility.",
    tags: ["entry approach", "ground operations", "smoke spread"],
    boxes: [
      { x: 12, y: 24, width: 38, height: 46, label: "Responder / equipment in haze" },
      { x: 50, y: 16, width: 40, height: 52, label: "Reduced-visibility access area" },
    ],
  },
  {
    frameId: "live-fire-c-64s-equipment-in-haze",
    responderId: "ff-c",
    sourceVideo: "/videos/fire/fire-feed-c.mp4",
    timestampSeconds: 64,
    title: "Responder equipment visible in haze",
    description: "Bodycam C shows responder gear and reflective material in smoky low-visibility conditions near the access area.",
    tags: ["entry approach", "smoke spread", "ground operations"],
    boxes: [
      { x: 10, y: 20, width: 42, height: 48, label: "Responder equipment in haze" },
      { x: 50, y: 16, width: 36, height: 54, label: "Low-visibility access area" },
    ],
    liveOnly: true,
  },
  {
    frameId: "live-fire-c-73_25s-right-side-flame-growth",
    responderId: "ff-c",
    sourceVideo: "/videos/fire/fire-feed-c.mp4",
    timestampSeconds: 73.25,
    title: "Right-side orange glow visible",
    description: "Bodycam C shows a right-side orange glow and smoke before the later ETF escalation cue.",
    tags: ["smoke spread", "entry control", "visibility"],
    boxes: [
      { x: 52, y: 8, width: 38, height: 58, label: "Right-side orange glow" },
    ],
    liveOnly: true,
  },
  {
    frameId: "live-fire-c-81s-intense-glow-and-smoke",
    responderId: "ff-c",
    sourceVideo: "/videos/fire/fire-feed-c.mp4",
    timestampSeconds: 81,
    title: "Intense glow and smoke recorded",
    description: "Bodycam C shows intense orange glow, smoke, and bright work lights in the same entry-control view.",
    tags: ["fire escalation", "smoke spread", "visibility"],
    boxes: [
      { x: 14, y: 8, width: 70, height: 58, label: "Intense glow and smoke" },
    ],
    liveOnly: true,
  },
  {
    frameId: "live-fire-c-105_5s-flame-front-through-smoke",
    responderId: "ff-c",
    sourceVideo: "/videos/fire/fire-feed-c.mp4",
    timestampSeconds: 105.5,
    title: "Flame front visible through dense smoke",
    description: "Bodycam C shows a bright flame front through dense smoke while hose operations continue.",
    tags: ["fire escalation", "smoke spread", "visibility"],
    boxes: [
      { x: 40, y: 6, width: 48, height: 54, label: "Flame front through smoke" },
    ],
    liveOnly: true,
  },
  {
    frameId: "live-fire-c-124_25s-near-whiteout-visibility",
    responderId: "ff-c",
    sourceVideo: "/videos/fire/fire-feed-c.mp4",
    timestampSeconds: 124.25,
    title: "Smoke and glare wash out the view",
    description: "Bodycam C shows white smoke and glare washing out most of the interior frame during suppression.",
    tags: ["smoke spread", "visibility", "fire response"],
    boxes: [
      { x: 4, y: 4, width: 88, height: 72, label: "Smoke / glare visibility loss" },
    ],
    liveOnly: true,
  },
  {
    frameId: "live-fire-c-184_5s-equipment-assisted-navigation",
    responderId: "ff-c",
    sourceVideo: "/videos/fire/fire-feed-c.mp4",
    timestampSeconds: 184.5,
    title: "Equipment-assisted navigation visible",
    description: "Bodycam C shows a handheld screen or device visible while crews work in a smoky interior.",
    tags: ["ground operations", "entry control", "visibility"],
    boxes: [
      { x: 24, y: 28, width: 36, height: 34, label: "Handheld screen / device" },
      { x: 58, y: 14, width: 28, height: 50, label: "Crew in smoky interior" },
    ],
    liveOnly: true,
  },
  {
    frameId: "live-fire-c-201_5s-small-flame-indicator",
    responderId: "ff-c",
    sourceVideo: "/videos/fire/fire-feed-c.mp4",
    timestampSeconds: 201.5,
    title: "Small flame indicator remains visible",
    description: "Bodycam C shows a small orange flame or glow low in the smoky frame near crew lights.",
    tags: ["fire escalation", "smoke spread", "fire response"],
    boxes: [
      { x: 34, y: 48, width: 34, height: 28, label: "Small flame / glow indicator" },
    ],
    liveOnly: true,
  },
  {
    frameId: "demo-punggol-post-fire-a-7_75s-sweep",
    responderId: "ff-a",
    sourceVideo: "/videos/fire/punggol-post-fire-wei-jie-pov.mp4",
    timestampSeconds: 7.75,
    title: "Post-fire sweep begins",
    description: "Tze Kai POV shows a clear corridor beside the building with railings, walkway space, and no visible crowding in the sweep path.",
    tags: ["fire response", "responder safety"],
    boxes: [
      { x: 22, y: 24, width: 52, height: 48, label: "Post-fire corridor sweep area" },
    ],
  },
  {
    frameId: "live-punggol-post-fire-a-15_75s-person-low-against-wall",
    responderId: "ff-a",
    sourceVideo: "/videos/fire/punggol-post-fire-wei-jie-pov.mp4",
    timestampSeconds: 15.75,
    title: "Person located low against wall",
    description: "Tze Kai POV shows a person low against the corridor wall as the post-fire welfare check begins.",
    tags: ["responder safety", "medical assistance"],
    boxes: [
      { x: 34, y: 22, width: 34, height: 52, label: "Person low against wall" },
    ],
    liveOnly: true,
  },
  {
    frameId: "demo-punggol-post-fire-a-19_25s-welfare-check",
    responderId: "ff-a",
    sourceVideo: "/videos/fire/punggol-post-fire-wei-jie-pov.mp4",
    timestampSeconds: 19.25,
    title: "Welfare check interaction visible",
    description: "Tze Kai POV shows a person crouched or seated beside the wall during the welfare-check interaction.",
    tags: ["responder safety", "medical assistance"],
    boxes: [
      { x: 32, y: 14, width: 34, height: 56, label: "Person beside wall" },
      { x: 61, y: 20, width: 25, height: 48, label: "Responder proximity" },
    ],
  },
  {
    frameId: "live-punggol-post-fire-a-20s-arm-near-lens",
    responderId: "ff-a",
    sourceVideo: "/videos/fire/punggol-post-fire-wei-jie-pov.mp4",
    timestampSeconds: 20,
    title: "Arm enters responder space",
    description: "Tze Kai POV shows the person's arm and torso close to the lens during the welfare-check exchange.",
    tags: ["responder safety", "unsafe proximity"],
    boxes: [
      { x: 14, y: 8, width: 68, height: 68, label: "Arm and torso near lens" },
    ],
    liveOnly: true,
  },
  {
    frameId: "live-punggol-post-fire-a-24s-sustained-close-posture",
    responderId: "ff-a",
    sourceVideo: "/videos/fire/punggol-post-fire-wei-jie-pov.mp4",
    timestampSeconds: 24,
    title: "Sustained close-range posture",
    description: "Tze Kai POV shows the person remaining crouched close to the responder-side space with an arm extended.",
    tags: ["responder safety", "unsafe proximity"],
    boxes: [
      { x: 24, y: 10, width: 52, height: 64, label: "Sustained close-range posture" },
    ],
    liveOnly: true,
  },
  {
    frameId: "live-punggol-post-fire-a-28_5s-raised-arms-near-responder",
    responderId: "ff-a",
    sourceVideo: "/videos/fire/punggol-post-fire-wei-jie-pov.mp4",
    timestampSeconds: 28.5,
    title: "Raised arms near responder",
    description: "Tze Kai POV shows both arms raised or moving close to the responder-side space while the person remains low.",
    tags: ["responder safety", "unsafe proximity"],
    boxes: [
      { x: 14, y: 10, width: 66, height: 62, label: "Raised arms near responder" },
    ],
    liveOnly: true,
  },
  {
    frameId: "live-punggol-post-fire-a-32s-close-range-interaction",
    responderId: "ff-a",
    sourceVideo: "/videos/fire/punggol-post-fire-wei-jie-pov.mp4",
    timestampSeconds: 32,
    title: "Close-range welfare-check interaction continues",
    description: "Tze Kai POV shows the involved person close beside the wall with an arm extended during the exchange.",
    tags: ["responder safety", "unsafe proximity"],
    boxes: [
      { x: 26, y: 10, width: 48, height: 62, label: "Close-range interaction" },
    ],
    liveOnly: true,
  },
  {
    frameId: "demo-punggol-post-fire-a-36_25s-unsafe-proximity",
    responderId: "ff-a",
    sourceVideo: "/videos/fire/punggol-post-fire-wei-jie-pov.mp4",
    timestampSeconds: 36.25,
    title: "Unsafe proximity during welfare check",
    description: "Tze Kai POV shows the involved person standing very close to the camera in the corridor, with an arm extended in frame.",
    tags: ["responder safety", "unsafe proximity"],
    boxes: [
      { x: 28, y: 8, width: 42, height: 64, label: "Involved person in close proximity" },
      { x: 58, y: 24, width: 30, height: 38, label: "Extended arm / near-camera position" },
    ],
  },
  {
    frameId: "live-punggol-post-fire-a-39_25s-pointing-gesture",
    responderId: "ff-a",
    sourceVideo: "/videos/fire/punggol-post-fire-wei-jie-pov.mp4",
    timestampSeconds: 39.25,
    title: "Pointing gesture during welfare check",
    description: "Tze Kai POV shows the person pointing outward during the continued welfare-check interaction.",
    tags: ["responder safety", "unsafe proximity"],
    boxes: [
      { x: 36, y: 14, width: 42, height: 56, label: "Pointing gesture" },
    ],
    liveOnly: true,
  },
  {
    frameId: "live-punggol-post-fire-a-40_5s-hydration-welfare-cue",
    responderId: "ff-a",
    sourceVideo: "/videos/fire/punggol-post-fire-wei-jie-pov.mp4",
    timestampSeconds: 40.5,
    title: "Hydration welfare cue visible",
    description: "Tze Kai POV shows the person drinking from a clear bottle during the post-fire welfare-check sequence.",
    tags: ["responder safety", "medical assistance"],
    boxes: [
      { x: 42, y: 18, width: 34, height: 54, label: "Hydration / welfare cue" },
    ],
    liveOnly: true,
  },
  {
    frameId: "demo-punggol-post-fire-a-45_25s-contact-evidence",
    responderId: "ff-a",
    sourceVideo: "/videos/fire/punggol-post-fire-wei-jie-pov.mp4",
    timestampSeconds: 45.25,
    title: "Physical contact evidence from second POV",
    description: "Tze Kai POV shows hands and arms meeting at close range during the responder-safety interaction.",
    tags: ["responder safety", "physical contact", "unsafe proximity"],
    boxes: [
      { x: 18, y: 34, width: 60, height: 34, label: "Hands / arms meet at close range" },
      { x: 48, y: 10, width: 34, height: 58, label: "Person close to responder-side space" },
    ],
  },
  {
    frameId: "live-punggol-post-fire-a-46_75s-spacing-hand-visible",
    responderId: "ff-a",
    sourceVideo: "/videos/fire/punggol-post-fire-wei-jie-pov.mp4",
    timestampSeconds: 46.75,
    title: "Spacing hand remains visible",
    description: "Tze Kai POV shows an outstretched hand between the responder-side space and the involved person after close-range contact.",
    tags: ["responder safety", "crew intervention", "unsafe proximity"],
    boxes: [
      { x: 10, y: 24, width: 54, height: 34, label: "Spacing hand between parties" },
    ],
    liveOnly: true,
  },
  {
    frameId: "live-punggol-post-fire-b-15_5s-person-low-against-wall",
    responderId: "ff-b",
    sourceVideo: "/videos/fire/punggol-post-fire-hafiz-pov.mp4",
    timestampSeconds: 15.5,
    title: "Second POV locates person low on floor",
    description: "Joseph POV shows the person seated or crouched low against the wall during the welfare-check phase.",
    tags: ["responder safety", "medical assistance"],
    boxes: [
      { x: 34, y: 18, width: 36, height: 54, label: "Person low against wall" },
    ],
    liveOnly: true,
  },
  {
    frameId: "live-punggol-post-fire-b-21_25s-raised-hand-near-camera",
    responderId: "ff-b",
    sourceVideo: "/videos/fire/punggol-post-fire-hafiz-pov.mp4",
    timestampSeconds: 21.25,
    title: "Raised hand near responder POV",
    description: "Joseph POV shows the person's arm raised near the responder-side camera space.",
    tags: ["responder safety", "unsafe proximity"],
    boxes: [
      { x: 24, y: 8, width: 48, height: 62, label: "Raised hand near responder POV" },
    ],
    liveOnly: true,
  },
  {
    frameId: "live-punggol-post-fire-b-28_5s-raised-arm-close-proximity",
    responderId: "ff-b",
    sourceVideo: "/videos/fire/punggol-post-fire-hafiz-pov.mp4",
    timestampSeconds: 28.5,
    title: "Raised arm with close proximity",
    description: "Joseph POV shows the person raising an arm toward the camera while remaining within close responder-side space.",
    tags: ["responder safety", "unsafe proximity"],
    boxes: [
      { x: 20, y: 8, width: 56, height: 62, label: "Raised arm in close proximity" },
    ],
    liveOnly: true,
  },
  {
    frameId: "demo-punggol-post-fire-b-36_5s-impact-recovery",
    responderId: "ff-b",
    sourceVideo: "/videos/fire/punggol-post-fire-hafiz-pov.mp4",
    timestampSeconds: 36.5,
    title: "Impact and recovery perspective",
    description: "Joseph POV shows a tilted close-range view with foreground obstruction during the immediate impact and recovery perspective.",
    tags: ["responder safety", "physical contact", "unsafe proximity"],
    boxes: [
      { x: 22, y: 12, width: 58, height: 60, label: "Close-range recovery view" },
      { x: 4, y: 58, width: 28, height: 28, label: "Foreground obstruction" },
    ],
  },
  {
    frameId: "demo-punggol-post-fire-b-37_25s-contact-proximity",
    responderId: "ff-b",
    sourceVideo: "/videos/fire/punggol-post-fire-hafiz-pov.mp4",
    timestampSeconds: 37.25,
    title: "Close approach before contact evidence",
    description: "Joseph POV shows the involved person extremely close to the camera before the later physical-contact evidence.",
    tags: ["responder safety", "unsafe proximity"],
    boxes: [
      { x: 18, y: 6, width: 66, height: 78, label: "Close approach before contact" },
    ],
  },
  {
    frameId: "demo-punggol-post-fire-b-38_25s-crew-spacing",
    responderId: "ff-b",
    sourceVideo: "/videos/fire/punggol-post-fire-hafiz-pov.mp4",
    timestampSeconds: 38.25,
    title: "Crew spacing intervention visible",
    description: "Joseph POV shows a crew arm positioned between the camera and the involved person as spacing is restored near the wall.",
    tags: ["responder safety", "crew intervention", "unsafe proximity"],
    boxes: [
      { x: 4, y: 18, width: 34, height: 54, label: "Crew arm restoring spacing" },
      { x: 48, y: 14, width: 32, height: 58, label: "Involved person near wall" },
    ],
  },
  {
    frameId: "live-punggol-post-fire-b-39_5s-pointing-gesture",
    responderId: "ff-b",
    sourceVideo: "/videos/fire/punggol-post-fire-hafiz-pov.mp4",
    timestampSeconds: 39.5,
    title: "Pointing gesture near responder POV",
    description: "Joseph POV shows the involved person extending a pointed hand toward the responder-side space.",
    tags: ["responder safety", "unsafe proximity"],
    boxes: [
      { x: 42, y: 16, width: 44, height: 54, label: "Pointing gesture near responder POV" },
    ],
    liveOnly: true,
  },
  {
    frameId: "live-punggol-post-fire-b-43_25s-spacing-maintained",
    responderId: "ff-b",
    sourceVideo: "/videos/fire/punggol-post-fire-hafiz-pov.mp4",
    timestampSeconds: 43.25,
    title: "Crew spacing maintained after contact moment",
    description: "Joseph POV shows an open hand and forearm between the camera and the involved person while close-range spacing continues.",
    tags: ["responder safety", "crew intervention", "unsafe proximity"],
    boxes: [
      { x: 6, y: 20, width: 38, height: 48, label: "Crew hand / forearm" },
      { x: 46, y: 12, width: 36, height: 58, label: "Involved person in close range" },
    ],
    liveOnly: true,
  },
  {
    frameId: "demo-punggol-post-fire-b-45_5s-physical-contact",
    responderId: "ff-b",
    sourceVideo: "/videos/fire/punggol-post-fire-hafiz-pov.mp4",
    timestampSeconds: 45.5,
    title: "Physical contact evidence visible",
    description: "Joseph POV shows an outstretched responder-side hand in contact with the involved person's upper chest or shoulder area.",
    tags: ["responder safety", "physical contact", "unsafe proximity"],
    boxes: [
      { x: 4, y: 38, width: 58, height: 26, label: "Responder-side hand contact" },
      { x: 48, y: 8, width: 38, height: 64, label: "Involved person close to camera" },
    ],
  },
  {
    frameId: "demo-punggol-post-fire-b-46_5s-recovery-withdrawal",
    responderId: "ff-b",
    sourceVideo: "/videos/fire/punggol-post-fire-hafiz-pov.mp4",
    timestampSeconds: 46.5,
    title: "Recovery and withdrawal posture visible",
    description: "Joseph POV shows the involved person bending or turning away while the responder-side arm remains extended after contact.",
    tags: ["responder safety", "physical contact", "crew intervention"],
    boxes: [
      { x: 4, y: 28, width: 48, height: 36, label: "Responder-side arm remains extended" },
      { x: 48, y: 10, width: 36, height: 62, label: "Recovery / withdrawal posture" },
    ],
  },
  {
    frameId: "demo-punggol-post-fire-b-47_5s-spacing-maintained-after-contact",
    responderId: "ff-b",
    sourceVideo: "/videos/fire/punggol-post-fire-hafiz-pov.mp4",
    timestampSeconds: 47.5,
    title: "Spacing maintained after contact",
    description: "Joseph POV shows the responder-side arm extended while the involved person steps back to the side.",
    tags: ["responder safety", "crew intervention", "unsafe proximity"],
    boxes: [
      { x: 8, y: 32, width: 48, height: 32, label: "Arm maintaining spacing" },
      { x: 62, y: 14, width: 28, height: 58, label: "Involved person stepping back" },
    ],
  },
  {
    frameId: "live-punggol-post-fire-b-50_75s-fast-arm-motion",
    responderId: "ff-b",
    sourceVideo: "/videos/fire/punggol-post-fire-hafiz-pov.mp4",
    timestampSeconds: 50.75,
    title: "Fast arm motion near spacing hand",
    description: "Joseph POV shows a fast arm motion toward the outstretched spacing hand during the close-range exchange.",
    tags: ["responder safety", "unsafe proximity"],
    boxes: [
      { x: 24, y: 18, width: 58, height: 54, label: "Fast arm motion near spacing hand" },
    ],
    liveOnly: true,
  },
  {
    frameId: "live-punggol-post-fire-b-51_5s-close-distance-after-contact",
    responderId: "ff-b",
    sourceVideo: "/videos/fire/punggol-post-fire-hafiz-pov.mp4",
    timestampSeconds: 51.5,
    title: "Close distance remains after contact",
    description: "Joseph POV shows the involved person turning back toward the responder while the spacing hand remains extended.",
    tags: ["responder safety", "unsafe proximity", "crew intervention"],
    boxes: [
      { x: 10, y: 28, width: 44, height: 32, label: "Spacing hand remains extended" },
      { x: 52, y: 12, width: 36, height: 62, label: "Involved person at close distance" },
    ],
    liveOnly: true,
  },
];

const woodlandsResponderSafetyCues: DemoCue[] = [
  {
    frameId: "demo-woodlands-22_5s-physical-contact",
    responderId: "med-woodlands-a",
    sourceVideo: "/videos/woodlands/woodlands-medical-bodycam.mp4",
    timestampSeconds: 22.5,
    title: "Physical contact toward responder",
    description: "Bodycam W1 shows a physical-contact moment involving another responder.",
    tags: ["responder safety", "physical contact", "unsafe proximity"],
    boxes: [
      { x: 38, y: 16, width: 28, height: 46, label: "Physical-contact moment" },
      { x: 61, y: 19, width: 24, height: 48, label: "Responder receiving contact" },
    ],
  },
  {
    frameId: "demo-woodlands-45_5s-second-contact-risk",
    responderId: "med-woodlands-a",
    sourceVideo: "/videos/woodlands/woodlands-medical-bodycam.mp4",
    timestampSeconds: 45.5,
    title: "Second responder contact-risk moment",
    description: "Bodycam W1 shows another contact-risk moment involving a responder.",
    tags: ["responder safety", "physical contact", "crew intervention"],
    boxes: [
      { x: 34, y: 14, width: 34, height: 52, label: "Second contact-risk moment" },
      { x: 66, y: 18, width: 23, height: 45, label: "Responder proximity" },
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
  const outputPath = path.join(cacheDir, `${cue.frameId}.jpg`);

  try {
    return `data:image/jpeg;base64,${(await readFile(outputPath)).toString("base64")}`;
  } catch {
    // Frame not cached yet; extract it once, then reuse it on later scripted ticks.
  }

  // ffmpeg CLI: https://ffmpeg.org/ffmpeg.html
  await execa("ffmpeg", ["-y", "-v", "error", "-ss", String(cue.timestampSeconds), "-i", videoPath, "-frames:v", "1", "-vf", "scale=640:-1", "-q:v", "4", outputPath]);

  return `data:image/jpeg;base64,${(await readFile(outputPath)).toString("base64")}`;
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

// Joseph video review correction: avoid revealing flame / ETF cues before the source video reaches the cue.
const demoCueToleranceSeconds = 0.25;

export function isDemoFireIncident(incident: Incident) {
  return incident.id === demoFireIncidentId;
}

export function isDemoWoodlandsIncident(incident: Incident) {
  return incident.id === demoWoodlandsIncidentId;
}

export async function buildPunggolFireDemoFrames(cacheDir: string, responders: Responder[], visibleThroughSecondsBySource?: Record<string, number>, options?: { includeLiveOnly?: boolean }) {
  const scopedCues = options?.includeLiveOnly ? punggolFireCues : punggolFireCues.filter((cue) => !cue.liveOnly);
  const cues = visibleThroughSecondsBySource
    ? scopedCues.filter((cue) => (visibleThroughSecondsBySource[cue.sourceVideo] ?? -Infinity) + demoCueToleranceSeconds >= cue.timestampSeconds)
    : scopedCues;

  return buildDemoFrames(cacheDir, cues, responders);
}

export async function buildWoodlandsDemoFrames(cacheDir: string, responders: Responder[], visibleThroughSecondsBySource?: Record<string, number>) {
  const cues = visibleThroughSecondsBySource
    ? woodlandsResponderSafetyCues.filter((cue) => (visibleThroughSecondsBySource[cue.sourceVideo] ?? -Infinity) + demoCueToleranceSeconds >= cue.timestampSeconds)
    : woodlandsResponderSafetyCues;

  return buildDemoFrames(cacheDir, cues, responders);
}
