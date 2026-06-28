// Next.js Instrumentation: https://nextjs.org/docs/app/guides/instrumentation
const modelModes = new Set(["gb10-openai", "codex", "openai"]);
const defaultGb10Model = "gb10-local-text";
const defaultCodexModel = "gpt-5.5";
const healthcheckTimeoutMs = Number.parseInt(process.env.DEV_HEALTHCHECK_TIMEOUT_MS ?? "2500", 10);

function hasValue(value: string | undefined) {
  return Boolean(value?.trim());
}

function getModelMode() {
  if (modelModes.has(process.env.AI_MODEL_MODE ?? "")) {
    return process.env.AI_MODEL_MODE;
  }

  return "gb10-openai";
}

function getModelsEndpoint(baseUrl: string) {
  return `${baseUrl.replace(/\/+$/, "")}/models`;
}

function getModelIds(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("data" in payload) || !Array.isArray(payload.data)) {
    return [];
  }

  return payload.data.flatMap((model) => {
    if (!model || typeof model !== "object" || !("id" in model) || typeof model.id !== "string") return [];
    return [model.id];
  });
}

async function fetchJsonHealth(label: string, url: string, headers: HeadersInit = {}) {
  const controller = new AbortController();
  const startedAt = Date.now();
  const timeout = setTimeout(() => controller.abort(), healthcheckTimeoutMs);

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
    });
    const elapsedMs = Date.now() - startedAt;

    if (!response.ok) {
      return {
        ok: false,
        message: `${label} unreachable: HTTP ${response.status} ${response.statusText} at ${url} (${elapsedMs}ms)`,
      };
    }

    let payload: unknown = null;

    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    return { ok: true, elapsedMs, payload };
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    const reason = error instanceof Error ? (error.name === "AbortError" ? `timeout after ${healthcheckTimeoutMs}ms` : error.message) : String(error);

    return {
      ok: false,
      message: `${label} unreachable: ${reason} at ${url} (${elapsedMs}ms)`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function logGb10Health() {
  const baseUrl = process.env.GB10_OPENAI_BASE_URL?.trim();

  if (!baseUrl) {
    console.warn("[dev-health] gb10 missing: set GB10_OPENAI_BASE_URL");
    return;
  }

  const headers: HeadersInit = hasValue(process.env.GB10_OPENAI_API_KEY)
    ? { Authorization: `Bearer ${process.env.GB10_OPENAI_API_KEY}` }
    : {};
  const result = await fetchJsonHealth("gb10", getModelsEndpoint(baseUrl), headers);

  if (!result.ok) {
    console.warn(`[dev-health] ${result.message}`);
    return;
  }

  const modelIds = getModelIds(result.payload);

  if (modelIds.length > 0 && !modelIds.includes(defaultGb10Model)) {
    console.warn(`[dev-health] gb10 alive: ${baseUrl} (${result.elapsedMs}ms), but ${defaultGb10Model} was not listed; available: ${modelIds.slice(0, 5).join(", ")}`);
    return;
  }

  console.log(`[dev-health] gb10 alive: ${baseUrl} (${defaultGb10Model}, ${result.elapsedMs}ms)`);
}

async function logOpenAIHealth(mode: string) {
  if (!hasValue(process.env.OPENAI_API_KEY)) {
    const scope = mode === "gb10-openai" ? "vision calls" : "openai mode";
    console.warn(`[dev-health] openai missing: OPENAI_API_KEY is not set (${scope})`);
    return;
  }

  const result = await fetchJsonHealth("openai", "https://api.openai.com/v1/models", {
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  });

  if (!result.ok) {
    console.warn(`[dev-health] ${result.message}`);
    return;
  }

  console.log(`[dev-health] openai reachable: https://api.openai.com/v1 (${result.elapsedMs}ms)`);
}

function logCodexHealth() {
  console.log(`[dev-health] codex configured: ${defaultCodexModel}; run codex login before using AI_MODEL_MODE=codex`);
}

async function logHealth() {
  const mode = getModelMode();

  console.log(`[dev-health] AI_MODEL_MODE=${mode}`);

  if (mode === "gb10-openai") {
    await logGb10Health();
    await logOpenAIHealth(mode);
    return;
  }

  if (mode === "openai") {
    await logOpenAIHealth(mode);
    return;
  }

  logCodexHealth();
}

export async function register() {
  if (process.env.NODE_ENV !== "development" || process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    await logHealth();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[dev-health] health checks skipped after unexpected error: ${message}`);
  }
}
