import React from "react";
import { NextRequest } from "next/server";
// npm install pptxgenjs
// PptxGenJS Quick Start: https://github.com/gitbrent/pptxgenjs/blob/master/README.md
import PptxGenJS from "pptxgenjs";
// React PDF Node API: https://react-pdf.org/node
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { z } from "zod";
import type { DecisionReview, IncidentMilestone } from "@/lib/domain";
import { getDecisionReviews } from "@/lib/decision-store";
import { getIncidentById, getIncidentResponders, supportsAarBriefingSlides } from "@/lib/scenario";

export const runtime = "nodejs";

// React PDF Font API: https://react-pdf.org/fonts#registerhyphenationcallback
Font.registerHyphenationCallback((word) => [word]);

const runtimeBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  label: z.string(),
});

const runtimeEvidenceSchema = z.object({
  frameId: z.string(),
  sourceVideo: z.string(),
  responderId: z.string(),
  sourceResponder: z.string(),
  frameTimestampSeconds: z.number(),
  timestampLabel: z.string(),
  imageUrl: z.string(),
  order: z.number().optional(),
  rank: z.number().optional(),
  name: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  boxes: z.array(runtimeBoxSchema),
});

const runtimeRecommendationSchema = z.object({
  id: z.string(),
  order: z.number().optional(),
  rank: z.number().optional(),
  title: z.string(),
  reason: z.string(),
  evidenceFrameIds: z.array(z.string()),
});

const runtimeDecisionReviewSchema = z.object({
  id: z.string(),
  recommendationId: z.string(),
  incidentId: z.string().optional(),
  reviewer: z.string(),
  decision: z.enum(["approved", "rejected", "edited"]),
  reason: z.string(),
  timestamp: z.string(),
});

const runtimeAnalysisSchema = z.object({
  incidentId: z.string(),
  incidentTitle: z.string(),
  summary: z.string(),
  generatedFrom: z.string(),
  evidence: z.array(runtimeEvidenceSchema).min(1),
  recommendations: z.array(runtimeRecommendationSchema),
  decisionReviews: z.array(runtimeDecisionReviewSchema).optional(),
});

const runtimeMilestoneSchema = z.object({
  id: z.string(),
  label: z.string(),
  timestamp: z.string().optional(),
  displayTime: z.string(),
  sourceType: z.enum(["dispatch-system", "footage", "officer-entered"]),
  sourceLabel: z.string(),
  status: z.enum(["pending", "unavailable", "confirmed"]),
  notes: z.string().optional(),
  evidenceRef: z.string().optional(),
});

const bodySchema = z.object({
  analysis: runtimeAnalysisSchema,
  milestoneIds: z.array(z.string()).optional(),
  milestones: z.array(runtimeMilestoneSchema).optional(),
});

const colors = {
  graphite: "#1f2024",
  ink: "#15161a",
  muted: "#63666f",
  line: "#d5d8df",
  paper: "#f6f7f5",
  amber: "#c77b16",
  red: "#b6402f",
  green: "#2f7d56",
  blue: "#2e608f",
  white: "#ffffff",
};

