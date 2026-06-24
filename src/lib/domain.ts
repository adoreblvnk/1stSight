export type ReviewState = "system-created" | "pending-review" | "approved" | "rejected" | "selected";

export type IncidentTag =
  | "fire escalation"
  | "fire response"
  | "unsafe entry"
  | "blocked access"
  | "smoke spread"
  | "visibility"
  | "entry control"
  | "deployment"
  | "medical assistance"
  | "responder safety"
  | "physical contact"
  | "unsafe proximity"
  | "crew intervention"
  | "abuse"
  | "strike"
  | "assault"
  | "patient movement";

export type IncidentType = "fire" | "medical";

export type IncidentMilestoneId =
  | "call-received"
  | "dispatch"
  | "acknowledge"
  | "move-out"
  | "arrive-at-scene"
  | "at-patient-side"
  | "after-patient-assessment"
  | "moving-out-to-hospital"
  | "arrive-hospital"
  | "first-jet-out"
  | "ba-entry"
  | "damping-down"
  | "post-fire-sweep"
  | "welfare-check"
  | "verbal-aggression"
  | "physical-contact"
  | "de-escalation-restraint"
  | "police-support-notified"
  | "investigation-cause-search"
  | "hand-over";

export type IncidentMilestoneSourceType = "dispatch-system" | "footage" | "officer-entered";

export type IncidentMilestoneStatus = "pending" | "unavailable" | "confirmed";

export type IncidentMilestone = {
  id: IncidentMilestoneId;
  label: string;
  timestamp?: string;
  displayTime: string;
  sourceType: IncidentMilestoneSourceType;
  sourceLabel: string;
  status: IncidentMilestoneStatus;
  notes?: string;
  evidenceRef?: string;
};

export type Coordinates = {
  lat: number;
  lng: number;
};

export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
};

export type Responder = {
  id: string;
  name: string;
  role: string;
  feedLabel: string;
  videoSrc: string;
  reviewVideoSrcs?: string[];
  unavailableNote?: string;
  status: "en route" | "interior" | "monitoring" | "post-incident";
  position: Coordinates;
};

export type Evidence = {
  id: string;
  incidentId: string;
  responderId: string;
  source: string;
  timestamp: string;
  mediaSrc: string;
  description: string;
  reviewState: ReviewState;
  tags: IncidentTag[];
  boxes: BoundingBox[];
  selectedForReport: boolean;
};

export type IncidentObject = {
  id: string;
  incidentId: string;
  title: string;
  timestamp: string;
  source: string;
  summary: string;
  evidenceId: string;
  tags: IncidentTag[];
  reviewState: ReviewState;
};

export type Incident = {
  id: string;
  type: IncidentType;
  title: string;
  severity: "watch" | "elevated" | "critical";
  status: "live" | "review" | "concluded";
  startTime: string;
  location: string;
  position: Coordinates;
  summary: string;
  tags: IncidentTag[];
  objectIds: string[];
  evidenceIds: string[];
  responderIds: string[];
  milestones: IncidentMilestone[];
  supportsRuntimeAnalysis: boolean;
  unavailableReason?: string;
};

export type IncidentEvent = {
  id: string;
  timestamp: string;
  type: "system" | "ai-evidence" | "recommendation" | "human-review" | "report";
  title: string;
  source: string;
  evidenceId: string;
  reviewState: ReviewState;
};

export type Recommendation = {
  id: string;
  title: string;
  action: string;
  reason: string;
  evidence: string;
  sourceTimestamp: string;
  incidentId: string;
  status: "pending-review" | "approved" | "rejected" | "edited";
  reviewer: string;
};

export type DecisionReview = {
  id: string;
  recommendationId: string;
  incidentId?: string;
  reviewer: string;
  decision: "approved" | "rejected" | "edited";
  reason: string;
  timestamp: string;
};

export type DeploymentMarker = {
  id: string;
  incidentId?: string;
  label: string;
  kind: "station" | "unit" | "incident" | "hazard" | "platform" | "model";
  position: Coordinates;
  status: string;
};

export type ArchitectureNode = {
  id: string;
  label: string;
  detail: string;
  boundary: "OpenShift" | "Harbor" | "GB10" | "Cloud AI" | "Browser";
};

export type DraftReport = {
  id: string;
  title: string;
  generatedAt: string;
  incidentIds: string[];
  evidenceIds: string[];
  reviewState: ReviewState;
  claims: Array<{
    text: string;
    reason: string;
    evidence: string;
  }>;
};

export type ScenarioState = {
  scenarioId: string;
  title: string;
  incidentClock: string;
  deploymentProgress: number;
  liveAnalysisCue: {
    responderId: string;
    timestampSeconds: number;
  };
  responders: Responder[];
  incidents: Incident[];
  incidentObjects: IncidentObject[];
  evidence: Evidence[];
  events: IncidentEvent[];
  recommendations: Recommendation[];
  decisions: DecisionReview[];
  deploymentMarkers: DeploymentMarker[];
  architecture: ArchitectureNode[];
  report: DraftReport;
};
