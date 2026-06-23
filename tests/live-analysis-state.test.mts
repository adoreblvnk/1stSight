// Node.js test runner API: https://nodejs.org/api/test.html
import test from "node:test";
import assert from "node:assert/strict";
import { mergeLiveAnalysis, type LiveAnalysis } from "../src/lib/live-analysis-state.ts";

function analysisAt(generatedAt: string, seconds: number, options: { recommendation?: boolean; sustained?: boolean } = {}) {
  const timestamp = seconds === 77.5 ? "1:17.5" : "2:02";
  const frameId = seconds === 77.5 ? "demo-fire-b-77_5s-escalation-etf" : "demo-fire-b-122s-sustained-escalation";

  return {
    generatedAt,
    incidentId: "punggol-residential-fire",
    incidentTitle: "Caller report: residential unit fire",
    chunkStartSeconds: seconds,
    chunkDurationSeconds: 5,
    generatedFrom: "deterministic demo evidence surfaced by current Punggol live feed time",
    events: options.recommendation
      ? [{
          id: frameId,
          timestamp,
          title: options.sustained ? "Sustained flame growth continues" : "Escalating fire conditions visible",
          source: `Firefighter B / ${timestamp}`,
          evidence: options.sustained ? "Bodycam B at 2:02 shows continued fire growth and heavy flame conditions requiring command review." : "Bodycam B shows fire escalation at 1:17.5, supporting an Enhanced Task Force consideration for the Ground Commander.",
          severity: "high" as const,
          confidence: 0.98,
          reviewState: "pending-review" as const,
          category: "fire escalation",
          sourceResponder: "Firefighter B",
        }]
      : [],
    recommendation: options.recommendation
      ? {
          shouldRecommend: true,
          id: options.sustained ? "demo-etf-recommendation-122s" : "demo-etf-recommendation-77_5s",
          title: "Flag ETF consideration for Ground Commander",
          action: "Flag Enhanced Task Force consideration for Ground Commander",
          reason: options.sustained ? "Sustained fire growth at 2:02 adds severity to the earlier escalation evidence." : "Bodycam B shows escalating fire conditions at 1:17.5.",
          evidence: options.sustained ? "Bodycam B at 2:02 shows continued fire growth and heavy flame conditions requiring command review." : "Bodycam B shows fire escalation at 1:17.5, supporting an Enhanced Task Force consideration for the Ground Commander.",
          evidenceFrameId: frameId,
          evidenceImageUrl: "data:image/png;base64,test",
          sourceTimestamp: timestamp,
          reviewState: "pending-review" as const,
        }
      : {
          shouldRecommend: false,
          id: "",
          title: "",
          action: "",
          reason: "",
          evidence: "",
          evidenceFrameId: "",
          evidenceImageUrl: "",
          sourceTimestamp: "",
          reviewState: "system-created" as const,
        },
  };
}

test("keeps Punggol live state empty before escalation evidence surfaces", () => {
  const merged = mergeLiveAnalysis(null, analysisAt("2026-07-03T13:00:00.000Z", 0));

  assert.equal(merged.events.length, 0);
  assert.equal(merged.recommendations.length, 0);
});

test("adds ETF once after escalation evidence and suppresses same-evidence reruns", () => {
  let merged: LiveAnalysis | null = mergeLiveAnalysis(null, analysisAt("2026-07-03T13:00:00.000Z", 0));

  merged = mergeLiveAnalysis(merged, analysisAt("2026-07-03T13:00:05.000Z", 77.5, { recommendation: true }));
  assert.equal(merged.events.length, 1);
  assert.equal(merged.recommendations.length, 1);
  assert.equal(merged.recommendations[0].title, "Flag ETF consideration for Ground Commander");

  merged = mergeLiveAnalysis(merged, analysisAt("2026-07-03T13:00:10.000Z", 77.5, { recommendation: true }));
  assert.equal(merged.events.length, 1);
  assert.equal(merged.recommendations.length, 1);
});

test("allows a repeat ETF recommendation only when later evidence is more severe", () => {
  let merged: LiveAnalysis | null = mergeLiveAnalysis(null, analysisAt("2026-07-03T13:00:05.000Z", 77.5, { recommendation: true }));

  merged = mergeLiveAnalysis(merged, analysisAt("2026-07-03T13:00:20.000Z", 122, { recommendation: true, sustained: true }));

  assert.equal(merged.events.length, 2);
  assert.equal(merged.recommendations.length, 2);
  assert.match(merged.recommendations[1].reason, /adds severity/i);
});
