import type { IncidentMilestone, ScenarioState } from "@/lib/domain";
// opencode run "$(cat /tmp/1stsight-opencode-map-feature.md)"
import { fireStationDeploymentMarkers } from "@/lib/fire-stations";

export const DEFAULT_INCIDENT_ID = "punggol-residential-fire";
export const WOODLANDS_AAR_INCIDENT_ID = "woodlands-medical-responder-safety";
export const STREAM_INCIDENT_ID = "stage-medical-assistance-stream";

const sharedMilestoneLabels: Record<IncidentMilestone["id"], string> = {
  "call-received": "Call received",
  dispatch: "Dispatch",
  acknowledge: "Acknowledge",
  "move-out": "Move out",
  "arrive-at-scene": "Arrive at scene",
  "at-patient-side": "At patient side",
  "after-patient-assessment": "After patient assessment",
  "moving-out-to-hospital": "Moving out to hospital",
  "arrive-hospital": "Arrive hospital",
  "first-jet-out": "First jet out",
  "ba-entry": "BA entry",
  "damping-down": "Damping down",
  "post-fire-sweep": "Post-fire sweep",
  "welfare-check": "Welfare check",
  "verbal-aggression": "Verbal aggression",
  "physical-contact": "Physical contact / shove",
  "de-escalation-restraint": "De-escalation / restraint",
  "police-support-notified": "On-site police support notified",
  "investigation-cause-search": "Investigation / cause search",
  "hand-over": "Hand over",
};

function milestone(id: IncidentMilestone["id"], fields: Omit<IncidentMilestone, "id" | "label">): IncidentMilestone {
  return {
    id,
    label: sharedMilestoneLabels[id],
    ...fields,
  };
}

function unavailableMilestone(id: IncidentMilestone["id"], notes: string): IncidentMilestone {
  return milestone(id, {
    displayTime: "Unavailable",
    sourceType: "officer-entered",
    sourceLabel: "Officer review input required",
    status: "unavailable",
    notes,
  });
}

