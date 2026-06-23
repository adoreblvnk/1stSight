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
      name: "Firefighter A",
      role: "Interior attack",
      feedLabel: "Bodycam A",
      videoSrc: "/videos/fire/fire-feed-a.mp4",
      status: "interior",
      position: { lat: 1.4152, lng: 103.9105 },
    },
    {
      id: "ff-b",
      name: "Firefighter B",
      role: "Hose support",
      feedLabel: "Bodycam B",
      videoSrc: "/videos/fire/fire-feed-b-escalation.mp4",
      status: "monitoring",
      position: { lat: 1.4149, lng: 103.9108 },
    },
    {
      id: "ff-c",
      name: "Firefighter C",
      role: "Entry control",
      feedLabel: "Bodycam C",
      videoSrc: "/videos/fire/fire-feed-c.mp4",
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
      tags: ["fire response", "deployment"],
      objectIds: ["obj-bodycam-a-attack", "obj-flame-spread", "obj-bodycam-c-entry-control"],
      evidenceIds: ["ev-fire-a-attack", "ev-fire-b-escalation", "ev-fire-c-entry-control"],
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
    title: "Structured Evidence Briefing: Fire Response Bodycam Review",
    generatedAt: "2026-07-03T14:40:00+08:00",
    incidentIds: [DEFAULT_INCIDENT_ID],
    evidenceIds: ["ev-fire-a-attack", "ev-fire-b-escalation", "ev-fire-c-entry-control"],
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
  return incidentId === WOODLANDS_AAR_INCIDENT_ID;
}
