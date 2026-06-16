# 1stSight MVP Implementation Plan

> **For Hermes:** Do not start coding until this plan is explicitly approved. Use subagent-driven-development only after approval.

## Goal

Build a mentor-ready 1stSight prototype that demonstrates C&C evidence review, timeline creation, evidence-linked Draft Fire Incident Intelligence Report generation, and AAR/post-incident review from responder phone/bodycam frames.

## Architecture

The MVP is a Next.js TypeScript app with two demo modes: Firefighter capture and C&C dashboard. The first working version uses deterministic mock AI and static demo frames so the demo works without API keys; AI SDK endpoints are layered after the product flow is stable.

## Fixed decisions

- App root: `/home/adoreblvnk/Documents/1stSight/app`.
- Repo root: `/home/adoreblvnk/Documents/1stSight`.
- All app-relative paths below are relative to `/home/adoreblvnk/Documents/1stSight/app`.
- Package manager: `pnpm`.
- MVP persistence: client-side React state + localStorage.
- MVP frame assets: static files under `public/demo/frames/`.
- MVP report export: browser print/save-to-PDF via `window.print()`.
- Chunking: 0.5–1s sampled frames for near-live alerting; 15–30s chunks for backend/storage/report/AAR context.
- Secondary output: AAR/post-incident review from the same evidence timeline after the Draft Fire Incident Intelligence Report.
- MVP AI: deterministic mock first; real models are stretch after demo works.
- If `AGENTS.md` conflicts with `PROJECT_CONTEXT.md` or `PLAN.md`, follow `PROJECT_CONTEXT.md` and `PLAN.md` for 1stSight.

## Tech stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- **motion**
- **AI SDK v6**
- Zod for schemas
- Vitest for pure logic tests
- Optional later: Mastra

## Runtime models

- **google / `gemini-3-flash-preview`** — multimodal frame triage.
- **openai / `gpt-5.4-mini`** — alert JSON normalisation, severity, timeline phrasing.
- **openai / `gpt-5.5`** — final commander-facing report drafting.

Codex is for development only, not runtime incident inference.

---

## Build principle

Prototype reliability beats architecture.

The first demo must work even if:

- AI keys are missing.
- Phone camera permissions fail.
- Network latency is poor.
- Real footage is blurry.

Every AI-dependent feature needs deterministic fallback.

---

## Milestone 0: Preflight

**Objective:** Confirm repo state and avoid damaging pitch/proposal files.

**Read-only checks:**

```bash
cd /home/adoreblvnk/Documents/1stSight
git status --short
node --version
pnpm --version
```

**Expected:**

- Existing pitch/docs/assets remain untouched.
- `pnpm` is available.
- App will be created under `app/`, not repo root.

---

## Milestone 1: Scaffold app shell

**Objective:** Create a clean Next.js app foundation.

**Command after approval:**

```bash
cd /home/adoreblvnk/Documents/1stSight
pnpm create next-app@latest app --ts --eslint --tailwind --app --src-dir --import-alias '@/*'
```

**Install shadcn/ui:**

```bash
cd /home/adoreblvnk/Documents/1stSight/app
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button card badge tabs dialog sheet separator scroll-area textarea input select table
```

**Use `table` for:** evidence/report source listing only.

**Verification:**

```bash
pnpm dev
```

Expected: default app loads locally.

---

## Milestone 2: Add environment and demo mode

**Objective:** Make model keys optional and demo behavior explicit.

**Create:**

- `.env.local.example`

**Contents:**

```bash
GOOGLE_GENERATIVE_AI_API_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_DEMO_MODE=true
```

**Rule:**

When `NEXT_PUBLIC_DEMO_MODE=true`, UI/API prefer deterministic mock output even if keys exist.

**Verification:**

```bash
pnpm lint
pnpm tsc --noEmit
```

---

## Milestone 3: Define domain schemas

**Objective:** Lock data shapes before UI work.

**Create:**

- `src/lib/types.ts`
- `src/lib/schemas.ts`

**Core types:**

- `Incident`
- `Responder`
- `FrameEvidence`
- `AlertType`
- `AlertSeverity`
- `AlertStatus`
- `IncidentAlert`
- `TimelineEventCategory`
- `TimelineEvent`
- `GeneratedReport`
- `EvidenceChunk`
- `AarReview`

**Alert type values:**

- `smoke`
- `fire`
- `blocked_access`
- `possible_casualty`
- `exit`
- `low_visibility`
- `feed_issue`
- `other`

**Alert status values:**

- `suggested`
- `confirmed`
- `dismissed`
- `uncertain`

