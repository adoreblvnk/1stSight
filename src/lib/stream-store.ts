import type { Coordinates, IncidentType } from "@/lib/domain";

export type StreamLocationStatus = "exact" | "approximate" | "none";
export type StreamAnalysisStatus = "ready" | "analyzing" | "paused" | "error";

export type StreamBodycam = {
  id: string;
  slotId: number;
  displayName: string;
  joinedAt: string;
  lastSeenAt: string;
  status: "connected" | "stopped";
  position: Coordinates;
  locationStatus: StreamLocationStatus;
  previewDataUrl?: string;
  lastChunkId?: string;
  lastError?: string;
};

export type StreamEvent = {
  id: string;
  incidentId: string;
  incidentType: IncidentType;
  bodycamId: string;
  bodycamDisplayName: string;
  bodycamSlotId: number;
  sourceChunkId: string;
  timestamp: string;
  title: string;
  evidence: string;
  severity: "low" | "medium" | "high";
  tags: string[];
  confidence: "confirmed" | "probable" | "unclear";
  locationStatus: StreamLocationStatus;
  bestEvidenceFrame: {
    frameId: string;
    imageUrl: string;
    timestampSeconds: number;
    timestampWithinChunkSeconds: number;
  };
  supportingFrames: Array<{
    frameId: string;
    imageUrl: string;
    timestampSeconds: number;
    timestampWithinChunkSeconds: number;
  }>;
  recommendation?: {
    title: string;
    action: string;
    reason: string;
  };
};

export type StreamIncidentSession = {
  id: string;
  incidentId: string;
  incidentType: IncidentType;
  title: string;
  callerContext: string;
  location: string;
  position: Coordinates;
  createdAt: string;
  analysisPaused: boolean;
  bodycams: StreamBodycam[];
  events: StreamEvent[];
  lastError?: string;
};

export type StreamWebRtcCandidateSource = "bodycam" | "ops";

export type StreamWebRtcCandidate = {
  seq: number;
  candidate: RTCIceCandidateInit;
  createdAt: string;
};

export type StreamWebRtcSignal = {
  bodycamId: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  bodycamCandidates: StreamWebRtcCandidate[];
  opsCandidates: StreamWebRtcCandidate[];
  updatedAt: string;
};

const maxBodycams = 4;
const fallbackPosition: Coordinates = { lat: 1.3344, lng: 103.8976 };

type StreamStore = {
  session: StreamIncidentSession | null;
  webrtcSignals: Record<string, StreamWebRtcSignal>;
};

const globalStore = globalThis as typeof globalThis & { __firstSightStreamStore?: StreamStore };

function store() {
  globalStore.__firstSightStreamStore ??= { session: null, webrtcSignals: {} };
  globalStore.__firstSightStreamStore.webrtcSignals ??= {};
  return globalStore.__firstSightStreamStore;
}

function nowIso() {
  return new Date().toISOString();
}

function createDefaultSession(anchor?: Coordinates): StreamIncidentSession {
  return {
    id: `stream-${Date.now()}`,
    incidentId: "stage-medical-assistance-stream",
    incidentType: "medical",
    title: "Stage medical assistance stream",
    callerContext: "Evaluator stream opened for a medical assistance scenario. Responders are assessing current footage from the stage environment.",
    location: "91 Ubi Ave 4, Singapore 408827",
    position: anchor ?? fallbackPosition,
    createdAt: nowIso(),
    analysisPaused: false,
    bodycams: [],
    events: [],
  };
}

function approximatePosition(anchor: Coordinates, slotId: number): Coordinates {
  const offset = slotId * 0.00008;
  return { lat: anchor.lat + offset, lng: anchor.lng - offset };
}

export function getStreamSession() {
  return store().session;
}

export function ensureStreamSession(anchor?: Coordinates) {
  const state = store();
  state.session ??= createDefaultSession(anchor);
  if (anchor && state.session.bodycams.length === 0) state.session.position = anchor;
  return state.session;
}

