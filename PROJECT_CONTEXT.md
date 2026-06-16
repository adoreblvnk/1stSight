# PROJECT_CONTEXT.md

## Product

**1stSight** is a Command & Control incident intelligence prototype for the SCDF x Dell Lifesavers' Innovation Challenge.

It turns imperfect responder phone/bodycam footage into commander-reviewed evidence, live timeline events, and an evidence-linked Draft Fire Incident Intelligence Report.

## Winning position

A normal fire report generator starts after the incident. 1stSight starts during the incident and produces the report from verified operational evidence.

## Core demo promise

In a 3-minute mentor/judge demo, 1stSight should show:

1. A firefighter phone PWA capturing near-live sampled frames.
2. A C&C dashboard receiving 2 responder feeds.
3. AI-suggested alerts for smoke, blocked access, possible casualty, and low visibility.
4. C&C controls to confirm, dismiss, or mark alerts uncertain.
5. A timeline that builds from officer-reviewed events.
6. A Draft Fire Incident Intelligence Report generated from confirmed events and source-frame evidence.
7. An AAR/post-incident review output generated from the same evidence timeline.

## Primary users

- **Firefighter / responder:** starts capture before arrival or scenario entry, then stays hands-free.
- **C&C officer / ops room officer:** reviews alerts, confirms facts, manages timeline, exports report.
- **Incident commander / mentor judge:** evaluates whether the system reduces monitoring and reporting burden.

## Non-negotiable MVP constraints

- Do not depend on real SCDF system integration for the prototype.
- Do not depend on voice/audio analysis.
- Do not require perfect video clarity.
- Do not use full livestreaming as the first implementation path.
- Do not let AI create operational facts without C&C confirmation.
- Do not frame this as autonomous firefighting or tactical command.
- Do not overbuild precise indoor tracking, FireGround integration, or WebRTC for MVP.

## MVP scope

### Must build

- Demo role selection: Firefighter / C&C.
- Firefighter capture screen using phone camera.
- Sampled-frame capture loop, roughly every 0.5–1 second.
- Backend/storage/reporting chunks at 15–30 second windows, while near-live alerting still uses 0.5–1 second sampled frames.
- C&C dashboard with 2 responder feed cards.
- Alert queue with source frame, timestamp, responder, confidence, and uncertainty state.
- Confirm / dismiss / mark uncertain controls.
- Incident timeline generated from officer actions.
- Draft Fire Incident Intelligence Report page generated from confirmed timeline and evidence frames.
- AAR/post-incident review page generated from the same evidence timeline for training, operational review, and blindspot analysis.
- Report type label must state: `Draft Fire Incident Intelligence Report`.
- Report disclaimer must state: not an official SCDF Fire Report or Ambulance Report; probable cause, liability, medical diagnosis, and hospital conveyance are not determined by 1stSight.
- Demo data path with deterministic/mock AI outputs so the demo works without model keys.

### MVP state and assets

- App lives in `/home/adoreblvnk/Documents/1stSight/app`.
- MVP state is client-side with localStorage; no database for the first demo.
- Evidence frames live under `app/public/demo/frames/`.
- C&C dashboard always has deterministic two-feed demo data, even if no phones are connected.
- Firefighter camera capture is a believable capture experience first; real cross-device streaming is optional after the dashboard/report flow works.
- Report export is print/save-to-PDF from a report page, not server-side PDF generation.

### Should build if time permits

- Real AI SDK endpoint for frame triage.
- Simple PDF/export styling for report output.
- Feed health states: live, stale, disconnected, low visibility.
- Simple warehouse/HDB floor plan visual with approximate responder pins.

### Out of scope for MVP

- Actual Drager/FireGround integration.
- SCDF SSO or production auth.
- Full WebRTC livestreaming.
- Precise indoor localisation.
- Facial recognition.
- Medical diagnosis.
- Automated tactical routing or commands.

## Tech stack

- **Next.js + TypeScript:** app shell, routes, dashboard, API routes.
- **Tailwind + shadcn/ui:** fast polished operational dashboard UI.
- **motion:** restrained ops-centre transitions and status changes.
- **AI SDK v6:** provider abstraction for frame analysis, alert structuring, and report generation.
- **Mastra:** optional later workflow layer; do not make it critical for the first demo.
- **Demo mode first:** deterministic mock alerts before live model integration.

## Runtime AI model selection

Use 3 runtime models:

- **google / `gemini-3-flash-preview`** — fast multimodal frame triage for smoke, fire cues, blocked access, casualty-like cues, and low-visibility states.
- **openai / `gpt-5.4-mini`** — low-latency alert classification, JSON structuring, severity labels, and timeline updates.
- **openai / `gpt-5.5`** — strongest commander-facing reasoning and final evidence-linked report generation.

Use Codex only for development help, not runtime incident analysis.

## AI pipeline

1. Firefighter device sends sampled frame + metadata.
2. Demo mode or `gemini-3-flash-preview` proposes visible cues.
3. `gpt-5.4-mini` normalises cues into strict alert JSON.
4. C&C officer confirms, dismisses, edits, or marks uncertain.
5. Confirmed and uncertain events enter the incident timeline.
6. `gpt-5.5` drafts the report from timeline, source frames, and C&C notes only.
7. AAR generator converts the same confirmed/uncertain/dismissed timeline into post-incident review sections.

