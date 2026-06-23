import type { LiveAnalysisOutput } from "@/lib/ai/schemas";

export type LiveEvent = LiveAnalysisOutput["events"][number] & {
  category?: string;
  evidenceImageUrl?: string;
  sourceResponder?: string;
  boxes?: Array<{ x: number; y: number; width: number; height: number; label: string }>;
};

export type LiveAnalysis = Omit<LiveAnalysisOutput, "events"> & {
  generatedFrom: string;
  events: LiveEvent[];
  recommendations: LiveAnalysisOutput["recommendation"][];
};

type IncomingLiveAnalysis = Omit<LiveAnalysisOutput, "events"> & {
  generatedFrom: string;
  events: LiveEvent[];
};

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

function recommendationKey(recommendation: LiveAnalysisOutput["recommendation"]) {
  return onePhrase(recommendation.action || recommendation.title)
    .toLowerCase()
    .replace(/\betf\b/g, "enhanced task force")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function timestampSeconds(timestamp: string | undefined) {
  const match = timestamp?.match(/(\d+):(\d+(?:\.\d+)?)/);
  if (!match) return 0;

  return Number(match[1]) * 60 + Number(match[2]);
}

function recommendationSeverity(recommendation: LiveAnalysisOutput["recommendation"]) {
  const text = `${recommendation.title} ${recommendation.action} ${recommendation.reason} ${recommendation.evidence}`.toLowerCase();
  let score = 0;

  if (/enhanced task force|etf|raise alarm|alarm level/.test(text)) score += 50;
  if (/uncontrolled|large fire|rapid|beyond initial attack|multiple compartments|defensive|worsening/.test(text)) score += 30;
  if (/sustained|continued|continues|adds severity|intense|heavy flame|flame growth|fire growth/.test(text)) score += 20;
  if (/fire escalation|smoke spread|resource escalation/.test(text)) score += 10;

  return score + Math.min(30, Math.floor(timestampSeconds(recommendation.sourceTimestamp) / 15));
}

export function mergeLiveAnalysis(previous: LiveAnalysis | null, next: IncomingLiveAnalysis): LiveAnalysis {
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
  const nextRecommendation = next.recommendation.shouldRecommend
    ? { ...next.recommendation, id: `${next.generatedAt}-${next.chunkStartSeconds}-${previousRecommendations.length}-${next.recommendation.id}` }
    : null;
  const nextRecommendations = nextRecommendation && previousRecommendations
    .filter((recommendation) => recommendationKey(recommendation) === recommendationKey(nextRecommendation))
    .every((recommendation) => recommendationSeverity(nextRecommendation) > recommendationSeverity(recommendation))
    ? [nextRecommendation]
    : [];

  return {
    ...next,
    events: [...previousEvents, ...nextEvents],
    recommendations: [...previousRecommendations, ...nextRecommendations],
  };
}
