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
  evidenceGrid: { flexDirection: "row", gap: 12 },
  evidenceCard: { flex: 1, border: "1 solid #44474f", backgroundColor: "#18191e", padding: 8, minHeight: 300 },
  frameWrap: { height: 170, backgroundColor: "#050608", alignItems: "center", justifyContent: "center", marginBottom: 8, overflow: "hidden", position: "relative" },
  frameImage: { width: "100%", height: 170, objectFit: "cover" },
  frameBox: { position: "absolute", border: `2 solid ${colors.amber}`, backgroundColor: "rgba(199, 123, 22, 0.10)" },
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
type RuntimeMilestone = IncidentMilestone;
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

function sourceReference(item: RuntimeEvidence) {
  const sourceFile = item.sourceVideo.split("/").filter(Boolean).at(-1) ?? item.sourceVideo;
  return `${item.sourceResponder} / ${sourceFile} / ${item.timestampLabel}`;
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
  return evidence.map(sourceReference).join("; ");
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
      body: `${hasResponderSafety ? "Selected frames show unsafe proximity or physical-contact indicators without assigning legal intent." : hasFireEscalation ? "Selected frames show fire or smoke escalation requiring GC review." : "Selected frames require officer interpretation before final AAR wording."} Source: ${refs}.`,
    },
    {
      title: hasCrewIntervention ? "Crew intervention visible in current footage" : "Formal operational sequence remains incomplete",
      body: `${hasCrewIntervention ? "Crew movement/intervention can be reviewed against the bodycam timeline." : "Formal records should come from system/officer inputs where footage cannot confirm them."} Source: ${refs}.`,
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
    const itemChunks = chunkItems(section.items, 4);

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

function confirmedMilestones(milestones: IncidentMilestone[]) {
  return milestones.filter((item) => item.status === "confirmed");
}

function sectionMilestoneBody(item: IncidentMilestone) {
  return `${item.displayTime} · ${item.label}. ${item.notes ? `${item.notes} ` : ""}Source: ${milestoneSourceLabel(item)}.`;
}

function buildAarSections(analysis: RuntimeAnalysis, milestones: IncidentMilestone[]): AarSection[] {
  const incident = getIncidentById(analysis.incidentId);
  const confirmed = confirmedMilestones(milestones);
  const pending = milestones.filter((item) => item.status === "pending");
  const evidenceRefs = sourceReferences(analysis.evidence);
  const recommendationItems = analysis.recommendations.map((item) => ({
    title: item.title,
    body: `${item.reason} Evidence: ${frameRefs(item, analysis.evidence).join("; ") || evidenceRefs}.`,
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
        { title: "Evidence basis", body: `${analysis.evidence.length} selected BWC frame${analysis.evidence.length === 1 ? "" : "s"}. Source: ${evidenceRefs}.` },
      ],
    },
    {
      title: "Area of operations",
      subtitle: incident?.location,
      items: [
        { title: "Operating area", body: incident?.location ?? analysis.incidentTitle },
        { title: "Responder coverage", body: Array.from(new Set(analysis.evidence.map((item) => `${item.sourceResponder} (${item.sourceVideo.split("/").filter(Boolean).at(-1) ?? item.sourceVideo})`))).join("; ") },
      ],
    },
    {
      title: "Sequence of events",
      subtitle: "Confirmed timeline",
      items: confirmed.slice(0, 8).map((item) => ({ title: item.label, body: sectionMilestoneBody(item) })),
    },
    {
      title: "SCDF's responses",
      subtitle: "Actions reflected in selected evidence",
      items: analysis.evidence.slice(0, 6).map((item) => ({ title: item.name, body: `${item.description} Source: ${sourceReference(item)}.` })),
      evidence: analysis.evidence.slice(0, 2),
      dark: true,
    },
    { title: "Challenges", subtitle: "Issues for AAR discussion", items: evidenceChallenges(analysis.evidence) },
    { title: "Areas done well", subtitle: "Evidence-linked strengths", items: doneWell(analysis.evidence) },
    { title: "Areas for improvement", subtitle: "Follow-up before final use", items: improvements(milestones) },
    {
      title: "Actions taken",
      subtitle: "Officer / agency follow-up",
      items: [
        ...recommendationItems,
        ...decisionItems,
        ...pending.slice(0, 4).map((item) => ({ title: item.label, body: `${item.displayTime}. Source: ${milestoneSourceLabel(item)}.` })),
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
                ...item.boxes.slice(0, 3).map((box, boxIndex) => React.createElement(View, { key: `${item.frameId}-box-${boxIndex}`, style: { ...styles.frameBox, left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.width * 100}%`, height: `${box.height * 100}%` } })),
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

  slide.addText(section.toUpperCase(), { x: 0.35, y: 0.22, w: 6.2, h: 0.22, fontFace: "Aptos", fontSize: 7, bold: true, color: textColor, breakLine: false, fit: "shrink" });
  slide.addText(page, { x: 11.2, y: 0.22, w: 1.7, h: 0.22, fontFace: "Aptos", fontSize: 7, bold: true, color: textColor, align: "right", breakLine: false, fit: "shrink" });
}

function addPptxFooter(slide: PptxSlide, dark = false) {
  slide.addText("1stSight AAR briefing slides for officer review. Formal incident records not supplied to this workflow are marked pending officer input.", { x: 0.35, y: 7.1, w: 12.6, h: 0.2, fontFace: "Aptos", fontSize: 6.8, color: dark ? "CFD2D8" : pptxColor(colors.muted), margin: 0, fit: "shrink" });
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

function addPptxSectionSlide(pptx: PptxGenJS, section: AarSection, page: string) {
  const dark = Boolean(section.dark);
  const slide = pptx.addSlide();
  slide.background = { color: pptxColor(dark ? colors.graphite : colors.paper) };
  addPptxHeader(slide, section.title, page, dark);
  slide.addText(section.title, { x: 0.35, y: 0.72, w: 11.8, h: 0.42, fontFace: "Aptos Display", fontSize: 22, bold: true, color: pptxColor(dark ? colors.white : colors.ink), fit: "shrink" });
  if (section.subtitle) slide.addText(section.subtitle, { x: 0.35, y: 1.18, w: 11.8, h: 0.28, fontFace: "Aptos", fontSize: 9.2, color: dark ? "D8DBE2" : pptxColor(colors.muted), fit: "shrink" });

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
          x: x + box.x * imageW,
          y: imageY + box.y * imageH,
          w: box.width * imageW,
          h: box.height * imageH,
          fill: { color: pptxColor(colors.amber), transparency: 88 },
          line: { color: pptxColor(colors.amber), width: 1.6 },
        });
      });
      slide.addText(item.name, { x, y: 4.66, w: imageW, h: 0.28, fontFace: "Aptos", fontSize: 9.5, bold: true, color: pptxColor(dark ? colors.white : colors.ink), margin: 0.03, fit: "shrink" });
      slide.addText(sourceReference(item), { x, y: 4.98, w: imageW, h: 0.22, fontFace: "Aptos", fontSize: 6.2, color: dark ? "F0B45D" : pptxColor(colors.amber), margin: 0.03, fit: "shrink" });
    });
  }

  const startY = section.evidence?.length ? 4.78 : 1.72;
  const itemWidth = section.evidence?.length ? 5.95 : 5.95;
  section.items.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = 0.35 + col * 6.3;
    const y = startY + row * 1.05;
    if (dark) {
      slide.addShape(pptx.ShapeType.rect, { x, y, w: itemWidth, h: 0.82, fill: { color: "272932" }, line: { color: "44474F", width: 1 } });
      slide.addText(item.title, { x: x + 0.12, y: y + 0.1, w: itemWidth - 0.24, h: 0.18, fontFace: "Aptos", fontSize: 8.5, bold: true, color: pptxColor(colors.white), margin: 0, fit: "shrink" });
      slide.addText(item.body, { x: x + 0.12, y: y + 0.34, w: itemWidth - 0.24, h: 0.34, fontFace: "Aptos", fontSize: 6.8, color: "D8DBE2", margin: 0, fit: "shrink" });
    } else {
      addPptxFinding(slide, item.title, item.body, x, y, itemWidth, 0.82);
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
