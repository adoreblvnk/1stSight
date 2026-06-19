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
};

type StrictStructuredRequest<TSchema extends z.ZodType> = {
  schema: TSchema;
  prompt?: string;
  messages?: ModelMessage[];
  prefer: "text" | "vision";
};

function getTextModel() {
  if (process.env.GB10_OPENAI_BASE_URL && process.env.GB10_MODEL_ID) {
    // AI SDK OpenAI Compatible Provider: https://ai-sdk.dev/providers/openai-compatible-providers
    return createOpenAICompatible({
      baseURL: process.env.GB10_OPENAI_BASE_URL,
      name: "gb10-vllm",
      apiKey: process.env.GB10_OPENAI_API_KEY,
    }).chatModel(process.env.GB10_MODEL_ID);
  }

  if (process.env.OPENAI_API_KEY) {
    // AI SDK OpenAI Provider: https://ai-sdk.dev/providers/ai-sdk-providers/openai
    return openai(process.env.OPENAI_MODEL_ID ?? "gpt-5.5");
  }

  if (process.env.CODEX_MODEL_ID) {
    // AI SDK Provider Codex CLI README: https://github.com/ben-vargas/ai-sdk-provider-codex-cli
    return codexExec(process.env.CODEX_MODEL_ID, {
      allowNpx: true,
      skipGitRepoCheck: true,
      approvalMode: "on-failure",
      sandboxMode: "workspace-write",
    });
  }

  return null;
}

function getVisionModel() {
  if (process.env.OPENAI_API_KEY) {
    // AI SDK OpenAI Provider: https://ai-sdk.dev/providers/ai-sdk-providers/openai
    return openai(process.env.OPENAI_VISION_MODEL_ID ?? process.env.OPENAI_MODEL_ID ?? "gpt-5.5");
  }

  if (process.env.CODEX_MODEL_ID) {
    // AI SDK Provider Codex CLI README: https://github.com/ben-vargas/ai-sdk-provider-codex-cli
    return codexExec(process.env.CODEX_MODEL_ID, {
      allowNpx: true,
      skipGitRepoCheck: true,
      approvalMode: "on-failure",
      sandboxMode: "workspace-write",
    });
  }

  return null;
}

export async function generateStructured<TSchema extends z.ZodType>({
  schema,
  prompt,
  fallback,
  prefer,
}: StructuredRequest<TSchema>): Promise<z.infer<TSchema>> {
  const model = prefer === "vision" ? getVisionModel() : getTextModel();

  if (!model) {
    return fallback;
  }

  try {
    // AI SDK v6 Structured Outputs: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
    const { output } = await generateText({
      model,
      output: Output.object({ schema }),
      prompt,
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
}: StrictStructuredRequest<TSchema>): Promise<z.infer<TSchema>> {
  const model = prefer === "vision" ? getVisionModel() : getTextModel();

  if (!model) {
    throw new Error("No server-side AI model is configured for runtime analysis.");
  }

  // AI SDK v6 Structured Outputs: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
  const { output } = await generateText({
    model,
    output: Output.object({ schema }),
    ...(messages ? { messages } : { prompt: prompt ?? "" }),
  });

  return schema.parse(output);
}
