"use client";

// React useEffect API: https://react.dev/reference/react/useEffect
import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type MutableRefObject, type ReactNode } from "react";
// Next.js Link API: https://nextjs.org/docs/app/api-reference/components/link
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
// Google Maps React API: https://visgl.github.io/react-google-maps/docs/get-started
import { AdvancedMarker, APIProvider, Map } from "@vis.gl/react-google-maps";
// Motion React: https://motion.dev/docs/react
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Activity, Check, Download, FastForward, MapPinned, Pause, Play, Search, Square, VolumeX } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
// shadcn/ui Select: https://ui.shadcn.com/docs/components/base/select
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// REUI Timeline: https://github.com/keenthemes/reui/blob/main/registry-reui/bases/base/components/timeline/c-timeline-2.tsx
import { Timeline, TimelineContent, TimelineDate, TimelineHeader, TimelineIndicator, TimelineItem, TimelineSeparator, TimelineTitle } from "@/components/reui/timeline";
import type { DecisionReview, DeploymentMarker, Incident, Responder, ScenarioState } from "@/lib/domain";
import type { LiveAnalysisOutput, RuntimeEvidenceSearchOutput } from "@/lib/ai/schemas";
import { cn } from "@/lib/utils";

const incidentLevelTags = new Set(["fire escalation", "fire response", "ground operations", "entry approach", "entry control", "smoke spread", "visibility", "deployment", "blocked access", "unsafe entry", "hazmat", "medical", "civil", "hazard", "incident"]);

type DemoMode = "live" | "escalation" | "concluded";

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
  evidenceFrameIds: string[];
};

type RuntimeAnalysis = {
  incidentId: string;
  incidentTitle: string;
  summary: string;
  generatedFrom: string;
  evidence: RuntimeEvidence[];
  recommendations: RuntimeRecommendation[];
};

type LiveEvent = LiveAnalysisOutput["events"][number] & { category?: string; evidenceImageUrl?: string; sourceResponder?: string };

type LiveAnalysis = Omit<LiveAnalysisOutput, "events"> & {
  generatedFrom: string;
  events: LiveEvent[];
  recommendations: LiveAnalysisOutput["recommendation"][];
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
  { href: "/review", label: "Post-Incident Review" },
];

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

