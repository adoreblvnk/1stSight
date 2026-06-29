"use client";

// React useEffect API: https://react.dev/reference/react/useEffect
import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type MutableRefObject, type ReactNode } from "react";
// Next.js Link API: https://nextjs.org/docs/app/api-reference/components/link
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
// Google Maps React API: https://visgl.github.io/react-google-maps/docs/get-started
// AdvancedMarker API: https://visgl.github.io/react-google-maps/docs/api-reference/components/advanced-marker
import { AdvancedMarker, APIProvider, Map } from "@vis.gl/react-google-maps";
// Motion React: https://motion.dev/docs/react
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Activity, Check, Download, MapPinned, Pause, Play, Search, Square, VolumeX } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
// shadcn/ui Select: https://ui.shadcn.com/docs/components/base/select
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// REUI Timeline: https://github.com/keenthemes/reui/blob/main/registry-reui/bases/base/components/timeline/c-timeline-2.tsx
import { Timeline, TimelineContent, TimelineDate, TimelineHeader, TimelineIndicator, TimelineItem, TimelineSeparator, TimelineTitle } from "@/components/reui/timeline";
import type { DecisionReview, DeploymentMarker, Incident, IncidentMilestone, Responder, ScenarioState } from "@/lib/domain";
import type { LiveAnalysisOutput, RuntimeEvidenceSearchOutput } from "@/lib/ai/schemas";
import { mergeLiveAnalysis, type LiveAnalysis, type LiveEvent } from "@/lib/live-analysis-state";
// opencode run "$(cat /tmp/1stsight-opencode-map-feature.md)"
import { dispatchVehicleLabel, dispatchVehicleStatus, nearestFireStation } from "@/lib/fire-stations";
import type { StreamIncidentSession } from "@/lib/stream-store";
import { liveRelayFrameIntervalMs } from "@/lib/stream-relay-config";
import { cn } from "@/lib/utils";
import { browserRtcConfiguration } from "@/lib/webrtc";

const incidentLevelTags = new Set(["fire escalation", "fire response", "ground operations", "entry approach", "entry control", "smoke spread", "visibility", "deployment", "blocked access", "unsafe entry", "hazmat", "medical", "civil", "hazard", "incident", "abuse", "strike", "assault"]);

type LiveMode = "live" | "escalation" | "post-fire-loading" | "post-fire" | "concluded";

type RuntimeEvidence = {
  frameId: string;
  sourceVideo: string;
  responderId: string;
  sourceResponder: string;
  frameTimestampSeconds: number;
  timestampLabel: string;
  order: number;
  name: string;
  description: string;
  confidence: number;
  tags: string[];
  boxes: Array<{ x: number; y: number; width: number; height: number; label: string }>;
  imageUrl: string;
};

type RuntimeRecommendation = {
  id: string;
  order: number;
  title: string;
  reason: string;
  sourceTimestamp?: string;
  evidenceFrameIds: string[];
};

type RuntimeAnalysis = {
  incidentId: string;
  incidentTitle: string;
  summary: string;
  generatedFrom: string;
  evidence: RuntimeEvidence[];
  recommendations: RuntimeRecommendation[];
  decisionReviews?: DecisionReview[];
};

type StreamUiAnalysis = {
  generatedAt: string;
  generatedFrom: string;
  events: LiveEvent[];
  recommendations: LiveAnalysisOutput["recommendation"][];
};

type Gb10HealthStatus = "checking" | "online" | "offline" | "not-configured";

type Gb10HealthResponse = {
  configured: boolean;
  reachable: boolean;
  status: Exclude<Gb10HealthStatus, "checking">;
  checkedAt: string;
};

// opencode run "$(cat /tmp/1stsight-opencode-map-feature.md)"
type DispatchPreview = {
  incidentId: string;
  station: ReturnType<typeof nearestFireStation>;
  vehicleMarker: DeploymentMarker;
  progress: number;
  status: "idle" | "moving" | "arrived";
};

const statusTone = {
  "pending-review": "border-warning text-warning",
  approved: "border-success text-success",
  rejected: "border-destructive text-destructive",
  edited: "border-info text-info",
  selected: "border-foreground text-foreground",
};

const routeItems = [
  { href: "/", label: "Map" },
  { href: "/live", label: "Live Dashboard" },
  { href: "/bodycam", label: "Bodycam" },
  { href: "/review", label: "Post-Incident Review" },
];

const streamIncidentId = "stage-medical-assistance-stream";
const aarBriefingIncidentId = "woodlands-medical-responder-safety";
const punggolIncidentId = "punggol-residential-fire";
const aarBriefingIncidentIds = new Set([punggolIncidentId, aarBriefingIncidentId]);
const startupLiveAnalysisIntervalMs = 3000;
const steadyLiveAnalysisIntervalMs = 8000;

const heroImages = {
  // codex exec '$imagegen generate an operational command centre map hero background for a firefighter bodycam incident dashboard, Singapore urban grid at night, dark inset screen material, restrained emergency amber accents, no text, no logos, save as public/ai-images/ops-map-hero.png'
  map: "/ai-images/ops-map-hero.png",
  // codex exec '$imagegen generate a live responder bodycam operations background, three abstract video feeds, smoke and emergency lighting implied but not graphic, command dashboard mood, dark screen surface, no text, no logos, save as public/ai-images/live-feeds-hero.png'
  live: "/ai-images/live-feeds-hero.png",
  // codex exec '$imagegen generate a post incident evidence review background image, bodycam frame contact sheet aesthetic, subtle bounding box overlays, dark screen surface, warm paper interface accents, no text, no logos, save as public/ai-images/evidence-review-hero.png'
  review: "/ai-images/evidence-review-hero.png",
} as const;

const paperScope = "[--background:var(--paper)] [--border:oklch(82%_0.004_260)] [--card:var(--paper)] [--foreground:var(--paper-foreground)] [--muted:oklch(90%_0.003_260)] [--muted-foreground:oklch(39%_0.004_260)] [--secondary:oklch(90%_0.003_260)] [--disabled:oklch(88%_0.003_260)] [--disabled-foreground:oklch(48%_0.004_260)] [--disabled-border:oklch(76%_0.004_260)]";
const commandScope = "[--background:var(--command)] [--border:var(--command-border)] [--card:var(--command)] [--foreground:var(--command-foreground)] [--muted:oklch(29%_0.005_260)] [--muted-foreground:var(--command-muted-foreground)] [--secondary:oklch(29%_0.005_260)]";

const panelTone = {
  paper: cn(paperScope, "border-border bg-paper text-paper-foreground"),
  command: cn(commandScope, "border-command-border bg-command text-command-foreground"),
} as const;

const pageTextureTone = {
  map: "command-texture-map",
  live: "command-texture-live",
  review: "command-texture-review",
  neutral: "command-texture-neutral",
} as const;

type PageBackgroundKey = keyof typeof pageTextureTone;

function incidentHref(href: string, incidentId: string) {
  return `${href}?incident=${encodeURIComponent(incidentId)}`;
}

function getIncident(state: ScenarioState, incidentId: string) {
  return state.incidents.find((incident) => incident.id === incidentId) ?? state.incidents[0];
}

function getIncidentResponders(state: ScenarioState, incident: Incident) {
  const responderIds = new Set(incident.responderIds);
  return state.responders.filter((responder) => responderIds.has(responder.id));
}

function isPostFirePhase(incidentId: string, mode: LiveMode) {
  return incidentId === punggolIncidentId && (mode === "post-fire-loading" || mode === "post-fire");
}

function liveFeedSource(responder: Responder, postFirePhase: boolean) {
  return postFirePhase && responder.reviewVideoSrcs?.[0] ? responder.reviewVideoSrcs[0] : responder.videoSrc;
}

function OperationalBadge({ children, tone }: { children: ReactNode; tone?: keyof typeof statusTone }) {
  return (
    <Badge variant="outline" className={cn("rounded-sm font-mono text-[10px] uppercase tracking-widest", tone && statusTone[tone])}>
      {children}
    </Badge>
  );
}

function Gb10ReachabilityBadge() {
  const [status, setStatus] = useState<Gb10HealthStatus>("checking");

  useEffect(() => {
    let mounted = true;

    async function checkGb10() {
      try {
        const response = await fetch("/api/gb10/health", { cache: "no-store" });
        if (!response.ok) throw new Error("GB10 health check failed.");

        const health = (await response.json()) as Gb10HealthResponse;
        if (!mounted) return;
        setStatus(health.status);
      } catch {
        if (!mounted) return;
        setStatus("offline");
      }
    }

    void checkGb10();
    const intervalId = window.setInterval(() => void checkGb10(), 30000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const tone = status === "online" ? "approved" : status === "offline" ? "rejected" : "pending-review";
  const label = status === "online" ? "GB10 reachable" : status === "offline" ? "GB10 unreachable" : status === "not-configured" ? "GB10 not configured" : "GB10 checking";

  return <OperationalBadge tone={tone}>{label}</OperationalBadge>;
}

// opencode run "$(cat /tmp/1stsight-opencode-map-feature.md)"
function interpolatePosition(origin: DeploymentMarker["position"], target: DeploymentMarker["position"], progress: number) {
  return {
    lat: origin.lat + (target.lat - origin.lat) * progress,
    lng: origin.lng + (target.lng - origin.lng) * progress,
  };
}

function incidentMarkerLabel(incident: Incident | null) {
  if (!incident) return "Incident";
  return incident.type === "medical" ? "Medical incident" : "Fire incident";
}

function markerCategory(marker: DeploymentMarker, state: ScenarioState) {
  if (marker.kind === "unit") return marker.label.toLowerCase().includes("ambulance") ? "Ambulance" : "Firetruck";
  if (marker.kind === "incident") return incidentMarkerLabel(marker.incidentId ? getIncident(state, marker.incidentId) : null);
  if (marker.kind === "station") return "Fire station";
  return marker.kind;
}

function MapMarkerGlyph({ marker, selected, state }: { marker: DeploymentMarker; selected: boolean; state: ScenarioState }) {
  const linkedIncident = marker.incidentId ? getIncident(state, marker.incidentId) : null;
  const isAmbulance = marker.kind === "unit" && marker.label.toLowerCase().includes("ambulance");
  const markerPinClassName = cn(
    "absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-2/3 rotate-45 rounded-[50%_50%_50%_8px] border bg-screen shadow-[0_0_0_2px_color-mix(in_oklch,var(--color-screen),transparent_45%)] transition-colors",
    marker.kind === "station" && "border-info bg-info/15",
    marker.kind === "incident" && linkedIncident?.type === "medical" && "border-success bg-success/20",
    marker.kind === "incident" && linkedIncident?.type === "fire" && "border-warning bg-warning/20",
    marker.kind === "unit" && isAmbulance && "border-success bg-success",
    marker.kind === "unit" && !isAmbulance && "border-warning bg-warning",
  );
  const markerLabelClassName = cn(
    "relative z-10 -mt-1 font-mono text-[10px] font-semibold uppercase leading-none",
    marker.kind === "station" && "text-info",
    marker.kind === "incident" && linkedIncident?.type === "medical" && "text-success",
    marker.kind === "incident" && linkedIncident?.type === "fire" && "text-warning",
    marker.kind === "unit" && "text-background",
  );
  const glyph = marker.kind === "station" ? "FS" : marker.kind === "incident" ? linkedIncident?.type === "medical" ? "MI" : "FI" : isAmbulance ? "AM" : "FT";

  return (
    <span className={cn("relative grid size-11 place-items-center", selected && "rounded-full outline outline-2 outline-accent outline-offset-1")} aria-hidden="true">
      <span className={markerPinClassName} />
      <span className={markerLabelClassName}>{glyph}</span>
    </span>
  );
}

function Panel({ title, label, children, tone = "command", className }: { title: string; label?: string; children: ReactNode; tone?: keyof typeof panelTone; className?: string }) {
  return (
    <section className={cn("overflow-hidden rounded-[var(--radius-shell)] border", panelTone[tone], className)}>
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-4 py-2">
        <div>
          {label ? <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p> : null}
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function milestoneTone(status: IncidentMilestone["status"]) {
  if (status === "confirmed") return "border-success text-success";
  if (status === "pending") return "border-warning text-warning";
  return "border-disabled text-muted-foreground";
}

function milestoneSourceLabel(milestone: IncidentMilestone) {
  const source = milestone.sourceType === "dispatch-system" ? "system" : milestone.sourceType === "officer-entered" ? "officer" : "footage";
  return `${source} · ${milestone.sourceLabel}`;
}

function HeroImageBackdrop({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <Image src={src} alt={alt} fill priority unoptimized className="object-cover opacity-35" sizes="100vw" />
      <div className="absolute inset-0 bg-[color-mix(in_oklch,var(--card),transparent_14%)]" />
      <div className="absolute inset-0 deployment-grid opacity-20" />
    </div>
  );
}

function PageAmbientBackground({ background }: { background: PageBackgroundKey }) {
  return <div className={cn("command-texture pointer-events-none fixed inset-0 z-0 bg-background", pageTextureTone[background])} aria-hidden="true" />;
}

function incidentTags(tags: string[]) {
  return tags
    .map((tag) => tag.toLowerCase().replace(/-/g, " "))
    .map((tag) => {
      if (tag.includes("entry")) return "entry approach";
      if (tag.includes("responder safety")) return "responder safety";
      if (tag.includes("abuse")) return "abuse";
      if (tag.includes("strike")) return "strike";
      if (tag.includes("assault")) return "assault";
      if (tag.includes("physical")) return "physical contact";
      if (tag.includes("proximity")) return "unsafe proximity";
      if (tag.includes("crew")) return "crew intervention";
      if (tag.includes("smoke")) return "smoke spread";
      if (tag.includes("flame") || tag.includes("fire")) return "fire escalation";
      if (tag.includes("hazmat") || tag.includes("chemical") || tag.includes("gas")) return "hazmat";
      if (tag.includes("medical") || tag.includes("casualty") || tag.includes("ambulance")) return "medical";
      if (tag.includes("civil") || tag.includes("crowd")) return "civil";
      if (tag.includes("collapse") || tag.includes("blocked") || tag.includes("hazard")) return "hazard";
      if (tag.includes("hose") || tag.includes("firefighter") || tag.includes("responder")) return "ground operations";
      if (tag.includes("visibility")) return "visibility";
      return incidentLevelTags.has(tag) ? tag : "incident";
    })
    .filter((tag, index, values) => values.indexOf(tag) === index)
    .slice(0, 3);
}

function shortBoxLabel(label: string) {
  return label
    .replace(/\bconfidence\b:?\s*/gi, "")
    .replace(/\bbodycam\s+([a-z])\b/gi, "Firefighter $1")
    .replace(/\s+/g, " ")
    .trim();
}

function topEvidence(evidence: RuntimeEvidence[]) {
  const buckets = [
    /ground operations|entry approach|entry control/i,
    /fire escalation|smoke spread|fire response/i,
    /post-fire|welfare|sweep/i,
    /physical contact|impact|recovery|crew intervention|unsafe proximity|abuse|strike|assault/i,
  ];
  const selected: RuntimeEvidence[] = [];

  buckets.forEach((bucket) => {
    const item = evidence.find((candidate) => !selected.some((selectedItem) => selectedItem.frameId === candidate.frameId) && bucket.test(`${candidate.name} ${candidate.description} ${candidate.tags.join(" ")}`));

    if (item) selected.push(item);
  });

  evidence.forEach((item) => {
    if (selected.length >= 4) return;
    if (!selected.some((selectedItem) => selectedItem.frameId === item.frameId)) selected.push(item);
  });

  return selected;
}

function briefingEvidence(evidence: RuntimeEvidence[], selectedFrameIds: Set<string>) {
  return evidence.filter((item) => selectedFrameIds.has(item.frameId));
}

function cleanOperationalText(text: string) {
  return text
    .replace(new RegExp(`use as ${"context"} for[^.!?]*`, "gi"), "")
    .replace(/\b[Ff]rame\s+ff-[a-z]-[a-z0-9-]+\s+shows\s+/g, "")
    .replace(/\b[Ff]rame\s+shows\s+/g, "")
    .replace(/\bff-[a-z]-[a-z0-9-]+\b/g, "the selected frame")
    .replace(/\bevt-\d+\b/g, "the observed event")
    .replace(/\s+/g, " ")
    .trim();
}

function onePhrase(text: string) {
  return cleanOperationalText(text).split(/[.!?]/)[0]?.trim() || text;
}

function conciseReason(text: string) {
  const cleaned = cleanOperationalText(text);
  const sentences = cleaned.split(/[.!?]/).map((sentence) => sentence.trim()).filter(Boolean);

  return sentences.slice(0, 2).join(". ") || cleaned;
}

function eventCategory(event: { category?: string; title: string; evidence: string }) {
  if (event.category) return event.category.toLowerCase();
  const text = `${event.title} ${event.evidence}`;

  if (/hazmat|chemical|gas|spill/i.test(text)) return "hazmat";
  if (/casualty|ambulance|medical|injur/i.test(text)) return "medical";
  if (/civil|crowd|public order|evacuat/i.test(text)) return "civil";
  if (/fire|flame|smoke|burn|hose/i.test(text)) return "fire";
  if (/collapse|debris|blocked|entry|access/i.test(text)) return "hazard";

  return "incident";
}

function insetBox(box: { x: number; y: number; width: number; height: number; label: string }) {
  const inset = 2;
  const maxBoxSpan = 72;
  const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value * 10) / 10));
  const width = Math.min(clamp(box.width), maxBoxSpan);
  const height = Math.min(clamp(box.height), maxBoxSpan);
  const x = Math.min(100 - inset - width, Math.max(inset, clamp(box.x)));
  const y = Math.min(100 - inset - height, Math.max(inset, clamp(box.y)));

  return {
    ...box,
    x,
    y,
    width,
    height,
  };
}

const punggolFireDurationSeconds = 205.333;

const punggolMilestoneOffsets: Partial<Record<IncidentMilestone["id"], number>> = {
  "call-received": -20 * 60,
  dispatch: -18 * 60,
  acknowledge: -16 * 60,
  "move-out": -14 * 60,
  "arrive-at-scene": 0,
  "first-jet-out": 5,
  "ba-entry": 64,
  "post-fire-sweep": punggolFireDurationSeconds + 8,
  "welfare-check": punggolFireDurationSeconds + 18,
  "verbal-aggression": punggolFireDurationSeconds + 31,
  "physical-contact": punggolFireDurationSeconds + 37,
  "de-escalation-restraint": punggolFireDurationSeconds + 40,
  "police-support-notified": punggolFireDurationSeconds + 44,
};

function formatSessionClock(sessionStartMs: number, offsetSeconds: number) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(sessionStartMs + offsetSeconds * 1000));
}

