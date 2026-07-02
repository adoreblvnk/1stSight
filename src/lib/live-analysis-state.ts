import type { LiveAnalysisOutput } from "@/lib/ai/schemas";

export type LiveEvent = LiveAnalysisOutput["events"][number] & {
  category?: string;
  evidenceImageUrl?: string;
  sourceResponder?: string;
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

const maxLiveRecommendations = 3;

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

function recommendationSlot(recommendation: LiveAnalysisOutput["recommendation"]) {
  const text = `${recommendation.title} ${recommendation.action} ${recommendation.reason} ${recommendation.evidence} ${recommendation.evidenceFrameId}`.toLowerCase();

  // Joseph stage-demo feedback: keep live review to two ETF cues and one responder-safety police cue.
  if (/enhanced task force|etf/.test(text)) return /sustained|130_75/.test(text) ? "fire-etf-sustained" : "fire-etf-initial";
  if (/police|responder safety|physical contact|unsafe proximity|physical aggression|physically aggressive/.test(text)) return "responder-safety-police";

  return recommendationKey(recommendation);
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
  const recommendationSlots = new Set(previousRecommendations.map(recommendationSlot));
  const nextRecommendations = nextRecommendation
    && previousRecommendations.length < maxLiveRecommendations
    && !recommendationSlots.has(recommendationSlot(nextRecommendation))
    ? [nextRecommendation]
    : [];
  const recommendations = [...previousRecommendations, ...nextRecommendations].slice(0, maxLiveRecommendations);

  return {
    ...next,
    events: [...previousEvents, ...nextEvents],
    recommendations,
  };
}
