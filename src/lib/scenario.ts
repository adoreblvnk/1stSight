import type { ScenarioState } from "@/lib/domain";

export const DEFAULT_INCIDENT_ID = "punggol-warehouse-fire";

export const scenarioState: ScenarioState = {
  scenarioId: "punggol-warehouse-ops-2026-07-03",
  title: "Punggol warehouse fire response review",
  incidentClock: "14:03:21",
  deploymentProgress: 78,
  liveAnalysisCue: {
    responderId: "ff-b",
    timestampSeconds: 78,
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
  ],
  incidents: [
    {
      id: DEFAULT_INCIDENT_ID,
      title: "Caller report: small warehouse fire",
      severity: "watch",
      status: "live",
      startTime: "13:56:10",
      location: "21 Punggol Field Walk",
      position: { lat: 1.415, lng: 103.9105 },
      summary: "Caller reports a small fire inside Punggol warehouse, 21 Punggol Field Walk. Caller remains outside and reports no visible injuries.",
      tags: ["fire response", "deployment"],
      objectIds: ["obj-bodycam-a-attack", "obj-flame-spread", "obj-bodycam-c-entry-control"],
      evidenceIds: ["ev-fire-a-attack", "ev-fire-b-escalation", "ev-fire-c-entry-control"],
      responderIds: ["ff-a", "ff-b", "ff-c"],
      supportsRuntimeAnalysis: true,
    },
    {
      id: "jurong-chemical-leak",
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
      supportsRuntimeAnalysis: false,
      unavailableReason: "No responder video has been attached to this incident.",
    },
    {
      id: "tampines-mall-medical-assist",
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
      supportsRuntimeAnalysis: false,
      unavailableReason: "No bodycam footage is available for review.",
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
    { id: "station", label: "Punggol Fire Station", kind: "station", position: { lat: 1.4023, lng: 103.8972 }, status: "origin" },
    { id: "btf", label: "Basic Task Force", kind: "unit", position: { lat: 1.4103, lng: 103.9051 }, status: "approaching" },
    { id: "warehouse", incidentId: DEFAULT_INCIDENT_ID, label: "Punggol warehouse", kind: "incident", position: { lat: 1.415, lng: 103.9105 }, status: "live incident" },
    { id: "jurong-yard", incidentId: "jurong-chemical-leak", label: "Jurong logistics yard", kind: "incident", position: { lat: 1.3099, lng: 103.7239 }, status: "awaiting footage" },
    { id: "tampines-concourse", incidentId: "tampines-mall-medical-assist", label: "Tampines retail concourse", kind: "incident", position: { lat: 1.3535, lng: 103.9451 }, status: "review pending" },
  ],
  architecture: [
    { id: "browser", label: "Ops Centre dashboard", detail: "Browser UI receives only NEXT_PUBLIC_GOOGLE_MAPS_API_KEY and calls route handlers.", boundary: "Browser" },
    { id: "openshift", label: "Dell Cloud Native Platform / OpenShift", detail: "Next.js dashboard and backend route handlers run in a container on port 8080.", boundary: "OpenShift" },
    { id: "harbor", label: "Harbor registry", detail: "Container image is built locally and pushed to Harbor for OpenShift deployment.", boundary: "Harbor" },
    { id: "gb10", label: "GB10 / vLLM / Nemotron", detail: "OpenAI-compatible text endpoint is reached through Cloudflare Tunnel; OpenShift has no GPU.", boundary: "GB10" },
    { id: "cloud-ai", label: "Cloud AI", detail: "Vision-heavy evidence extraction can use cloud AI through server-side keys only.", boundary: "Cloud AI" },
  ],
  report: {
    id: "report-fire-response-evidence",
    title: "Structured Evidence Report: Fire Response Bodycam Review",
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
        text: "Fire escalation and smoke conditions are available for review and report export.",
        reason: "Selected evidence cards describe fire growth, reduced visibility, and entry-control events.",
        evidence: "Bodycam A 14:02:10, Bodycam B 14:03:21, Bodycam C 14:04:06",
      },
    ],
  },
};

export function getScenarioState() {
  return scenarioState;
}

// 1stSight prototype incident catalogue: generated for multi-incident command routing.
export function getIncidentById(incidentId: string) {
  return scenarioState.incidents.find((incident) => incident.id === incidentId) ?? null;
}

// 1stSight prototype incident catalogue: generated for multi-incident command routing.
export function getSelectedIncidentId(incidentId: string | null | undefined) {
  return getIncidentById(incidentId ?? "")?.id ?? DEFAULT_INCIDENT_ID;
}

// 1stSight prototype incident catalogue: generated for multi-incident command routing.
export function getIncidentResponders(incidentId: string) {
  const incident = getIncidentById(incidentId);

  if (!incident) return [];

  const responderIds = new Set(incident.responderIds);
  return scenarioState.responders.filter((responder) => responderIds.has(responder.id));
}

// 1stSight prototype incident catalogue: generated for multi-incident command routing.
export function getRuntimeIncident(incidentId: string) {
  const incident = getIncidentById(incidentId);

  if (!incident) return { incident: null, responders: [] };

  return { incident, responders: getIncidentResponders(incident.id) };
}

export function findEvidence(id: string) {
  return scenarioState.evidence.find((item) => item.id === id);
}