const punggolFireMilestones: IncidentMilestone[] = [
  milestone("call-received", { timestamp: "13:56:10", displayTime: "13:56", sourceType: "dispatch-system", sourceLabel: "Caller intake log", status: "confirmed", notes: "Caller reports small unit fire; no injuries reported." }),
  milestone("dispatch", { timestamp: "13:57:24", displayTime: "13:57", sourceType: "dispatch-system", sourceLabel: "Dispatch console", status: "confirmed", notes: "SCDF response unit assigned in live Ops Centre flow." }),
  milestone("acknowledge", { timestamp: "13:58:02", displayTime: "13:58", sourceType: "dispatch-system", sourceLabel: "Unit status log", status: "confirmed" }),
  milestone("move-out", { timestamp: "13:59:16", displayTime: "13:59", sourceType: "dispatch-system", sourceLabel: "Unit status log", status: "confirmed" }),
  milestone("arrive-at-scene", { timestamp: "14:01:48", displayTime: "14:01", sourceType: "dispatch-system", sourceLabel: "Unit status log", status: "confirmed" }),
  unavailableMilestone("at-patient-side", "Medical patient-side timing is not applicable to this fire workflow."),
  unavailableMilestone("after-patient-assessment", "Patient assessment timing is not applicable to this fire workflow."),
  unavailableMilestone("moving-out-to-hospital", "Hospital conveyance timing is not part of this fire workflow."),
  unavailableMilestone("arrive-hospital", "Hospital arrival timing is not part of this fire workflow."),
  milestone("first-jet-out", { timestamp: "14:02:10", displayTime: "14:02", sourceType: "footage", sourceLabel: "Bodycam A", status: "confirmed", notes: "Hose-line movement visible near initial fire area.", evidenceRef: "ev-fire-a-attack" }),
  milestone("ba-entry", { timestamp: "14:04:06", displayTime: "14:04", sourceType: "footage", sourceLabel: "Bodycam C", status: "confirmed", notes: "Entry-control conditions recorded from responder footage.", evidenceRef: "ev-fire-c-entry-control" }),
  milestone("damping-down", { displayTime: "Pending officer input", sourceType: "officer-entered", sourceLabel: "Officer review input required", status: "pending", notes: "Not derived from current selected bodycam frames." }),
  milestone("post-fire-sweep", { timestamp: "00:08", displayTime: "post-fire 00:08", sourceType: "footage", sourceLabel: "Wei Jie POV / Bodycam A", status: "confirmed", notes: "Post-fire corridor sweep continues from the same Punggol incident using Wei Jie POV footage.", evidenceRef: "demo-punggol-post-fire-a-08s-sweep" }),
  milestone("welfare-check", { timestamp: "00:18", displayTime: "post-fire 00:18", sourceType: "footage", sourceLabel: "Wei Jie POV / Bodycam A", status: "confirmed", notes: "Responders conduct a welfare-check interaction after the fire response; this is footage-derived, not caller context.", evidenceRef: "demo-punggol-post-fire-a-18s-welfare-check" }),
  milestone("verbal-aggression", { timestamp: "00:31", displayTime: "post-fire 00:31", sourceType: "footage", sourceLabel: "Wei Jie POV / Bodycam A", status: "confirmed", notes: "Raised verbal aggression is visible/audible in the post-fire welfare-check sequence.", evidenceRef: "demo-punggol-post-fire-a-31s-verbal-aggression" }),
  milestone("physical-contact", { timestamp: "00:37", displayTime: "post-fire 00:37", sourceType: "footage", sourceLabel: "Wei Jie POV + Hafiz POV", status: "confirmed", notes: "Wei Jie POV clearly shows physical contact / shove against Hafiz; Hafiz POV supports the impact and recovery perspective.", evidenceRef: "demo-punggol-post-fire-a-37s-physical-contact" }),
  milestone("de-escalation-restraint", { timestamp: "00:40", displayTime: "post-fire 00:40", sourceType: "footage", sourceLabel: "Hafiz POV / Bodycam B", status: "confirmed", notes: "Crew de-escalation and restraint/recovery actions follow the contact moment.", evidenceRef: "demo-punggol-post-fire-b-40s-recovery" }),
  milestone("police-support-notified", { timestamp: "00:44", displayTime: "post-fire 00:44", sourceType: "officer-entered", sourceLabel: "Officer / GC guidance", status: "confirmed", notes: "Reviewable guidance: notify or confirm on-site police support for the welfare-check scene through the officer / Ground Commander." }),
  milestone("investigation-cause-search", { displayTime: "Pending officer input", sourceType: "officer-entered", sourceLabel: "Officer review input required", status: "pending", notes: "Formal investigation milestone not supplied to 1stSight." }),
  milestone("hand-over", { displayTime: "Pending officer input", sourceType: "officer-entered", sourceLabel: "Officer review input required", status: "pending", notes: "Handover timestamp must be confirmed by officer/system record." }),
];

const woodlandsMedicalMilestones: IncidentMilestone[] = [
  milestone("call-received", { timestamp: "17:22:08", displayTime: "17:22", sourceType: "dispatch-system", sourceLabel: "995 caller context supplied for scenario", status: "confirmed", notes: "Caller reports adult female appears distressed and may require medical attention." }),
  milestone("dispatch", { displayTime: "Pending officer input", sourceType: "dispatch-system", sourceLabel: "Dispatch system record not supplied", status: "pending", notes: "Bodycam footage cannot confirm dispatch." }),
  milestone("acknowledge", { displayTime: "Pending officer input", sourceType: "dispatch-system", sourceLabel: "Unit status record not supplied", status: "pending" }),
  milestone("move-out", { displayTime: "Pending officer input", sourceType: "dispatch-system", sourceLabel: "Unit status record not supplied", status: "pending" }),
  milestone("arrive-at-scene", { displayTime: "Pending officer input", sourceType: "dispatch-system", sourceLabel: "Arrival status record not supplied", status: "pending" }),
  milestone("at-patient-side", { timestamp: "00:21.5", displayTime: "00:21", sourceType: "footage", sourceLabel: "Bodycam W1", status: "confirmed", notes: "Responder is at the patient interaction area in selected footage.", evidenceRef: "med-woodlands-a-21.5s" }),
  milestone("after-patient-assessment", { timestamp: "00:22.5", displayTime: "00:22.5", sourceType: "footage", sourceLabel: "Bodycam W1", status: "confirmed", notes: "Assessment/proximity review point is footage-derived and requires officer interpretation.", evidenceRef: "med-woodlands-a-22_5s" }),
  milestone("moving-out-to-hospital", { displayTime: "Pending officer input", sourceType: "officer-entered", sourceLabel: "Officer review input required", status: "pending", notes: "Conveyance decision/timing is not visible in current selected frames." }),
  milestone("arrive-hospital", { displayTime: "Pending officer input", sourceType: "officer-entered", sourceLabel: "Officer review input required", status: "pending", notes: "Hospital arrival record was not supplied." }),
  unavailableMilestone("first-jet-out", "Fire suppression timing is not applicable to this medical/responder-safety workflow."),
  unavailableMilestone("ba-entry", "BA entry timing is not applicable to this medical/responder-safety workflow."),
  unavailableMilestone("damping-down", "Damping down is not applicable to this medical/responder-safety workflow."),
  unavailableMilestone("investigation-cause-search", "Fire investigation/cause-search timing is not applicable to this medical/responder-safety workflow."),
  milestone("hand-over", { displayTime: "Pending officer input", sourceType: "officer-entered", sourceLabel: "Officer review input required", status: "pending", notes: "Handover must be confirmed by officer or receiving facility record." }),
];