## Chunking strategy

- Use 0.5–1 second sampled frames for near-live C&C alerting.
- Group frames/events into 15–30 second chunks for backend persistence, replay, report context, and AAR review.
- Chunks must retain source frame IDs, responder IDs, timestamps, feed health, AI outputs, and C&C actions.
- Chunks are not report facts by themselves; report/AAR claims still require confirmed timeline events, source frames, or C&C notes.

### MVP AI rule

The first complete demo must work without AI API keys. Real AI endpoints are stretch functionality layered after the deterministic evidence workflow works.

For MVP:

- mock AI emits fixed, schema-valid alerts once per scenario
- template report generation comes before AI-written report generation
- AI failures fall back to mock/schema-valid output
- no report claim may be generated without a source frame, timeline event, or C&C note

## Alert schema requirements

Every alert must include:

- `id`
- `incidentId`
- `responderId`
- `timestamp`
- `frameId`
- `frameUrl`
- `type`: smoke | fire | blocked_access | possible_casualty | exit | low_visibility | feed_issue | other
- `severity`: low | medium | high | critical
- `confidence`: 0–1
- `status`: suggested | confirmed | dismissed | uncertain
- `summary`
- `rationale`
- `source`: mock | gemini-3-flash-preview | manual

### Alert and timeline state transitions

- `suggested`: appears in alert queue only; not a report fact.
- `confirmed`: enters timeline and confirmed report facts.
- `uncertain`: enters timeline and uncertain report section, not confirmed facts.
- `dismissed`: remains in audit/dismissed summary only.
- `manual_note`: human-authored timeline/report note.

## Report type

1stSight does **not** create an official SCDF Fire Report or Ambulance Report.

SCDF's public report e-services expose two requestable incident report types:

- **Fire Report** — a one-page post-investigation report with location, date/time, nature of fire, method of extinguishment, damage description, injury summary, and probable cause.
- **Ambulance Report** — a one-page EMS report with location, date/time, nature/description of incident, and hospital conveyed to, released through a consent-sensitive workflow.

For the MVP, 1stSight creates a **Draft Fire Incident Intelligence Report**:

- Fire Report-adjacent because it supports incident location/time, nature of fire, damage notes, injury/casualty notes, extinguishment/action notes, and evidence references.
- Not a formal SCDF Fire Report because it does not determine probable cause, liability, or final investigator findings.
- Not an Ambulance Report because it does not handle patient identity, consent forms, diagnosis, insurance workflow, or hospital conveyance unless manually entered as a C&C note.

Use these research files as the report-structure reference:

- `SCDF_FIRE_REPORT_STRUCTURE.md`
- `SCDF_AMBULANCE_REPORT_STRUCTURE.md`

## Report generation requirements

The report must separate:

- Confirmed facts.
- AI-suggested but unconfirmed observations.
- Uncertain observations.
- Dismissed alerts.
- C&C manual notes.

Every report claim must link back to a timeline event, C&C note, or source frame.

## AAR / post-incident review requirements

AAR is a secondary output after the Draft Fire Incident Intelligence Report.

The AAR must include:

- Incident timeline replay by 15–30 second chunks.
- Confirmed decision points and their source evidence.
- Uncertain/dismissed AI alerts as learning material, not operational conclusions.
- Feed health/staleness notes.
- Blindspots: missing views, unclear footage, delayed confirmation, repeated false alerts.
- Suggested discussion questions for ops-centre mentor review.

## Demo scenario

### Warehouse fire scenario

- Responder Alpha enters a smoky warehouse area.
- Responder Bravo sees a blocked access path or casualty-like shape.
- Dashboard shows both feeds.
- AI suggests smoke, blocked access, and possible casualty.
- Officer confirms smoke, marks casualty uncertain, dismisses one weak alert.
- Timeline updates.
- Report exports confirmed facts with evidence frames and uncertainty clearly separated.

## Success criteria

The prototype succeeds if judges can see:

- Firefighters stay hands-free after setup.
- C&C does not need to watch every feed equally.
- AI uncertainty is visible and safe.
- Officer confirmation is central.
- Report generation is grounded in evidence, not freeform hallucination.
- The product is useful even before deep SCDF integration.

## Live deployment story

For real SCDF live operations, this stack needs hardened infrastructure:

- Dell Cloud Native Platform / Kubernetes / OpenShift deployment.
- Secure identity and role-based access.
- Encrypted frame/evidence storage.
- Queue-based frame ingestion.
- Approved model endpoints.
- Audit logs for every AI alert and officer action.
- Monitoring, retention policy, and failover.
- Later bodycam/FireGround integration.

## Current development rule

Do not start coding until `PROJECT_CONTEXT.md` and `PLAN.md` are agreed.

If `AGENTS.md` conflicts with this project context, treat `PROJECT_CONTEXT.md` and `PLAN.md` as authoritative for 1stSight.
