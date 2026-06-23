import React from "react";
import { NextRequest } from "next/server";
// React PDF Node API: https://react-pdf.org/node
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { z } from "zod";
import type { DecisionReview, IncidentMilestone } from "@/lib/domain";
import { getDecisionReviews } from "@/lib/decision-store";
import { getIncidentById, getIncidentResponders, supportsAarBriefingSlides } from "@/lib/scenario";

export const runtime = "nodejs";

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

const bodySchema = z.object({
  analysis: runtimeAnalysisSchema,
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
  slide: { padding: 24, fontSize: 10, color: colors.ink, fontFamily: "Helvetica", backgroundColor: colors.paper },
  darkSlide: { padding: 24, fontSize: 10, color: colors.white, fontFamily: "Helvetica", backgroundColor: colors.graphite },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14, paddingBottom: 8, borderBottom: `1 solid ${colors.line}` },
  darkHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14, paddingBottom: 8, borderBottom: "1 solid #44474f" },
  eyebrow: { fontSize: 8, textTransform: "uppercase", letterSpacing: 1.8, color: colors.muted },
  darkEyebrow: { fontSize: 8, textTransform: "uppercase", letterSpacing: 1.8, color: "#cfd2d8" },
  slideNumber: { fontSize: 8, textTransform: "uppercase", letterSpacing: 1.2, color: colors.muted },
  darkSlideNumber: { fontSize: 8, textTransform: "uppercase", letterSpacing: 1.2, color: "#cfd2d8" },
  title: { fontSize: 26, lineHeight: 1.08, fontWeight: 700, marginBottom: 10 },
  darkTitle: { fontSize: 26, lineHeight: 1.08, fontWeight: 700, marginBottom: 10, color: colors.white },
  subtitle: { fontSize: 11, lineHeight: 1.35, color: colors.muted },
  darkSubtitle: { fontSize: 11, lineHeight: 1.35, color: "#d8dbe2" },
  grid2: { flexDirection: "row", gap: 14 },
  grid3: { flexDirection: "row", gap: 10 },
  col: { flex: 1 },
  metric: { border: `1 solid ${colors.line}`, padding: 10, minHeight: 94, backgroundColor: colors.white },
  metricDark: { border: "1 solid #44474f", padding: 10, minHeight: 94, backgroundColor: "#272932" },
  metricLabel: { fontSize: 8, textTransform: "uppercase", letterSpacing: 1.1, color: colors.muted, marginBottom: 6 },
  metricValue: { fontSize: 11.5, fontWeight: 700, lineHeight: 1.22 },
  metricNote: { fontSize: 7.8, color: colors.muted, lineHeight: 1.22, marginTop: 5 },
  timelineGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  milestone: { width: "23.8%", border: `1 solid ${colors.line}`, padding: 8, minHeight: 74, backgroundColor: colors.white },
  milestonePending: { border: `1 solid ${colors.amber}`, backgroundColor: "#fff6e8" },
  milestoneUnavailable: { border: "1 solid #c9cbd1", backgroundColor: "#eceef1" },
  milestoneLabel: { fontSize: 8, textTransform: "uppercase", letterSpacing: 0.8, color: colors.muted, marginBottom: 5 },
  milestoneTime: { fontSize: 13, fontWeight: 700, marginBottom: 4 },
  milestoneSource: { fontSize: 7.5, lineHeight: 1.22, color: colors.muted },
  evidenceGrid: { flexDirection: "row", gap: 10 },
  evidenceCard: { flex: 1, border: "1 solid #44474f", backgroundColor: "#18191e", padding: 8, minHeight: 420 },
  frameWrap: { height: 230, backgroundColor: "#050608", alignItems: "center", justifyContent: "center", marginBottom: 8, overflow: "hidden" },
  frameImage: { width: "100%", height: 230, objectFit: "contain" },
  evidenceTitle: { color: colors.white, fontSize: 12, fontWeight: 700, lineHeight: 1.2, marginBottom: 5 },
  evidenceBody: { color: "#d8dbe2", fontSize: 8.5, lineHeight: 1.25, marginBottom: 6 },
  evidenceSource: { color: "#f0b45d", fontSize: 7.5, lineHeight: 1.22 },
  finding: { border: `1 solid ${colors.line}`, padding: 10, backgroundColor: colors.white, marginBottom: 8, minHeight: 82 },
  findingTitle: { fontSize: 11, fontWeight: 700, marginBottom: 5 },
  findingBody: { fontSize: 9, color: colors.muted, lineHeight: 1.28 },
  recommendation: { border: `1 solid ${colors.line}`, padding: 9, marginBottom: 7, backgroundColor: colors.white },
  footer: { position: "absolute", bottom: 14, left: 24, right: 24, fontSize: 7.5, color: colors.muted, borderTop: `1 solid ${colors.line}`, paddingTop: 6 },
  darkFooter: { position: "absolute", bottom: 14, left: 24, right: 24, fontSize: 7.5, color: "#cfd2d8", borderTop: "1 solid #44474f", paddingTop: 6 },
});