function incidentEvidenceOffsetSeconds(item: Pick<RuntimeEvidence, "sourceVideo" | "frameTimestampSeconds">) {
  return item.sourceVideo.includes("punggol-post-fire") ? punggolFireDurationSeconds + item.frameTimestampSeconds : item.frameTimestampSeconds;
}

function applyRuntimeEvidenceClock<T extends RuntimeEvidence>(item: T, sessionStartMs: number | null): T {
  if (sessionStartMs === null) return item;
  return {
    ...item,
    timestampLabel: formatSessionClock(sessionStartMs, incidentEvidenceOffsetSeconds(item)),
  };
}

function applyRuntimeMilestoneClock(milestone: IncidentMilestone, incidentId: string, sessionStartMs: number | null): IncidentMilestone {
  if (incidentId !== punggolIncidentId || sessionStartMs === null || milestone.status !== "confirmed") return milestone;
  const offsetSeconds = punggolMilestoneOffsets[milestone.id];
  if (offsetSeconds === undefined) return milestone;
  return {
    ...milestone,
    timestamp: new Date(sessionStartMs + offsetSeconds * 1000).toISOString(),
    displayTime: formatSessionClock(sessionStartMs, offsetSeconds),
  };
}

function applyRuntimeRecommendationClock<T extends RuntimeRecommendation>(recommendation: T, evidence: RuntimeEvidence[]): T {
  const linkedEvidence = evidence.find((item) => recommendation.evidenceFrameIds.includes(item.frameId));
  return linkedEvidence ? { ...recommendation, sourceTimestamp: linkedEvidence.timestampLabel } : recommendation;
}

function timestampLabelSeconds(label: string) {
  const parts = label.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] ?? 0;
}

function evidenceFrameOffsetSeconds(frameId: string, timestampLabel: string) {
  const seconds = timestampLabelSeconds(timestampLabel);
  return frameId.includes("post-fire") ? punggolFireDurationSeconds + seconds : seconds;
}

function liveEventOffsetSeconds(event: Pick<LiveEvent, "timestamp" | "title" | "evidence" | "source">) {
  const seconds = timestampLabelSeconds(event.timestamp);
  const text = `${event.title} ${event.evidence} ${event.source}`.toLowerCase();
  return /post-fire|welfare|physical contact|shove|de-escalation|recovery|police|aggression/.test(text) ? punggolFireDurationSeconds + seconds : seconds;
}

function applyRuntimeLiveClock(analysis: LiveAnalysis, sessionStartMs: number | null, incidentId: string): LiveAnalysis {
  if (incidentId !== punggolIncidentId || sessionStartMs === null) return analysis;
  const events = analysis.events.map((event) => {
    const timestamp = formatSessionClock(sessionStartMs, liveEventOffsetSeconds(event));
    return {
      ...event,
      timestamp,
      source: event.source.replace(event.timestamp, timestamp),
    };
  });
  const recommendations = analysis.recommendations.map((recommendation) => {
    const offsetSeconds = evidenceFrameOffsetSeconds(recommendation.evidenceFrameId, recommendation.sourceTimestamp);
    return { ...recommendation, sourceTimestamp: formatSessionClock(sessionStartMs, offsetSeconds) };
  });
  return {
    ...analysis,
    events,
    recommendations,
    recommendation: {
      ...analysis.recommendation,
      sourceTimestamp: formatSessionClock(sessionStartMs, evidenceFrameOffsetSeconds(analysis.recommendation.evidenceFrameId, analysis.recommendation.sourceTimestamp)),
    },
  };
}

function useMountedSessionStart() {
  const [sessionStartMs, setSessionStartMs] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setSessionStartMs(Date.now()), 0);

    return () => window.clearTimeout(timer);
  }, []);

  return sessionStartMs;
}

function formatMountedSessionClock(sessionStartMs: number | null, offsetSeconds: number) {
  if (sessionStartMs === null) return "--:--";
  return formatSessionClock(sessionStartMs, offsetSeconds);
}

function streamAnalysis(session: StreamIncidentSession | null): StreamUiAnalysis | null {
  if (!session) return null;

  const events = session.events.map((event) => ({
    id: event.id,
    timestamp: event.timestamp,
    title: event.title,
    evidence: event.evidence,
    severity: event.severity,
    category: event.tags[0] ?? event.incidentType,
    source: `Bodycam ${event.bodycamSlotId}`,
    sourceResponder: event.bodycamDisplayName,
    reviewState: "system-created" as const,
    confidence: event.confidence,
    tags: event.tags,
    evidenceFrameId: event.bestEvidenceFrame.frameId,
    evidenceImageUrl: event.bestEvidenceFrame.imageUrl,
  })) satisfies LiveEvent[];

  const recommendations = session.events.flatMap((event) => {
    if (!event.recommendation) return [];

    return [{
      id: `${event.id}-recommendation`,
      title: event.recommendation.title,
      action: event.recommendation.action,
      reason: event.recommendation.reason,
      evidence: event.evidence,
      evidenceFrameId: event.bestEvidenceFrame.frameId,
      evidenceImageUrl: event.bestEvidenceFrame.imageUrl,
      sourceTimestamp: event.timestamp,
      reviewState: "system-created" as const,
      shouldRecommend: true,
    }];
  }) satisfies LiveAnalysisOutput["recommendation"][];

  return {
    generatedAt: session.events[0]?.timestamp ?? session.createdAt,
    generatedFrom: session.title,
    events,
    recommendations,
  };
}