function OperationalBadge({ children, tone }: { children: ReactNode; tone?: keyof typeof statusTone }) {
  return (
    <Badge variant="outline" className={cn("rounded-sm font-mono text-[10px] uppercase tracking-widest", tone && statusTone[tone])}>
      {children}
    </Badge>
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
  return evidence.slice(0, 3);
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

function formatSessionClock(sessionStartMs: number, offsetSeconds: number) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(sessionStartMs + Math.max(0, offsetSeconds) * 1000));
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

function mergeLiveAnalysis(previous: LiveAnalysis | null, next: LiveAnalysisOutput & { generatedFrom: string }) {
  const previousEvents = previous?.events ?? [];
  const eventIds = new Set(previousEvents.map((event) => `${event.timestamp}:${onePhrase(event.title)}:${onePhrase(event.evidence)}`));
  const nextEvents = next.events
    .map((event, index) => ({
      ...event,
      id: `${next.generatedAt}-${next.chunkStartSeconds}-${previousEvents.length + index}-${event.id}-${event.source}`,
    }))
    .filter((event) => {
      const eventKey = `${event.timestamp}:${onePhrase(event.title)}:${onePhrase(event.evidence)}`;

      if (eventIds.has(eventKey)) return false;
      eventIds.add(eventKey);
      return true;
    });
  const previousRecommendations = previous?.recommendations ?? [];
  const nextRecommendations = next.recommendation.shouldRecommend
    ? [{ ...next.recommendation, id: `${next.generatedAt}-${next.chunkStartSeconds}-${previousRecommendations.length}-${next.recommendation.id}` }]
    : [];

  return {
    ...next,
    events: [...previousEvents, ...nextEvents],
    recommendations: [...previousRecommendations, ...nextRecommendations],
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
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Incident</span>
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

function AppShell({ state, activeState, selectedIncidentId, onIncidentChange, showSidebar = true, background = "neutral", children }: { state: ScenarioState; activeState: string; selectedIncidentId: string; onIncidentChange: (incidentId: string) => void; showSidebar?: boolean; background?: PageBackgroundKey; children: ReactNode }) {
  const pathname = usePathname();

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.12, ease: "circOut" }}>
      <div className="relative isolate min-h-[100dvh] bg-background text-foreground">
        <PageAmbientBackground background={background} />
        <header className="sticky top-0 z-20 border-b border-command-border bg-background">
          <div className="mx-auto flex min-h-14 max-w-[1760px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-0">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid size-8 place-items-center border border-foreground bg-foreground text-background">
                <Activity aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">SCDF Ops Centre prototype</p>
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
              <OperationalBadge tone={activeState === "concluded" ? "approved" : "pending-review"}>{activeState}</OperationalBadge>
            </div>
          </div>
        </header>

        <div className={cn("relative z-10 mx-auto grid max-w-[1760px] gap-4 p-4 sm:p-6", showSidebar && "xl:grid-cols-[260px_minmax(0,1fr)]")}>
          {showSidebar ? <IncidentSidebar state={state} selectedIncidentId={selectedIncidentId} onIncidentChange={onIncidentChange} /> : null}
          <main className="flex min-w-0 flex-col gap-4">{children}</main>
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

function MarkerDetail({ marker, state, selectedIncidentId }: { marker: DeploymentMarker; state: ScenarioState; selectedIncidentId: string }) {
  const linkedResponder = state.responders.find((responder) => responder.position.lat === marker.position.lat && responder.position.lng === marker.position.lng);
  const linkedIncident = marker.incidentId ? getIncident(state, marker.incidentId) : marker.kind === "incident" ? getIncident(state, selectedIncidentId) : null;

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
              <Button size="sm" className="rounded-sm" render={<Link href={incidentHref("/live", linkedIncident.id)} />} nativeButton={false}>Open live</Button>
              <Button size="sm" variant="outline" className="rounded-sm" render={<Link href={incidentHref("/review", linkedIncident.id)} />} nativeButton={false}>Open review</Button>
            </div>
          </div>
        ) : null}
      </div>
    </motion.aside>
  );
}

