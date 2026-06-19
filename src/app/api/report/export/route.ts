import React from "react";
import { NextRequest } from "next/server";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { z } from "zod";
import { getScenarioState } from "@/lib/scenario";

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

const runtimeAnalysisSchema = z.object({
  incidentId: z.string(),
  incidentTitle: z.string(),
  summary: z.string(),
  generatedFrom: z.string(),
  evidence: z.array(runtimeEvidenceSchema).min(1),
  recommendations: z.array(runtimeRecommendationSchema),
});

const bodySchema = z.object({
  analysis: runtimeAnalysisSchema,
});

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, color: "#202020", fontFamily: "Helvetica" },
  title: { fontSize: 18, marginBottom: 8, fontWeight: 700 },
  subtitle: { fontSize: 9, marginBottom: 18, color: "#555555" },
  section: { borderTop: "1 solid #d8d2c3", paddingTop: 10, marginTop: 12 },
  sectionTitle: { fontSize: 11, marginBottom: 7, fontWeight: 700, textTransform: "uppercase" },
  row: { flexDirection: "row", borderBottom: "1 solid #ece6d9", paddingVertical: 6 },
  key: { width: "26%", color: "#555555", paddingRight: 8 },
  value: { width: "74%" },
  claim: { marginBottom: 8, padding: 8, border: "1 solid #d8d2c3" },
  // React PDF Image style: https://react-pdf.org/components#image
  frameWrap: { width: "100%", height: 150, marginBottom: 6, alignItems: "center", justifyContent: "center", backgroundColor: "#111111" },
  frameViewport: { position: "relative", width: "72%", height: 150, overflow: "hidden" },
  frameImage: { width: "100%", height: 150, objectFit: "contain" },
  boxLabel: { position: "absolute", backgroundColor: "#f4a62a", color: "#111111", fontSize: 7, fontWeight: 700, paddingHorizontal: 3, paddingVertical: 2 },
  evidence: { fontSize: 9, color: "#5d2419", marginTop: 4 },
  footer: { position: "absolute", bottom: 24, left: 32, right: 32, fontSize: 8, color: "#666666" },
});

type RuntimeAnalysis = z.infer<typeof runtimeAnalysisSchema>;

const incidentLevelTags = new Set(["fire escalation", "fire response", "ground operations", "entry approach", "entry control", "smoke spread", "visibility", "deployment", "blocked access", "unsafe entry"]);

function incidentTags(tags: string[]) {
  return tags
    .map((tag) => tag.toLowerCase().replace(/-/g, " "))
    .map((tag) => {
      if (tag.includes("entry")) return "entry approach";
      if (tag.includes("smoke")) return "smoke spread";
      if (tag.includes("flame") || tag.includes("fire")) return "fire escalation";
      if (tag.includes("hose") || tag.includes("firefighter") || tag.includes("responder")) return "ground operations";
      if (tag.includes("visibility")) return "visibility";
      return incidentLevelTags.has(tag) ? tag : "fire response";
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

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Math.round(value * 10) / 10));
}

function insetBox(box: z.infer<typeof runtimeBoxSchema>) {
  const inset = 2;
  const maxBoxSpan = 72;
  const width = Math.min(clampPercent(box.width), maxBoxSpan);
  const height = Math.min(clampPercent(box.height), maxBoxSpan);
  const x = Math.min(100 - inset - width, Math.max(inset, clampPercent(box.x)));
  const y = Math.min(100 - inset - height, Math.max(inset, clampPercent(box.y)));

  return {
    ...box,
    x,
    y,
    width,
    height,
  };
}

