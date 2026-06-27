import { generateText, Output, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { codexExec } from "ai-sdk-provider-codex-cli";
import type { z } from "zod";

type StructuredRequest<TSchema extends z.ZodType> = {
  schema: TSchema;
  prompt: string;
  fallback: z.infer<TSchema>;
  prefer: "text" | "vision";
  outputName?: string;
  outputDescription?: string;
};

type StrictStructuredRequest<TSchema extends z.ZodType> = {
  schema: TSchema;
  prompt?: string;
  messages?: ModelMessage[];
  prefer: "text" | "vision";
  outputName?: string;
  outputDescription?: string;
};

type ModelMode = "gb10-openai" | "codex" | "openai";
const DEFAULT_OPENAI_MODEL = "gpt-5.5";
const DEFAULT_GB10_MODEL = "gb10-local-text";
const DEFAULT_CODEX_MODEL = "gpt-5.5";

function getModelMode(): ModelMode {
  if (process.env.AI_MODEL_MODE === "gb10-openai" || process.env.AI_MODEL_MODE === "codex" || process.env.AI_MODEL_MODE === "openai") {
    return process.env.AI_MODEL_MODE;
  }

  return "gb10-openai";
}

function usesGb10TextModel(prefer: "text" | "vision") {
  return getModelMode() === "gb10-openai" && prefer === "text" && Boolean(process.env.GB10_OPENAI_BASE_URL);
}

function withGb10NoThinkPrompt(prompt: string) {
  // NVIDIA Nemotron Nano prompt format: https://huggingface.co/nvidia/NVIDIA-Nemotron-Nano-9B-v2
  return `/no_think\n${prompt}`;
}

function withGb10NoThinkMessages(messages: ModelMessage[]) {
  // NVIDIA Nemotron Nano prompt format: https://huggingface.co/nvidia/NVIDIA-Nemotron-Nano-9B-v2
  if (messages[0]?.role === "system" && typeof messages[0].content === "string") {
    return [{ ...messages[0], content: withGb10NoThinkPrompt(messages[0].content) }, ...messages.slice(1)];
  }

  return [{ role: "system" as const, content: "/no_think" }, ...messages];
}

function getGb10TextModel() {
  if (process.env.GB10_OPENAI_BASE_URL) {
    // AI SDK OpenAI Compatible Provider: https://ai-sdk.dev/providers/openai-compatible-providers
    return createOpenAICompatible({
      baseURL: process.env.GB10_OPENAI_BASE_URL,
      name: "gb10-vllm",
      apiKey: process.env.GB10_OPENAI_API_KEY,
    }).chatModel(DEFAULT_GB10_MODEL);
  }

  return null;
}

function getOpenAITextModel() {
  if (process.env.OPENAI_API_KEY) {
    // AI SDK OpenAI Provider: https://ai-sdk.dev/providers/ai-sdk-providers/openai
    return openai(DEFAULT_OPENAI_MODEL);
  }

  return null;
}

function getOpenAIVisionModel() {
  if (process.env.OPENAI_API_KEY) {
    // AI SDK OpenAI Provider: https://ai-sdk.dev/providers/ai-sdk-providers/openai
    return openai(DEFAULT_OPENAI_MODEL);
  }

  return null;
}

function getCodexModel() {
  // AI SDK Provider Codex CLI README: https://github.com/ben-vargas/ai-sdk-provider-codex-cli
  return codexExec(DEFAULT_CODEX_MODEL, {
    allowNpx: true,
    skipGitRepoCheck: true,
    approvalMode: "on-failure",
    sandboxMode: "workspace-write",
  });
}

function getTextModel() {
  const mode = getModelMode();

  if (mode === "codex") {
    return getCodexModel();
  }

  if (mode === "openai") {
    return getOpenAITextModel();
  }

  return getGb10TextModel();
}

function getVisionModel() {
  const mode = getModelMode();

  if (mode === "codex") {
    return getCodexModel();
  }

  return getOpenAIVisionModel();
}

export async function generateStructured<TSchema extends z.ZodType>({
  schema,
  prompt,
  fallback,
  prefer,
  outputName,
  outputDescription,
}: StructuredRequest<TSchema>): Promise<z.infer<TSchema>> {
  const model = prefer === "vision" ? getVisionModel() : getTextModel();
  const modelPrompt = usesGb10TextModel(prefer) ? withGb10NoThinkPrompt(prompt) : prompt;

  if (!model) {
    return fallback;
  }

  try {
    // AI SDK v6 Structured Outputs: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
    const { output } = await generateText({
      model,
      output: Output.object({ schema, name: outputName, description: outputDescription }),
      prompt: modelPrompt,
    });

    return schema.parse(output);
  } catch (error) {
    console.error("1stSight model fallback used", error);
    return fallback;
  }
}

export async function generateStructuredStrict<TSchema extends z.ZodType>({
  schema,
  prompt,
  messages,
  prefer,
  outputName,
  outputDescription,
}: StrictStructuredRequest<TSchema>): Promise<z.infer<TSchema>> {
  const model = prefer === "vision" ? getVisionModel() : getTextModel();
  const modelPrompt = usesGb10TextModel(prefer) ? withGb10NoThinkPrompt(prompt ?? "") : prompt ?? "";
  const modelMessages = messages && usesGb10TextModel(prefer) ? withGb10NoThinkMessages(messages) : messages;

  if (!model) {
    throw new Error("No server-side AI model is configured for runtime analysis.");
  }

  // AI SDK v6 Structured Outputs: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
  const { output } = await generateText({
    model,
    output: Output.object({ schema, name: outputName, description: outputDescription }),
    ...(modelMessages ? { messages: modelMessages } : { prompt: modelPrompt }),
  });

  return schema.parse(output);
}