function IncidentSelector({ state, selectedIncidentId, onIncidentChange }: { state: ScenarioState; selectedIncidentId: string; onIncidentChange: (incidentId: string) => void }) {
  const selectedIncident = getIncident(state, selectedIncidentId);
  const incidentOptions = state.incidents.map((incident) => ({
    label: `${incident.location} / ${incident.status}`,
    value: incident.id,
  }));

  return (
    <div className="flex min-w-[min(100%,22rem)] flex-col gap-1">
      <Select items={incidentOptions} value={selectedIncident.id} onValueChange={(incidentId) => incidentId && onIncidentChange(incidentId)}>
        <SelectTrigger size="default" className="h-9 w-full rounded-sm border-border bg-card font-mono text-xs uppercase tracking-widest text-foreground">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start" className="rounded-sm border-border font-mono text-xs uppercase tracking-widest">
          <SelectGroup>
            {incidentOptions.map((incident) => (
              <SelectItem key={incident.value} value={incident.value} className="rounded-sm">
                {incident.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

function AppShell({ state, selectedIncidentId, onIncidentChange, showSidebar = true, background = "neutral", fixedViewport = false, children }: { state: ScenarioState; selectedIncidentId: string; onIncidentChange: (incidentId: string) => void; showSidebar?: boolean; background?: PageBackgroundKey; fixedViewport?: boolean; children: ReactNode }) {
  const pathname = usePathname();

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.12, ease: "circOut" }}>
      <div className={cn("relative isolate bg-background text-foreground", fixedViewport ? "flex h-[100dvh] flex-col overflow-hidden" : "min-h-[100dvh]")}>
        <PageAmbientBackground background={background} />
        <header className={cn("sticky top-0 z-20 border-b border-command-border bg-background", fixedViewport && "shrink-0")}>
          <div className="mx-auto flex min-h-14 max-w-[1760px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-0">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid size-8 place-items-center border border-foreground bg-foreground text-background">
                <Activity aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">SCDF Ops Centre pilot workflow</p>
                <h1 className="truncate text-base font-semibold">1stSight command dashboard</h1>
              </div>
            </div>
            <nav className="flex flex-wrap items-center gap-2" aria-label="Operational flow">
              {routeItems.map((item) => {
                const active = item.href === "/" ? pathname === "/" || pathname === "/map" : pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={incidentHref(item.href, selectedIncidentId)}
                    className={cn(
                      "h-9 border px-3 py-2 font-mono text-xs uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      active ? "border-command-border bg-screen text-screen-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="flex items-end gap-3">
              <IncidentSelector state={state} selectedIncidentId={selectedIncidentId} onIncidentChange={onIncidentChange} />
            </div>
            <div className="hidden items-center gap-2 xl:flex">
              <Gb10ReachabilityBadge />
            </div>
          </div>
        </header>

        <div className={cn("relative z-10 mx-auto grid w-full max-w-[1760px] gap-4 p-4 sm:p-6", fixedViewport && "min-h-0 flex-1 overflow-hidden", showSidebar && "xl:grid-cols-[260px_minmax(0,1fr)]")}>
          {showSidebar ? <IncidentSidebar state={state} selectedIncidentId={selectedIncidentId} onIncidentChange={onIncidentChange} /> : null}
          <main className={cn("flex min-w-0 flex-col gap-4", fixedViewport && "h-full min-h-0 overflow-hidden")}>{children}</main>
        </div>
      </div>
    </MotionConfig>
  );
}

function IncidentSidebar({ state, selectedIncidentId, onIncidentChange }: { state: ScenarioState; selectedIncidentId: string; onIncidentChange: (incidentId: string) => void }) {
  const selectedIncident = getIncident(state, selectedIncidentId);

  return (
    <aside className="h-fit overflow-hidden rounded-[var(--radius-shell)] border border-border bg-card xl:sticky xl:top-20">
      <div className="border-b border-border p-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Incident</p>
        <h2 className="mt-1 text-lg font-semibold">{selectedIncident.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{selectedIncident.location}</p>
      </div>
      <div className="grid gap-px bg-border">
        {state.incidents.map((incident) => (
          <button key={incident.id} type="button" onClick={() => onIncidentChange(incident.id)} className={cn("bg-card p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50", incident.id === selectedIncidentId && "bg-muted")}> 
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{incident.title}</p>
              <OperationalBadge>{incident.severity}</OperationalBadge>
            </div>
            <p className="mt-2 font-mono text-xs text-muted-foreground">{incident.startTime} / {incident.location}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{incident.summary}</p>
          </button>
        ))}
      </div>
    </aside>
  );
}

function MarkerDetail({ marker, state, selectedIncidentId, dispatchPreview, onEnterDashboard }: { marker: DeploymentMarker; state: ScenarioState; selectedIncidentId: string; dispatchPreview: DispatchPreview | null; onEnterDashboard: (incidentId: string) => void }) {
  const linkedResponder = state.responders.find((responder) => responder.position.lat === marker.position.lat && responder.position.lng === marker.position.lng);
  const linkedIncident = marker.incidentId ? getIncident(state, marker.incidentId) : marker.kind === "incident" ? getIncident(state, selectedIncidentId) : null;
  const canEnterLinkedIncident = linkedIncident ? dispatchPreview?.incidentId === linkedIncident.id && dispatchPreview.status === "arrived" : false;

  return (
    <motion.aside initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} className={cn(paperScope, "absolute bottom-4 right-4 top-auto z-10 w-[min(420px,calc(100%-2rem))] border border-border bg-paper p-4 text-paper-foreground lg:bottom-6 lg:right-6")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{marker.kind}</p>
          <h2 className="mt-1 text-base font-semibold">{marker.label}</h2>
        </div>
        <OperationalBadge>{marker.status}</OperationalBadge>
      </div>
      <div className="mt-4 grid gap-px bg-border">
        <div className="bg-background p-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Coordinates</p>
          <p className="mt-1 font-mono text-xs">{marker.position.lat.toFixed(4)}, {marker.position.lng.toFixed(4)}</p>
        </div>
        {linkedResponder ? (
          <div className="bg-background p-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Responder feed</p>
            <p className="mt-1 text-sm">{linkedResponder.name}</p>
          </div>
        ) : null}
        {linkedIncident ? (
          <div className="bg-background p-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Incident state</p>
            <p className="mt-1 text-sm font-medium">{linkedIncident.title}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{linkedIncident.location}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{linkedIncident.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" className="rounded-sm" onClick={() => onEnterDashboard(linkedIncident.id)} disabled={!canEnterLinkedIncident}>{linkedIncident.status === "review" ? "Open review" : "Open live"}</Button>
              <OperationalBadge tone={canEnterLinkedIncident ? "approved" : "pending-review"}>{canEnterLinkedIncident ? "arrived" : "dispatch preview required"}</OperationalBadge>
            </div>
          </div>
        ) : null}
      </div>
    </motion.aside>
  );
}

function DeploymentMap({ state, selectedIncidentId, selectedMarker, dispatchPreview, onSelectMarker, onEnterDashboard }: { state: ScenarioState; selectedIncidentId: string; selectedMarker: DeploymentMarker | null; dispatchPreview: DispatchPreview | null; onSelectMarker: (marker: DeploymentMarker) => void; onEnterDashboard: (incidentId: string) => void }) {
  const [mapsConfig, setMapsConfig] = useState<{ googleMapsApiKey: string } | null>(null);
  const [mapsLoadError, setMapsLoadError] = useState<string | null>(null);
  const apiKey = mapsConfig?.googleMapsApiKey ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  // AdvancedMarker basic usage: https://github.com/visgl/react-google-maps/blob/main/README.md
  const mapId = "DEMO_MAP_ID";
  const center = state.deploymentMarkers.find((marker) => marker.incidentId === selectedIncidentId)?.position ?? state.deploymentMarkers[0].position;
  const visibleMarkers = dispatchPreview ? [...state.deploymentMarkers, dispatchPreview.vehicleMarker] : state.deploymentMarkers;

  // APIProvider onError: https://visgl.github.io/react-google-maps/docs/api-reference/components/api-provider
  const handleMapsLoadError = useCallback((error: unknown) => {
    console.error("Google Maps API Error:", error);
    setMapsLoadError(error instanceof Error ? error.message : "Google Maps API failed to load.");
  }, []);

  useEffect(() => {
    let mounted = true;

    void fetch("/api/public-config", { cache: "no-store" })
      .then((response) => response.json())
      .then((config: { googleMapsApiKey?: string }) => {
        if (!mounted) return;
        setMapsConfig({ googleMapsApiKey: config.googleMapsApiKey ?? "" });
      })
      .catch(() => {
        if (!mounted) return;
        setMapsConfig({ googleMapsApiKey: "" });
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (!apiKey || mapsLoadError) {
    return (
      <div className="relative h-full min-h-0 overflow-hidden bg-screen p-4 text-screen-foreground">
        <div className="absolute inset-0 deployment-grid opacity-30" />
        <div className="relative flex h-full min-h-0 flex-col justify-between overflow-auto border border-screen-border bg-screen/90 p-4">
          <div className="font-mono text-xs uppercase tracking-widest text-screen-foreground/60">Map fallback, select an incident marker to preview dispatch</div>
          {mapsLoadError ? <div className="border border-destructive bg-destructive/10 p-3 text-sm text-destructive">Google Maps did not load. Check the browser console for the Google Maps API error code.</div> : null}
          {dispatchPreview ? (
            <div className="border border-accent bg-accent/10 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-screen-foreground/60">Dispatch movement</p>
                  <p className="text-sm font-medium">{dispatchPreview.station.name} to {getIncident(state, dispatchPreview.incidentId).location}</p>
                </div>
                <OperationalBadge tone={dispatchPreview.status === "arrived" ? "approved" : "pending-review"}>{Math.round(dispatchPreview.progress * 100)}%</OperationalBadge>
              </div>
              <div className="mt-3 h-2 border border-screen-border bg-black/35">
                <div className="h-full bg-accent" style={{ width: `${Math.round(dispatchPreview.progress * 100)}%` }} />
              </div>
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3">
            {visibleMarkers.map((marker) => (
              <button key={marker.id} type="button" onClick={() => onSelectMarker(marker)} className={cn("border border-screen-border bg-black/35 p-3 text-left transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50", marker.incidentId === selectedIncidentId && "border-accent")}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-screen-foreground/55">{markerCategory(marker, state)}</p>
                    <p className="text-sm font-medium">{marker.label}</p>
                  </div>
                  <MapMarkerGlyph marker={marker} selected={selectedMarker?.id === marker.id} state={state} />
                </div>
                <p className="mt-2 font-mono text-xs text-screen-foreground/55">{marker.position.lat.toFixed(4)}, {marker.position.lng.toFixed(4)}</p>
                <div className="mt-2"><OperationalBadge>{marker.status}</OperationalBadge></div>
              </button>
            ))}
          </div>
          <AnimatePresence>{selectedMarker ? <MarkerDetail marker={selectedMarker} state={state} selectedIncidentId={selectedIncidentId} dispatchPreview={dispatchPreview} onEnterDashboard={onEnterDashboard} /> : null}</AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-0 flex-1 border-b border-border">
      <APIProvider apiKey={apiKey} onError={handleMapsLoadError}>
        <Map className="h-full min-h-0" defaultCenter={center} defaultZoom={14} gestureHandling="greedy" disableDefaultUI colorScheme="DARK" mapId={mapId}>
          {visibleMarkers.map((marker) => (
            <AdvancedMarker key={marker.id} position={marker.position} title={`${markerCategory(marker, state)}: ${marker.label}, ${marker.status}`} onClick={() => onSelectMarker(marker)}>
              <MapMarkerGlyph marker={marker} selected={selectedMarker?.id === marker.id} state={state} />
            </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>
      <AnimatePresence>{selectedMarker ? <MarkerDetail marker={selectedMarker} state={state} selectedIncidentId={selectedIncidentId} dispatchPreview={dispatchPreview} onEnterDashboard={onEnterDashboard} /> : null}</AnimatePresence>
    </div>
  );
}

type StreamBodycam = StreamIncidentSession["bodycams"][number];

type StreamWebRtcCandidate = {
  seq: number;
  candidate: RTCIceCandidateInit;
};

type StreamLiveRelayFrame = NonNullable<StreamBodycam["liveRelayFrame"]>;

function isNewerRelayFrame(next: StreamLiveRelayFrame, previous?: StreamLiveRelayFrame) {
  if (!previous) return true;
  return Date.parse(next.capturedAt) > Date.parse(previous.capturedAt);
}

async function postOpsWebRtcCandidate(bodycamId: string, candidate: RTCIceCandidateInit) {
  await fetch("/api/stream/webrtc/candidates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bodycamId, source: "ops", candidate }),
  });
}

function StreamBodycamSlot({ slot, bodycam }: { slot: number; bodycam?: StreamBodycam }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const candidateSeqRef = useRef(0);
  const relayFrameRef = useRef<StreamLiveRelayFrame | undefined>(bodycam?.liveRelayFrame);
  const relayStatsRef = useRef({ startedAtMs: 0, count: 0, capturedAt: "" });
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState("waiting");
  const [directRelayFrame, setDirectRelayFrame] = useState<StreamLiveRelayFrame | undefined>(bodycam?.liveRelayFrame);
  const [relayFps, setRelayFps] = useState<number | null>(null);
  const bodycamId = bodycam?.id;

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    if (!bodycamId || connectionState === "connected") return;

    let active = true;
    const activeBodycamId = bodycamId;
    relayStatsRef.current = { startedAtMs: performance.now(), count: 0, capturedAt: relayFrameRef.current?.capturedAt ?? "" };

    function recordRelayFrame(frame: StreamLiveRelayFrame) {
      if (frame.capturedAt === relayStatsRef.current.capturedAt) return;

      const now = performance.now();
      const elapsedMs = now - relayStatsRef.current.startedAtMs;
      const count = relayStatsRef.current.count + 1;
      relayStatsRef.current = { ...relayStatsRef.current, count, capturedAt: frame.capturedAt };

      if (elapsedMs >= 1000) {
        setRelayFps(Math.round((count * 1000) / elapsedMs));
        relayStatsRef.current = { startedAtMs: now, count: 0, capturedAt: frame.capturedAt };
      }
    }

    async function refreshRelayFrame() {
      const response = await fetch(`/api/stream/frame?bodycamId=${encodeURIComponent(activeBodycamId)}`, { cache: "no-store" });
      if (!active || !response.ok) return;

      const result = await response.json().catch(() => ({})) as { frame?: StreamLiveRelayFrame | null };
      if (!result.frame) return;

      const frame = result.frame as StreamLiveRelayFrame;
      if (!isNewerRelayFrame(frame, relayFrameRef.current)) return;

      relayFrameRef.current = frame;
      recordRelayFrame(frame);
      setDirectRelayFrame(frame);
    }

    void refreshRelayFrame();
    const relayPoll = window.setInterval(() => void refreshRelayFrame(), liveRelayFrameIntervalMs);

    return () => {
      active = false;
      window.clearInterval(relayPoll);
    };
  }, [bodycamId, connectionState]);

  useEffect(() => {
    if (!bodycamId) return;

    const activeBodycamId = bodycamId;
    let active = true;
    let offerPoll: number | null = null;
    let candidatePoll: number | null = null;
    const peerConnection = new RTCPeerConnection(browserRtcConfiguration());
    peerConnectionRef.current = peerConnection;
    candidateSeqRef.current = 0;
    window.setTimeout(() => {
      if (active) setConnectionState("connecting");
    }, 0);

    peerConnection.addEventListener("track", (event) => {
      if (!active) return;
      setRemoteStream(event.streams[0] ?? new MediaStream([event.track]));
    });
    peerConnection.addEventListener("icecandidate", (event) => {
      if (event.candidate) void postOpsWebRtcCandidate(activeBodycamId, event.candidate.toJSON());
    });
    peerConnection.addEventListener("connectionstatechange", () => {
      if (!active) return;
      setConnectionState(peerConnection.connectionState);
      if (["closed", "disconnected", "failed"].includes(peerConnection.connectionState)) setRemoteStream(null);
    });

    async function pollBodycamCandidates() {
      const response = await fetch(`/api/stream/webrtc/candidates?bodycamId=${encodeURIComponent(activeBodycamId)}&source=bodycam&afterSeq=${candidateSeqRef.current}`, { cache: "no-store" });
      if (!response.ok) return;

      const result = await response.json() as { candidates?: StreamWebRtcCandidate[] };
      for (const item of result.candidates ?? []) {
        candidateSeqRef.current = Math.max(candidateSeqRef.current, item.seq);
        await peerConnection.addIceCandidate(item.candidate).catch(() => null);
      }
    }

    async function connectFromOffer() {
      const response = await fetch(`/api/stream/webrtc/offer?bodycamId=${encodeURIComponent(activeBodycamId)}`, { cache: "no-store" });
      if (!active || !response.ok) return false;

      const result = await response.json() as { offer?: RTCSessionDescriptionInit | null };
      if (!result.offer || peerConnection.signalingState === "closed") return false;

      await peerConnection.setRemoteDescription(result.offer);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      await fetch("/api/stream/webrtc/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bodycamId: activeBodycamId, answer }),
      });
      setConnectionState("answer sent");
      return true;
    }

    offerPoll = window.setInterval(async () => {
      if (peerConnection.remoteDescription || peerConnection.signalingState === "closed") return;
      const connected = await connectFromOffer().catch(() => false);
      if (connected && offerPoll !== null) {
        window.clearInterval(offerPoll);
        offerPoll = null;
      }
    }, 1000);
    void connectFromOffer().catch(() => false);

    candidatePoll = window.setInterval(() => {
      if (peerConnection.remoteDescription && peerConnection.signalingState !== "closed") void pollBodycamCandidates();
    }, 1000);

    return () => {
      active = false;
      if (offerPoll !== null) window.clearInterval(offerPoll);
      if (candidatePoll !== null) window.clearInterval(candidatePoll);
      peerConnection.close();
      peerConnectionRef.current = null;
      setRemoteStream(null);
    };
  }, [bodycamId]);

  const hasWebRtcVideo = Boolean(remoteStream && connectionState === "connected");
  const liveRelayFrame = directRelayFrame ?? bodycam?.liveRelayFrame;
  const analyzedEvidenceFrame = bodycam?.previewDataUrl;
  const relayCapturedAtMs = liveRelayFrame ? Date.parse(liveRelayFrame.capturedAt) : Number.NaN;
  const relayFpsLabel = relayFps === null ? "measuring fps" : `${relayFps} fps actual`;
  const relayLabel = Number.isFinite(relayCapturedAtMs) ? `Live feed relay ${new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(relayCapturedAtMs))} · ${relayFpsLabel}` : `Live feed relay · ${relayFpsLabel}`;
  const sourceFrameLabel = `Current source frame · ${bodycam?.displayName ?? `Bodycam ${slot}`}`;

  return (
    <div className="min-h-52 bg-screen text-screen-foreground">
      <div className="flex items-center justify-between border-b border-screen-border px-3 py-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-screen-foreground/60">Bodycam {slot}</p>
          <p className="text-sm font-medium">{bodycam?.displayName ?? "Awaiting responder"}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-screen-foreground/60">{hasWebRtcVideo ? "live source feed" : liveRelayFrame ? "source feed relay" : analyzedEvidenceFrame ? "current source frame" : bodycam?.locationStatus ?? "open"}</span>
          <span className={cn("size-2 border", bodycam ? "live-dot border-success bg-success" : "border-screen-foreground/40")} />
        </div>
      </div>
      {bodycam ? (
        <div className="relative aspect-video bg-black">
          <video ref={videoRef} autoPlay playsInline muted className={cn("h-full w-full object-cover", hasWebRtcVideo ? "block" : "hidden")} />
          {!hasWebRtcVideo && liveRelayFrame ? <Image src={liveRelayFrame.imageUrl} alt={`${bodycam.displayName} live feed relay frame`} fill unoptimized className="object-cover" sizes="(min-width: 768px) 50vw, 100vw" /> : null}
          {!hasWebRtcVideo && !liveRelayFrame && analyzedEvidenceFrame ? <Image src={analyzedEvidenceFrame} alt={`${bodycam.displayName} latest analyzed evidence frame`} fill unoptimized className="object-cover opacity-80" sizes="(min-width: 768px) 50vw, 100vw" /> : null}
          {!hasWebRtcVideo && !liveRelayFrame && !analyzedEvidenceFrame ? (
            <div className="grid h-full place-items-center bg-black/60 p-4 text-center font-mono text-xs uppercase tracking-widest text-screen-foreground/45">
              Waiting for feed to connect
            </div>
          ) : null}
          {!hasWebRtcVideo && liveRelayFrame ? <div className="absolute bottom-2 left-2 border border-screen-border bg-black/70 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-screen-foreground/75">{relayLabel}</div> : null}
          {!hasWebRtcVideo && !liveRelayFrame && analyzedEvidenceFrame ? <div className="absolute bottom-2 left-2 border border-warning/70 bg-black/70 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-warning">{sourceFrameLabel}</div> : null}
        </div>
      ) : (
        <div className="grid aspect-video place-items-center bg-black/60 p-4 text-center font-mono text-xs uppercase tracking-widest text-screen-foreground/45">
          Open bodycam route to connect
        </div>
      )}
      <div className="border-t border-screen-border px-3 py-2 text-xs text-screen-foreground/65">
        {hasWebRtcVideo ? `Current source feed ${connectionState}` : liveRelayFrame ? relayLabel : analyzedEvidenceFrame ? "Evidence window using the latest source frame" : connectionState === "waiting" ? "Waiting for feed to connect" : `Current source feed ${connectionState}; waiting for feed relay`}
      </div>
    </div>
  );
}

function BodycamGrid({ incident, responders, mode, playing, activeAudioResponderId, onAudioChange, onPunggolFireEnded, onPostFireReady, videoRefs, streamSession, liveCue }: { incident: Incident; responders: Responder[]; mode: LiveMode; playing: boolean; activeAudioResponderId: string | null; onAudioChange: (responderId: string | null) => void; onPunggolFireEnded: () => void; onPostFireReady: () => void; videoRefs: MutableRefObject<Record<string, HTMLVideoElement | null>>; streamSession?: StreamIncidentSession | null; liveCue: { responderId: string; timestampSeconds: number } }) {
  const isPunggolPostFirePhase = isPostFirePhase(incident.id, mode);
  const isPunggolFirePhase = incident.id === punggolIncidentId && mode !== "post-fire-loading" && mode !== "post-fire";

  useEffect(() => {
    const readyListeners: Array<{ video: HTMLVideoElement; listener: () => void }> = [];
    let readinessTimer: number | null = null;
    let postFireStarted = false;
    const postFireVideos: HTMLVideoElement[] = [];
    const expectedPostFireVideoCount = mode === "post-fire-loading" ? responders.filter((responder) => responder.reviewVideoSrcs?.length).length : 0;

    const postFireReady = () => postFireVideos.length === expectedPostFireVideoCount && postFireVideos.length > 0 && postFireVideos.every((video) => video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA);
    const startPostFirePlayback = () => {
      if (mode !== "post-fire-loading" || postFireStarted || !postFireReady()) return;
      postFireStarted = true;
      postFireVideos.forEach((video) => {
        video.pause();
        video.currentTime = 0;
      });
      postFireVideos.forEach((video) => void video.play());
      onPostFireReady();
    };

    responders.forEach((responder) => {
      const video = videoRefs.current[responder.id];
      if (!video) return;

      video.muted = mode === "post-fire-loading" || activeAudioResponderId !== responder.id;
      if (mode === "escalation" && responder.id === liveCue.responderId) video.currentTime = liveCue.timestampSeconds;

      if (isPunggolPostFirePhase && responder.reviewVideoSrcs?.length) {
        postFireVideos.push(video);
        if (video.dataset.postFirePrepared !== "true") {
          video.currentTime = 0;
          video.dataset.postFirePrepared = "true";
        }
        if (video.currentTime > 44) video.currentTime = 0;
        if (video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) video.load();
      } else {
        delete video.dataset.postFirePrepared;
      }

      if (!playing) {
        video.pause();
        return;
      }

      if (mode === "post-fire-loading") {
        video.pause();
        return;
      }

      const playWhenReady = () => void video.play();
      if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        playWhenReady();
      } else {
        video.addEventListener("canplay", playWhenReady, { once: true });
        readyListeners.push({ video, listener: playWhenReady });
      }
    });

    if (mode === "post-fire-loading") {
      postFireVideos.forEach((video) => video.pause());
      readinessTimer = window.setInterval(startPostFirePlayback, 50);
      if (postFireReady()) {
        window.setTimeout(startPostFirePlayback, 0);
      } else {
        postFireVideos.forEach((video) => {
          if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return;
          video.addEventListener("canplay", startPostFirePlayback, { once: true });
          readyListeners.push({ video, listener: startPostFirePlayback });
        });
      }
    }

    return () => {
      if (readinessTimer !== null) window.clearInterval(readinessTimer);
      readyListeners.forEach(({ video, listener }) => video.removeEventListener("canplay", listener));
    };
  }, [activeAudioResponderId, isPunggolPostFirePhase, liveCue.responderId, liveCue.timestampSeconds, mode, onPostFireReady, playing, responders, videoRefs]);

  if (incident.id === streamIncidentId) {
    return (
      <div className="grid gap-px bg-border md:grid-cols-2">
        {[1, 2, 3, 4].map((slot) => {
          const bodycam = streamSession?.bodycams.find((item) => item.slotId === slot && item.status === "connected");
          return <StreamBodycamSlot key={bodycam?.id ?? `open-${slot}`} slot={slot} bodycam={bodycam} />;
        })}
      </div>
    );
  }

  function handleFeedEnded(responderId: string) {
    if (isPunggolFirePhase && responderId === "ff-b") onPunggolFireEnded();
  }

  function selectAudioFeed(responderId: string) {
    onAudioChange(responderId);
    Object.entries(videoRefs.current).forEach(([videoResponderId, video]) => {
      if (!video) return;
      video.muted = true;
      if (videoResponderId !== responderId) return;
      if (!playing || mode === "post-fire-loading") {
        video.muted = false;
        return;
      }
      void video.play().then(() => {
        video.muted = false;
      }).catch(() => {
        video.muted = false;
      });
    });
  }

  function renderFeed(responder: ScenarioState["responders"][number]) {
    if (isPunggolPostFirePhase && !responder.reviewVideoSrcs?.length) {
      return (
        <div key={responder.id} className="min-w-0 bg-screen text-left text-screen-foreground">
          <div className="flex items-center justify-between border-b border-screen-border px-3 py-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-screen-foreground/60">{responder.feedLabel}</p>
              <p className="text-sm font-medium">{responder.name}</p>
            </div>
            <span className="size-2 border border-screen-foreground/30" />
          </div>
          <div className="grid aspect-video place-items-center bg-black/60 p-4 text-center font-mono text-xs uppercase tracking-widest text-screen-foreground/45">
            {responder.unavailableNote ?? "Not attached to current phase"}
          </div>
        </div>
      );
    }

    const videoSrc = liveFeedSource(responder, isPunggolPostFirePhase);

    return (
      <button key={responder.id} type="button" onClick={() => selectAudioFeed(responder.id)} className="relative min-w-0 bg-screen text-left text-screen-foreground transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <div className="flex items-center justify-between border-b border-screen-border px-3 py-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-screen-foreground/60">{responder.feedLabel}</p>
            <p className="text-sm font-medium">{responder.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-screen-foreground/60">{activeAudioResponderId === responder.id ? "audio" : "muted"}</span>
            <span className={cn("size-2 border", playing ? "live-dot border-success bg-success" : "border-screen-foreground/40")} />
          </div>
        </div>
        <div className="relative aspect-video bg-black">
          <video
            key={videoSrc}
            ref={(node) => {
              videoRefs.current[responder.id] = node;
            }}
            src={videoSrc}
            muted={mode === "post-fire-loading" || activeAudioResponderId !== responder.id}
            loop={!isPunggolFirePhase}
            onEnded={() => handleFeedEnded(responder.id)}
            onLoadedMetadata={(event) => {
              if (mode === "post-fire-loading") event.currentTarget.currentTime = 0;
            }}
            playsInline
            className="aspect-video w-full bg-black object-cover"
          />
          {mode === "post-fire-loading" ? (
            <div className="absolute inset-0 grid place-items-center bg-black font-mono text-xs uppercase tracking-widest text-screen-foreground/55">
              Loading post-fire POV
            </div>
          ) : null}
        </div>
      </button>
    );
  }

  return (
    <div className="grid gap-px bg-border md:grid-cols-2">
      {responders.length ? responders.map((responder) => renderFeed(responder)) : (
        <div className="min-h-72 bg-screen p-4 text-screen-foreground md:col-span-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-screen-foreground/60">No footage</p>
          <p className="mt-2 text-sm font-medium">{incident.title}</p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-screen-foreground/70">{incident.unavailableReason ?? "No responder video has been attached to this incident."}</p>
        </div>
      )}
      {!isPunggolPostFirePhase ? <div className="min-h-52 bg-screen text-screen-foreground">
        <div className="flex items-center justify-between border-b border-screen-border px-3 py-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-screen-foreground/60">Reserve feed</p>
            <p className="text-sm font-medium">Unassigned</p>
          </div>
          <span className="size-2 border border-screen-foreground/30" />
        </div>
        <div className="grid aspect-video place-items-center bg-black/60 font-mono text-xs uppercase tracking-widest text-screen-foreground/45">
          Empty feed slot
        </div>
      </div> : null}
    </div>
  );
}

function EventLog({ analysis, isAnalyzing, responders }: { analysis: LiveAnalysis | StreamUiAnalysis | null; isAnalyzing?: boolean; responders?: Responder[] }) {
  const events = analysis?.events ?? [];
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const latestEventKey = events.map((event) => event.id).join("|");

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller || events.length === 0) return;
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
  }, [events.length, latestEventKey]);

  if (events.length === 0) {
    return (
      <div className="bg-card p-3">
        <div className="border border-screen-border bg-screen p-3 text-screen-foreground">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Scanning current feeds</p>
              <p className="mt-1 text-xs leading-relaxed text-screen-foreground/65">Supported events appear here when current frames show operational changes.</p>
            </div>
            <span className={cn("size-2 border", isAnalyzing ? "live-dot border-accent bg-accent" : "border-screen-foreground/40")} />
          </div>
          {responders?.length ? (
            <div className="mt-3 grid gap-px bg-screen-border">
              {responders.map((responder) => (
                <div key={responder.id} className="flex items-center justify-between gap-3 bg-black/35 px-2 py-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-screen-foreground/65">{responder.feedLabel}</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-screen-foreground/55">{isAnalyzing ? "analyzing" : "queued"}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="max-h-[280px] overflow-y-auto bg-border">
      {events.map((event) => {
        const boxes = event.boxes?.slice(0, 3).map(insetBox) ?? [];

        return (
          <div key={event.id} className="border-b border-border bg-card px-3 py-2 last:border-b-0">
            <div className="grid min-w-0 gap-3 border border-warning/60 bg-warning/10 p-3 sm:grid-cols-[112px_1fr]">
              {event.evidenceImageUrl ? (
                <div className="relative aspect-video overflow-hidden bg-screen">
                  <Image src={event.evidenceImageUrl} alt={conciseReason(event.evidence)} fill unoptimized className="object-cover" sizes="112px" />
                  {boxes.map((box, boxIndex) => (
                    <div key={`${event.id}-${box.label}-${boxIndex}`} className="absolute border border-warning bg-warning/15" style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.width}%`, height: `${box.height}%` }} />
                  ))}
                </div>
              ) : null}
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold leading-snug">{onePhrase(event.title)}</p>
                  <OperationalBadge tone="pending-review">{eventCategory(event)}</OperationalBadge>
                </div>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{event.sourceResponder || event.source}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{conciseReason(event.evidence)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecommendationReview({ analysis, incidentId }: { analysis: LiveAnalysis | StreamUiAnalysis | null; incidentId: string }) {
  const recommendations = analysis?.recommendations ?? [];
  const [decisions, setDecisions] = useState<Record<string, DecisionReview>>({});
  const [isReviewPending, startReviewTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const latestRecommendationKey = recommendations.map((recommendation) => recommendation.id).join("|");

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller || recommendations.length === 0) return;
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
  }, [recommendations.length, latestRecommendationKey]);

  function review(recommendation: LiveAnalysisOutput["recommendation"], decisionValue: "approved" | "rejected") {
    startReviewTransition(async () => {
      const response = await fetch("/api/recommendation-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: decisionValue,
          incidentId,
          recommendation: {
            id: recommendation.id,
            title: recommendation.title,
            reason: onePhrase(recommendation.reason),
            evidence: onePhrase(recommendation.evidence),
            sourceTimestamp: recommendation?.sourceTimestamp ?? analysis?.generatedAt ?? "live analysis",
          },
        }),
      });
      const result = (await response.json()) as DecisionReview;
      setDecisions((current) => ({ ...current, [recommendation.id]: result }));
    });
  }

  return (
    <Panel title="Recommendations" label="Officer review">
      <div ref={scrollRef} className="max-h-[360px] overflow-y-auto bg-border">
        {recommendations.length ? recommendations.map((recommendation) => {
          const decision = decisions[recommendation.id];

          return (
            <div key={recommendation.id} className={cn("grid gap-3 border-b border-border bg-card p-3 last:border-b-0 sm:grid-cols-[104px_1fr]", decision && "bg-muted/45")}>
              {recommendation.evidenceImageUrl ? (
                <div className="relative aspect-video overflow-hidden bg-screen">
                  <Image src={recommendation.evidenceImageUrl} alt={onePhrase(recommendation.evidence)} fill unoptimized className="object-cover" sizes="104px" />
                </div>
              ) : null}
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug">{onePhrase(recommendation.title)}</p>
                    {recommendation.sourceTimestamp ? <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Observed {recommendation.sourceTimestamp}</p> : null}
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{onePhrase(recommendation.reason)}</p>
                  </div>
                  {decision ? <OperationalBadge tone={decision.decision}>{decision.decision}</OperationalBadge> : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" className="rounded-sm" onClick={() => review(recommendation, "approved")} disabled={isReviewPending}>
                    <Check data-icon="inline-start" />
                    Mark for GC
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-sm" onClick={() => review(recommendation, "rejected")} disabled={isReviewPending}>
                    Hold
                  </Button>
                </div>
                <DecisionResult decision={decision ?? null} />
              </div>
            </div>
          );
        }) : (
          <div className="bg-card p-3 text-sm text-muted-foreground">No supported C&C action in the current event stream.</div>
        )}
      </div>
    </Panel>
  );
}

function decisionLabel(decision: DecisionReview["decision"]) {
  if (decision === "approved") return "Marked for GC consideration";
  if (decision === "rejected") return "Held from GC summary";
  return "Edited by Ops Centre";
}

function timelineTone(kind: "system" | "footage" | "ai" | "recommendation" | "officer" | "pending", decision?: DecisionReview["decision"]) {
  if (kind === "pending") return "border-warning text-warning";
  if (kind === "officer") return decision === "approved" ? "border-success text-success" : decision === "rejected" ? "border-destructive text-destructive" : "border-info text-info";
  if (kind === "ai" || kind === "recommendation") return "border-accent text-accent";
  return "border-screen-foreground/55 text-screen-foreground/75";
}

function timelineClockMinutes(label: string) {
  const parts = label.trim().match(/(\d{1,2}):(\d{2})\s*([AP]M)?/i);
  if (!parts) return Number.MAX_SAFE_INTEGER;
  let hour = Number(parts[1]);
  const minute = Number(parts[2]);
  const period = parts[3]?.toUpperCase();
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function timelineDecisionMinutes(timestamp: string) {
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return timelineClockMinutes(timestamp);
  const date = new Date(parsed);
  return date.getHours() * 60 + date.getMinutes();
}

function UnifiedIncidentTimeline({ incident, evidence, highlightedEvidenceIds, recommendations, decisionReviews, isAnalyzing, canRunReviewAnalysis, emptyMessage }: { incident: Incident; evidence: RuntimeEvidence[]; highlightedEvidenceIds: Set<string>; recommendations: RuntimeRecommendation[]; decisionReviews: DecisionReview[]; isAnalyzing: boolean; canRunReviewAnalysis: boolean; emptyMessage: string }) {
  const evidenceByFrameId = new globalThis.Map(evidence.map((item) => [item.frameId, item]));
  const confirmedMilestones = incident.milestones.filter((milestone) => milestone.status === "confirmed");
  const pendingMilestones = incident.milestones.filter((milestone) => milestone.status === "pending");
  const visibleRecommendations = recommendations.filter((recommendation) => recommendation.evidenceFrameIds.length === 0 || recommendation.evidenceFrameIds.some((frameId) => evidenceByFrameId.has(frameId)));
  const pendingLabels = pendingMilestones.map((milestone) => milestone.label).join(" / ");
  const timelineEntries = [
    ...confirmedMilestones.map((milestone, index) => ({ kind: "milestone" as const, key: `milestone-${milestone.id}`, sort: timelineClockMinutes(milestone.displayTime) * 1000 + index, milestone })),
    ...evidence.map((item, index) => ({ kind: "evidence" as const, key: `evidence-${item.frameId}-${index}`, sort: timelineClockMinutes(item.timestampLabel) * 1000 + 300 + index, item })),
    ...visibleRecommendations.map((recommendation, index) => {
      const linkedEvidence = recommendation.evidenceFrameIds.flatMap((frameId) => {
        const item = evidenceByFrameId.get(frameId);
        return item ? [item] : [];
      });
      const sourceTime = linkedEvidence[0]?.timestampLabel ?? recommendation.sourceTimestamp ?? "Review";
      return { kind: "recommendation" as const, key: `recommendation-${recommendation.id}`, sort: timelineClockMinutes(sourceTime) * 1000 + 600 + index, recommendation, linkedEvidence };
    }),
    ...decisionReviews.map((decision, index) => ({ kind: "decision" as const, key: `decision-${decision.id}`, sort: timelineDecisionMinutes(decision.timestamp) * 1000 + 800 + index, decision })),
  ].sort((a, b) => a.sort - b.sort);
  const entriesCount = timelineEntries.length + (pendingMilestones.length ? 1 : 0);

  return (
    <div className="bg-screen p-4 text-screen-foreground">
      <div className="mb-4 flex flex-wrap gap-2">
        <OperationalBadge>{confirmedMilestones.length} confirmed</OperationalBadge>
        <OperationalBadge>{evidence.length} evidence</OperationalBadge>
        {decisionReviews.length ? <OperationalBadge tone="approved">{decisionReviews.length} officer reviewed</OperationalBadge> : null}
        {pendingMilestones.length ? <OperationalBadge tone="pending-review">{pendingMilestones.length} pending</OperationalBadge> : null}
      </div>

      {entriesCount === 0 ? (
        <div className="border border-screen-border bg-black/35 p-4 text-sm text-screen-foreground/65">
          {canRunReviewAnalysis && isAnalyzing ? "Analyzing current feeds." : emptyMessage}
        </div>
      ) : (
        <Timeline defaultValue={entriesCount} className="max-w-none gap-0">
          {timelineEntries.map((entry, index) => {
            const step = index + 1;

            if (entry.kind === "milestone") {
              const milestone = entry.milestone;
              return (
                <TimelineItem key={entry.key} step={step} className="sm:group-data-[orientation=vertical]/timeline:ms-40 group-data-[orientation=vertical]/timeline:not-last:pb-5">
                  <TimelineHeader>
                    <TimelineSeparator className="bg-screen-foreground/25 group-data-completed/timeline-item:bg-accent" />
                    <TimelineDate className="font-mono text-screen-foreground/75 sm:group-data-[orientation=vertical]/timeline:absolute sm:group-data-[orientation=vertical]/timeline:-left-40 sm:group-data-[orientation=vertical]/timeline:w-28 sm:group-data-[orientation=vertical]/timeline:text-right">{milestone.displayTime}</TimelineDate>
                    <TimelineTitle className="sr-only">{milestone.label}</TimelineTitle>
                    <TimelineIndicator className={cn("bg-screen", milestoneTone(milestone.status))} />
                  </TimelineHeader>
                  <TimelineContent className="text-screen-foreground">
                    <div className="border border-screen-border bg-black/35 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-semibold">{milestone.label}</p>
                        <Badge variant="outline" className={cn("rounded-sm font-mono text-[10px] uppercase tracking-widest", timelineTone(milestone.sourceType === "footage" ? "footage" : "system"))}>{milestone.sourceType === "footage" ? "footage" : "system"}</Badge>
                      </div>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-screen-foreground/55">{milestoneSourceLabel(milestone)}</p>
                      {milestone.notes ? <p className="mt-2 text-xs leading-relaxed text-screen-foreground/75">{milestone.notes}</p> : null}
                    </div>
                  </TimelineContent>
                </TimelineItem>
              );
            }

            if (entry.kind === "evidence") {
              const item = entry.item;
              const boxes = item.boxes.slice(0, 3).map(insetBox);
              const highlighted = highlightedEvidenceIds.has(item.frameId);
              return (
                <TimelineItem key={entry.key} step={step} className="sm:group-data-[orientation=vertical]/timeline:ms-40 group-data-[orientation=vertical]/timeline:not-last:pb-5">
                  <TimelineHeader>
                    <TimelineSeparator className="bg-screen-foreground/25 group-data-completed/timeline-item:bg-accent" />
                    <TimelineDate className="font-mono text-screen-foreground/75 sm:group-data-[orientation=vertical]/timeline:absolute sm:group-data-[orientation=vertical]/timeline:-left-40 sm:group-data-[orientation=vertical]/timeline:w-28 sm:group-data-[orientation=vertical]/timeline:text-right">{item.timestampLabel}</TimelineDate>
                    <TimelineTitle className="sr-only">{item.name}</TimelineTitle>
                    <TimelineIndicator className="border-accent bg-screen text-accent" />
                  </TimelineHeader>
                  <TimelineContent className="text-screen-foreground">
                    <div className={cn("grid gap-3 border bg-black/35 p-3 lg:grid-cols-[minmax(300px,0.95fr)_minmax(260px,1fr)]", highlighted ? "border-warning bg-warning/15 ring-2 ring-warning/80" : "border-screen-border")}>
                      <div className="relative aspect-video min-h-52 overflow-hidden bg-black">
                        <Image src={item.imageUrl} alt={item.description} fill unoptimized className="object-cover" sizes="(min-width: 1280px) 620px, (min-width: 1024px) 42vw, 100vw" />
                        {boxes.map((box, boxIndex) => (
                          <div key={`${item.frameId}-${box.label}-${boxIndex}`} className="absolute border-2 border-warning bg-warning/15" style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.width}%`, height: `${box.height}%` }}>
                            <span className="absolute left-0 top-0 grid size-5 place-items-center border border-screen bg-warning font-mono text-[10px] font-semibold text-background">{boxIndex + 1}</span>
                          </div>
                        ))}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="text-sm font-semibold">{onePhrase(item.name)}</p>
                          <Badge variant="outline" className={cn("rounded-sm font-mono text-[10px] uppercase tracking-widest", highlighted ? "border-warning text-warning" : timelineTone("ai"))}>{highlighted ? "search match" : "AI evidence"}</Badge>
                        </div>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-screen-foreground/55">{item.sourceResponder} / {item.sourceVideo.split("/").at(-1)}</p>
                        <p className="mt-2 text-sm leading-snug text-screen-foreground/80">{onePhrase(item.description)}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {incidentTags(item.tags).map((tag) => (
                            <span key={tag} className="border border-screen-foreground/60 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-screen-foreground/85">{tag}</span>
                          ))}
                        </div>
                        {boxes.length ? (
                          <div className="mt-3 grid gap-1 border border-screen-border bg-black/40 p-2">
                            {boxes.map((box, boxIndex) => <p key={`${item.frameId}-label-${box.label}-${boxIndex}`} className="truncate text-xs text-screen-foreground/80">{boxIndex + 1}. {shortBoxLabel(box.label)}</p>)}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </TimelineContent>
                </TimelineItem>
              );
            }

            if (entry.kind === "recommendation") {
              const recommendation = entry.recommendation;
              return (
                <TimelineItem key={entry.key} step={step} className="sm:group-data-[orientation=vertical]/timeline:ms-40 group-data-[orientation=vertical]/timeline:not-last:pb-5">
                  <TimelineHeader>
                    <TimelineSeparator className="bg-screen-foreground/25 group-data-completed/timeline-item:bg-accent" />
                    <TimelineDate className="font-mono text-screen-foreground/75 sm:group-data-[orientation=vertical]/timeline:absolute sm:group-data-[orientation=vertical]/timeline:-left-40 sm:group-data-[orientation=vertical]/timeline:w-28 sm:group-data-[orientation=vertical]/timeline:text-right">{entry.linkedEvidence[0]?.timestampLabel ?? recommendation.sourceTimestamp ?? "Review"}</TimelineDate>
                    <TimelineTitle className="sr-only">{recommendation.title}</TimelineTitle>
                    <TimelineIndicator className="border-accent bg-screen text-accent" />
                  </TimelineHeader>
                  <TimelineContent className="text-screen-foreground">
                    <div className="border border-accent/55 bg-accent/10 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-semibold">{recommendation.title}</p>
                        <Badge variant="outline" className={cn("rounded-sm font-mono text-[10px] uppercase tracking-widest", timelineTone("recommendation"))}>recommendation</Badge>
                      </div>
                      <p className="mt-2 text-sm leading-snug text-screen-foreground/80">{recommendation.reason}</p>
                      {entry.linkedEvidence.length ? <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-screen-foreground/55">Evidence: {entry.linkedEvidence.map((item) => item.timestampLabel).join(" / ")}</p> : null}
                    </div>
                  </TimelineContent>
                </TimelineItem>
              );
            }

            const decision = entry.decision;
            return (
              <TimelineItem key={entry.key} step={step} className="sm:group-data-[orientation=vertical]/timeline:ms-40 group-data-[orientation=vertical]/timeline:not-last:pb-5">
                <TimelineHeader>
                  <TimelineSeparator className="bg-screen-foreground/25 group-data-completed/timeline-item:bg-accent" />
                  <TimelineDate className="font-mono text-screen-foreground/75 sm:group-data-[orientation=vertical]/timeline:absolute sm:group-data-[orientation=vertical]/timeline:-left-40 sm:group-data-[orientation=vertical]/timeline:w-28 sm:group-data-[orientation=vertical]/timeline:text-right">{decision.timestamp}</TimelineDate>
                  <TimelineTitle className="sr-only">{decisionLabel(decision.decision)}</TimelineTitle>
                  <TimelineIndicator className={cn("bg-screen", timelineTone("officer", decision.decision))} />
                </TimelineHeader>
                <TimelineContent className="text-screen-foreground">
                  <div className="border border-screen-border bg-black/35 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-semibold">Officer decision: {decisionLabel(decision.decision)}</p>
                      <Badge variant="outline" className={cn("rounded-sm font-mono text-[10px] uppercase tracking-widest", timelineTone("officer", decision.decision))}>{decision.decision}</Badge>
                    </div>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-screen-foreground/55">{decision.reviewer}</p>
                    <p className="mt-2 text-sm leading-snug text-screen-foreground/80">{decision.reason}</p>
                  </div>
                </TimelineContent>
              </TimelineItem>
            );
          })}

          {pendingMilestones.length ? (
            <TimelineItem step={timelineEntries.length + 1} className="sm:group-data-[orientation=vertical]/timeline:ms-40">
              <TimelineHeader>
                <TimelineSeparator className="bg-screen-foreground/25" />
                <TimelineDate className="font-mono text-screen-foreground/75 sm:group-data-[orientation=vertical]/timeline:absolute sm:group-data-[orientation=vertical]/timeline:-left-40 sm:group-data-[orientation=vertical]/timeline:w-28 sm:group-data-[orientation=vertical]/timeline:text-right">Pending</TimelineDate>
                <TimelineTitle className="sr-only">Pending records</TimelineTitle>
                <TimelineIndicator className="border-warning bg-screen text-warning" />
              </TimelineHeader>
              <TimelineContent className="text-screen-foreground">
                <div className="border border-warning/60 bg-warning/10 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-semibold">Pending formal records</p>
                    <Badge variant="outline" className="rounded-sm border-warning font-mono text-[10px] uppercase tracking-widest text-warning">pending</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-snug text-screen-foreground/80">{pendingLabels}</p>
                </div>
              </TimelineContent>
            </TimelineItem>
          ) : null}
        </Timeline>
      )}
    </div>
  );
}

function RuntimeSearchPanel({ incidentId, evidence, onResultsChange }: { incidentId: string; evidence: RuntimeEvidence[]; onResultsChange: (items: RuntimeEvidence[], hasFilter: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<RuntimeEvidenceSearchOutput | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearchPending, startSearchTransition] = useTransition();
  const lastResultKeyRef = useRef("");

  function runSearch() {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || evidence.length === 0) return;

    const normalizedQuery = trimmedQuery.toLowerCase();
    const directTerms = normalizedQuery.match(/abuse|strike|assault|physical contact|shove|drunk|aggressive/g);
    if (directTerms?.length) {
      const directMatches = evidence.filter((item) => {
        const haystack = `${item.name} ${item.description} ${item.tags.join(" ")} ${item.boxes.map((box) => box.label).join(" ")}`.toLowerCase();
        return directTerms.some((term) => haystack.includes(term));
      });

      setSearchError(null);
      setResult({
        query: trimmedQuery,
        intent: "Responder-safety / abuse evidence",
        answer: directMatches.length ? "Matching responder-safety evidence is highlighted in the timeline." : "No matching responder-safety evidence found.",
        reason: "Matched query terms against analyzed evidence titles, descriptions, tags, and box labels.",
        evidenceFrameIds: directMatches.map((item) => item.frameId),
      });
      return;
    }

    startSearchTransition(async () => {
      setSearchError(null);
      const searchEvidence = evidence.map((item) => ({
        frameId: item.frameId,
        sourceVideo: item.sourceVideo,
        responderId: item.responderId,
        sourceResponder: item.sourceResponder,
        frameTimestampSeconds: item.frameTimestampSeconds,
        timestampLabel: item.timestampLabel,
        order: item.order,
        name: item.name,
        description: item.description,
        tags: item.tags,
        boxes: item.boxes,
      }));
      const response = await fetch("/api/review/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId, query, evidence: searchEvidence }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setResult(null);
        onResultsChange(evidence, false);
        setSearchError(typeof payload.error === "string" ? payload.error : "Runtime search failed.");
        return;
      }

      setResult(payload);
    });
  }

  const matchedEvidence = useMemo(() => {
    if (!result) return [];
    const evidenceByFrameId = new globalThis.Map(evidence.map((item) => [item.frameId, item]));

    return result.evidenceFrameIds.flatMap((frameId) => {
      const item = evidenceByFrameId.get(frameId);
      return item ? [item] : [];
    });
  }, [evidence, result]);

  useEffect(() => {
    const activeEvidence = result ? matchedEvidence : evidence;
    const resultKey = `${Boolean(result)}:${activeEvidence.map((item) => item.frameId).join("|")}`;

    if (lastResultKeyRef.current === resultKey) return;
    lastResultKeyRef.current = resultKey;
    onResultsChange(activeEvidence, Boolean(result));
  }, [evidence, matchedEvidence, onResultsChange, result]);

  function clearSearch() {
    setQuery("");
    setResult(null);
    setSearchError(null);
    onResultsChange(evidence, false);
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="incident-search">Search analyzed evidence</FieldLabel>
          <div className="flex gap-2">
            <Input id="incident-search" value={query} onChange={(event) => setQuery(event.target.value)} className="h-9 rounded-sm" placeholder="abuse, strike, assault" />
            <Button size="sm" className="rounded-sm" onClick={runSearch} disabled={isSearchPending || evidence.length === 0 || !query.trim()}>
              <Search data-icon="inline-start" />
              {isSearchPending ? "Searching" : "Search"}
            </Button>
            {result ? <Button size="sm" variant="outline" className="rounded-sm" onClick={clearSearch}>Clear</Button> : null}
          </div>
        </Field>
      </FieldGroup>

      {searchError ? <div className="border border-destructive bg-background p-3 text-sm text-destructive">{searchError}</div> : null}

      <div className="divide-y divide-border border border-border">
        {result ? (
          <div className="p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="break-words font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{cleanOperationalText(result.intent)}</p>
              <p className="break-words font-mono text-xs text-muted-foreground">{matchedEvidence.length ? `${matchedEvidence.length} match${matchedEvidence.length === 1 ? "" : "es"}` : "no matches"}</p>
            </div>
          </div>
        ) : (
          <div className="p-3 text-sm text-muted-foreground">Ask about analyzed evidence.</div>
        )}
        {matchedEvidence.length ? (
          <div className="grid grid-cols-[4.5rem_1fr] border-b border-border bg-muted/50 p-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>Time</span>
            <span>Evidence</span>
          </div>
        ) : null}
        {matchedEvidence.map((item) => (
          <div key={item.frameId} className="grid gap-2 p-2 text-sm sm:grid-cols-[4.5rem_1fr]">
            <p className="font-mono text-xs text-muted-foreground">{item.timestampLabel}</p>
            <div className="min-w-0">
              <p className="truncate font-medium">{item.name}</p>
              <p className="truncate text-xs text-muted-foreground">{cleanOperationalText(item.description)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DecisionResult({ decision }: { decision: DecisionReview | null }) {
  return (
    <AnimatePresence>
      {decision ? (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className={cn("mt-3 border bg-background p-2", decision.decision === "approved" ? "border-success" : "border-destructive")}>
          <p className={cn("font-mono text-[10px] uppercase tracking-widest", decision.decision === "approved" ? "text-success" : "text-destructive")}>{decision.decision === "approved" ? "marked for GC consideration" : "held from GC summary"}</p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function MapDashboard({ initialState, initialIncidentId }: { initialState: ScenarioState; initialIncidentId: string }) {
  const [state] = useState(initialState);
  const router = useRouter();
  const pathname = usePathname();
  const [selectedIncidentId, setSelectedIncidentId] = useState(initialIncidentId);
  const [selectedMarker, setSelectedMarker] = useState<DeploymentMarker | null>(null);
  const [dispatchPreview, setDispatchPreview] = useState<DispatchPreview | null>(null);
  const selectedIncident = getIncident(state, selectedIncidentId);
  const dashboardTarget = selectedIncident.status === "review" ? "/review" : "/live";
  const canEnterDashboard = dispatchPreview?.incidentId === selectedIncidentId && dispatchPreview.status === "arrived";
  const dashboardLabel = canEnterDashboard ? selectedIncident.status === "review" ? "Enter review dashboard" : "Enter live dashboard" : dispatchPreview?.incidentId === selectedIncidentId && dispatchPreview.status === "moving" ? "Dispatch movement in progress" : "Select incident marker";
  const latestDispatchRef = useRef(0);
  function routeToDashboard() {
    if (!canEnterDashboard) return;
    router.push(incidentHref(dashboardTarget, selectedIncidentId));
  }

  function enterIncidentDashboard(incidentId: string) {
    const incident = getIncident(state, incidentId);
    if (dispatchPreview?.incidentId !== incident.id || dispatchPreview.status !== "arrived") return;

    router.push(incidentHref(incident.status === "review" ? "/review" : "/live", incident.id));
  }

  function startDispatchPreview(incidentId: string) {
    const incident = getIncident(state, incidentId);
    const station = nearestFireStation(incident.position);
    const dispatchId = latestDispatchRef.current + 1;
    latestDispatchRef.current = dispatchId;
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const durationMs = prefersReducedMotion ? 250 : 2600;
    const startedAt = performance.now();

    function setProgress(progress: number) {
      const status = progress >= 1 ? "arrived" : progress > 0 ? "moving" : "idle";
      const position = interpolatePosition(station.position, incident.position, progress);
      setDispatchPreview({
        incidentId,
        station,
        progress,
        status,
        vehicleMarker: {
          id: `dispatch-${incident.id}`,
          incidentId: incident.id,
          label: dispatchVehicleLabel(incident),
          kind: "unit",
          position,
          status: dispatchVehicleStatus(incident, progress),
        },
      });
    }

    setProgress(0);

    function frame(now: number) {
      if (latestDispatchRef.current !== dispatchId) return;

      const rawProgress = Math.min(1, (now - startedAt) / durationMs);
      const easedProgress = 1 - Math.pow(1 - rawProgress, 3);
      setProgress(easedProgress);

      if (rawProgress < 1) window.requestAnimationFrame(frame);
    }

    window.requestAnimationFrame(frame);
  }

  function selectIncident(incidentId: string) {
    setSelectedIncidentId(incidentId);
    setSelectedMarker(state.deploymentMarkers.find((marker) => marker.incidentId === incidentId) ?? null);
    router.replace(incidentHref(pathname, incidentId), { scroll: false });
    startDispatchPreview(incidentId);
  }

  return (
    <AppShell state={state} selectedIncidentId={selectedIncidentId} onIncidentChange={selectIncident} showSidebar={false} background="map" fixedViewport>
      <section className={cn(commandScope, "flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--radius-shell)] border border-border bg-command text-command-foreground")}>
        <div className="command-texture command-texture-map relative flex min-h-12 flex-wrap items-center justify-between gap-3 overflow-hidden border-b border-border px-4 py-3">
          <HeroImageBackdrop src={heroImages.map} alt="AI generated operations map background" />
          <div className="relative">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Deployment map</p>
            <h2 className="text-sm font-semibold">{selectedIncident.title}</h2>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{selectedIncident.location}</p>
          </div>
          <Button
            size="lg"
            className={cn("relative rounded-sm", !canEnterDashboard && "pointer-events-none !border-disabled-border !bg-disabled !text-disabled-foreground opacity-50")}
            onClick={routeToDashboard}
            aria-disabled={!canEnterDashboard}
            data-disabled={!canEnterDashboard ? "" : undefined}
          >
            <MapPinned data-icon="inline-start" />
            {dashboardLabel}
          </Button>
        </div>
        <DeploymentMap state={state} selectedIncidentId={selectedIncidentId} selectedMarker={selectedMarker} dispatchPreview={dispatchPreview} onEnterDashboard={enterIncidentDashboard} onSelectMarker={(marker) => {
          setSelectedMarker(marker);
          if (marker.kind === "incident" && marker.incidentId) selectIncident(marker.incidentId);
        }} />
      </section>
    </AppShell>
  );
}

export function LiveDashboard({ initialState, initialIncidentId }: { initialState: ScenarioState; initialIncidentId: string }) {
  const [state] = useState(initialState);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedIncidentId, setSelectedIncidentId] = useState(initialIncidentId);
  const sessionStartMs = useMountedSessionStart();
  const [mode, setMode] = useState<LiveMode>("live");
  const [playing, setPlaying] = useState(true);
  const [activeAudioResponderId, setActiveAudioResponderId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<LiveAnalysis | null>(null);
  const [streamSession, setStreamSession] = useState<StreamIncidentSession | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const liveLoopRef = useRef(false);
  const analyzeInFlightRef = useRef(false);
  const queuedAnalysisTimesRef = useRef<Record<string, number> | null>(null);
  const analysisGenerationRef = useRef(0);
  const selectedIncident = getIncident(state, selectedIncidentId);
  const isStreamIncident = selectedIncident.id === streamIncidentId;
  const incidentResponders = useMemo(() => getIncidentResponders(state, selectedIncident), [selectedIncident, state]);
  const postFirePhase = isPostFirePhase(selectedIncident.id, mode);
  const analysisResponders = useMemo(() => postFirePhase ? incidentResponders.filter((responder) => responder.reviewVideoSrcs?.length) : incidentResponders, [incidentResponders, postFirePhase]);
  const canRunLiveAnalysis = selectedIncident.supportsRuntimeAnalysis && (isStreamIncident || analysisResponders.length > 0);
  const streamDisplayAnalysis = isStreamIncident ? streamAnalysis(streamSession) : null;
  const liveDisplayAnalysis = useMemo(() => analysis ? applyRuntimeLiveClock(analysis, sessionStartMs, selectedIncident.id) : null, [analysis, selectedIncident.id, sessionStartMs]);
  const displayAnalysis = isStreamIncident ? streamDisplayAnalysis : liveDisplayAnalysis;
  const liveAnalysisIntervalMs = analysis?.events.length ? steadyLiveAnalysisIntervalMs : startupLiveAnalysisIntervalMs;
  const liveCue = selectedIncident.id === aarBriefingIncidentId ? { responderId: "med-woodlands-a", timestampSeconds: 45.5 } : state.liveAnalysisCue;
  const operatorControlsVisible = searchParams.get("operator") === "1" || searchParams.get("debug") === "1";
  const analysisStatusLabel = isStreamIncident
    ? streamSession?.analysisPaused
      ? "Analysis unavailable"
      : "Analyzing current feed window"
    : canRunLiveAnalysis
    ? isPending
      ? "Analyzing current feed window"
      : analysis?.events.length
      ? "Evidence window active"
      : "Scanning current feed window"
    : "Analysis unavailable";

  function selectIncident(incidentId: string) {
    setMode("live");
    setPlaying(true);
    setActiveAudioResponderId(null);
    setAnalysis(null);
    setStreamSession(null);
    setAnalysisError(null);
    videoRefs.current = {};
    liveLoopRef.current = false;
    analyzeInFlightRef.current = false;
    queuedAnalysisTimesRef.current = null;
    analysisGenerationRef.current += 1;
    setSelectedIncidentId(incidentId);
    router.replace(incidentHref(pathname, incidentId), { scroll: false });
  }

  const analyzeChunk = useCallback((nextTimes?: Record<string, number>) => {
    if (!canRunLiveAnalysis) return;
    if (isStreamIncident) return;
    if (analyzeInFlightRef.current) {
      queuedAnalysisTimesRef.current = nextTimes ?? Object.fromEntries(
        analysisResponders.map((responder) => [responder.id, videoRefs.current[responder.id]?.currentTime ?? 0]),
      );
      return;
    }
    analyzeInFlightRef.current = true;
    const generation = analysisGenerationRef.current;

    startTransition(async () => {
      try {
        setAnalysisError(null);
        const feeds = analysisResponders.map((responder) => {
          const video = videoRefs.current[responder.id];

          return {
            responderId: responder.id,
            videoSrc: liveFeedSource(responder, postFirePhase),
            currentTime: nextTimes?.[responder.id] ?? video?.currentTime ?? 0,
          };
        });

        const response = await fetch("/api/live/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ incidentId: selectedIncident.id, feeds, operatorEvidenceSupport: operatorControlsVisible || selectedIncident.id === punggolIncidentId }),
        });
        const responseText = await response.text();
        let result: { error?: string } & Partial<LiveAnalysisOutput & { generatedFrom: string }> = {};
        try {
          result = responseText ? JSON.parse(responseText) : {};
        } catch {
          setAnalysisError(`Live analysis failed with HTTP ${response.status}.`);
          return;
        }
        if (!response.ok) {
          setAnalysisError(typeof result.error === "string" ? result.error : "Live analysis failed.");
          return;
        }
        if (generation !== analysisGenerationRef.current) return;
        setAnalysis((current) => mergeLiveAnalysis(current, result as Parameters<typeof mergeLiveAnalysis>[1]));
      } catch (error) {
        if (generation !== analysisGenerationRef.current) return;
        setAnalysisError(error instanceof Error ? `Live analysis failed: ${error.message}` : "Live analysis failed.");
      } finally {
        if (generation !== analysisGenerationRef.current) return;
        analyzeInFlightRef.current = false;
        const queuedTimes = queuedAnalysisTimesRef.current;
        queuedAnalysisTimesRef.current = null;
        if (queuedTimes) window.setTimeout(() => analyzeChunk(queuedTimes), 0);
      }
    });
  }, [analysisResponders, canRunLiveAnalysis, isStreamIncident, operatorControlsVisible, postFirePhase, selectedIncident.id, startTransition]);

  useEffect(() => {
    if (!isStreamIncident) return;

    let active = true;
    async function refreshStreamSession() {
      const response = await fetch("/api/stream/session", { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!active) return;
      setStreamSession(result.session ?? null);
      setAnalysisError(typeof result.session?.lastError === "string" ? result.session.lastError : null);
    }

    void refreshStreamSession();
    const interval = window.setInterval(() => void refreshStreamSession(), 2000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [isStreamIncident]);

  useEffect(() => {
    if (!canRunLiveAnalysis || isStreamIncident) return;
    if (!playing || mode === "concluded") return;

    liveLoopRef.current = true;
    analyzeChunk();
    const interval = window.setInterval(() => {
      if (!liveLoopRef.current) return;
      analyzeChunk();
    }, liveAnalysisIntervalMs);

    return () => {
      liveLoopRef.current = false;
      window.clearInterval(interval);
    };
  }, [analyzeChunk, canRunLiveAnalysis, isStreamIncident, liveAnalysisIntervalMs, mode, playing]);

  function toggleStreamAnalysis() {
    if (!isStreamIncident) {
      setPlaying((value) => !value);
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/stream/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisPaused: !streamSession?.analysisPaused }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setAnalysisError(typeof result.error === "string" ? result.error : "Stream analysis state could not be updated.");
        return;
      }
      setStreamSession(result.session ?? null);
      setAnalysisError(null);
    });
  }

  function continuePostFireSweep() {
    if (isStreamIncident) return;
    analysisGenerationRef.current += 1;
    analyzeInFlightRef.current = false;
    queuedAnalysisTimesRef.current = null;
    setMode("post-fire-loading");
    setPlaying(false);
    setActiveAudioResponderId("ff-a");
  }

  const handlePostFireReady = useCallback(() => {
    setMode((currentMode) => {
      if (currentMode !== "post-fire-loading") return currentMode;
      setPlaying(true);
      return "post-fire";
    });
  }, []);

  function handlePunggolFireEnded() {
    if (selectedIncident.id !== punggolIncidentId || postFirePhase) return;
    continuePostFireSweep();
  }

  return (
    <AppShell state={state} selectedIncidentId={selectedIncidentId} onIncidentChange={selectIncident} showSidebar={false} background="live" fixedViewport>
      <section className={cn(commandScope, "shrink-0 overflow-hidden rounded-[var(--radius-shell)] border border-border bg-command text-command-foreground")}>
        <div className="grid gap-px bg-border lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)_auto]">
          <div className="command-texture command-texture-live relative overflow-hidden bg-card p-3">
            <HeroImageBackdrop src={heroImages.live} alt="AI generated live bodycam feed background" />
            <div className="relative">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Live operations</p>
              <h2 className="mt-1 text-lg font-semibold leading-tight">{selectedIncident.title}</h2>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{selectedIncident.location}</p>
            </div>
          </div>
          <div className="bg-card p-3">
            <p className="text-sm leading-snug text-muted-foreground">{isStreamIncident ? "Monitor connected browser bodycams while current feed windows generate structured stream events." : canRunLiveAnalysis ? "Monitor source feeds while live analysis adds supported events." : selectedIncident.unavailableReason ?? "No live footage is attached."}</p>
            <p className="mt-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">{analysisStatusLabel}</p>
          </div>
          <div className="flex flex-wrap content-start gap-2 bg-card p-3 lg:justify-end">
            {operatorControlsVisible ? (
              <Button size="lg" variant="outline" className="rounded-sm" onClick={toggleStreamAnalysis} disabled={!canRunLiveAnalysis || isPending}>
                {(isStreamIncident ? !streamSession?.analysisPaused : playing) ? <Pause data-icon="inline-start" /> : <Play data-icon="inline-start" />}
                {(isStreamIncident ? !streamSession?.analysisPaused : playing) ? "Pause" : "Resume"}
              </Button>
            ) : null}
            <Button size="lg" variant="outline" className="rounded-sm" onClick={() => setActiveAudioResponderId(null)} disabled={!canRunLiveAnalysis || activeAudioResponderId === null}>
              <VolumeX data-icon="inline-start" />
              Mute all
            </Button>
            <Button size="lg" variant="outline" className="rounded-sm" onClick={continuePostFireSweep} disabled={!canRunLiveAnalysis || isStreamIncident || selectedIncident.id !== punggolIncidentId || postFirePhase}>
              <Square data-icon="inline-start" />
              Advance feeds
            </Button>
            <Button size="lg" variant="outline" className="rounded-sm" render={<Link href={incidentHref("/review", selectedIncidentId)} />} nativeButton={false}>
              <Search data-icon="inline-start" />
              Open incident review
            </Button>

          </div>
        </div>
      </section>

      {operatorControlsVisible ? (
        <section className={cn(commandScope, "shrink-0 border border-border bg-command px-4 py-2 text-command-foreground")}>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Operator controls visible</p>
        </section>
      ) : null}

      <div className="grid min-h-0 flex-1 items-stretch gap-4 overflow-hidden xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel title="Live responder feeds" label="Feeds" className="h-full min-h-0 overflow-y-auto">
          <BodycamGrid incident={selectedIncident} responders={incidentResponders} mode={mode} playing={playing} activeAudioResponderId={activeAudioResponderId} onAudioChange={setActiveAudioResponderId} onPunggolFireEnded={handlePunggolFireEnded} onPostFireReady={handlePostFireReady} videoRefs={videoRefs} streamSession={streamSession} liveCue={liveCue} />
        </Panel>

        <div className="grid max-h-full auto-rows-max content-start gap-4 overflow-y-auto xl:sticky xl:top-20">
          <Panel title="Case brief" label="Caller report" className="xl:hidden">
            <details className="p-4">
              <summary className="cursor-pointer font-mono text-xs uppercase tracking-widest text-muted-foreground">Open caller brief</summary>
              <div className="mt-3 grid gap-px bg-border">
                {[selectedIncident].map((incident) => (
                  <div key={incident.id} className={cn(paperScope, "bg-paper p-3 text-paper-foreground")}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{incident.title}</p>
                      <OperationalBadge>{incident.severity}</OperationalBadge>
                    </div>
                    <p className="mt-2 font-mono text-xs text-muted-foreground">{formatMountedSessionClock(sessionStartMs, 0)}</p>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{incident.summary}</p>
                  </div>
                ))}
              </div>
            </details>
          </Panel>
          <Panel title="Case brief" label="Caller report" className="hidden xl:block">
            <details className="p-4">
              <summary className="cursor-pointer font-mono text-xs uppercase tracking-widest text-muted-foreground">Open caller brief</summary>
              <div className="mt-3 grid gap-px bg-border">
                {[selectedIncident].map((incident) => (
                  <div key={incident.id} className={cn(paperScope, "bg-paper p-3 text-paper-foreground")}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{incident.title}</p>
                      <OperationalBadge>{incident.severity}</OperationalBadge>
                    </div>
                    <p className="mt-2 font-mono text-xs text-muted-foreground">{formatMountedSessionClock(sessionStartMs, 0)}</p>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{incident.summary}</p>
                  </div>
                ))}
              </div>
            </details>
          </Panel>
          <Panel title="Events" label="Live analysis">
            <EventLog analysis={displayAnalysis} isAnalyzing={isPending} responders={isStreamIncident ? undefined : analysisResponders} />
          </Panel>
          <RecommendationReview analysis={displayAnalysis} incidentId={selectedIncidentId} />
          {analysisError ? (
            <div className="border border-destructive bg-command p-3 text-sm text-destructive">{analysisError}</div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}

export function ReviewDashboard({ initialState, initialIncidentId }: { initialState: ScenarioState; initialIncidentId: string }) {
  const [state] = useState(initialState);
  const router = useRouter();
  const pathname = usePathname();
  const [selectedIncidentId, setSelectedIncidentId] = useState(initialIncidentId);
  const [analysis, setAnalysis] = useState<RuntimeAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [activeEvidence, setActiveEvidence] = useState<RuntimeEvidence[]>([]);
  const [selectedBriefingEvidenceIds, setSelectedBriefingEvidenceIds] = useState<Set<string>>(new Set());
  const [selectedBriefingMilestoneIds, setSelectedBriefingMilestoneIds] = useState<Set<IncidentMilestone["id"]>>(new Set());
  const [decisionReviews, setDecisionReviews] = useState<DecisionReview[]>([]);
  const [hasEvidenceFilter, setHasEvidenceFilter] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isExportPending, startExportTransition] = useTransition();
  const analysisStartedRef = useRef(false);
  const sessionStartMs = useMountedSessionStart();
  const selectedIncident = getIncident(state, selectedIncidentId);
  const runtimeMilestones = useMemo(() => selectedIncident.milestones.map((milestone) => applyRuntimeMilestoneClock(milestone, selectedIncident.id, sessionStartMs)), [selectedIncident.id, selectedIncident.milestones, sessionStartMs]);
  const incidentResponders = useMemo(() => getIncidentResponders(state, selectedIncident), [selectedIncident, state]);
  const selectableMilestones = useMemo(() => runtimeMilestones.filter((milestone) => milestone.status !== "unavailable"), [runtimeMilestones]);
  const selectedExportEvidence = analysis ? briefingEvidence(hasEvidenceFilter ? activeEvidence : analysis.evidence, selectedBriefingEvidenceIds) : [];
  const canRunReviewAnalysis = selectedIncident.supportsRuntimeAnalysis && incidentResponders.length > 0;
  const canGenerateAarSlides = aarBriefingIncidentIds.has(selectedIncident.id);
  const canExportSlides = canGenerateAarSlides && sessionStartMs !== null && Boolean(analysis) && selectedExportEvidence.length > 0 && selectedBriefingMilestoneIds.size > 0 && !isExportPending;
  const refreshDisabled = !canRunReviewAnalysis || isPending;
  const exportDisabled = !canRunReviewAnalysis || !canExportSlides;

  function selectIncident(incidentId: string) {
    setAnalysis(null);
    setAnalysisError(null);
    setExportError(null);
    setActiveEvidence([]);
    setSelectedBriefingEvidenceIds(new Set());
    setSelectedBriefingMilestoneIds(new Set());
    setDecisionReviews([]);
    setHasEvidenceFilter(false);
    analysisStartedRef.current = false;
    setSelectedIncidentId(incidentId);
    router.replace(incidentHref(pathname, incidentId), { scroll: false });
  }

  const runAnalysis = useCallback(() => {
    if (!canRunReviewAnalysis || sessionStartMs === null) return;
    startTransition(async () => {
      setAnalysisError(null);
      setExportError(null);
      const response = await fetch("/api/review/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId: selectedIncident.id, feedIds: incidentResponders.map((responder) => responder.id) }),
      });
      const result = await response.json();
      if (!response.ok) {
        setAnalysis(null);
        setAnalysisError(typeof result.error === "string" ? result.error : "Post-incident analysis failed.");
        return;
      }
      const timedEvidence = (result.evidence as RuntimeEvidence[]).map((item) => applyRuntimeEvidenceClock(item, sessionStartMs));
      const normalizedAnalysis = {
        ...result,
        evidence: timedEvidence,
        recommendations: result.recommendations.map((recommendation: RuntimeRecommendation) => applyRuntimeRecommendationClock(recommendation, timedEvidence)),
      };
      setAnalysis(normalizedAnalysis);
      setActiveEvidence([...normalizedAnalysis.evidence].sort((a, b) => a.order - b.order));
      setSelectedBriefingEvidenceIds(new Set(normalizedAnalysis.evidence.map((item: RuntimeEvidence) => item.frameId)));
      setSelectedBriefingMilestoneIds(new Set(runtimeMilestones.filter((milestone) => milestone.status !== "unavailable").map((milestone) => milestone.id)));
      setHasEvidenceFilter(false);
    });
  }, [canRunReviewAnalysis, incidentResponders, runtimeMilestones, selectedIncident.id, sessionStartMs, startTransition]);

  useEffect(() => {
    let active = true;

    void fetch(`/api/recommendation-review?incidentId=${encodeURIComponent(selectedIncident.id)}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { decisions?: DecisionReview[] }) => {
        if (!active) return;
        setDecisionReviews(payload.decisions ?? []);
      })
      .catch(() => {
        if (!active) return;
        setDecisionReviews([]);
      });

    return () => {
      active = false;
    };
  }, [selectedIncident.id]);

  useEffect(() => {
    if (!canRunReviewAnalysis || sessionStartMs === null) return;
    if (analysisStartedRef.current) return;
    analysisStartedRef.current = true;
    runAnalysis();
  }, [canRunReviewAnalysis, runAnalysis, sessionStartMs]);

  function exportReport(format: "pdf" | "pptx") {
    if (!canGenerateAarSlides || !analysis || selectedExportEvidence.length === 0 || selectedBriefingMilestoneIds.size === 0 || sessionStartMs === null) return;

    startExportTransition(async () => {
      setExportError(null);
      const exportEvidence = topEvidence(selectedExportEvidence);
      const exportEvidenceFrameIds = new Set(exportEvidence.map((item) => item.frameId));
      const exportAnalysis = {
        ...analysis,
        decisionReviews,
        evidence: exportEvidence.map((item) => ({
          frameId: item.frameId,
          sourceVideo: item.sourceVideo,
          responderId: item.responderId,
          sourceResponder: item.sourceResponder,
          frameTimestampSeconds: item.frameTimestampSeconds,
          timestampLabel: item.timestampLabel,
          imageUrl: item.imageUrl,
          order: item.order,
          name: item.name,
          description: item.description,
          tags: item.tags,
          boxes: item.boxes.slice(0, 3).map((box) => ({ ...box, label: shortBoxLabel(box.label) })),
        })),
        recommendations: analysis.recommendations
          .map((recommendation) => ({
            ...recommendation,
            order: recommendation.order,
            evidenceFrameIds: recommendation.evidenceFrameIds.filter((frameId) => exportEvidenceFrameIds.has(frameId)),
          }))
          .filter((recommendation) => recommendation.evidenceFrameIds.length > 0),
      };
      const response = await fetch(format === "pptx" ? "/api/report/export?format=pptx" : "/api/report/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis: exportAnalysis, milestoneIds: [...selectedBriefingMilestoneIds], milestones: runtimeMilestones }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setExportError(typeof payload.error === "string" ? payload.error : `AAR briefing ${format.toUpperCase()} export failed.`);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `1stsight-${selectedIncident.id}-aar-briefing-slides.${format}`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });
  }

  function setAllBriefingEvidence(checked: boolean) {
    setSelectedBriefingEvidenceIds(checked && analysis ? new Set(analysis.evidence.map((item) => item.frameId)) : new Set());
  }

  function toggleBriefingEvidence(frameId: string) {
    setSelectedBriefingEvidenceIds((current) => {
      const next = new Set(current);

      if (next.has(frameId)) next.delete(frameId);
      else next.add(frameId);

      return next;
    });
  }

  function setAllBriefingMilestones(checked: boolean) {
    setSelectedBriefingMilestoneIds(checked ? new Set(selectableMilestones.map((milestone) => milestone.id)) : new Set());
  }

  function toggleBriefingMilestone(milestoneId: IncidentMilestone["id"]) {
    setSelectedBriefingMilestoneIds((current) => {
      const next = new Set(current);

      if (next.has(milestoneId)) next.delete(milestoneId);
      else next.add(milestoneId);

      return next;
    });
  }

  return (
    <AppShell state={state} selectedIncidentId={selectedIncidentId} onIncidentChange={selectIncident} showSidebar={false} background="review">
      <section className={cn(commandScope, "overflow-hidden rounded-[var(--radius-shell)] border border-border bg-command text-command-foreground")}>
        <div className="grid gap-px bg-border lg:grid-cols-[1fr_auto]">
          <div className="command-texture command-texture-review relative overflow-hidden bg-card p-4">
            <HeroImageBackdrop src={heroImages.review} alt="AI generated evidence review background" />
            <div className="relative">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Post-incident review</p>
              <h2 className="mt-1 text-lg font-semibold">{selectedIncident.title}</h2>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{selectedIncident.location}</p>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{canRunReviewAnalysis ? "Evidence timeline from current videos." : selectedIncident.unavailableReason ?? "No review footage is attached."}</p>
              <p className="mt-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">{canRunReviewAnalysis ? (isPending ? "Analyzing current evidence window" : analysis ? `${activeEvidence.length} evidence item${activeEvidence.length === 1 ? "" : "s"}${hasEvidenceFilter ? " filtered for review" : ""} / ${selectedExportEvidence.length} selected for briefing` : "Queued for analysis") : "Analysis unavailable"}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 bg-card p-4 lg:justify-end">
            <Button size="lg" variant="outline" className="rounded-sm aria-disabled:pointer-events-none aria-disabled:opacity-50" aria-disabled={refreshDisabled} data-disabled={refreshDisabled ? "" : undefined} onClick={() => { if (refreshDisabled) return; runAnalysis(); }}>
              <Search data-icon="inline-start" />
              {isPending ? "Analyzing" : "Refresh analysis"}
            </Button>
            <Button size="lg" variant="outline" className="rounded-sm aria-disabled:pointer-events-none aria-disabled:opacity-50" aria-disabled={exportDisabled} data-disabled={exportDisabled ? "" : undefined} onClick={() => { if (exportDisabled) return; exportReport("pptx"); }}>
              <Download data-icon="inline-start" />
              {isExportPending ? "Exporting" : "Download PPTX"}
            </Button>
            <Button size="lg" variant="outline" className="rounded-sm aria-disabled:pointer-events-none aria-disabled:opacity-50" aria-disabled={exportDisabled} data-disabled={exportDisabled ? "" : undefined} onClick={() => { if (exportDisabled) return; exportReport("pdf"); }}>
              <Download data-icon="inline-start" />
              {isExportPending ? "Exporting" : "Download PDF"}
            </Button>
          </div>
        </div>
      </section>

      {analysisError ? <div className="border border-destructive bg-command p-3 text-sm text-destructive">{analysisError}</div> : null}
      {exportError ? <div className="border border-destructive bg-command p-3 text-sm text-destructive">{exportError}</div> : null}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Panel title="Incident timeline" label="Provenance">
          <UnifiedIncidentTimeline
            incident={{ ...selectedIncident, milestones: runtimeMilestones }}
            evidence={analysis ? analysis.evidence : []}
            highlightedEvidenceIds={hasEvidenceFilter ? new Set(activeEvidence.map((item) => item.frameId)) : new Set()}
            recommendations={analysis?.recommendations ?? []}
            decisionReviews={decisionReviews}
            isAnalyzing={isPending}
            canRunReviewAnalysis={canRunReviewAnalysis}
            emptyMessage={canRunReviewAnalysis ? "Building evidence timeline." : selectedIncident.unavailableReason ?? "No review footage is attached."}
          />
        </Panel>

        <div className="grid gap-4 xl:sticky xl:top-20">
          <Panel title="Search" label="Filter" tone="paper" className="h-fit">
            <RuntimeSearchPanel incidentId={selectedIncident.id} evidence={analysis?.evidence ?? []} onResultsChange={(items, hasFilter) => {
              setActiveEvidence(items);
              setHasEvidenceFilter(hasFilter);
            }} />
          </Panel>

        <Panel title="Generate AAR briefing slides" label="Slides" tone="paper">
          <div className="p-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {!canGenerateAarSlides
                ? "AAR slide export is available for incidents with reviewable bodycam evidence."
                : canRunReviewAnalysis
                  ? analysis
                    ? `Briefing slides cover the full incident by default. Active search focuses the export until cleared.`
                    : "Analysis starts automatically."
                  : "Export is disabled until footage is available."}
            </p>
            {analysis ? (
              <div className="mt-4 grid gap-4">
                <div className="border border-border">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/50 p-2">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Evidence selected for briefing</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" className="h-8 rounded-sm px-2" onClick={() => setAllBriefingEvidence(true)}>Include all</Button>
                      <Button size="sm" variant="ghost" className="h-8 rounded-sm px-2" onClick={() => setAllBriefingEvidence(false)}>Exclude all</Button>
                    </div>
                  </div>
                  <div className="max-h-56 divide-y divide-border overflow-y-auto">
                    {analysis.evidence.map((item) => {
                      const selected = selectedBriefingEvidenceIds.has(item.frameId);

                      return (
                        <button key={item.frameId} type="button" onClick={() => toggleBriefingEvidence(item.frameId)} className="grid w-full grid-cols-[1.25rem_4rem_1fr] gap-2 p-2 text-left text-sm hover:bg-muted/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent">
                          <span className={cn("mt-0.5 grid size-4 place-items-center border", selected ? "border-accent bg-accent text-accent-foreground" : "border-border text-transparent")}><Check className="size-3" /></span>
                          <span className="font-mono text-xs text-muted-foreground">{item.timestampLabel}</span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{item.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">{item.sourceResponder} / {incidentTags(item.tags).join(" / ")}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border border-border">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/50 p-2">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Milestones selected for briefing</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" className="h-8 rounded-sm px-2" onClick={() => setAllBriefingMilestones(true)}>Include all</Button>
                      <Button size="sm" variant="ghost" className="h-8 rounded-sm px-2" onClick={() => setAllBriefingMilestones(false)}>Exclude all</Button>
                    </div>
                  </div>
                  <div className="max-h-56 divide-y divide-border overflow-y-auto">
                    {selectableMilestones.map((milestone) => {
                      const selected = selectedBriefingMilestoneIds.has(milestone.id);

                      return (
                        <button key={milestone.id} type="button" onClick={() => toggleBriefingMilestone(milestone.id)} className="grid w-full grid-cols-[1.25rem_4.5rem_1fr] gap-2 p-2 text-left text-sm hover:bg-muted/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent">
                          <span className={cn("mt-0.5 grid size-4 place-items-center border", selected ? "border-accent bg-accent text-accent-foreground" : "border-border text-transparent")}><Check className="size-3" /></span>
                          <span className="font-mono text-xs text-muted-foreground">{milestone.displayTime}</span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{milestone.label}</span>
                            <span className="block truncate text-xs text-muted-foreground">{milestone.sourceType} / {milestone.status}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{selectedExportEvidence.length} evidence / {selectedBriefingMilestoneIds.size} milestones selected for briefing slides</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="rounded-sm aria-disabled:pointer-events-none aria-disabled:opacity-50" aria-disabled={exportDisabled} data-disabled={exportDisabled ? "" : undefined} onClick={() => { if (exportDisabled) return; exportReport("pptx"); }}>
                    <Download data-icon="inline-start" />
                    {isExportPending ? "Exporting" : "Download PPTX"}
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-sm aria-disabled:pointer-events-none aria-disabled:opacity-50" aria-disabled={exportDisabled} data-disabled={exportDisabled ? "" : undefined} onClick={() => { if (exportDisabled) return; exportReport("pdf"); }}>
                    <Download data-icon="inline-start" />
                    {isExportPending ? "Exporting" : "Download PDF"}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </Panel>
        </div>
      </div>

    </AppShell>
  );
}