const unavailableMilestones: IncidentMilestone[] = Object.keys(sharedMilestoneLabels).map((id) => unavailableMilestone(id as IncidentMilestone["id"], "No timestamp source is attached to this incident."));

export const scenarioState: ScenarioState = {
  scenarioId: "punggol-residential-ops-2026-07-03",
  title: "Punggol residential fire response review",
  incidentClock: "14:03:21",
  deploymentProgress: 78,
  liveAnalysisCue: {
    responderId: "ff-b",
    timestampSeconds: 77.5,
  },
  responders: [
    {
      id: "ff-a",
      name: "Wei Jie",
      role: "Interior attack / post-fire welfare sweep",
      feedLabel: "Bodycam A",
      videoSrc: "/videos/fire/fire-feed-a.mp4",
      reviewVideoSrcs: ["/videos/fire/punggol-post-fire-wei-jie-pov.mp4"],
      status: "interior",
      position: { lat: 1.4152, lng: 103.9105 },
    },
    {
      id: "ff-b",
      name: "Hafiz",
      role: "Hose support / post-fire welfare sweep",
      feedLabel: "Bodycam B",
      videoSrc: "/videos/fire/fire-feed-b-escalation.mp4",
      reviewVideoSrcs: ["/videos/fire/punggol-post-fire-hafiz-pov.mp4"],
      status: "monitoring",
      position: { lat: 1.4149, lng: 103.9108 },
    },
    {
      id: "ff-c",
      name: "Firefighter C",
      role: "Entry control",
      feedLabel: "Bodycam C",
      videoSrc: "/videos/fire/fire-feed-c.mp4",
      unavailableNote: "Bodycam C not attached to post-fire sweep",
      status: "post-incident",
      position: { lat: 1.4147, lng: 103.9101 },
    },
    {
      id: "med-woodlands-a",
      name: "Woodlands Medic A",
      role: "Medical assistance",
      feedLabel: "Bodycam W1",
      videoSrc: "/videos/woodlands/woodlands-medical-bodycam.mp4",
      status: "monitoring",
      position: { lat: 1.436, lng: 103.7864 },
    },
  ],
  incidents: [
    {
      id: DEFAULT_INCIDENT_ID,
      type: "fire",
      title: "Caller report: residential unit fire",
      severity: "watch",
      status: "live",
      startTime: "13:56:10",
      location: "21 Punggol Field Walk",
      position: { lat: 1.415, lng: 103.9105 },
      summary: "Caller reports a small fire inside a residential unit at 21 Punggol Field Walk. Caller remains outside and reports no visible injuries.",
      tags: ["fire response", "deployment", "responder safety", "physical contact", "crew intervention"],
      objectIds: ["obj-bodycam-a-attack", "obj-flame-spread", "obj-bodycam-c-entry-control", "obj-punggol-post-fire-sweep", "obj-punggol-welfare-check", "obj-punggol-verbal-aggression", "obj-punggol-physical-contact", "obj-punggol-de-escalation", "obj-punggol-police-support-guidance"],
      evidenceIds: ["ev-fire-a-attack", "ev-fire-b-escalation", "ev-fire-c-entry-control", "demo-punggol-post-fire-a-08s-sweep", "demo-punggol-post-fire-a-18s-welfare-check", "demo-punggol-post-fire-a-31s-verbal-aggression", "demo-punggol-post-fire-a-37s-physical-contact", "demo-punggol-post-fire-b-37s-impact-recovery", "demo-punggol-post-fire-b-40s-recovery"],
      responderIds: ["ff-a", "ff-b", "ff-c"],
      milestones: punggolFireMilestones,
      supportsRuntimeAnalysis: true,
    },
    {
      id: "jurong-chemical-leak",
      type: "fire",
      title: "Chemical vapour report at Jurong logistics yard",
      severity: "elevated",
      status: "live",
      startTime: "15:18:44",
      location: "8 Jurong Pier Road",
      position: { lat: 1.3099, lng: 103.7239 },
      summary: "Site supervisor reports vapour near a loading bay. First appliances are staging while HazMat assessment is pending.",
      tags: ["deployment", "blocked access"],
      objectIds: [],
      evidenceIds: [],
      responderIds: [],
      milestones: unavailableMilestones,
      supportsRuntimeAnalysis: false,
      unavailableReason: "No responder video has been attached to this incident.",
    },
    {
      id: "tampines-mall-medical-assist",
      type: "medical",
      title: "Medical assist at Tampines retail concourse",
      severity: "watch",
      status: "review",
      startTime: "16:07:12",
      location: "4 Tampines Central 5",
      position: { lat: 1.3535, lng: 103.9451 },
      summary: "Mall security requests ambulance support for a collapsed member of public. Crowd control and access routing are being coordinated.",
      tags: ["deployment", "blocked access"],
      objectIds: [],
      evidenceIds: [],
      responderIds: [],
      milestones: unavailableMilestones,
      supportsRuntimeAnalysis: false,
      unavailableReason: "No bodycam footage is available for review.",
    },
    {
      id: WOODLANDS_AAR_INCIDENT_ID,
      type: "medical",
      title: "Woodlands medical assistance responder safety review",
      severity: "elevated",
      status: "review",
      startTime: "17:22:08",
      location: "Woodlands medical assistance scene",
      position: { lat: 1.436, lng: 103.7864 },
      summary: "Responder footage is available for medical assistance and responder-safety AAR review, including possible unsafe proximity and crew intervention around the patient interaction.",
      tags: ["medical assistance", "responder safety", "unsafe proximity", "crew intervention"],
      objectIds: [],
      evidenceIds: [],
      responderIds: ["med-woodlands-a"],
      milestones: woodlandsMedicalMilestones,
      supportsRuntimeAnalysis: true,
    },
    {
      id: STREAM_INCIDENT_ID,
      type: "medical",
      title: "Stage medical assistance stream",
      severity: "watch",
      status: "live",
      startTime: "18:00:00",
      location: "91 Ubi Ave 4, Singapore 408827",
      position: { lat: 1.3344, lng: 103.8976 },
      summary: "Evaluator stream opened for a medical assistance scenario. Responders are assessing current footage from the stage environment.",
      tags: ["medical assistance", "responder safety"],
      objectIds: [],
      evidenceIds: [],
      responderIds: [],
      milestones: unavailableMilestones,
      supportsRuntimeAnalysis: true,
    },
  ],
  incidentObjects: [
    {
      id: "obj-punggol-post-fire-sweep",
      incidentId: DEFAULT_INCIDENT_ID,
      title: "Post-fire corridor sweep begins",
      timestamp: "post-fire 00:08",
      source: "Wei Jie POV / Bodycam A",
      summary: "Wei Jie POV records the same Punggol incident continuing into a post-fire corridor sweep.",
      evidenceId: "demo-punggol-post-fire-a-08s-sweep",
      tags: ["fire response", "responder safety"],
      reviewState: "selected",
    },
    {
      id: "obj-punggol-welfare-check",
      incidentId: DEFAULT_INCIDENT_ID,
      title: "Welfare check interaction",
      timestamp: "post-fire 00:18",
      source: "Wei Jie POV / Bodycam A",
      summary: "Responder footage shows a welfare-check interaction after the fire phase; it is not part of the caller report.",
      evidenceId: "demo-punggol-post-fire-a-18s-welfare-check",
      tags: ["responder safety", "medical assistance"],
      reviewState: "selected",
    },
    {
      id: "obj-punggol-verbal-aggression",
      incidentId: DEFAULT_INCIDENT_ID,
      title: "Verbal aggression during welfare check",
      timestamp: "post-fire 00:31",
      source: "Wei Jie POV / Bodycam A",
      summary: "Raised verbal aggression is captured during the post-fire welfare-check sequence.",
      evidenceId: "demo-punggol-post-fire-a-31s-verbal-aggression",
      tags: ["responder safety", "unsafe proximity"],
      reviewState: "pending-review",
    },
    {
      id: "obj-punggol-physical-contact",
      incidentId: DEFAULT_INCIDENT_ID,
      title: "Physical contact / shove visible",
      timestamp: "post-fire 00:37",
      source: "Wei Jie POV / Bodycam A; Hafiz POV / Bodycam B",
      summary: "Wei Jie POV provides the clearest physical contact / shove evidence; Hafiz POV supports impact and recovery context.",
      evidenceId: "demo-punggol-post-fire-a-37s-physical-contact",
      tags: ["responder safety", "physical contact", "unsafe proximity"],
      reviewState: "pending-review",
    },
    {
      id: "obj-punggol-de-escalation",
      incidentId: DEFAULT_INCIDENT_ID,
      title: "De-escalation and restraint / recovery",
      timestamp: "post-fire 00:40",
      source: "Hafiz POV / Bodycam B",
      summary: "Hafiz POV shows impact/recovery and crew actions immediately after the contact moment.",
      evidenceId: "demo-punggol-post-fire-b-40s-recovery",
      tags: ["responder safety", "crew intervention"],
      reviewState: "pending-review",
    },
    {
      id: "obj-punggol-police-support-guidance",
      incidentId: DEFAULT_INCIDENT_ID,
      title: "On-site police-support guidance",
      timestamp: "post-fire 00:44",
      source: "Officer / GC guidance",
      summary: "Reviewable guidance is to notify or confirm police already on scene for support through the officer / Ground Commander.",
      evidenceId: "demo-punggol-post-fire-a-37s-physical-contact",
      tags: ["responder safety", "crew intervention"],
      reviewState: "pending-review",
    },
    {
      id: "obj-bodycam-a-attack",
      incidentId: DEFAULT_INCIDENT_ID,
      title: "Interior attack feed indexed",
      timestamp: "14:02:10",
      source: "Firefighter A bodycam",
      summary: "Bodycam A records firefighters operating near the initial fire area with visible flame glow and hose-line movement.",
      evidenceId: "ev-fire-a-attack",
      tags: ["fire response", "visibility"],
      reviewState: "selected",
    },
    {
      id: "obj-flame-spread",
      incidentId: DEFAULT_INCIDENT_ID,
      title: "Storage-room fire growth",
      timestamp: "14:03:21",
      source: "Firefighter B",
      summary: "Interior feed shows flame growth crossing shelving and smoke thickening near the storage-room ceiling.",
      evidenceId: "ev-fire-b-escalation",
      tags: ["fire escalation", "smoke spread"],
      reviewState: "pending-review",
    },
    {
      id: "obj-bodycam-c-entry-control",
      incidentId: DEFAULT_INCIDENT_ID,
      title: "Entry-control feed indexed",
      timestamp: "14:04:06",
      source: "Firefighter C bodycam",
      summary: "Bodycam C records entry-control conditions, smoke near the access point, and responder positioning during the fire response.",
      evidenceId: "ev-fire-c-entry-control",
      tags: ["fire response", "entry control", "smoke spread"],
      reviewState: "selected",
    },
  ],
  evidence: [],
  events: [],
  recommendations: [],
  decisions: [],
  deploymentMarkers: [
    ...fireStationDeploymentMarkers,
    { id: "punggol-residential", incidentId: DEFAULT_INCIDENT_ID, label: "Punggol residential", kind: "incident", position: { lat: 1.415, lng: 103.9105 }, status: "live incident" },
    { id: "jurong-yard", incidentId: "jurong-chemical-leak", label: "Jurong logistics yard", kind: "incident", position: { lat: 1.3099, lng: 103.7239 }, status: "awaiting footage" },
    { id: "tampines-concourse", incidentId: "tampines-mall-medical-assist", label: "Tampines retail concourse", kind: "incident", position: { lat: 1.3535, lng: 103.9451 }, status: "review pending" },
    { id: "woodlands-medical", incidentId: "woodlands-medical-responder-safety", label: "Woodlands medical", kind: "incident", position: { lat: 1.436, lng: 103.7864 }, status: "review footage" },
    { id: "stage-stream", incidentId: STREAM_INCIDENT_ID, label: "Stage medical stream", kind: "incident", position: { lat: 1.3344, lng: 103.8976 }, status: "stream ready" },
  ],
  architecture: [
    { id: "browser", label: "Ops Centre dashboard", detail: "Browser UI receives only NEXT_PUBLIC_GOOGLE_MAPS_API_KEY and calls route handlers.", boundary: "Browser" },
    { id: "openshift", label: "Dell Cloud Native Platform / OpenShift", detail: "Next.js dashboard and backend route handlers run in a container on port 8080.", boundary: "OpenShift" },
    { id: "harbor", label: "Harbor registry", detail: "Container image is built locally and pushed to Harbor for OpenShift deployment.", boundary: "Harbor" },
    { id: "gb10", label: "GB10 / vLLM / Nemotron", detail: "OpenAI-compatible text endpoint is reached through Cloudflare Tunnel; OpenShift has no GPU.", boundary: "GB10" },
    { id: "cloud-ai", label: "Cloud AI", detail: "Vision-heavy evidence extraction can use cloud AI through server-side keys only.", boundary: "Cloud AI" },
  ],
  report: {
    id: "aar-fire-response-evidence",
    title: "Structured Evidence Briefing: Punggol Fire Response and Responder-Safety Review",
    generatedAt: "2026-07-03T14:40:00+08:00",
    incidentIds: [DEFAULT_INCIDENT_ID],
    evidenceIds: ["ev-fire-a-attack", "ev-fire-b-escalation", "ev-fire-c-entry-control", "demo-punggol-post-fire-a-37s-physical-contact", "demo-punggol-post-fire-b-37s-impact-recovery"],
    reviewState: "pending-review",
    claims: [
      {
        text: "Three current uploaded videos are indexed as fire-response bodycam feeds from firefighters on scene.",
        reason: "Responder metadata maps Bodycam A, Bodycam B, and Bodycam C to fire-response video sources.",
        evidence: "Firefighter A bodycam, Firefighter B bodycam, and Firefighter C bodycam",
      },
      {
        text: "Fire escalation and smoke conditions are available for post-incident evidence review.",
        reason: "Selected evidence cards describe fire growth, reduced visibility, and entry-control events.",
        evidence: "Bodycam A 14:02:10, Bodycam B 14:03:21, Bodycam C 14:04:06",
      },
    ],
  },
};

