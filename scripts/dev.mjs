import { spawn } from "node:child_process";
import process from "node:process";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
const projectDir = process.cwd();
// Next.js Environment Variables Guide: https://github.com/vercel/next.js/blob/v16.2.9/docs/01-app/02-guides/environment-variables.mdx
loadEnvConfig(projectDir, true);

const modelModes = new Set(["gb10-openai", "codex", "openai"]);
const defaultGb10Model = "gb10-local-text";
const defaultCodexModel = "gpt-5.5";
const healthcheckTimeoutMs = Number.parseInt(process.env.DEV_HEALTHCHECK_TIMEOUT_MS ?? "2500", 10);

function hasValue(value) {
  return Boolean(value?.trim());
}

function getModelMode() {
  if (modelModes.has(process.env.AI_MODEL_MODE)) {
    return process.env.AI_MODEL_MODE;
  }

  return "gb10-openai";
}

function getModelsEndpoint(baseUrl) {
  return `${baseUrl.replace(/\/+$/, "")}/models`;
}

function getModelIds(payload) {
  if (!Array.isArray(payload?.data)) {
    return [];
  }

  return payload.data.map((model) => model?.id).filter(Boolean);
}

async function fetchJsonHealth(label, url, headers = {}) {
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

    let payload = null;

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
  const model = defaultGb10Model;

  if (!hasValue(baseUrl)) {
    console.warn("[dev-health] gb10 missing: set GB10_OPENAI_BASE_URL");
    return;
  }

  const headers = hasValue(process.env.GB10_OPENAI_API_KEY)
    ? { Authorization: `Bearer ${process.env.GB10_OPENAI_API_KEY}` }
    : {};
  const result = await fetchJsonHealth("gb10", getModelsEndpoint(baseUrl), headers);

  if (!result.ok) {
    console.warn(`[dev-health] ${result.message}`);
    return;
  }

  const modelIds = getModelIds(result.payload);

  if (modelIds.length > 0 && !modelIds.includes(model)) {
    console.warn(`[dev-health] gb10 alive: ${baseUrl} (${result.elapsedMs}ms), but ${model} was not listed; available: ${modelIds.slice(0, 5).join(", ")}`);
    return;
  }

  console.log(`[dev-health] gb10 alive: ${baseUrl} (${model}, ${result.elapsedMs}ms)`);
}

async function logOpenAIHealth(mode) {
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

function startNextDev() {
  const command = process.platform === "win32" ? "next.cmd" : "next";
  const child = spawn(command, ["dev", ...process.argv.slice(2)], {
    env: process.env,
    stdio: "inherit",
  });

  child.on("error", (error) => {
    console.error(`[dev-health] failed to start next dev: ${error.message}`);
    process.exit(1);
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

try {
  await logHealth();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[dev-health] health checks skipped after unexpected error: ${message}`);
}

console.log("[dev-health] starting next dev");
startNextDev();