const styles = StyleSheet.create({
  slide: { padding: 24, fontSize: 12, color: colors.ink, fontFamily: "Helvetica", backgroundColor: colors.paper },
  darkSlide: { padding: 24, fontSize: 12, color: colors.white, fontFamily: "Helvetica", backgroundColor: colors.graphite },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14, paddingBottom: 8, borderBottom: `1 solid ${colors.line}` },
  darkHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14, paddingBottom: 8, borderBottom: "1 solid #44474f" },
  eyebrow: { fontSize: 9, textTransform: "uppercase", letterSpacing: 1.8, color: colors.muted },
  darkEyebrow: { fontSize: 9, textTransform: "uppercase", letterSpacing: 1.8, color: "#cfd2d8" },
  slideNumber: { fontSize: 9, textTransform: "uppercase", letterSpacing: 1.2, color: colors.muted },
  darkSlideNumber: { fontSize: 9, textTransform: "uppercase", letterSpacing: 1.2, color: "#cfd2d8" },
  title: { fontSize: 30, lineHeight: 1.08, fontWeight: 700, marginBottom: 10 },
  darkTitle: { fontSize: 30, lineHeight: 1.08, fontWeight: 700, marginBottom: 10, color: colors.white },
  subtitle: { fontSize: 13, lineHeight: 1.35, color: colors.muted },
  darkSubtitle: { fontSize: 13, lineHeight: 1.35, color: "#d8dbe2" },
  grid2: { flexDirection: "row", gap: 14 },
  grid3: { flexDirection: "row", gap: 10 },
  col: { flex: 1 },
  metric: { border: `1 solid ${colors.line}`, padding: 10, minHeight: 94, backgroundColor: colors.white },
  metricDark: { border: "1 solid #44474f", padding: 10, minHeight: 94, backgroundColor: "#272932" },
  metricLabel: { fontSize: 9, textTransform: "uppercase", letterSpacing: 1.1, color: colors.muted, marginBottom: 6 },
  metricValue: { fontSize: 13.5, fontWeight: 700, lineHeight: 1.22 },
  metricNote: { fontSize: 9, color: colors.muted, lineHeight: 1.22, marginTop: 5 },
  timelineGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  milestone: { width: "23.8%", border: `1 solid ${colors.line}`, padding: 8, minHeight: 74, backgroundColor: colors.white },
  milestonePending: { border: `1 solid ${colors.amber}`, backgroundColor: "#fff6e8" },
  milestoneUnavailable: { border: "1 solid #c9cbd1", backgroundColor: "#eceef1" },
  milestoneLabel: { fontSize: 9, textTransform: "uppercase", letterSpacing: 0.8, color: colors.muted, marginBottom: 5 },
  milestoneTime: { fontSize: 15, fontWeight: 700, marginBottom: 4 },
  milestoneSource: { fontSize: 9, lineHeight: 1.22, color: colors.muted },
  evidenceGrid: { flexDirection: "row", gap: 12 },
  evidenceCard: { flex: 1, border: "1 solid #44474f", backgroundColor: "#18191e", padding: 8, minHeight: 300 },
  frameWrap: { height: 170, backgroundColor: "#050608", alignItems: "center", justifyContent: "center", marginBottom: 8, overflow: "hidden", position: "relative" },
  frameImage: { width: "100%", height: 170, objectFit: "cover" },
  frameBox: { position: "absolute", border: `2 solid ${colors.amber}`, backgroundColor: "rgba(199, 123, 22, 0.10)" },
  evidenceTitle: { color: colors.white, fontSize: 14, fontWeight: 700, lineHeight: 1.2, marginBottom: 5 },
  evidenceBody: { color: "#d8dbe2", fontSize: 10.5, lineHeight: 1.25, marginBottom: 6 },
  evidenceSource: { color: "#f0b45d", fontSize: 9, lineHeight: 1.22 },
  finding: { border: `1 solid ${colors.line}`, padding: 10, backgroundColor: colors.white, marginBottom: 8, minHeight: 82 },
  findingTitle: { fontSize: 12.5, fontWeight: 700, marginBottom: 5 },
  findingBody: { fontSize: 10.5, color: colors.muted, lineHeight: 1.28 },
  recommendation: { border: `1 solid ${colors.line}`, padding: 9, marginBottom: 7, backgroundColor: colors.white },
  footer: { position: "absolute", bottom: 14, left: 24, right: 24, fontSize: 9, color: colors.muted, borderTop: `1 solid ${colors.line}`, paddingTop: 6 },
  darkFooter: { position: "absolute", bottom: 14, left: 24, right: 24, fontSize: 9, color: "#cfd2d8", borderTop: "1 solid #44474f", paddingTop: 6 },
});

type RuntimeAnalysis = z.infer<typeof runtimeAnalysisSchema>;
type RuntimeEvidence = z.infer<typeof runtimeEvidenceSchema>;
type RuntimeRecommendation = z.infer<typeof runtimeRecommendationSchema>;
type RuntimeDecisionReview = z.infer<typeof runtimeDecisionReviewSchema>;
type RuntimeMilestone = IncidentMilestone;
type PptxSlide = ReturnType<InstanceType<typeof PptxGenJS>["addSlide"]>;

const incidentLevelTags = new Set(["fire escalation", "fire response", "ground operations", "entry approach", "entry control", "smoke spread", "visibility", "deployment", "blocked access", "unsafe entry", "hazmat", "medical assistance", "responder safety", "physical contact", "unsafe proximity", "crew intervention", "patient movement", "medical", "civil", "hazard", "incident"]);
const maxBriefingEvidenceCount = 8;
// hermes agent: priority order for Punggol AAR briefing evidence.
const briefingEvidenceFramePriority = [
  "demo-fire-b-76_5s-escalation-etf",
  "demo-fire-b-130_75s-sustained-escalation",
  "demo-fire-c-63_25s-entry-control",
  "demo-punggol-post-fire-a-19_25s-welfare-check",
  "demo-punggol-post-fire-a-36_25s-unsafe-proximity",
  "demo-punggol-post-fire-a-45_25s-contact-evidence",
  "demo-punggol-post-fire-b-36_5s-impact-recovery",
  "demo-punggol-post-fire-b-47_5s-spacing-maintained-after-contact",
];