**Timeline categories:**

- `ai_suggested`
- `cc_confirmed`
- `cc_uncertain`
- `dismissed`
- `manual_note`
- `feed_issue`

**Verification:**

```bash
pnpm tsc --noEmit
```

---

## Milestone 4: Seed deterministic demo data

**Objective:** Make the whole demo work before live camera/AI.

**Create:**

- `src/lib/demo-data.ts`
- `public/demo/frames/alpha-smoke-001.jpg`
- `public/demo/frames/alpha-low-visibility-002.jpg`
- `public/demo/frames/bravo-blocked-access-001.jpg`
- `public/demo/frames/bravo-casualty-uncertain-001.jpg`
- `public/demo/frames/bravo-weak-alert-001.jpg`

**Exports:**

```ts
export const demoIncident: Incident;
export const demoResponders: Responder[];
export const demoFrames: FrameEvidence[];
export const initialDemoAlerts: IncidentAlert[];
```

**Minimum data:**

- One warehouse incident.
- Two responders: Alpha, Bravo.
- Five evidence frames.
- Four suggested alerts.
- Fixed IDs and fixed ISO timestamps.

**Rule:**

No `Math.random()` or current timestamps in deterministic demo data.

---

## Milestone 5: Build incident state reducer

**Objective:** Centralise C&C actions and report state.

**Create:**

- `src/lib/incident-state.tsx`
- `src/lib/incident-state.test.ts`

**State ownership:**

- React Context provider wraps app routes.
- Persist to localStorage key: `1stsight-demo-incident`.
- Add reset action to restore deterministic demo state.
- No database in MVP.

**Actions:**

```ts
type IncidentAction =
  | { type: "confirm-alert"; alertId: string; note?: string }
  | { type: "dismiss-alert"; alertId: string; note?: string }
  | { type: "mark-alert-uncertain"; alertId: string; note?: string }
  | { type: "add-manual-note"; responderId?: string; frameId?: string; note: string }
  | { type: "reset-demo" };
```

**Rules:**

- `confirm-alert`: alert becomes `confirmed`; create/update `cc_confirmed` timeline event.
- `mark-alert-uncertain`: alert becomes `uncertain`; create/update `cc_uncertain` timeline event.
- `dismiss-alert`: alert becomes `dismissed`; create/update `dismissed` timeline event; exclude from confirmed report facts.
- `add-manual-note`: create `manual_note` event.

**Tests:**

- Confirmed alert creates confirmed timeline event.
- Uncertain alert does not become confirmed fact.
- Dismissed alert is excluded from report conclusions.
- Reset restores deterministic seed state.

---

## Milestone 6: Build route structure

**Objective:** Make the prototype navigable.

**Routes:**

- `/` — role selection / demo entry.
- `/firefighter` — phone capture mode.
- `/command` — C&C dashboard.
- `/report` — generated Draft Fire Incident Intelligence Report.
- `/aar` — generated AAR/post-incident review.

**Files:**

- `src/app/page.tsx`
- `src/app/firefighter/page.tsx`
- `src/app/command/page.tsx`
- `src/app/report/page.tsx`
- `src/app/aar/page.tsx`
- `src/app/layout.tsx` — wraps routes with incident state provider.

**Verification:**

Open all routes with no runtime errors.

---

## Milestone 7: Firefighter capture demo

**Objective:** Show the hands-free responder experience.

**Create:**

- `src/components/firefighter/camera-capture.tsx`
- `src/components/firefighter/capture-status.tsx`

**Behavior:**

- Request camera permission using `getUserMedia`.
- Show full-screen preview if available.
- Show callsign selector: Alpha or Bravo.
- Show incident ID and capture status.
- Show sampled-frame indicator every 0.5–1s.
- If camera fails, show static fallback demo frame.

**Important MVP rule:**

Firefighter page does not need to stream real frames to C&C for the first demo. C&C uses deterministic demo frames from `demo-data.ts`.

**Mobile verification:**

```bash
pnpm dev --host 0.0.0.0
```

Open `/firefighter` from phone. If camera fails due to insecure origin, fallback mode is acceptable.

---

## Milestone 8: C&C dashboard layout

**Objective:** Build the main judge-facing screen.

**Create:**

- `src/components/command/incident-header.tsx`
- `src/components/command/responder-feed-card.tsx`
- `src/components/command/alert-queue.tsx`
- `src/components/command/alert-actions.tsx`
- `src/components/command/evidence-panel.tsx`
- `src/components/command/timeline.tsx`

