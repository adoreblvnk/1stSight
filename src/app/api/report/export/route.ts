import React from "react";
import { NextRequest } from "next/server";
// npm install pptxgenjs
// PptxGenJS Quick Start: https://github.com/gitbrent/pptxgenjs/blob/master/README.md
import PptxGenJS from "pptxgenjs";
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
type PptxSlide = ReturnType<InstanceType<typeof PptxGenJS>["addSlide"]>;

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

function pptxColor(color: string) {
  return color.replace(/^#/, "");
}

function addPptxHeader(slide: PptxSlide, section: string, page: string, dark = false) {
  const textColor = dark ? "CFD2D8" : pptxColor(colors.muted);

  slide.addText(section.toUpperCase(), { x: 0.35, y: 0.22, w: 6.2, h: 0.22, fontFace: "Aptos", fontSize: 7, bold: true, color: textColor, breakLine: false, fit: "shrink" });
  slide.addText(page, { x: 11.2, y: 0.22, w: 1.7, h: 0.22, fontFace: "Aptos", fontSize: 7, bold: true, color: textColor, align: "right", breakLine: false, fit: "shrink" });
}

function addPptxFooter(slide: PptxSlide, dark = false) {
  slide.addText("1stSight AAR briefing slides for officer review. Formal incident records not supplied to this workflow are marked pending officer input.", { x: 0.35, y: 7.1, w: 12.6, h: 0.2, fontFace: "Aptos", fontSize: 6.8, color: dark ? "CFD2D8" : pptxColor(colors.muted), margin: 0, fit: "shrink" });
}

function addPptxMetric(slide: PptxSlide, label: string, value: string, note: string, x: number, y: number, w: number) {
  slide.addText(label.toUpperCase(), { x, y, w, h: 0.18, fontFace: "Aptos", fontSize: 6.8, bold: true, color: pptxColor(colors.muted), margin: 0.03, fit: "shrink" });
  slide.addText(value, { x, y: y + 0.24, w, h: 0.34, fontFace: "Aptos", fontSize: 11, bold: true, color: pptxColor(colors.ink), margin: 0.03, fit: "shrink" });
  slide.addText(note, { x, y: y + 0.64, w, h: 0.36, fontFace: "Aptos", fontSize: 6.8, color: pptxColor(colors.muted), margin: 0.03, fit: "shrink" });
}

function addPptxFinding(slide: PptxSlide, title: string, body: string, x: number, y: number, w: number, h = 0.78) {
  slide.addText(title, { x, y, w, h: 0.2, fontFace: "Aptos", fontSize: 8.5, bold: true, color: pptxColor(colors.ink), margin: 0.03, fit: "shrink" });
  slide.addText(body, { x, y: y + 0.25, w, h: h - 0.25, fontFace: "Aptos", fontSize: 7.2, color: pptxColor(colors.muted), margin: 0.03, fit: "shrink" });
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

async function renderPptxBuffer(analysis: RuntimeAnalysis) {
  const incident = getIncidentById(analysis.incidentId);
  const milestones = incident?.milestones ?? [];
  const pendingCount = milestones.filter((item) => item.status === "pending").length;
  const footageCount = milestones.filter((item) => item.sourceType === "footage" && item.status === "confirmed").length;
  const pendingMilestones = milestones.filter((item) => item.status === "pending").slice(0, 5);
  const decisionReviews = analysis.decisionReviews ?? [];

  // PptxGenJS Presentation API: https://github.com/gitbrent/pptxgenjs/blob/master/README.md
  const pptx = new PptxGenJS();
  pptx.author = "1stSight";
  pptx.company = "1stSight";
  pptx.subject = "AAR briefing slides";
  pptx.title = `1stSight AAR briefing slides: ${incident?.title ?? analysis.incidentTitle}`;
  pptx.layout = "LAYOUT_WIDE";
  pptx.theme = { headFontFace: "Aptos Display", bodyFontFace: "Aptos" };

  const overview = pptx.addSlide();
  overview.background = { color: pptxColor(colors.paper) };
  addPptxHeader(overview, "Incident overview", "01 / 05");
  overview.addText("Woodlands medical assistance responder-safety AAR", { x: 0.35, y: 0.72, w: 11.6, h: 0.5, fontFace: "Aptos Display", fontSize: 24, bold: true, color: pptxColor(colors.ink), fit: "shrink" });
  overview.addText(incident?.summary ?? analysis.summary, { x: 0.35, y: 1.25, w: 11.8, h: 0.46, fontFace: "Aptos", fontSize: 10, color: pptxColor(colors.muted), fit: "shrink" });
  addPptxMetric(overview, "Location", truncate(incident?.location ?? analysis.incidentTitle, 42), "Supplied caller context", 0.35, 2.0, 3.85);
  addPptxMetric(overview, "Runtime evidence", `${analysis.evidence.length} selected BWC frame${analysis.evidence.length === 1 ? "" : "s"}`, generatedFromLabel(analysis.generatedFrom), 4.55, 2.0, 3.85);
  addPptxMetric(overview, "Milestone provenance", `${footageCount} footage / ${pendingCount} pending`, "System events stay pending when records are not supplied", 8.75, 2.0, 3.85);
  addPptxFinding(overview, "Briefing scope", "Concise post-incident learning slides. Formal dispatch, assessment, conveyance, and handover fields stay pending until officers supply those records.", 0.35, 3.55, 5.85, 1.15);
  addPptxFinding(overview, "Evidence boundary", `Later slides reference selected BWC frames and milestone sources. Source frames: ${sourceReferences(analysis.evidence)}.`, 6.65, 3.55, 5.95, 1.15);
  addPptxFooter(overview);

  const timeline = pptx.addSlide();
  timeline.background = { color: pptxColor(colors.paper) };
  addPptxHeader(timeline, "Milestone timeline", "02 / 05");
  timeline.addText("Timestamp provenance before AAR discussion", { x: 0.35, y: 0.72, w: 11.8, h: 0.42, fontFace: "Aptos Display", fontSize: 22, bold: true, color: pptxColor(colors.ink), fit: "shrink" });
  timeline.addText("System/dispatch events are not inferred from BWC. Missing formal data is marked pending officer input.", { x: 0.35, y: 1.18, w: 11.8, h: 0.28, fontFace: "Aptos", fontSize: 9.2, color: pptxColor(colors.muted), fit: "shrink" });
  milestones.slice(0, 12).forEach((item, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const x = 0.35 + col * 3.18;
    const y = 1.78 + row * 1.45;
    timeline.addText(`${item.label} · ${item.status}`.toUpperCase(), { x, y, w: 2.85, h: 0.18, fontFace: "Aptos", fontSize: 6.4, bold: true, color: item.status === "pending" ? pptxColor(colors.amber) : pptxColor(colors.muted), margin: 0.03, fit: "shrink" });
    timeline.addText(item.displayTime, { x, y: y + 0.24, w: 2.85, h: 0.28, fontFace: "Aptos", fontSize: 13, bold: true, color: pptxColor(colors.ink), margin: 0.03, fit: "shrink" });
    timeline.addText(`${milestoneSourceLabel(item)}${item.notes ? `. ${truncate(item.notes, 82)}` : ""}`, { x, y: y + 0.58, w: 2.85, h: 0.52, fontFace: "Aptos", fontSize: 6.6, color: pptxColor(colors.muted), margin: 0.03, fit: "shrink" });
  });
  addPptxFooter(timeline);

  const evidence = pptx.addSlide();
  evidence.background = { color: pptxColor(colors.graphite) };
  addPptxHeader(evidence, "Selected evidence frames", "03 / 05", true);
  evidence.addText("Visual evidence selected for briefing", { x: 0.35, y: 0.72, w: 11.8, h: 0.42, fontFace: "Aptos Display", fontSize: 22, bold: true, color: pptxColor(colors.white), fit: "shrink" });
  evidence.addText("Each frame keeps its bodycam/source ID and timestamp reference.", { x: 0.35, y: 1.18, w: 11.8, h: 0.26, fontFace: "Aptos", fontSize: 9.2, color: "D8DBE2", fit: "shrink" });
  analysis.evidence.slice(0, 3).forEach((item, index) => {
    const x = 0.35 + index * 4.22;
    // PptxGenJS Images API: https://gitbrent.github.io/PptxGenJS/docs/api-images/
    evidence.addImage({ data: item.imageUrl, x, y: 1.72, w: 3.75, h: 2.15, sizing: { type: "contain", w: 3.75, h: 2.15 } });
    evidence.addText(item.name, { x, y: 4.08, w: 3.75, h: 0.34, fontFace: "Aptos", fontSize: 10.5, bold: true, color: pptxColor(colors.white), margin: 0.03, fit: "shrink" });
    evidence.addText(item.description, { x, y: 4.48, w: 3.75, h: 0.58, fontFace: "Aptos", fontSize: 7.2, color: "D8DBE2", margin: 0.03, fit: "shrink" });
    evidence.addText(`${sourceReference(item)}\nTags: ${item.tags.join(" / ")}`, { x, y: 5.18, w: 3.75, h: 0.48, fontFace: "Aptos", fontSize: 6.4, color: "F0B45D", margin: 0.03, fit: "shrink" });
  });
  addPptxFooter(evidence, true);

  const findings = pptx.addSlide();
  findings.background = { color: pptxColor(colors.paper) };
  addPptxHeader(findings, "AAR findings", "04 / 05");
  findings.addText("What the review should focus on", { x: 0.35, y: 0.72, w: 11.8, h: 0.42, fontFace: "Aptos Display", fontSize: 22, bold: true, color: pptxColor(colors.ink), fit: "shrink" });
  [
    { label: "Main challenges", items: evidenceChallenges(analysis.evidence) },
    { label: "Areas done well", items: doneWell(analysis.evidence) },
    { label: "Areas for improvement", items: improvements(milestones) },
  ].forEach((column, columnIndex) => {
    const x = 0.35 + columnIndex * 4.22;
    findings.addText(column.label.toUpperCase(), { x, y: 1.42, w: 3.75, h: 0.18, fontFace: "Aptos", fontSize: 6.8, bold: true, color: pptxColor(colors.muted), margin: 0.03, fit: "shrink" });
    column.items.slice(0, 2).forEach((item, itemIndex) => addPptxFinding(findings, item.title, item.body, x, 1.85 + itemIndex * 1.45, 3.75, 1.1));
  });
  addPptxFooter(findings);

  const followUp = pptx.addSlide();
  followUp.background = { color: pptxColor(colors.paper) };
  addPptxHeader(followUp, "Officer-reviewed follow-up", "05 / 05");
  followUp.addText("Follow-up items before final use", { x: 0.35, y: 0.72, w: 11.8, h: 0.42, fontFace: "Aptos Display", fontSize: 22, bold: true, color: pptxColor(colors.ink), fit: "shrink" });
  followUp.addText("Officer-reviewed decisions".toUpperCase(), { x: 0.35, y: 1.45, w: 5.8, h: 0.18, fontFace: "Aptos", fontSize: 6.8, bold: true, color: pptxColor(colors.muted), margin: 0.03, fit: "shrink" });
  const decisionItems = decisionReviews.length ? decisionReviews.map((item) => ({ title: decisionLabel(item.decision), body: `${item.reason} Source timestamp: ${item.timestamp}` })) : [{ title: "No officer-reviewed live decision recorded", body: "Add approval, hold, or edited decision records before final briefing circulation." }];
  decisionItems.slice(0, 2).forEach((item, index) => addPptxFinding(followUp, item.title, item.body, 0.35, 1.82 + index * 1.05, 5.8, 0.82));
  followUp.addText("Recommendations / considerations".toUpperCase(), { x: 0.35, y: 4.08, w: 5.8, h: 0.18, fontFace: "Aptos", fontSize: 6.8, bold: true, color: pptxColor(colors.muted), margin: 0.03, fit: "shrink" });
  const recommendationItems = analysis.recommendations.length ? analysis.recommendations.map((item) => ({ title: item.title, body: `${item.reason} Evidence: ${frameRefs(item, analysis.evidence).join("; ")}` })) : [{ title: "No model recommendation exported", body: `Officer review should use selected frames directly. Evidence: ${sourceReferences(analysis.evidence)}.` }];
  recommendationItems.slice(0, 2).forEach((item, index) => addPptxFinding(followUp, item.title, item.body, 0.35, 4.45 + index * 1.05, 5.8, 0.82));
  followUp.addText("Pending officer/system data".toUpperCase(), { x: 6.75, y: 1.45, w: 5.8, h: 0.18, fontFace: "Aptos", fontSize: 6.8, bold: true, color: pptxColor(colors.muted), margin: 0.03, fit: "shrink" });
  pendingMilestones.forEach((item, index) => addPptxFinding(followUp, item.label, `${item.displayTime}. Source: ${milestoneSourceLabel(item)}.`, 6.75, 1.82 + index * 0.82, 5.8, 0.62));
  addPptxFinding(followUp, "Review state", "Officer input pending. Add reviewed follow-up and formal records before final briefing circulation.", 6.75, 6.05, 5.8, 0.68);
  addPptxFooter(followUp);

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

  if (format === "pptx") {
    const pptxBody = await renderPptxBuffer(analysis);

    return new Response(pptxBody, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": 'attachment; filename="1stsight-woodlands-aar-briefing-slides.pptx"',
      },
    });
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