function incidentTags(tags: string[]) {
  return tags
    .map((tag) => tag.toLowerCase().replace(/-/g, " "))
    .map((tag) => {
      if (tag.includes("responder safety")) return "responder safety";
      if (tag.includes("physical")) return "physical contact";
      if (tag.includes("proximity")) return "unsafe proximity";
      if (tag.includes("crew")) return "crew intervention";
      if (tag.includes("patient")) return "patient movement";
      if (tag.includes("medical") || tag.includes("casualty") || tag.includes("ambulance")) return "medical assistance";
      if (tag.includes("entry")) return "entry approach";
      if (tag.includes("smoke")) return "smoke spread";
      if (tag.includes("flame") || tag.includes("fire")) return "fire escalation";
      if (tag.includes("hazmat") || tag.includes("chemical") || tag.includes("gas")) return "hazmat";
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
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;

  const clipped = text.slice(0, maxLength - 1).trim();
  const wordBoundary = clipped.lastIndexOf(" ");
  const safeClip = wordBoundary > maxLength * 0.6 ? clipped.slice(0, wordBoundary).trim() : clipped;
  return `${safeClip}…`;
}

// Generated by Hermes Agent: compact AAR slide evidence provenance for stage-readable exports.
function sourceFeedLabel(item: RuntimeEvidence) {
  if (item.responderId === "ff-a" || /fire-feed-a|wei-jie/i.test(item.sourceVideo)) return "Bodycam A";
  if (item.responderId === "ff-b" || /fire-feed-b|hafiz/i.test(item.sourceVideo)) return "Bodycam B";
  if (item.responderId === "ff-c" || /fire-feed-c/i.test(item.sourceVideo)) return "Bodycam C";
  if (item.responderId === "med-woodlands-a" || /woodlands/i.test(item.sourceVideo)) return "Bodycam W1";
  return "BWC";
}

function sourceReference(item: RuntimeEvidence) {
  return `${sourceFeedLabel(item)} / ${item.timestampLabel}`;
}

function sourceCoverageReference(item: RuntimeEvidence) {
  return sourceFeedLabel(item);
}

function validateIncidentEvidence(analysis: RuntimeAnalysis) {
  const responders = getIncidentResponders(analysis.incidentId);
  const responderIds = new Set(responders.map((responder) => responder.id));
  const sourceVideos = new Set(responders.flatMap((responder) => [responder.videoSrc, ...(responder.reviewVideoSrcs ?? [])]));
  const invalidEvidence = analysis.evidence.find((item) => !responderIds.has(item.responderId) || !sourceVideos.has(item.sourceVideo));

  if (invalidEvidence) {
    throw new Error("AAR briefing slide evidence must belong to the selected incident responder footage.");
  }
}

function sourceReferences(evidence: RuntimeEvidence[]) {
  const detailedRefs = Array.from(new Set(evidence.map(sourceReference)));

  if (detailedRefs.length <= 2) return detailedRefs.join("; ");

  const coverage = Array.from(new Set(evidence.map(sourceCoverageReference))).sort().join(", ");
  return `${coverage}; ${detailedRefs.length} selected timestamp${detailedRefs.length === 1 ? "" : "s"} shown on evidence cards`;
}

function evidenceChronologyKey(item: RuntimeEvidence) {
  const postFireOffset = /punggol-post-fire/i.test(item.sourceVideo) ? 10000 : 0;
  return postFireOffset + item.frameTimestampSeconds;
}

function evidenceBriefingScore(item: RuntimeEvidence) {
  const text = `${item.frameId} ${item.name} ${item.description} ${item.tags.join(" ")} ${item.boxes.map((box) => box.label).join(" ")}`.toLowerCase();
  let score = 0;

  // hermes agent: rank selected evidence for aar sequence slides.
  if (/physical contact|contact evidence|hand contact|hands? \/ arms? meet|responder-side hand contact/.test(text)) score += 120;
  if (/impact|recovery|withdrawal/.test(text)) score += 105;
  if (/crew intervention|spacing/.test(text)) score += 95;
  if (/unsafe proximity|close proximity|close-range|near responder|responder-side space/.test(text)) score += 90;
  if (/sustained flame|fire escalation|flame growth|fire growth|visible flame|flame front/.test(text)) score += 88;
  if (/entry-control|entry control|entry approach|smoke|visibility/.test(text)) score += 70;
  if (/welfare check|post-fire sweep|corridor sweep/.test(text)) score += 65;
  if (/fire response|ground operations|hose line|operating area/.test(text)) score += 55;
  if (/demo-/.test(item.frameId)) score += 8;

  return score;
}

function topBriefingEvidence(evidence: RuntimeEvidence[]) {
  const evidenceByFrameId = new Map(evidence.map((item) => [item.frameId, item]));
  const priorityEvidence = briefingEvidenceFramePriority.flatMap((frameId) => {
    const item = evidenceByFrameId.get(frameId);
    return item ? [item] : [];
  });
  const priorityFrameIds = new Set(priorityEvidence.map((item) => item.frameId));
  const fallbackEvidence = [...evidence]
    .filter((item) => !priorityFrameIds.has(item.frameId))
    .sort((a, b) => evidenceBriefingScore(b) - evidenceBriefingScore(a) || (a.order ?? a.rank ?? 0) - (b.order ?? b.rank ?? 0));

  return [...priorityEvidence, ...fallbackEvidence]
    .slice(0, maxBriefingEvidenceCount)
    .sort((a, b) => evidenceChronologyKey(a) - evidenceChronologyKey(b));
}

function sequenceEvidenceItems(evidence: RuntimeEvidence[], milestones: IncidentMilestone[]) {
  const milestoneByEvidenceRef = new Map(
    milestones
      .filter((item) => item.status === "confirmed" && item.evidenceRef)
      .map((item) => [item.evidenceRef, item]),
  );

  return evidence.map((item) => {
    const milestone = milestoneByEvidenceRef.get(item.frameId);
    const displayTime = milestone?.displayTime ?? item.timestampLabel;
    const title = milestone?.label ?? item.name;
    const milestoneNote = milestone?.notes ? `${milestone.notes} ` : "";

    return {
      title,
      body: `${displayTime} · ${milestoneNote}${item.description} BWC: ${sourceReference(item)}.`,
    };
  });
}

function briefingMilestones(incidentId: string, milestoneIds?: string[], runtimeMilestones?: RuntimeMilestone[]) {
  const incident = getIncidentById(incidentId);
  const sourceMilestones = runtimeMilestones?.length ? runtimeMilestones : incident?.milestones;
  const selectableMilestones = sourceMilestones?.filter((item) => item.status !== "unavailable") ?? [];

  if (!milestoneIds?.length) return selectableMilestones;

  const selectedIds = new Set(milestoneIds);
  return selectableMilestones.filter((item) => selectedIds.has(item.id));
}

function frameRefs(recommendation: RuntimeRecommendation, evidence: RuntimeEvidence[]) {
  const byId = new Map(evidence.map((item) => [item.frameId, item]));
  return recommendation.evidenceFrameIds.flatMap((frameId) => {
    const item = byId.get(frameId);
    return item ? [sourceReference(item)] : [];
  });
}

function sanitizeAnalysis(analysis: RuntimeAnalysis): RuntimeAnalysis {
  const incident = getIncidentById(analysis.incidentId);

  if (!incident) {
    throw new Error("Incident was not found.");
  }

  if (!supportsAarBriefingSlides(incident.id)) {
    throw new Error("AAR briefing slides are unavailable for this incident in the presentation flow.");
  }

  if (!incident.supportsRuntimeAnalysis) {
    throw new Error(incident.unavailableReason ?? "AAR briefing slide PDF is unavailable for this incident.");
  }

  validateIncidentEvidence(analysis);

  const evidence = [...analysis.evidence]
    .sort((a, b) => (a.order ?? a.rank ?? 0) - (b.order ?? b.rank ?? 0))
    .map((item, index) => ({
      ...item,
      order: item.order ?? item.rank ?? index + 1,
      name: truncate(item.name, 72),
      description: truncate(item.description, 150),
      tags: incidentTags(item.tags),
      boxes: item.boxes.slice(0, 3).map((box) => ({ ...box, label: shortBoxLabel(box.label) })),
    }));
  const evidenceFrameIds = new Set(evidence.map((item) => item.frameId));

  return {
    ...analysis,
    evidence,
    recommendations: analysis.recommendations
      .map((recommendation, index) => ({
        ...recommendation,
        order: recommendation.order ?? recommendation.rank ?? index + 1,
        title: truncate(recommendation.title, 72),
        reason: truncate(recommendation.reason, 135),
        evidenceFrameIds: recommendation.evidenceFrameIds.filter((frameId) => evidenceFrameIds.has(frameId)),
      }))
      .filter((recommendation) => recommendation.evidenceFrameIds.length > 0),
  };
}

function milestoneSourceLabel(milestone: IncidentMilestone) {
  const source = milestone.sourceType === "dispatch-system" ? "system" : milestone.sourceType === "officer-entered" ? "officer" : "footage";
  return `${source} / ${milestone.sourceLabel}`;
}

function evidenceChallenges(evidence: RuntimeEvidence[]) {
  const refs = sourceReferences(evidence);
  const hasResponderSafety = evidence.some((item) => item.tags.some((tag) => /responder safety|physical contact|unsafe proximity/i.test(tag)));
  const hasCrewIntervention = evidence.some((item) => item.tags.some((tag) => /crew intervention|patient movement/i.test(tag)));
  const hasFireEscalation = evidence.some((item) => item.tags.some((tag) => /fire escalation|smoke spread|visibility/i.test(tag)));

  return [
    {
      title: hasResponderSafety ? "Responder-safety risk in post-fire welfare check" : hasFireEscalation ? "Fire escalation requires command review" : "Incident interaction requires officer review",
      body: `${hasResponderSafety ? "Selected frames show unsafe proximity or physical-contact indicators without assigning legal intent." : hasFireEscalation ? "Selected frames show fire or smoke escalation requiring GC review." : "Selected frames require officer interpretation before final AAR wording."} BWC coverage: ${refs}.`,
    },
    {
      title: hasCrewIntervention ? "Crew intervention visible in current footage" : "Formal operational sequence remains incomplete",
      body: `${hasCrewIntervention ? "Crew movement/intervention can be reviewed against the bodycam timeline." : "Formal records should come from system/officer inputs where footage cannot confirm them."} BWC coverage: ${refs}.`,
    },
  ];
}

function doneWell(evidence: RuntimeEvidence[]) {
  const refs = sourceReferences(evidence);
  return [
    { title: "Available BWC retained scene context", body: `Evidence frames preserve source, timestamp, and responder identity. BWC coverage: ${refs}.` },
    { title: "AAR claims remain evidence-linked", body: `Selected observations are tied to frame-level references instead of unsupported narrative. BWC coverage: ${refs}.` },
  ];
}

function improvements(milestones: IncidentMilestone[]) {
  const pending = milestones.filter((item) => item.status === "pending").slice(0, 3);
  const pendingLabels = pending.map((item) => item.label).join(", ") || "formal dispatch and handover milestones";

  return [
    { title: "Complete formal timestamp provenance", body: `${pendingLabels} remain pending officer/system input before final AAR use.` },
    { title: "Confirm officer-reviewed follow-up", body: "Add reviewed follow-up decisions and any receiving-facility/handover records before archival use." },
  ];
}

function decisionLabel(decision: DecisionReview["decision"] | RuntimeDecisionReview["decision"]) {
  if (decision === "approved") return "Marked for GC consideration";
  if (decision === "rejected") return "Held from GC summary";
  return "Edited by Ops Centre";
}

type AarSection = {
  title: string;
  subtitle?: string;
  items: Array<{ title: string; body: string }>;
  evidence?: RuntimeEvidence[];
  dark?: boolean;
};

function nonEmptySections(sections: AarSection[]) {
  return sections.filter((section) => section.items.length > 0 || (section.evidence?.length ?? 0) > 0);
}

function chunkItems<T>(items: T[], chunkSize: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) chunks.push(items.slice(index, index + chunkSize));
  return chunks;
}

function paginateAarSections(sections: AarSection[]) {
  return sections.flatMap((section) => {
    const slides: AarSection[] = [];
    const evidenceChunks = chunkItems(section.evidence ?? [], 2);
    const itemChunks = chunkItems(section.items, 3);

    evidenceChunks.forEach((evidence, index) => {
      slides.push({
        title: evidenceChunks.length + itemChunks.length > 1 ? `${section.title} (${index + 1})` : section.title,
        subtitle: section.subtitle,
        items: [],
        evidence,
        dark: section.dark,
      });
    });

    itemChunks.forEach((items, index) => {
      const offset = evidenceChunks.length;
      slides.push({
        title: evidenceChunks.length + itemChunks.length > 1 ? `${section.title} (${offset + index + 1})` : section.title,
        subtitle: index === 0 && evidenceChunks.length === 0 ? section.subtitle : section.subtitle ? `${section.subtitle} · continued` : "Continued",
        items,
        dark: false,
      });
    });

    return slides;
  });
}

function buildAarSections(analysis: RuntimeAnalysis, milestones: IncidentMilestone[]): AarSection[] {
  const incident = getIncidentById(analysis.incidentId);
  const pending = milestones.filter((item) => item.status === "pending");
  const briefingEvidence = topBriefingEvidence(analysis.evidence);
  const evidenceRefs = sourceReferences(analysis.evidence);
  const briefingEvidenceRefs = sourceReferences(briefingEvidence);
  const recommendationItems = analysis.recommendations.map((item) => ({
    title: item.title,
    body: `${item.reason} BWC: ${frameRefs(item, analysis.evidence).join("; ") || evidenceRefs}.`,
  }));
  const decisionItems = (analysis.decisionReviews ?? []).map((item) => ({
    title: decisionLabel(item.decision),
    body: `${item.reason} Source timestamp: ${item.timestamp}.`,
  }));

  return nonEmptySections([
    {
      title: "Brief background",
      subtitle: incident?.title ?? analysis.incidentTitle,
      items: [
        { title: "Incident", body: incident?.summary ?? analysis.summary },
        { title: "Location", body: incident?.location ?? analysis.incidentTitle },
        { title: "Evidence basis", body: `${briefingEvidence.length} priority BWC frame${briefingEvidence.length === 1 ? "" : "s"} selected from ${analysis.evidence.length} review frame${analysis.evidence.length === 1 ? "" : "s"}. BWC coverage: ${briefingEvidenceRefs}.` },
      ],
    },
    {
      title: "Area of operations",
      subtitle: incident?.location,
      items: [
        { title: "Operating area", body: incident?.location ?? analysis.incidentTitle },
        { title: "Responder coverage", body: Array.from(new Set(briefingEvidence.map(sourceCoverageReference))).sort().join(", ") },
      ],
    },
    {
      title: "Sequence of events",
      subtitle: "Top confirmed evidence",
      items: sequenceEvidenceItems(briefingEvidence, milestones),
    },
    {
      title: "SCDF's responses",
      subtitle: "Actions reflected in selected evidence",
      items: briefingEvidence.slice(0, 6).map((item) => ({ title: item.name, body: `${item.description} BWC: ${sourceReference(item)}.` })),
      evidence: briefingEvidence,
      dark: true,
    },
    { title: "Challenges", subtitle: "Issues for AAR discussion", items: evidenceChallenges(briefingEvidence) },
    { title: "Areas done well", subtitle: "Evidence-linked strengths", items: doneWell(briefingEvidence) },
    { title: "Areas for improvement", subtitle: "Follow-up before final use", items: improvements(milestones) },
    {
      title: "Actions taken",
      subtitle: "Officer / agency follow-up",
      items: [
        ...recommendationItems,
        ...decisionItems,
        ...pending.slice(0, 4).map((item) => ({ title: item.label, body: `${item.displayTime}. Input needed: ${milestoneSourceLabel(item)}.` })),
      ],
    },
  ]);
}

function SlideHeader({ section, page }: { section: string; page: string }) {
  return React.createElement(
    View,
    { style: styles.header },
    React.createElement(Text, { style: styles.eyebrow }, section),
    React.createElement(Text, { style: styles.slideNumber }, page),
  );
}

function DarkSlideHeader({ section, page }: { section: string; page: string }) {
  return React.createElement(
    View,
    { style: styles.darkHeader },
    React.createElement(Text, { style: styles.darkEyebrow }, section),
    React.createElement(Text, { style: styles.darkSlideNumber }, page),
  );
}

function Footer({ dark = false }: { dark?: boolean }) {
  return React.createElement(Text, { style: dark ? styles.darkFooter : styles.footer }, "1stSight AAR briefing slides for officer review. Formal incident records not supplied to this workflow are marked pending officer input.");
}

function SectionSlide({ section, page }: { section: AarSection; page: string }) {
  const dark = Boolean(section.dark);
  return React.createElement(
    Page,
    { size: "A4", orientation: "landscape", style: dark ? styles.darkSlide : styles.slide },
    dark ? React.createElement(DarkSlideHeader, { section: section.title, page }) : React.createElement(SlideHeader, { section: section.title, page }),
    React.createElement(Text, { style: dark ? styles.darkTitle : styles.title }, section.title),
    section.subtitle ? React.createElement(Text, { style: dark ? styles.darkSubtitle : styles.subtitle }, section.subtitle) : null,
    section.evidence?.length
      ? React.createElement(
          View,
          { style: { ...styles.evidenceGrid, marginTop: 12 } },
          section.evidence.slice(0, 3).map((item) =>
            React.createElement(
              View,
              { key: item.frameId, style: styles.evidenceCard },
              React.createElement(
                View,
                { style: styles.frameWrap },
                React.createElement(Image, { src: item.imageUrl, style: styles.frameImage }),
                ...item.boxes.slice(0, 3).map((box, boxIndex) => React.createElement(View, { key: `${item.frameId}-box-${boxIndex}`, style: { ...styles.frameBox, left: `${box.x}%`, top: `${box.y}%`, width: `${box.width}%`, height: `${box.height}%` } })),
              ),
              React.createElement(Text, { style: styles.evidenceTitle }, item.name),
              React.createElement(Text, { style: styles.evidenceBody }, item.description),
              React.createElement(Text, { style: styles.evidenceSource }, sourceReference(item)),
            ),
          ),
        )
      : null,
    React.createElement(
      View,
      { style: { marginTop: section.evidence?.length ? 10 : 18, flexDirection: "row", flexWrap: "wrap", gap: 10 } },
      section.items.map((item) =>
        React.createElement(
          View,
          { key: `${section.title}-${item.title}`, style: dark ? { ...styles.metricDark, width: "48%", minHeight: 82 } : { ...styles.finding, width: "48%", minHeight: 82 } },
          React.createElement(Text, { style: dark ? { ...styles.findingTitle, color: colors.white } : styles.findingTitle }, item.title),
          React.createElement(Text, { style: dark ? { ...styles.findingBody, color: "#d8dbe2" } : styles.findingBody }, item.body),
        ),
      ),
    ),
    React.createElement(Footer, { dark }),
  );
}

function AarBriefingDocument({ analysis, milestoneIds, milestones: runtimeMilestones }: { analysis: RuntimeAnalysis; milestoneIds?: string[]; milestones?: RuntimeMilestone[] }) {
  const incident = getIncidentById(analysis.incidentId);
  const milestones = briefingMilestones(analysis.incidentId, milestoneIds, runtimeMilestones);
  const sections = paginateAarSections(buildAarSections(analysis, milestones));
  const title = `1stSight AAR briefing slides: ${incident?.title ?? analysis.incidentTitle} / ${incident?.id ?? analysis.incidentId}`;

  return React.createElement(
    Document,
    { title },
    ...sections.map((section, index) => React.createElement(SectionSlide, { key: section.title, section, page: `${String(index + 1).padStart(2, "0")} / ${String(sections.length).padStart(2, "0")}` })),
  );
}

function pptxColor(color: string) {
  return color.replace(/^#/, "");
}

function addPptxHeader(slide: PptxSlide, section: string, page: string, dark = false) {
  const textColor = dark ? "CFD2D8" : pptxColor(colors.muted);

  slide.addText(section.toUpperCase(), { x: 0.35, y: 0.2, w: 6.2, h: 0.28, fontFace: "Aptos", fontSize: 9, bold: true, color: textColor, breakLine: false, fit: "shrink" });
  slide.addText(page, { x: 11.2, y: 0.2, w: 1.7, h: 0.28, fontFace: "Aptos", fontSize: 9, bold: true, color: textColor, align: "right", breakLine: false, fit: "shrink" });
}

function addPptxFooter(slide: PptxSlide, dark = false) {
  slide.addText("1stSight AAR briefing slides for officer review. Formal incident records not supplied to this workflow are marked pending officer input.", { x: 0.35, y: 7.0, w: 12.6, h: 0.32, fontFace: "Aptos", fontSize: 9, color: dark ? "CFD2D8" : pptxColor(colors.muted), margin: 0, fit: "shrink" });
}

function addPptxFinding(slide: PptxSlide, title: string, body: string, x: number, y: number, w: number, h = 1.08) {
  slide.addText(title, { x, y, w, h: 0.3, fontFace: "Aptos", fontSize: 11.5, bold: true, color: pptxColor(colors.ink), margin: 0.03, fit: "shrink" });
  slide.addText(body, { x, y: y + 0.36, w, h: h - 0.36, fontFace: "Aptos", fontSize: 10.2, color: pptxColor(colors.muted), margin: 0.03, fit: "shrink" });
}

async function arrayBufferFromPptxOutput(output: string | ArrayBuffer | Blob | Uint8Array): Promise<ArrayBuffer> {
  if (output instanceof ArrayBuffer) return output;
  if (output instanceof Uint8Array) {
    const copy = new ArrayBuffer(output.byteLength);
    new Uint8Array(copy).set(output);
    return copy;
  }
  if (output instanceof Blob) return output.arrayBuffer();

  const buffer = Buffer.from(output, "binary");
  const copy = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(copy).set(buffer);
  return copy;
}

function addPptxSectionSlide(pptx: PptxGenJS, section: AarSection, page: string) {
  const dark = Boolean(section.dark);
  const slide = pptx.addSlide();
  slide.background = { color: pptxColor(dark ? colors.graphite : colors.paper) };
  addPptxHeader(slide, section.title, page, dark);
  slide.addText(section.title, { x: 0.35, y: 0.72, w: 11.8, h: 0.5, fontFace: "Aptos Display", fontSize: 25, bold: true, color: pptxColor(dark ? colors.white : colors.ink), fit: "shrink" });
  if (section.subtitle) slide.addText(section.subtitle, { x: 0.35, y: 1.24, w: 11.8, h: 0.34, fontFace: "Aptos", fontSize: 12, color: dark ? "D8DBE2" : pptxColor(colors.muted), fit: "shrink" });

  if (section.evidence?.length) {
    section.evidence.slice(0, 2).forEach((item, index) => {
      const x = 0.35 + index * 6.3;
      const imageY = 1.62;
      const imageW = 5.72;
      const imageH = 2.85;
      // PptxGenJS Images API: https://gitbrent.github.io/PptxGenJS/docs/api-images/
      slide.addImage({ data: item.imageUrl, x, y: imageY, w: imageW, h: imageH, sizing: { type: "cover", x, y: imageY, w: imageW, h: imageH } });
      item.boxes.slice(0, 3).forEach((box) => {
        slide.addShape(pptx.ShapeType.rect, {
          x: x + (box.x / 100) * imageW,
          y: imageY + (box.y / 100) * imageH,
          w: (box.width / 100) * imageW,
          h: (box.height / 100) * imageH,
          fill: { color: pptxColor(colors.amber), transparency: 88 },
          line: { color: pptxColor(colors.amber), width: 1.6 },
        });
      });
      slide.addText(item.name, { x, y: 4.64, w: imageW, h: 0.36, fontFace: "Aptos", fontSize: 12, bold: true, color: pptxColor(dark ? colors.white : colors.ink), margin: 0.03, fit: "shrink" });
      slide.addText(sourceReference(item), { x, y: 5.04, w: imageW, h: 0.32, fontFace: "Aptos", fontSize: 9.5, color: dark ? "F0B45D" : pptxColor(colors.amber), margin: 0.03, fit: "shrink" });
    });
  }

  const startY = section.evidence?.length ? 5.5 : 1.86;
  const itemWidth = section.evidence?.length ? 5.95 : 5.95;
  section.items.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = 0.35 + col * 6.3;
    const y = startY + row * 1.3;
    if (dark) {
      slide.addShape(pptx.ShapeType.rect, { x, y, w: itemWidth, h: 1.08, fill: { color: "272932" }, line: { color: "44474F", width: 1 } });
      slide.addText(item.title, { x: x + 0.12, y: y + 0.1, w: itemWidth - 0.24, h: 0.3, fontFace: "Aptos", fontSize: 11.5, bold: true, color: pptxColor(colors.white), margin: 0, fit: "shrink" });
      slide.addText(item.body, { x: x + 0.12, y: y + 0.46, w: itemWidth - 0.24, h: 0.52, fontFace: "Aptos", fontSize: 10.2, color: "D8DBE2", margin: 0, fit: "shrink" });
    } else {
      addPptxFinding(slide, item.title, item.body, x, y, itemWidth, 1.08);
    }
  });
  addPptxFooter(slide, dark);
}