**Dashboard sections:**

- Incident header.
- Two responder feed cards.
- Simple feed labels: `live`, `stale`, `fallback`.
- Alert queue.
- Evidence preview panel.
- Timeline.
- Report CTA.

**Avoid:**

- Floor plan in MVP.
- Complex feed health logic.
- Too many hazard categories.

---

## Milestone 9: Deterministic mock AI

**Objective:** Make demo alerts reliable before model integration.

**Create:**

- `src/lib/mock-ai.ts`
- `src/lib/mock-ai.test.ts`

**Exports:**

```ts
export function getMockFrameAnalysis(frameId: string): FrameAnalysisResult;
export function getMockAlerts(incidentId: string): IncidentAlert[];
```

**Required alert IDs:**

- `alert-alpha-smoke`
- `alert-alpha-low-visibility`
- `alert-bravo-blocked-access`
- `alert-bravo-possible-casualty`
- `alert-bravo-weak-uncertain`

**Rules:**

- Stable output across refreshes.
- Schema-valid output.
- No random values.
- Mock mode emits fixed scenario alerts once.

**Tests:**

- Mock output is stable.
- Mock output validates against alert schema.

---

## Milestone 10: Commander confirmation workflow

**Objective:** Make human confirmation central.

**Controls:**

- Confirm.
- Dismiss.
- Mark uncertain.
- Optional note field.

**Acceptance:**

- Alert status updates immediately.
- Timeline updates immediately.
- Evidence frame remains linked.
- UI clearly separates confirmed vs uncertain vs dismissed.

---

## Milestone 11: Report generator

**Objective:** Beat generic fire report generators with source-linked evidence.

**Report type:**

The MVP generates a **Draft Fire Incident Intelligence Report**.

It is Fire Report-adjacent, but it is **not** an official SCDF Fire Report and **not** an Ambulance Report. Use `SCDF_FIRE_REPORT_STRUCTURE.md` and `SCDF_AMBULANCE_REPORT_STRUCTURE.md` as reference boundaries.

**Create:**

- `src/lib/report-generator.ts`
- `src/lib/report-generator.test.ts`
- `src/components/report/report-preview.tsx`
- `src/components/report/report-section.tsx`

**MVP report generation:**

Template-based first, not AI-written first.

**Report sections:**

- Report type: Draft Fire Incident Intelligence Report.
- Incident ID.
- Scenario/location label.
- Incident date/time range.
- Incident nature / fireground cues.
- Responders involved.
- Confirmed observations.
- Uncertain observations.
- Dismissed alerts summary.
- Timeline.
- Damage / affected-area notes from confirmed evidence only.
- Injury / casualty notes from C&C confirmation only; no medical diagnosis.
- Extinguishment / action notes only if manually entered or evidenced.
- Probable cause: default `Not determined by 1stSight prototype`.
- Evidence frame references.
- C&C notes.
- Generated timestamp.
- Prototype disclaimer: not official SCDF Fire Report or Ambulance Report.

**Rules:**

- Confirmed facts cite timeline event or frame ID.
- Uncertain observations are not written as facts.
- Dismissed alerts do not appear as conclusions.
- Claims without evidence are not allowed.
- Probable cause, liability, medical diagnosis, patient identity, consent workflow, and hospital conveyance are not auto-generated by 1stSight.

**Export:**

Add `Print / Save PDF` button using `window.print()`.

**Tests:**

- Confirmed facts include source references.
- Uncertain observations appear only in uncertain section.
- Dismissed alerts do not appear as conclusions.

---

## Milestone 11B: AAR / post-incident review generator

**Objective:** Reuse the evidence timeline for training and operational review after the draft report.

**Create:**

- `src/lib/chunking.ts`
- `src/lib/aar-generator.ts`
- `src/lib/aar-generator.test.ts`
- `src/components/aar/aar-preview.tsx`

**Chunking rule:**

- Near-live alerting uses 0.5–1 second sampled frames.
- Backend/storage/report/AAR context groups events into 15–30 second chunks.
- Every chunk keeps source frame IDs, responder IDs, timestamps, feed health, AI outputs, and C&C actions.

**AAR sections:**

- Incident overview.
- Timeline replay by chunk.
- Confirmed decision points.
- Uncertain and dismissed AI alerts for learning.
- Feed health/staleness notes.
- Blindspots: missing views, unclear footage, delayed confirmation, repeated false alerts.
- Mentor review questions.

**Tests:**

- Events are grouped into stable 15–30 second chunks.
- AAR includes confirmed, uncertain, and dismissed learning sections separately.
- AAR does not convert uncertain/dismissed alerts into operational facts.

