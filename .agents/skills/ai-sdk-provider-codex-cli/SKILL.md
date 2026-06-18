---
name: ai-sdk-provider-codex-cli
description: Use when adding, configuring, debugging, or reviewing the ai-sdk-provider-codex-cli community provider for Vercel AI SDK. Covers Codex CLI authentication, exec vs app-server providers, model settings, providerOptions, JSON object generation, image inputs, streaming behavior, and known limitations.
license: MIT
compatibility: Requires Node.js 18+, AI SDK v6, local Codex CLI, and either ChatGPT OAuth via codex login or OPENAI_API_KEY.
metadata:
  author: adoreblvnk
  version: "1.0"
  source: https://ai-sdk.dev/providers/community-providers/codex-cli
---

# AI SDK Provider Codex CLI

Use this skill when integrating `ai-sdk-provider-codex-cli` into a Node/Vercel AI SDK project, especially when the user wants to call GPT/Codex models through a local Codex CLI login instead of a normal hosted model API provider.

Primary sources:
- AI SDK provider page: https://ai-sdk.dev/providers/community-providers/codex-cli
- GitHub repo: https://github.com/ben-vargas/ai-sdk-provider-codex-cli
- Limitations: https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/main/LIMITATIONS.md

## First checks

Before editing code, inspect the project:

- Package manager and lockfile: `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `bun.lockb`, `bun.lock`
- AI SDK major version in `package.json`
- Existing provider setup files, usually under `src/`, `app/`, `lib/`, `server/`, or route handlers
- Runtime target: this provider is Node-only because it spawns a local process; do not use it in Edge runtime
- Authentication state: prefer `codex login`; otherwise confirm `OPENAI_API_KEY` is set where the process runs
- Codex CLI availability and version with `codex --version`

Install the AI SDK v6 package only.

```bash
npm i ai ai-sdk-provider-codex-cli
```

```bash
npm i -g @openai/codex
codex login
```

The upstream README currently recommends Codex CLI `0.130.x` or newer for full support of both exec and app-server modes. Prefer the repo README when deciding what Codex CLI version to install.

## Pick the provider mode

Default to `codexExec` unless the task needs true streaming deltas, lower per-call startup overhead, or stateful threads.

| Mode | Import | Behavior | Use when |
| --- | --- | --- | --- |
| Exec | `codexExec` / `createCodexExec` | Spawns `codex exec` per call | Simple local integration, CI, object generation, one-shot tasks |
| App server | `createCodexAppServer` | Starts persistent `codex app-server` JSON-RPC process | True incremental streaming, stateful threads, app-server MCP helpers |
| Legacy alias | `codexCli` / `createCodexCli` | Maps to exec mode | Existing examples/docs use it; new code should prefer explicit `codexExec` |

Close app-server providers after use with `await provider.close()` when the provider lifetime is not app-wide.

## Minimal exec integration

Use this shape for most `generateText` calls. Preserve the import/object ordering from the upstream examples unless project constraints force a change.

```js
// AI SDK Provider Codex CLI README: https://github.com/ben-vargas/ai-sdk-provider-codex-cli
import { generateText } from 'ai';
import { codexExec } from 'ai-sdk-provider-codex-cli';

const model = codexExec('gpt-5.5', {
  allowNpx: true,
  skipGitRepoCheck: true,
  approvalMode: 'on-failure',
  sandboxMode: 'workspace-write',
});

const { text } = await generateText({
  model,
  prompt: 'Reply with a single word: hello.',
});
console.log(text);
```

Use `allowNpx: true` when Codex might not be globally installed on PATH. Use `skipGitRepoCheck: true` in CI, temporary directories, and non-repo contexts.

## AI SDK docs alias integration

The AI SDK provider page imports the default provider instance as `codexCli`. This still works as an exec-mode alias.

```ts
// AI SDK Codex CLI Provider: https://ai-sdk.dev/providers/community-providers/codex-cli
import { codexCli } from 'ai-sdk-provider-codex-cli';
import { generateText } from 'ai';

const { text } = await generateText({
  model: codexCli('gpt-5.2-codex'),
  prompt: 'Write a vegetarian lasagna recipe for 4 people.',
});
```

For new code, prefer `codexExec` when you specifically want process-per-call behavior.

## App-server integration

Use app-server mode when the application benefits from a persistent local Codex process.

```js
// AI SDK Provider Codex CLI README: https://github.com/ben-vargas/ai-sdk-provider-codex-cli
import { streamText } from 'ai';
import { createCodexAppServer } from 'ai-sdk-provider-codex-cli';