type RuntimeAnalysis = z.infer<typeof runtimeAnalysisSchema>;
type RuntimeEvidence = z.infer<typeof runtimeEvidenceSchema>;
type RuntimeRecommendation = z.infer<typeof runtimeRecommendationSchema>;
type RuntimeDecisionReview = z.infer<typeof runtimeDecisionReviewSchema>;

const incidentLevelTags = new Set(["fire escalation", "fire response", "ground operations", "entry approach", "entry control", "smoke spread", "visibility", "deployment", "blocked access", "unsafe entry", "hazmat", "medical assistance", "responder safety", "physical contact", "unsafe proximity", "crew intervention", "patient movement", "medical", "civil", "hazard", "incident"]);

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
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1).trim()}…`;
}

function generatedFromLabel(text: string) {
  if (/deterministic|current bwc evidence selection/i.test(text)) return "Current BWC evidence selection";
  if (/request-time ffmpeg extraction/i.test(text)) return "Runtime frame extraction";
  return truncate(text, 58);
}

function sourceReference(item: RuntimeEvidence) {
  const sourceFile = item.sourceVideo.split("/").filter(Boolean).at(-1) ?? item.sourceVideo;
  return `${item.sourceResponder} / ${sourceFile} / ${item.timestampLabel}`;
}

function validateIncidentEvidence(analysis: RuntimeAnalysis) {
  const responders = getIncidentResponders(analysis.incidentId);
  const responderIds = new Set(responders.map((responder) => responder.id));
  const sourceVideos = new Set(responders.map((responder) => responder.videoSrc));
  const invalidEvidence = analysis.evidence.find((item) => !responderIds.has(item.responderId) || !sourceVideos.has(item.sourceVideo));

  if (invalidEvidence) {
    throw new Error("AAR briefing slide PDF evidence must belong to the Woodlands incident responder footage.");
  }
}

function sourceReferences(evidence: RuntimeEvidence[]) {
  return evidence.map(sourceReference).join("; ");
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
    throw new Error("AAR briefing slide PDF is available only for the Woodlands medical responder-safety review in this presentation flow.");
  }

  if (!incident.supportsRuntimeAnalysis) {
    throw new Error(incident.unavailableReason ?? "AAR briefing slide PDF is unavailable for this incident.");
  }

  validateIncidentEvidence(analysis);

  const evidence = [...analysis.evidence]
    .slice(0, 4)
    .map((item, index) => ({
      ...item,
      order: item.order ?? item.rank ?? index + 1,
      name: truncate(item.name, 72),
      description: truncate(item.description, 160),
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
        reason: truncate(recommendation.reason, 170),
        evidenceFrameIds: recommendation.evidenceFrameIds.filter((frameId) => evidenceFrameIds.has(frameId)),
      }))
      .filter((recommendation) => recommendation.evidenceFrameIds.length > 0),
  };
}

function milestoneStyle(milestone: IncidentMilestone) {
  if (milestone.status === "pending") return { ...styles.milestone, ...styles.milestonePending };
  if (milestone.status === "unavailable") return { ...styles.milestone, ...styles.milestoneUnavailable };
  return styles.milestone;
}

function milestoneSourceLabel(milestone: IncidentMilestone) {
  const source = milestone.sourceType === "dispatch-system" ? "system" : milestone.sourceType === "officer-entered" ? "officer" : "footage";
  return `${source} / ${milestone.sourceLabel}`;
}

function evidenceChallenges(evidence: RuntimeEvidence[]) {
  const refs = sourceReferences(evidence);
  const hasResponderSafety = evidence.some((item) => item.tags.some((tag) => /responder safety|physical contact|unsafe proximity/i.test(tag)));
  const hasCrewIntervention = evidence.some((item) => item.tags.some((tag) => /crew intervention|patient movement/i.test(tag)));

  return [
    {
      title: hasResponderSafety ? "Responder-safety risk in patient interaction" : "Patient-side interaction requires officer review",
      body: `${hasResponderSafety ? "Selected frames show unsafe proximity or contact-risk indicators." : "Selected frames require officer interpretation before final AAR wording."} Source: ${refs}.`,
    },
    {
      title: hasCrewIntervention ? "Crew intervention visible in current footage" : "Formal operational sequence remains incomplete",
      body: `${hasCrewIntervention ? "Crew movement/intervention can be reviewed against the bodycam timeline." : "Dispatch, conveyance, and handover data should come from system/officer records."} Source: ${refs}.`,
    },
  ];
}

function doneWell(evidence: RuntimeEvidence[]) {
  const refs = sourceReferences(evidence);
  return [
    { title: "Available BWC retained scene context", body: `Evidence frames preserve source, timestamp, and responder identity. Source: ${refs}.` },
    { title: "AAR claims remain evidence-linked", body: `Selected observations are tied to frame-level references instead of unsupported narrative. Source: ${refs}.` },
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

function OverviewSlide({ analysis, milestones }: { analysis: RuntimeAnalysis; milestones: IncidentMilestone[] }) {
  const incident = getIncidentById(analysis.incidentId);
  const pendingCount = milestones.filter((item) => item.status === "pending").length;
  const footageCount = milestones.filter((item) => item.sourceType === "footage" && item.status === "confirmed").length;

  return React.createElement(
    Page,
    { size: "A4", orientation: "landscape", style: styles.slide },
    React.createElement(SlideHeader, { section: "Incident overview", page: "01 / 05" }),
    React.createElement(Text, { style: styles.title }, "Woodlands medical assistance responder-safety AAR"),
    React.createElement(Text, { style: styles.subtitle }, incident?.summary ?? analysis.summary),
    React.createElement(
      View,
      { style: { ...styles.grid3, marginTop: 18 } },
      React.createElement(View, { style: styles.metric }, React.createElement(Text, { style: styles.metricLabel }, "Location"), React.createElement(Text, { style: styles.metricValue }, truncate(incident?.location ?? analysis.incidentTitle, 42)), React.createElement(Text, { style: styles.metricNote }, "Supplied caller context")),
      React.createElement(View, { style: styles.metric }, React.createElement(Text, { style: styles.metricLabel }, "Runtime evidence"), React.createElement(Text, { style: styles.metricValue }, `${analysis.evidence.length} selected BWC frame${analysis.evidence.length === 1 ? "" : "s"}`), React.createElement(Text, { style: styles.metricNote }, generatedFromLabel(analysis.generatedFrom))),
      React.createElement(View, { style: styles.metric }, React.createElement(Text, { style: styles.metricLabel }, "Milestone provenance"), React.createElement(Text, { style: styles.metricValue }, `${footageCount} footage / ${pendingCount} pending`), React.createElement(Text, { style: styles.metricNote }, "System events stay pending when records are not supplied")),
    ),
    React.createElement(
      View,
      { style: { ...styles.grid2, marginTop: 20 } },
      React.createElement(View, { style: { ...styles.finding, flex: 1 } }, React.createElement(Text, { style: styles.findingTitle }, "Briefing scope"), React.createElement(Text, { style: styles.findingBody }, "Concise post-incident learning slides. Formal dispatch, assessment, conveyance, and handover fields stay pending until officers supply those records.")),
      React.createElement(View, { style: { ...styles.finding, flex: 1 } }, React.createElement(Text, { style: styles.findingTitle }, "Evidence boundary"), React.createElement(Text, { style: styles.findingBody }, `Later slides reference selected BWC frames and milestone sources. Source frames: ${sourceReferences(analysis.evidence)}.`)),
    ),
    React.createElement(Footer, null),
  );
}

function MilestoneSlide({ milestones }: { milestones: IncidentMilestone[] }) {
  return React.createElement(
    Page,
    { size: "A4", orientation: "landscape", style: styles.slide },
    React.createElement(SlideHeader, { section: "Milestone timeline", page: "02 / 05" }),
    React.createElement(Text, { style: styles.title }, "Timestamp provenance before AAR discussion"),
    React.createElement(Text, { style: styles.subtitle }, "System/dispatch events are not inferred from BWC. Missing formal data is marked pending officer input."),
    React.createElement(
      View,
      { style: { ...styles.timelineGrid, marginTop: 12 } },
      milestones.map((item) =>
        React.createElement(
          View,
          { key: item.id, style: milestoneStyle(item) },
          React.createElement(Text, { style: styles.milestoneLabel }, `${item.label} · ${item.status}`),
          React.createElement(Text, { style: styles.milestoneTime }, item.displayTime),
          React.createElement(Text, { style: styles.milestoneSource }, milestoneSourceLabel(item)),
          item.notes ? React.createElement(Text, { style: styles.milestoneSource }, truncate(item.notes, 82)) : null,
        ),
      ),
    ),
    React.createElement(Footer, null),
  );
}

function EvidenceSlide({ analysis }: { analysis: RuntimeAnalysis }) {
  return React.createElement(
    Page,
    { size: "A4", orientation: "landscape", style: styles.darkSlide },
    React.createElement(DarkSlideHeader, { section: "Selected evidence frames", page: "03 / 05" }),
    React.createElement(Text, { style: styles.darkTitle }, "Visual evidence selected for briefing"),
    React.createElement(Text, { style: styles.darkSubtitle }, "Each frame keeps its bodycam/source ID and timestamp reference."),
    React.createElement(
      View,
      { style: { ...styles.evidenceGrid, marginTop: 12 } },
      analysis.evidence.slice(0, 3).map((item) =>
        React.createElement(
          View,
          { key: item.frameId, style: styles.evidenceCard },
          React.createElement(View, { style: styles.frameWrap }, React.createElement(Image, { src: item.imageUrl, style: styles.frameImage })),
          React.createElement(Text, { style: styles.evidenceTitle }, item.name),
          React.createElement(Text, { style: styles.evidenceBody }, item.description),
          React.createElement(Text, { style: styles.evidenceSource }, sourceReference(item)),
          React.createElement(Text, { style: styles.evidenceSource }, `Tags: ${item.tags.join(" / ")}`),
        ),
      ),
    ),
    React.createElement(Footer, { dark: true }),
  );
}

function FindingsSlide({ analysis, milestones }: { analysis: RuntimeAnalysis; milestones: IncidentMilestone[] }) {
  return React.createElement(
    Page,
    { size: "A4", orientation: "landscape", style: styles.slide },
    React.createElement(SlideHeader, { section: "AAR findings", page: "04 / 05" }),
    React.createElement(Text, { style: styles.title }, "What the review should focus on"),
    React.createElement(
      View,
      { style: { ...styles.grid3, marginTop: 8 } },
      React.createElement(View, { style: styles.col }, React.createElement(Text, { style: styles.metricLabel }, "Main challenges"), evidenceChallenges(analysis.evidence).map((item) => React.createElement(View, { key: item.title, style: styles.finding }, React.createElement(Text, { style: styles.findingTitle }, item.title), React.createElement(Text, { style: styles.findingBody }, item.body)))) ,
      React.createElement(View, { style: styles.col }, React.createElement(Text, { style: styles.metricLabel }, "Areas done well"), doneWell(analysis.evidence).map((item) => React.createElement(View, { key: item.title, style: styles.finding }, React.createElement(Text, { style: styles.findingTitle }, item.title), React.createElement(Text, { style: styles.findingBody }, item.body)))),
      React.createElement(View, { style: styles.col }, React.createElement(Text, { style: styles.metricLabel }, "Areas for improvement"), improvements(milestones).map((item) => React.createElement(View, { key: item.title, style: styles.finding }, React.createElement(Text, { style: styles.findingTitle }, item.title), React.createElement(Text, { style: styles.findingBody }, item.body)))),
    ),
    React.createElement(Footer, null),
  );
}

function FollowUpSlide({ analysis, milestones }: { analysis: RuntimeAnalysis; milestones: IncidentMilestone[] }) {
  const pendingMilestones = milestones.filter((item) => item.status === "pending").slice(0, 5);
  const decisionReviews = analysis.decisionReviews ?? [];

  return React.createElement(
    Page,
    { size: "A4", orientation: "landscape", style: styles.slide },
    React.createElement(SlideHeader, { section: "Officer-reviewed follow-up", page: "05 / 05" }),
    React.createElement(Text, { style: styles.title }, "Follow-up items before final use"),
    React.createElement(
      View,
      { style: styles.grid2 },
      React.createElement(
        View,
        { style: styles.col },
        React.createElement(Text, { style: styles.metricLabel }, "Officer-reviewed decisions"),
        decisionReviews.length
          ? decisionReviews.map((item) => React.createElement(View, { key: `${item.recommendationId}-${item.decision}`, style: styles.recommendation }, React.createElement(Text, { style: styles.findingTitle }, decisionLabel(item.decision)), React.createElement(Text, { style: styles.findingBody }, item.reason), React.createElement(Text, { style: styles.metricNote }, `Source timestamp: ${item.timestamp}`)))
          : React.createElement(View, { style: styles.recommendation }, React.createElement(Text, { style: styles.findingTitle }, "No officer-reviewed live decision recorded"), React.createElement(Text, { style: styles.findingBody }, "Add approval, hold, or edited decision records before final briefing circulation.")),
        React.createElement(Text, { style: { ...styles.metricLabel, marginTop: 8 } }, "Recommendations / considerations"),
        analysis.recommendations.length
          ? analysis.recommendations.map((item) => React.createElement(View, { key: item.id, style: styles.recommendation }, React.createElement(Text, { style: styles.findingTitle }, item.title), React.createElement(Text, { style: styles.findingBody }, item.reason), React.createElement(Text, { style: styles.metricNote }, `Evidence: ${frameRefs(item, analysis.evidence).join("; ")}`)))
          : React.createElement(View, { style: styles.recommendation }, React.createElement(Text, { style: styles.findingTitle }, "No model recommendation exported"), React.createElement(Text, { style: styles.findingBody }, `Officer review should use selected frames directly. Evidence: ${sourceReferences(analysis.evidence)}.`)),
      ),
      React.createElement(
        View,
        { style: styles.col },
        React.createElement(Text, { style: styles.metricLabel }, "Pending officer/system data"),
        pendingMilestones.map((item) => React.createElement(View, { key: item.id, style: styles.recommendation }, React.createElement(Text, { style: styles.findingTitle }, item.label), React.createElement(Text, { style: styles.findingBody }, `${item.displayTime}. Source: ${milestoneSourceLabel(item)}.`))),
        React.createElement(View, { style: styles.metricDark }, React.createElement(Text, { style: { ...styles.metricLabel, color: "#cfd2d8" } }, "Review state"), React.createElement(Text, { style: { ...styles.metricValue, color: colors.white } }, "Officer input pending"), React.createElement(Text, { style: { ...styles.metricNote, color: "#cfd2d8" } }, "Add reviewed follow-up and formal records before final briefing circulation.")),
      ),
    ),
    React.createElement(Footer, null),
  );
}

function AarBriefingDocument({ analysis }: { analysis: RuntimeAnalysis }) {
  const incident = getIncidentById(analysis.incidentId);
  const milestones = incident?.milestones ?? [];
  const title = `1stSight AAR briefing slides: ${incident?.title ?? analysis.incidentTitle} / ${incident?.id ?? analysis.incidentId}`;

  return React.createElement(
    Document,
    { title },
    React.createElement(OverviewSlide, { analysis, milestones }),
    React.createElement(MilestoneSlide, { milestones }),
    React.createElement(EvidenceSlide, { analysis }),
    React.createElement(FindingsSlide, { analysis, milestones }),
    React.createElement(FollowUpSlide, { analysis, milestones }),
  );
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

  const document = React.createElement(AarBriefingDocument, { analysis }) as unknown as React.ReactElement<React.ComponentProps<typeof Document>>;
  const buffer = await renderToBuffer(document);
  const pdfBody = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;

  return new Response(pdfBody, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="1stsight-woodlands-aar-briefing-slides.pdf"',
    },
  });
}