---

## Milestone 12: AI SDK integration stretch

**Objective:** Add real model calls without breaking demo mode.

**Create:**

- `src/app/api/analyse-frame/route.ts`
- `src/app/api/normalise-alert/route.ts`
- `src/app/api/generate-report/route.ts`
- `src/lib/ai/providers.ts`
- `src/lib/ai/schemas.ts`

**Endpoint contracts:**

`POST /api/analyse-frame`

```ts
Request: { incidentId: string; responderId: string; frameId: string; frameUrl: string; timestamp: string }
Response: { cues: Cue[]; source: "mock" | "gemini-3-flash-preview" }
```

`POST /api/normalise-alert`

```ts
Request: { incidentId: string; responderId: string; frameId: string; cues: Cue[] }
Response: { alerts: IncidentAlert[]; source: "mock" | "gpt-5.4-mini" }
```

`POST /api/generate-report`

```ts
Request: { incident: Incident; responders: Responder[]; timeline: TimelineEvent[]; alerts: IncidentAlert[]; frames: FrameEvidence[]; notes: string[] }
Response: GeneratedReport & { source: "mock" | "gpt-5.5" }
```

**Fallback rule:**

Each endpoint catches missing env vars, provider errors, timeout errors, and schema validation failures, then returns schema-valid mock data.

**Model availability rule:**

If provider packages reject a target model ID, keep mock mode working and document the unsupported model. Do not block MVP on live model availability.

---

## Milestone 13: Optional Mastra workflow

**Objective:** Add workflow orchestration only if the base demo is stable.

**Use Mastra for:**

- Analyse frame.
- Normalise alert.
- Update timeline.
- Generate report.

**Do not use Mastra for:**

- Basic UI state.
- Simple mock demo logic.
- Anything that risks delaying the MVP.

**Decision gate:**

Only add Mastra after the dashboard/report demo works.

---

## Milestone 14: Visual polish

**Objective:** Make the product look like an ops-centre tool.

**Visual direction:**

- Dark C&C dashboard.
- High-contrast alert severity badges.
- Evidence frame thumbnails.
- Minimal firefighter UI.
- Official-looking report page.

**Avoid:**

- Toy/hackathon styling.
- Excessive animations.
- Too many colors.
- Too many hazard categories.

---

## Milestone 15: Mentor demo script

**Objective:** Make the demo easy to explain.

**Demo beats:**

1. Firefighter starts capture.
2. C&C sees two feeds.
3. AI suggests alerts with source frames.
4. Officer confirms one, marks one uncertain, dismisses one.
5. Timeline updates.
6. Report exports from confirmed evidence.

**Key line:**

A normal fire report generator starts after the incident. 1stSight starts during the incident and produces the report from verified operational evidence.

---

## Test and validation commands

Use after implementation begins:

```bash
cd /home/adoreblvnk/Documents/1stSight/app
pnpm lint
pnpm tsc --noEmit
pnpm test
pnpm build
```

Add Vitest before logic tests if the scaffold does not include it.

---

## Before showing mentor

- App runs locally.
- Firefighter page works on phone or fallback mode.
- C&C dashboard shows two feeds.
- Alert actions update timeline.
- Report page separates confirmed and uncertain observations.
- Report has source-frame/event references.
- Demo works without AI keys.
- Real AI path, if present, fails safely to mock.
- No actual SCDF integration is claimed.
- AI output is not framed as operational fact without C&C confirmation.

---

## Risks

- **Real AI latency slows demo:** use deterministic mock mode first.
- **Camera permissions fail:** use fallback demo frames.
- **Judges see it as just report generation:** emphasize live evidence trail and C&C confirmation.
- **Scope creep into real integration:** keep FireGround/WebRTC/SSO/database as deployment story only.
- **Model IDs unavailable:** keep mock mode working and document it.

---

## Deferred deliberately

- Floor plan.
- Real upload/storage backend.
- Database.
- Auth.
- Server-side PDF generation.
- WebRTC livestreaming.
- FireGround/bodycam integration.
- Mastra orchestration.
- Production deployment hardening.

---

## Open questions for mentor

- What report fields would Maj Shahril expect from an ops-centre perspective?
- Should the first demo focus only on warehouse, or include a small HDB incident too?
- Which alert types are useful versus distracting for C&C?
- What should never be automated?

---

## Build authorization

Coding is now approved. Build inside `/home/adoreblvnk/Documents/1stSight/app` only and preserve existing proposal/pitch assets.