const provider = createCodexAppServer({
  defaultSettings: {
    minCodexVersion: '0.130.0',
    autoApprove: false,
    personality: 'pragmatic',
  },
});

const { textStream } = await streamText({
  model: provider('gpt-5.5'),
  prompt: 'Write two short lines of encouragement.',
});
for await (const chunk of textStream) process.stdout.write(chunk);

await provider.close();
```

Per-call app-server overrides belong under `providerOptions['codex-app-server']`.

```ts
// AI SDK Provider Codex CLI README: https://github.com/ben-vargas/ai-sdk-provider-codex-cli
import { generateText } from 'ai';
import { createCodexAppServer } from 'ai-sdk-provider-codex-cli';

const appServerProvider = createCodexAppServer();

const response = await generateText({
  model: appServerProvider('gpt-5.5'),
  prompt: 'Continue this task.',
  providerOptions: {
    'codex-app-server': {
      threadId: 'thr_existing',
      personality: 'pragmatic',
      approvalPolicy: 'on-request',
    },
  },
});
```

## Settings defaults

Useful exec settings:

- `allowNpx`: fallback to `npx -y @openai/codex` when `codex` is not on PATH
- `cwd`: working directory for Codex
- `addDirs`: extra directories Codex may read/write
- `approvalMode`: usually `on-failure`; supported values in AI SDK docs are `untrusted`, `on-failure`, `on-request`, `never`
- `sandboxMode`: usually `workspace-write`; supported values are `read-only`, `workspace-write`, `danger-full-access`
- `skipGitRepoCheck`: enable for CI/non-repo contexts
- `reasoningEffort`: `none`, `minimal`, `low`, `medium`, `high`, `xhigh`
- `reasoningSummary`: use `auto` or `detailed`; upstream notes that `concise` and `none` are rejected by API
- `modelVerbosity` / per-call `textVerbosity`: `low`, `medium`, `high`
- `webSearch`: maps to Codex web search config
- `mcpServers`, `rmcpClient`, `configOverrides`: pass through Codex config and MCP wiring
- `verbose` / `logger`: troubleshooting logs or custom logging

Avoid `dangerouslyBypassApprovalsAndSandbox` unless the user explicitly accepts that risk.

## Per-call exec overrides

Constructor defaults can be overridden per request with `providerOptions['codex-cli']`. Per-call values win over constructor settings.

```ts
// AI SDK Provider Codex CLI README: https://github.com/ben-vargas/ai-sdk-provider-codex-cli
import { generateText } from 'ai';
import { codexExec } from 'ai-sdk-provider-codex-cli';

const model = codexExec('gpt-5.5', {
  allowNpx: true,
  reasoningEffort: 'medium',
  modelVerbosity: 'medium',
});

const response = await generateText({
  model,
  prompt: 'Summarize the latest release notes.',
  providerOptions: {
    'codex-cli': {
      reasoningEffort: 'high',
      reasoningSummary: 'detailed',
      textVerbosity: 'high',
      rmcpClient: true,
      mcpServers: {
        scratch: {
          transport: 'stdio',
          command: 'pnpm',
          args: ['mcp', 'serve'],
        },
      },
      configOverrides: {
        experimental_resume: '/tmp/resume.jsonl',
      },
    },
  },
});
```

## Object generation rules

`generateObject` is supported through Codex CLI native JSON Schema / `--output-schema`, but OpenAI strict mode is stricter than normal Zod expectations.

Important limitations from `LIMITATIONS.md`:

- Zod `.optional()` fields do not work; all properties must be required
- Use required nullable/empty fields plus application-level post-processing instead of `.optional()`
- `$schema`, `$id`, `$ref`, `$defs`, `definitions`, schema-level `title`, `examples`, `default`, `format`, and `pattern` are stripped during schema sanitization
- `.email()`, `.url()`, `.uuid()`, and `.regex()` are not enforced by the API after sanitization
- Use `.describe()` to guide the model, then validate in application code

Bad:

```typescript
// LIMITATIONS.md: https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/main/LIMITATIONS.md
const schema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().optional(),
});
```

Good:

```typescript
// LIMITATIONS.md: https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/main/LIMITATIONS.md
const schema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().describe('Valid email address, or empty string when unavailable'),
});
```

Object generation example:

```js
// AI SDK Provider Codex CLI README: https://github.com/ben-vargas/ai-sdk-provider-codex-cli
import { generateObject } from 'ai';
import { z } from 'zod';
import { codexExec } from 'ai-sdk-provider-codex-cli';