function DeploymentMap({ state, selectedIncidentId, selectedMarker, onSelectMarker }: { state: ScenarioState; selectedIncidentId: string; selectedMarker: DeploymentMarker | null; onSelectMarker: (marker: DeploymentMarker) => void }) {
  const [mapsConfig, setMapsConfig] = useState<{ googleMapsApiKey: string; googleMapsMapId: string } | null>(null);
  const apiKey = mapsConfig?.googleMapsApiKey ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapId = mapsConfig?.googleMapsMapId || process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";
  const center = state.deploymentMarkers.find((marker) => marker.incidentId === selectedIncidentId)?.position ?? state.deploymentMarkers[0].position;

  useEffect(() => {
    let mounted = true;

    void fetch("/api/public-config", { cache: "no-store" })
      .then((response) => response.json())
      .then((config: { googleMapsApiKey?: string; googleMapsMapId?: string }) => {
        if (!mounted) return;
        setMapsConfig({ googleMapsApiKey: config.googleMapsApiKey ?? "", googleMapsMapId: config.googleMapsMapId ?? "" });
      })
      .catch(() => {
        if (!mounted) return;
        setMapsConfig({ googleMapsApiKey: "", googleMapsMapId: "" });
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (!apiKey) {
    return (
      <div className="relative min-h-[calc(100dvh-10rem)] overflow-hidden bg-screen p-4 text-screen-foreground">
        <div className="absolute inset-0 deployment-grid opacity-30" />
        <div className="relative flex h-full min-h-[calc(100dvh-12rem)] flex-col justify-between border border-screen-border bg-screen/90 p-4">
          <div className="font-mono text-xs uppercase tracking-widest text-screen-foreground/60">Map fallback, select a marker for details</div>
          <div className="grid gap-3 sm:grid-cols-3">
            {state.deploymentMarkers.map((marker) => (
              <button key={marker.id} type="button" onClick={() => onSelectMarker(marker)} className={cn("border border-screen-border bg-black/35 p-3 text-left transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50", marker.incidentId === selectedIncidentId && "border-accent")}>
                <p className="font-mono text-xs text-screen-foreground/55">{marker.kind}</p>
                <p className="text-sm font-medium">{marker.label}</p>
                <p className="font-mono text-xs text-screen-foreground/55">{marker.position.lat.toFixed(4)}, {marker.position.lng.toFixed(4)}</p>
                <OperationalBadge>{marker.status}</OperationalBadge>
              </button>
            ))}
          </div>
          <AnimatePresence>{selectedMarker ? <MarkerDetail marker={selectedMarker} state={state} selectedIncidentId={selectedIncidentId} /> : null}</AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100dvh-10rem)] border-b border-border">
      <APIProvider apiKey={apiKey}>
        <Map className="h-[calc(100dvh-10rem)] min-h-[620px]" defaultCenter={center} defaultZoom={14} gestureHandling="greedy" disableDefaultUI colorScheme="DARK" mapId={mapId}>
          {state.deploymentMarkers.map((marker) => (
            <AdvancedMarker key={marker.id} position={marker.position} title={`${marker.label}: ${marker.status}`} onClick={() => onSelectMarker(marker)} />
          ))}
        </Map>
      </APIProvider>
      <AnimatePresence>{selectedMarker ? <MarkerDetail marker={selectedMarker} state={state} selectedIncidentId={selectedIncidentId} /> : null}</AnimatePresence>
    </div>
  );
}

function BodycamGrid({ state, incident, responders, mode, playing, activeAudioResponderId, onAudioChange, videoRefs }: { state: ScenarioState; incident: Incident; responders: Responder[]; mode: DemoMode; playing: boolean; activeAudioResponderId: string | null; onAudioChange: (responderId: string | null) => void; videoRefs: MutableRefObject<Record<string, HTMLVideoElement | null>> }) {
  const cue = state.liveAnalysisCue;

  useEffect(() => {
    responders.forEach((responder) => {
      const video = videoRefs.current[responder.id];
      if (!video) return;
      video.muted = activeAudioResponderId !== responder.id;
      if (mode === "escalation" && responder.id === cue.responderId) video.currentTime = cue.timestampSeconds;
      if (playing) void video.play();
      else video.pause();
    });
  }, [activeAudioResponderId, cue.responderId, cue.timestampSeconds, mode, playing, responders, videoRefs]);

  function renderFeed(responder: ScenarioState["responders"][number]) {
    return (
      <button key={responder.id} type="button" onClick={() => onAudioChange(responder.id)} className="min-w-0 bg-screen text-left text-screen-foreground transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
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
        <video
          ref={(node) => {
            videoRefs.current[responder.id] = node;
          }}
          src={responder.videoSrc}
          muted={activeAudioResponderId !== responder.id}
          loop
          playsInline
          className="aspect-video w-full bg-black object-cover"
        />
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
      <div className="min-h-52 bg-screen text-screen-foreground">
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
      </div>
    </div>
  );
}

function EventLog({ analysis }: { analysis: LiveAnalysis | null }) {
  const events = analysis?.events ?? [];

  if (events.length === 0) {
    return <div className="p-3 text-sm text-muted-foreground">Waiting for supported live events.</div>;
  }

  return (
    <div className="max-h-[280px] overflow-y-auto bg-border">
      {events.map((event) => (
        <div key={event.id} className="border-b border-border bg-card px-3 py-2 last:border-b-0">
          <div className="grid min-w-0 gap-3 border border-warning/60 bg-warning/10 p-3 sm:grid-cols-[112px_1fr]">
            {event.evidenceImageUrl ? (
              <div className="relative aspect-video overflow-hidden bg-screen">
                <Image src={event.evidenceImageUrl} alt={conciseReason(event.evidence)} fill unoptimized className="object-cover" sizes="112px" />
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
      ))}
    </div>
  );
}

function RecommendationReview({ analysis }: { analysis: LiveAnalysis | null }) {
  const recommendations = analysis?.recommendations ?? [];
  const [decisions, setDecisions] = useState<Record<string, DecisionReview>>({});
  const [isReviewPending, startReviewTransition] = useTransition();

  function review(recommendation: LiveAnalysisOutput["recommendation"], decisionValue: "approved" | "rejected") {
    startReviewTransition(async () => {
      const response = await fetch("/api/recommendation-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: decisionValue,
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
      <div className="max-h-[360px] overflow-y-auto bg-border">
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
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{onePhrase(recommendation.reason)}</p>
                  </div>
                  {decision ? <OperationalBadge tone={decision.decision}>{decision.decision}</OperationalBadge> : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" className="rounded-sm" onClick={() => review(recommendation, "approved")} disabled={isReviewPending}>
                    <Check data-icon="inline-start" />
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-sm" onClick={() => review(recommendation, "rejected")} disabled={isReviewPending}>
                    Reject
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

function RuntimeEvidenceTimeline({ evidence, sessionStartMs, emptyMessage = "Building the evidence timeline from analyzed video frames." }: { evidence: RuntimeEvidence[]; sessionStartMs: number | null; emptyMessage?: string }) {
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const selectedEvidence = evidence.find((item) => item.frameId === selectedFrameId) ?? evidence[0];

  if (evidence.length === 0) {
    return (
      <div className="bg-screen p-4 text-sm text-screen-foreground/65">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="bg-screen p-4 text-screen-foreground">
      <Timeline defaultValue={evidence.length} className="max-w-none gap-0">
        {evidence.map((item, index) => {
          const selected = item.frameId === selectedEvidence?.frameId;
          const boxes = item.boxes.slice(0, 3).map(insetBox);

          return (
            <TimelineItem key={`${item.frameId}-${index}`} step={index + 1} className="sm:group-data-[orientation=vertical]/timeline:ms-44 group-data-[orientation=vertical]/timeline:not-last:pb-5">
              <TimelineHeader>
                <TimelineSeparator className="bg-screen-foreground/25 group-data-completed/timeline-item:bg-accent" />
                <TimelineDate className="font-mono text-screen-foreground/75 sm:group-data-[orientation=vertical]/timeline:absolute sm:group-data-[orientation=vertical]/timeline:-left-44 sm:group-data-[orientation=vertical]/timeline:w-32 sm:group-data-[orientation=vertical]/timeline:text-right">
                  {formatMountedSessionClock(sessionStartMs, item.frameTimestampSeconds)}
                </TimelineDate>
                <TimelineTitle className="sr-only">{item.name}</TimelineTitle>
                <TimelineIndicator className={cn("border-screen-foreground/50 bg-screen", selected && "border-accent bg-accent")} />
              </TimelineHeader>
              <TimelineContent className="text-screen-foreground">
                <button type="button" onClick={() => setSelectedFrameId(item.frameId)} className={cn("grid w-full gap-3 border bg-black/35 p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:grid-cols-[minmax(320px,1.15fr)_minmax(240px,0.85fr)] xl:grid-cols-[minmax(400px,1.2fr)_minmax(260px,0.8fr)]", selected ? "border-accent" : "border-screen-border hover:border-screen-foreground/50")} aria-pressed={selected}>
                  <div className="relative aspect-video min-h-52 overflow-hidden bg-black">
                    <Image src={item.imageUrl} alt={item.description} fill unoptimized className="object-cover" sizes="(min-width: 1280px) 760px, (min-width: 1024px) 58vw, 100vw" />
                    {boxes.map((box, boxIndex) => (
                      <div key={`${item.frameId}-${box.label}-${boxIndex}`} className="absolute border-2 border-warning bg-warning/15" style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.width}%`, height: `${box.height}%` }}>
                        <span className="absolute left-0 top-0 grid size-5 place-items-center border border-screen bg-warning font-mono text-[10px] font-semibold text-background">{boxIndex + 1}</span>
                      </div>
                    ))}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-screen-foreground">{onePhrase(item.name)}</p>
                    <p className="mt-1 text-sm leading-snug text-screen-foreground/80">{onePhrase(item.description)}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {incidentTags(item.tags).map((tag) => (
                        <span key={tag} className="border border-screen-foreground/60 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-screen-foreground/85">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 grid gap-1 border border-screen-border bg-black/40 p-2">
                      {boxes.map((box, boxIndex) => (
                        <p key={`${item.frameId}-label-${box.label}-${boxIndex}`} className="truncate text-xs text-screen-foreground/80">
                          {boxIndex + 1}. {shortBoxLabel(box.label)}
                        </p>
                      ))}
                      {boxes.length === 0 ? <p className="text-xs text-screen-foreground/65">No localized labels returned for this frame.</p> : null}
                    </div>
                  </div>
                </button>
              </TimelineContent>
            </TimelineItem>
          );
        })}
      </Timeline>
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
    if (!query.trim() || evidence.length === 0) return;

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

  return (
    <div className="flex flex-col gap-3 p-3">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="incident-search">Search analyzed evidence</FieldLabel>
          <div className="flex gap-2">
            <Input id="incident-search" value={query} onChange={(event) => setQuery(event.target.value)} className="h-9 rounded-sm" placeholder="Smoke, flame, entry control" />
            <Button size="sm" className="rounded-sm" onClick={runSearch} disabled={isSearchPending || evidence.length === 0 || !query.trim()}>
              <Search data-icon="inline-start" />
              {isSearchPending ? "Searching" : "Search"}
            </Button>
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
          <p className={cn("font-mono text-[10px] uppercase tracking-widest", decision.decision === "approved" ? "text-success" : "text-destructive")}>{decision.decision} by Ops Centre</p>
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
  const selectedIncident = getIncident(state, selectedIncidentId);
  const dashboardTarget = selectedIncident.status === "review" ? "/review" : "/live";
  const dashboardLabel = selectedIncident.status === "review" ? "Enter review dashboard" : "Enter live dashboard";

  function selectIncident(incidentId: string) {
    setSelectedIncidentId(incidentId);
    setSelectedMarker(state.deploymentMarkers.find((marker) => marker.incidentId === incidentId) ?? null);
    router.replace(incidentHref(pathname, incidentId), { scroll: false });
  }

  return (
    <AppShell state={state} activeState="deployment map" selectedIncidentId={selectedIncidentId} onIncidentChange={selectIncident} showSidebar={false} background="map">
      <section className={cn(commandScope, "overflow-hidden rounded-[var(--radius-shell)] border border-border bg-command text-command-foreground")}>
        <div className="command-texture command-texture-map relative flex min-h-12 flex-wrap items-center justify-between gap-3 overflow-hidden border-b border-border px-4 py-3">
          <HeroImageBackdrop src={heroImages.map} alt="AI generated operations map background" />
          <div className="relative">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Deployment map</p>
            <h2 className="text-sm font-semibold">{selectedIncident.title}</h2>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{selectedIncident.location}</p>
          </div>
          <Button size="lg" className="relative rounded-sm" render={<Link href={incidentHref(dashboardTarget, selectedIncidentId)} />} nativeButton={false}>
            <MapPinned data-icon="inline-start" />
            {dashboardLabel}
          </Button>
        </div>
        <DeploymentMap state={state} selectedIncidentId={selectedIncidentId} selectedMarker={selectedMarker} onSelectMarker={(marker) => {
          setSelectedMarker(marker);
          if (marker.incidentId) selectIncident(marker.incidentId);
        }} />
      </section>
    </AppShell>
  );
}

export function LiveDashboard({ initialState, initialIncidentId }: { initialState: ScenarioState; initialIncidentId: string }) {
  const [state] = useState(initialState);
  const router = useRouter();
  const pathname = usePathname();
  const [selectedIncidentId, setSelectedIncidentId] = useState(initialIncidentId);
  const sessionStartMs = useMountedSessionStart();
  const [mode, setMode] = useState<DemoMode>("live");
  const [playing, setPlaying] = useState(true);
  const [activeAudioResponderId, setActiveAudioResponderId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<LiveAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const liveLoopRef = useRef(false);
  const analyzeInFlightRef = useRef(false);
  const selectedIncident = getIncident(state, selectedIncidentId);
  const incidentResponders = useMemo(() => getIncidentResponders(state, selectedIncident), [selectedIncident, state]);
  const canRunLiveAnalysis = selectedIncident.supportsRuntimeAnalysis && incidentResponders.length > 0;

  function selectIncident(incidentId: string) {
    setMode("live");
    setPlaying(true);
    setActiveAudioResponderId(null);
    setAnalysis(null);
    setAnalysisError(null);
    videoRefs.current = {};
    liveLoopRef.current = false;
    analyzeInFlightRef.current = false;
    setSelectedIncidentId(incidentId);
    router.replace(incidentHref(pathname, incidentId), { scroll: false });
  }

  const analyzeChunk = useCallback((nextTimes?: Record<string, number>) => {
    if (!canRunLiveAnalysis) return;
    if (analyzeInFlightRef.current) return;
    analyzeInFlightRef.current = true;

    startTransition(async () => {
      try {
        setAnalysisError(null);
        const feeds = incidentResponders.map((responder) => {
          const video = videoRefs.current[responder.id];

          return {
            responderId: responder.id,
            videoSrc: responder.videoSrc,
            currentTime: nextTimes?.[responder.id] ?? video?.currentTime ?? 0,
          };
        });

        const response = await fetch("/api/live/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ incidentId: selectedIncident.id, feeds }),
        });
        const result = await response.json();
        if (!response.ok) {
          setAnalysisError(typeof result.error === "string" ? result.error : "Live analysis failed.");
          return;
        }
        setAnalysis((current) => mergeLiveAnalysis(current, result));
      } finally {
        analyzeInFlightRef.current = false;
      }
    });
  }, [canRunLiveAnalysis, incidentResponders, selectedIncident.id, startTransition]);

  useEffect(() => {
    if (!canRunLiveAnalysis) return;
    if (!playing || mode === "concluded") return;

    liveLoopRef.current = true;
    analyzeChunk();
    const interval = window.setInterval(() => {
      if (!liveLoopRef.current) return;
      analyzeChunk();
    }, 8000);

    return () => {
      liveLoopRef.current = false;
      window.clearInterval(interval);
    };
  }, [analyzeChunk, canRunLiveAnalysis, mode, playing]);

  function jumpToEscalation() {
    setMode("escalation");
    const cue = state.liveAnalysisCue;
    const nextTimes = Object.fromEntries(incidentResponders.map((responder) => [responder.id, responder.id === cue.responderId ? cue.timestampSeconds : videoRefs.current[responder.id]?.currentTime ?? 0]));
    const target = videoRefs.current[cue.responderId];
    if (target) target.currentTime = cue.timestampSeconds;
    analyzeChunk(nextTimes);
  }

  function concludeIncident() {
    setMode("concluded");
    setPlaying(false);
  }

  return (
    <AppShell state={state} activeState={mode} selectedIncidentId={selectedIncidentId} onIncidentChange={selectIncident} showSidebar={false} background="live">
      <section className={cn(commandScope, "overflow-hidden rounded-[var(--radius-shell)] border border-border bg-command text-command-foreground")}>
        <div className="grid gap-px bg-border lg:grid-cols-[1fr_auto]">
          <div className="command-texture command-texture-live relative overflow-hidden bg-card p-4">
            <HeroImageBackdrop src={heroImages.live} alt="AI generated live bodycam feed background" />
            <div className="relative">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Live operations</p>
              <h2 className="mt-1 text-lg font-semibold">{selectedIncident.title}</h2>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{selectedIncident.location}</p>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{canRunLiveAnalysis ? "Monitor bodycams while live analysis adds supported events." : selectedIncident.unavailableReason ?? "No live footage is attached."}</p>
              <p className="mt-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">{canRunLiveAnalysis ? (isPending ? "Analyzing current feeds" : "Continuous analysis active") : "Runtime analysis unavailable"}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 bg-card p-4 lg:justify-end">
            <Button size="lg" variant="outline" className="rounded-sm" onClick={() => setPlaying((value) => !value)} disabled={!canRunLiveAnalysis}>
              {playing ? <Pause data-icon="inline-start" /> : <Play data-icon="inline-start" />}
              {playing ? "Pause" : "Resume"}
            </Button>
            <Button size="lg" variant="outline" className="rounded-sm" onClick={() => setActiveAudioResponderId(null)} disabled={!canRunLiveAnalysis || activeAudioResponderId === null}>
              <VolumeX data-icon="inline-start" />
              Mute all
            </Button>
            <Button size="lg" variant="destructive" className="rounded-sm" onClick={jumpToEscalation} disabled={!canRunLiveAnalysis || isPending}>
              <FastForward data-icon="inline-start" />
              Advance feeds
            </Button>
            <Button size="lg" variant="outline" className="rounded-sm" render={<Link href={incidentHref("/review", selectedIncidentId)} />} nativeButton={false}>
              <Search data-icon="inline-start" />
              Open incident review
            </Button>
            <Button size="lg" variant="destructive" className="rounded-sm" onClick={concludeIncident} disabled={!canRunLiveAnalysis}>
              <Square data-icon="inline-start" />
              Conclude incident
            </Button>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel title="Live responder feeds" label="Feeds">
          <BodycamGrid state={state} incident={selectedIncident} responders={incidentResponders} mode={mode} playing={playing} activeAudioResponderId={activeAudioResponderId} onAudioChange={setActiveAudioResponderId} videoRefs={videoRefs} />
        </Panel>

        <div className="grid gap-4 xl:sticky xl:top-20">
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
            <EventLog analysis={analysis} />
          </Panel>
          <RecommendationReview analysis={analysis} />
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
  const [hasEvidenceFilter, setHasEvidenceFilter] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isExportPending, startExportTransition] = useTransition();
  const analysisStartedRef = useRef(false);
  const sessionStartMs = useMountedSessionStart();
  const selectedIncident = getIncident(state, selectedIncidentId);
  const incidentResponders = useMemo(() => getIncidentResponders(state, selectedIncident), [selectedIncident, state]);
  const canRunReviewAnalysis = selectedIncident.supportsRuntimeAnalysis && incidentResponders.length > 0;
  const canExportReport = sessionStartMs !== null && Boolean(analysis) && activeEvidence.length > 0 && !isExportPending;

  function selectIncident(incidentId: string) {
    setAnalysis(null);
    setAnalysisError(null);
    setExportError(null);
    setActiveEvidence([]);
    setHasEvidenceFilter(false);
    analysisStartedRef.current = false;
    setSelectedIncidentId(incidentId);
    router.replace(incidentHref(pathname, incidentId), { scroll: false });
  }

  const runAnalysis = useCallback(() => {
    if (!canRunReviewAnalysis) return;
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
      const normalizedAnalysis = {
        ...result,
        evidence: result.evidence,
        recommendations: result.recommendations,
      };
      setAnalysis(normalizedAnalysis);
      setActiveEvidence([...normalizedAnalysis.evidence].sort((a, b) => a.order - b.order));
      setHasEvidenceFilter(false);
    });
  }, [canRunReviewAnalysis, incidentResponders, selectedIncident.id, startTransition]);

  useEffect(() => {
    if (!canRunReviewAnalysis) return;
    if (analysisStartedRef.current) return;
    analysisStartedRef.current = true;
    runAnalysis();
  }, [canRunReviewAnalysis, runAnalysis]);

  function exportReport() {
    if (!analysis || activeEvidence.length === 0 || sessionStartMs === null) return;

    startExportTransition(async () => {
      setExportError(null);
      const exportEvidence = topEvidence(activeEvidence);
      const exportAnalysis = {
        ...analysis,
        evidence: exportEvidence.map((item) => ({
          frameId: item.frameId,
          sourceVideo: item.sourceVideo,
          responderId: item.responderId,
          sourceResponder: item.sourceResponder,
          frameTimestampSeconds: item.frameTimestampSeconds,
          timestampLabel: formatMountedSessionClock(sessionStartMs, item.frameTimestampSeconds),
          imageUrl: item.imageUrl,
            order: item.order,
          name: item.name,
          description: item.description,
          tags: incidentTags(item.tags),
          boxes: item.boxes.slice(0, 3).map((box) => ({ ...box, label: shortBoxLabel(box.label) })),
        })),
        recommendations: analysis.recommendations
          .map((recommendation) => ({
            ...recommendation,
            order: recommendation.order,
            evidenceFrameIds: recommendation.evidenceFrameIds.filter((frameId) => exportEvidence.some((item) => item.frameId === frameId)),
          }))
          .filter((recommendation) => recommendation.evidenceFrameIds.length > 0),
      };
      const response = await fetch("/api/report/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis: exportAnalysis }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setExportError(typeof payload.error === "string" ? payload.error : "Report export failed.");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "1stsight-runtime-evidence-report.pdf";
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <AppShell state={state} activeState="post-incident review" selectedIncidentId={selectedIncidentId} onIncidentChange={selectIncident} showSidebar={false} background="review">
      <section className={cn(commandScope, "overflow-hidden rounded-[var(--radius-shell)] border border-border bg-command text-command-foreground")}>
        <div className="grid gap-px bg-border lg:grid-cols-[1fr_auto]">
          <div className="command-texture command-texture-review relative overflow-hidden bg-card p-4">
            <HeroImageBackdrop src={heroImages.review} alt="AI generated evidence review background" />
            <div className="relative">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Post-incident review</p>
              <h2 className="mt-1 text-lg font-semibold">{selectedIncident.title}</h2>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{selectedIncident.location}</p>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{canRunReviewAnalysis ? "Evidence is extracted automatically from the current videos." : selectedIncident.unavailableReason ?? "No review footage is attached."}</p>
              <p className="mt-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">{canRunReviewAnalysis ? (isPending ? "Analyzing current feeds" : analysis ? `${activeEvidence.length} evidence item${activeEvidence.length === 1 ? "" : "s"}${hasEvidenceFilter ? " filtered" : ""}` : "Queued for analysis") : "Runtime analysis unavailable"}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 bg-card p-4 lg:justify-end">
            <Button size="lg" variant="outline" className="rounded-sm" onClick={runAnalysis} disabled={!canRunReviewAnalysis || isPending}>
              <Search data-icon="inline-start" />
              {isPending ? "Analyzing" : "Refresh analysis"}
            </Button>
            <Button size="lg" variant="outline" className="rounded-sm" onClick={exportReport} disabled={!canRunReviewAnalysis || !canExportReport}>
              <Download data-icon="inline-start" />
              {isExportPending ? "Exporting" : "Export PDF"}
            </Button>
          </div>
        </div>
      </section>

      {analysisError ? <div className="border border-destructive bg-command p-3 text-sm text-destructive">{analysisError}</div> : null}
      {exportError ? <div className="border border-destructive bg-command p-3 text-sm text-destructive">{exportError}</div> : null}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <Panel title="Evidence timeline" label="Evidence">
          <RuntimeEvidenceTimeline evidence={analysis ? activeEvidence : []} sessionStartMs={sessionStartMs} emptyMessage={canRunReviewAnalysis ? "Building the evidence timeline from analyzed video frames." : selectedIncident.unavailableReason ?? "No review footage is attached."} />
        </Panel>

        <Panel title="Search" label="Secondary" tone="paper" className="h-fit xl:sticky xl:top-20">
          <RuntimeSearchPanel incidentId={selectedIncident.id} evidence={analysis?.evidence ?? []} onResultsChange={(items, hasFilter) => {
            setActiveEvidence(items);
            setHasEvidenceFilter(hasFilter);
          }} />
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Panel title="Ops Centre recommendations" label="Review">
          <div className="divide-y divide-border">
            {analysis?.recommendations.length ? analysis.recommendations.map((item) => (
              <div key={item.id} className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{item.evidenceFrameIds.length} evidence frame{item.evidenceFrameIds.length === 1 ? "" : "s"}</span>
                </div>
                <p className="mt-2 text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.reason}</p>
              </div>
            )) : (
              <div className="p-4 text-sm text-muted-foreground">Recommendations appear after runtime analysis returns evidence.</div>
            )}
          </div>
        </Panel>

        <Panel title="Generate incident PDF" label="Report" tone="paper">
          <div className="p-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {canRunReviewAnalysis ? (analysis ? `Export top ${Math.min(activeEvidence.length, 3)} current evidence screenshot${Math.min(activeEvidence.length, 3) === 1 ? "" : "s"}.` : "Analysis starts automatically.") : "Export is disabled until footage is available."}
            </p>
            {analysis ? (
              <Button size="sm" variant="outline" className="mt-4 rounded-sm" onClick={exportReport} disabled={!canRunReviewAnalysis || !canExportReport}>
                <Download data-icon="inline-start" />
                {isExportPending ? "Exporting" : "Download report"}
              </Button>
            ) : null}
          </div>
        </Panel>
      </div>

    </AppShell>
  );
}