export function joinStreamBodycam(displayName: string, position?: Coordinates | null) {
  const session = ensureStreamSession(position ?? undefined);
  const activeBodycams = session.bodycams.filter((bodycam) => bodycam.status === "connected");

  if (activeBodycams.length >= maxBodycams) {
    return { ok: false as const, reason: "Maximum bodycams connected. Up to 4 live bodycams can join this stream." };
  }

  const usedSlots = new Set(activeBodycams.map((bodycam) => bodycam.slotId));
  const slotId = [1, 2, 3, 4].find((slot) => !usedSlots.has(slot)) ?? activeBodycams.length + 1;
  const isFirstJoin = session.bodycams.length === 0;
  const locationStatus: StreamLocationStatus = position ? "exact" : "approximate";
  const bodycamPosition = position ?? (isFirstJoin ? session.position : approximatePosition(session.position, slotId));
  const bodycam: StreamBodycam = {
    id: `bodycam-${Date.now()}-${slotId}`,
    slotId,
    displayName,
    joinedAt: nowIso(),
    lastSeenAt: nowIso(),
    status: "connected",
    position: bodycamPosition,
    locationStatus,
  };

  session.bodycams.push(bodycam);
  if (isFirstJoin && position) session.position = position;

  return { ok: true as const, session, bodycam };
}

export function updateStreamBodycam(bodycamId: string, update: Partial<Pick<StreamBodycam, "previewDataUrl" | "lastChunkId" | "lastError" | "status">>) {
  const session = getStreamSession();
  const bodycam = session?.bodycams.find((item) => item.id === bodycamId);

  if (!session || !bodycam) return null;

  Object.assign(bodycam, update, { lastSeenAt: nowIso() });
  if (update.status === "stopped") clearStreamWebRtcSignal(bodycamId);
  return { session, bodycam };
}

function ensureStreamWebRtcSignal(bodycamId: string) {
  const state = store();
  state.webrtcSignals[bodycamId] ??= {
    bodycamId,
    bodycamCandidates: [],
    opsCandidates: [],
    updatedAt: nowIso(),
  };
  return state.webrtcSignals[bodycamId];
}

export function setStreamWebRtcOffer(bodycamId: string, offer: RTCSessionDescriptionInit) {
  const signal = ensureStreamWebRtcSignal(bodycamId);
  signal.offer = offer;
  signal.answer = undefined;
  signal.bodycamCandidates = [];
  signal.opsCandidates = [];
  signal.updatedAt = nowIso();
  return signal;
}

export function setStreamWebRtcAnswer(bodycamId: string, answer: RTCSessionDescriptionInit) {
  const signal = ensureStreamWebRtcSignal(bodycamId);
  signal.answer = answer;
  signal.updatedAt = nowIso();
  return signal;
}

export function addStreamWebRtcCandidate(bodycamId: string, source: StreamWebRtcCandidateSource, candidate: RTCIceCandidateInit) {
  const signal = ensureStreamWebRtcSignal(bodycamId);
  const candidates = source === "bodycam" ? signal.bodycamCandidates : signal.opsCandidates;
  const nextCandidate = { seq: (candidates.at(-1)?.seq ?? 0) + 1, candidate, createdAt: nowIso() };
  candidates.push(nextCandidate);
  signal.updatedAt = nowIso();
  return nextCandidate;
}

export function getStreamWebRtcSignal(bodycamId: string) {
  return store().webrtcSignals[bodycamId] ?? null;
}

export function getStreamWebRtcCandidates(bodycamId: string, source: StreamWebRtcCandidateSource, afterSeq: number) {
  const signal = getStreamWebRtcSignal(bodycamId);
  const candidates = source === "bodycam" ? signal?.bodycamCandidates : signal?.opsCandidates;
  return candidates?.filter((candidate) => candidate.seq > afterSeq) ?? [];
}

export function clearStreamWebRtcSignal(bodycamId: string) {
  delete store().webrtcSignals[bodycamId];
}

export function setStreamAnalysisPaused(paused: boolean) {
  const session = ensureStreamSession();
  session.analysisPaused = paused;
  return session;
}

export function appendStreamEvents(events: StreamEvent[]) {
  const session = ensureStreamSession();
  session.events = [...events, ...session.events].slice(0, 40);
  session.lastError = undefined;
  return session;
}

export function setStreamError(message: string, bodycamId?: string) {
  const session = ensureStreamSession();
  session.lastError = message;
  if (bodycamId) updateStreamBodycam(bodycamId, { lastError: message });
  return session;
}

export const streamDefaults = {
  maxBodycams,
  fallbackPosition,
};