const schema = z.object({ name: z.string(), age: z.number().int() });
const { object } = await generateObject({
  model: codexExec('gpt-5.5', { allowNpx: true, skipGitRepoCheck: true }),
  schema,
  prompt: 'Generate a small user profile.',
});
console.log(object);
```

## Images

Image input is supported for vision-capable models.

- Exec mode supports local binary/base64 image inputs; HTTP/HTTPS image URLs are not supported in exec mode
- App-server mode supports HTTP/HTTPS image URLs as remote image inputs
- Local image data is written to temp files and passed to Codex CLI; temp files are cleaned up after the request
- Supported local formats include base64 data URLs, raw base64 strings, `Buffer`, `Uint8Array`, and `ArrayBuffer`

```js
// AI SDK Provider Codex CLI README: https://github.com/ben-vargas/ai-sdk-provider-codex-cli
import { generateText } from 'ai';
import { codexExec } from 'ai-sdk-provider-codex-cli';
import { readFileSync } from 'fs';

const model = codexExec('gpt-5.5', { allowNpx: true, skipGitRepoCheck: true });
const imageBuffer = readFileSync('./screenshot.png');

const { text } = await generateText({
  model,
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'What do you see in this image?' },
        { type: 'image', image: imageBuffer, mimeType: 'image/png' },
      ],
    },
  ],
});
console.log(text);
```

## Streaming and tools

Do not promise normal AI SDK tool execution semantics. In the current AI SDK v6 docs, the model capability table marks Tool Usage and Tool Streaming as unsupported because this provider does not support AI SDK custom tools passed to `generateText`/`streamText` through Zod/schema tool definitions.

- AI SDK custom tools passed to `generateText`/`streamText` are not supported as app-executed model tools
- Codex still executes its own CLI tools autonomously; those are provider-executed tool events, not AI SDK app tools
- The provider can surface Codex autonomous tool-call/tool-result events for observation via `result.fullStream`
- Tool events should be treated as monitoring/audit output with `providerExecuted: true`; the app does not execute those tool calls itself
- Exec mode `streamText()` is functional but generally emits final text as one chunk because `codex exec --experimental-json` lacks text delta events
- App-server mode supports true incremental text deltas via `item/agentMessage/delta`
- Usage tracking may be zero or incomplete because Codex CLI events do not consistently populate token usage

When a user asks for tool streaming, first clarify whether they mean AI SDK custom tools or observing Codex's autonomous CLI tools. For observation, implement readers over `result.fullStream`; do not wire application tools expecting the model to call them through normal AI SDK tool schemas.

## Troubleshooting checklist

- `Cannot find codex`: install `@openai/codex`, use `allowNpx: true`, or set a custom Codex path if the project supports it
- Auth failure: run `codex login` interactively, or ensure `OPENAI_API_KEY` is forwarded in provider `env`
- Edge runtime error: move the route/function to Node runtime; this provider spawns local processes
- Git repo warning/failure: set `skipGitRepoCheck: true` for CI/non-repo workdirs
- No incremental streaming in exec mode: expected; switch to app-server mode if true streaming matters
- Object generation 400 about `required`: remove `.optional()` and make every field required
- Email/URL/UUID/regex validation not enforced: use descriptions and validate after receiving the object
- HTTP image URL fails in exec mode: fetch it yourself and pass binary/base64, or switch to app-server mode
- ANSI/control sequences in logs: prefer `color: 'never'`, but note upstream says filtering may not be perfect

## Verification

After editing an integration:

- Run the project typecheck or build command
- Run a minimal `generateText` smoke test if credentials are available
- For object generation, include a schema with no optional properties and validate the parsed object in application code
- For app-server mode, verify the process closes cleanly or is intentionally app-scoped
- For route handlers, confirm the runtime is Node, not Edge