async function renderPptxBuffer(analysis: RuntimeAnalysis, milestoneIds?: string[], runtimeMilestones?: RuntimeMilestone[]) {
  const incident = getIncidentById(analysis.incidentId);
  const milestones = briefingMilestones(analysis.incidentId, milestoneIds, runtimeMilestones);
  const sections = paginateAarSections(buildAarSections(analysis, milestones));

  // PptxGenJS Presentation API: https://github.com/gitbrent/pptxgenjs/blob/master/README.md
  const pptx = new PptxGenJS();
  pptx.author = "1stSight";
  pptx.company = "1stSight";
  pptx.subject = "AAR briefing slides";
  pptx.title = `1stSight AAR briefing slides: ${incident?.title ?? analysis.incidentTitle}`;
  pptx.layout = "LAYOUT_WIDE";
  pptx.theme = { headFontFace: "Aptos Display", bodyFontFace: "Aptos" };

  sections.forEach((section, index) => addPptxSectionSlide(pptx, section, `${String(index + 1).padStart(2, "0")} / ${String(sections.length).padStart(2, "0")}`));

  // PptxGenJS Export API: https://github.com/gitbrent/pptxgenjs/blob/master/README.md
  const output = await pptx.write({ outputType: "nodebuffer" });
  return arrayBufferFromPptxOutput(output);
}

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return Response.json({ error: "AAR briefing slide PDF export requires the latest runtime analysis payload." }, { status: 400 });
  }

  let analysis: RuntimeAnalysis;

  try {
    analysis = sanitizeAnalysis(parsed.data.analysis);
    const decisionReviews = parsed.data.analysis.decisionReviews?.length ? parsed.data.analysis.decisionReviews : getDecisionReviews(analysis.incidentId);
    analysis = { ...analysis, decisionReviews };
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "AAR briefing slide PDF export is unavailable for this incident." }, { status: 400 });
  }

  const format = request.nextUrl.searchParams.get("format") === "pptx" ? "pptx" : "pdf";

  const runtimeMilestones = parsed.data.milestones as RuntimeMilestone[] | undefined;

  if (format === "pptx") {
    const pptxBody = await renderPptxBuffer(analysis, parsed.data.milestoneIds, runtimeMilestones);

    return new Response(pptxBody, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": 'attachment; filename="1stsight-aar-briefing-slides.pptx"',
      },
    });
  }

  const aarProps: { analysis: RuntimeAnalysis; milestoneIds?: string[]; milestones?: RuntimeMilestone[] } = { analysis, milestoneIds: parsed.data.milestoneIds, milestones: runtimeMilestones };
  const document = React.createElement(AarBriefingDocument, aarProps) as unknown as React.ReactElement<React.ComponentProps<typeof Document>>;
  const buffer = await renderToBuffer(document);
  const pdfBody = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;

  return new Response(pdfBody, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="1stsight-aar-briefing-slides.pdf"',
    },
  });
}