export function getScenarioState() {
  return scenarioState;
}

// 1stSight incident catalogue: generated for multi-incident command routing.
export function getIncidentById(incidentId: string) {
  return scenarioState.incidents.find((incident) => incident.id === incidentId) ?? null;
}

// 1stSight incident catalogue: generated for multi-incident command routing.
export function getSelectedIncidentId(incidentId: string | null | undefined) {
  return getIncidentById(incidentId ?? "")?.id ?? DEFAULT_INCIDENT_ID;
}

// 1stSight incident catalogue: generated for multi-incident command routing.
export function getIncidentResponders(incidentId: string) {
  const incident = getIncidentById(incidentId);

  if (!incident) return [];

  const responderIds = new Set(incident.responderIds);
  return scenarioState.responders.filter((responder) => responderIds.has(responder.id));
}

// 1stSight incident catalogue: generated for multi-incident command routing.
export function getRuntimeIncident(incidentId: string) {
  const incident = getIncidentById(incidentId);

  if (!incident) return { incident: null, responders: [] };

  return { incident, responders: getIncidentResponders(incident.id) };
}

export function findEvidence(id: string) {
  return scenarioState.evidence.find((item) => item.id === id);
}

export function getIncidentMilestones(incidentId: string) {
  return getIncidentById(incidentId)?.milestones ?? [];
}

export function supportsAarBriefingSlides(incidentId: string) {
  return incidentId === DEFAULT_INCIDENT_ID || incidentId === WOODLANDS_AAR_INCIDENT_ID;
}