function sanitizeAnalysis(analysis: RuntimeAnalysis): RuntimeAnalysis {
  const evidence = [...analysis.evidence]
    .slice(0, 3)
    .map((item) => ({
      ...item,
      tags: incidentTags(item.tags),
      boxes: item.boxes.slice(0, 3).map((box) => ({ ...insetBox(box), label: shortBoxLabel(box.label) })),
    }));
  const evidenceFrameIds = new Set(evidence.map((item) => item.frameId));

  return {
    ...analysis,
    evidence,
    recommendations: analysis.recommendations
      .map((recommendation) => ({
        ...recommendation,
        evidenceFrameIds: recommendation.evidenceFrameIds.filter((frameId) => evidenceFrameIds.has(frameId)),
      }))
      .filter((recommendation) => recommendation.evidenceFrameIds.length > 0),
  };
}

function ReportDocument({ analysis }: { analysis: RuntimeAnalysis }) {
  const state = getScenarioState();

  return React.createElement(
    Document,
    { title: `1stSight runtime evidence report: ${analysis.incidentTitle}` },
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(Text, { style: styles.title }, `Runtime Evidence Report: ${analysis.incidentTitle}`),
      React.createElement(
        Text,
        { style: styles.subtitle },
        "1stSight structured evidence export. Generated from runtime video-frame extraction and model analysis; not an official SCDF Fire Report or Ambulance Report.",
      ),
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, "Scenario"),
        React.createElement(Text, null, `${state.title} / ${state.incidentClock}`),
        React.createElement(Text, { style: styles.evidence }, analysis.generatedFrom),
      ),
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, "Model Summary"),
        React.createElement(Text, null, analysis.summary),
      ),
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, "Runtime Evidence Frames"),
        analysis.evidence.map((item) =>
          React.createElement(
            View,
            { key: item.frameId, style: styles.claim },
            React.createElement(Text, null, item.name),
            React.createElement(
              View,
              { style: styles.frameWrap },
              React.createElement(
                View,
                { style: styles.frameViewport },
                React.createElement(Image, { src: item.imageUrl, style: styles.frameImage }),
                item.boxes.slice(0, 3).map((box, boxIndex) =>
                  React.createElement(
                    View,
                    {
                      key: `${item.frameId}-${box.label}-${boxIndex}`,
                      style: {
                        position: "absolute",
                        left: `${box.x}%`,
                        top: `${box.y}%`,
                        width: `${box.width}%`,
                        height: `${box.height}%`,
                        border: "1.5 solid #f4a62a",
                        backgroundColor: "rgba(244, 166, 42, 0.10)",
                      },
                    },
                    React.createElement(Text, { style: styles.boxLabel }, `${boxIndex + 1} ${box.label}`),
                  ),
                ),
              ),
            ),
            React.createElement(Text, { style: styles.evidence }, `${item.sourceResponder} / ${item.timestampLabel}`),
            React.createElement(Text, { style: styles.evidence }, item.description),
            React.createElement(Text, { style: styles.evidence }, `Tags: ${item.tags.slice(0, 3).join(", ")}`),
          ),
        ),
      ),
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, "Recommended Follow-up"),
        analysis.recommendations.map((item) =>
          React.createElement(
            View,
            { key: item.id, style: styles.row },
            React.createElement(Text, { style: styles.key }, `${item.evidenceFrameIds.length} evidence frame${item.evidenceFrameIds.length === 1 ? "" : "s"}`),
            React.createElement(Text, { style: styles.value }, `${item.title}: ${item.reason}`),
          ),
        ),
      ),
      React.createElement(Text, { style: styles.footer }, "Generated by 1stSight for officer review. Source screenshots and localized labels are retained for traceability."),
    ),
  );
}

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return Response.json({ error: "Report export requires the latest runtime analysis payload." }, { status: 400 });
  }

  const requestBody = parsed.data;
  const analysis = sanitizeAnalysis(requestBody.analysis);
  // React PDF Node API: https://react-pdf.org/node
  const document = React.createElement(ReportDocument, { analysis }) as unknown as React.ReactElement<React.ComponentProps<typeof Document>>;
  const buffer = await renderToBuffer(document);
  const pdfBody = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;

  return new Response(pdfBody, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="1stsight-runtime-evidence-report.pdf"',
    },
  });
}
