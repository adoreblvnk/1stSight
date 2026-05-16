# PROJECT_CONTEXT.md

## Purpose

This is the canonical project context for **1stSight**, the SCDF x Dell Lifesavers' Innovation Challenge prototype. It preserves the full project brief from `ideas/01-incidentview-bodycam-ai-dashboard.md` while framing it as implementation context for design, development, proposal writing, and demo preparation.

## Product Name

**1stSight**

## Working Product Definition

1stSight is an AI-assisted bodycam command dashboard that helps C&C ops room officers see useful incident context earlier, monitor multiple bodycam feeds with less cognitive load, and surface smoke, fire, casualty, exit, and blocked-path cues for human confirmation.

## Non-Negotiable Prototype Constraints

- The firefighter-side experience must be hands-free after arrival or scenario start.
- Firefighter setup happens before arrival, such as during turnout or while travelling to the incident.
- The prototype uses a smartphone as a bodycam stand-in.
- The build should use a mobile web PWA rather than a native app.
- The first MVP uses near-live sampled frames rather than full livestreaming.
- The C&C user is primarily the ops room officer.
- The demo should use 2 to 3 bodycam feeds.
- AI detection should prioritise smoke, fire, casualties, exits, and blocked paths.
- The first location view should use an approximate floor plan, not precise indoor tracking.
- The FireGround Hub mounted on the fire appliance is a recommendation that supports deployment readiness, not the core standalone innovation.

## Full 1stSight Brief

# 1stSight Bodycam AI Command Dashboard

## One-Line Pitch

Turn a responder's existing chest-mounted bodycam, or a smartphone used as a prototype bodycam, into an AI-powered Command & Control dashboard that detects hazards, tracks responder status, summarizes the scene, and supports safer decisions.

## Core Idea

1stSight has two user modes:

- **Firefighter mode:** a mobile web PWA that opens the phone camera and behaves like a lightweight bodycam stream.
- **Command & Control mode:** a web dashboard where ops room officers view responder feeds, AI alerts, incident timeline, map context, and a plain-English scene summary.

For the prototype, a smartphone replaces the physical bodycam. This keeps the demo practical while preserving the real deployment story: SCDF can later connect actual bodycam streams because firefighters already carry bodycams in the chest pocket.

Prototype decisions:

- Use a **mobile web PWA**, not a native app.
- Use **demo role switching** for login, with users entering as either Firefighter or C&C.
- Use **near-live frame streaming**, where smartphones send sampled camera frames every 0.5 to 1 second.
- Use a **vision API first** for AI detection and summarisation, with object detection as a later enhancement.
- Demo both a **warehouse fire** and an **HDB unit or corridor fire**, with warehouse as the main story.
- Demo **2 to 3 bodycam feeds**, enough to show monitoring burden without making the prototype noisy.
- Prioritise AI detection for **smoke, fire, casualties, and exits** first. Cylinders, vehicles, electrical panels, and PPE issues are secondary extensions.
- Keep firefighter-side operation **hands-free after arrival**. Any mode selection or stream setup happens before reaching the incident scene, such as during the ride from fire station to incident location.
- Use an **approximate floor plan** for the first dashboard location view, not precise indoor tracking.

## Problem

Firefighters already have bodycams connected through the Drager FireGround workflow, where bodycam feeds connect to a FireGround Hub and are then relayed to Command & Control. The current value is mainly livestreaming back to command.

1stSight targets two practical pain points: C&C may not receive useful bodycam visibility early enough, and once feeds arrive, the ops room officer still has to manually watch multiple streams, infer hazards, and maintain situational awareness under time pressure.

There is also an early-incident visibility gap. First-arriving appliances prioritise immediate response and crews may proceed headfirst without setting up bodycam and FireGround connectivity. In current practice, bodycam and FireGround setup may happen only when later appliances arrive. This means C&C may not get useful visual feeds from the earliest and most time-critical phase of the incident.

1stSight proposes configuring the FireGround Hub en route and mounting it on the fire appliance itself where feasible. Since the FireGround Hub has a substantial practical range of around 500m to 1km, the bodycam network can be ready when the appliance arrives. This can save around 1 to 2 minutes of setup time and, more importantly, lets the first-arriving crews move directly to the scene while C&C starts receiving bodycam feeds earlier.

This is especially relevant for warehouse and industrial fires, where the building is larger, the scene is less familiar, hazards may be hidden, and command needs fast updates from multiple teams. It can also help in HDB incidents by reducing radio load and giving command a quick visual summary.

## Why This Fits Singapore And SCDF

SCDF's 2030 direction emphasizes connected systems, smart operations, intelligence-driven decision-making, and responder safety. The 2025 statistics also show rising fires at residential and non-residential premises, with non-residential fires increasing 13.5% and industrial fires increasing 27.5%.

This idea is economically viable because it builds on existing chest-pocket bodycam hardware and the existing FireGround Hub workflow instead of requiring a new frontline communications stack. The prototype uses smartphones only to simulate that future bodycam workflow.

It also fits Dell's sponsor platform well: the web dashboard and AI services can run on the required Dell Cloud Native Platform, while video inference and multimodal summarisation can use Dell CSC Demo Studio, NVIDIA NIM, or a Dell AI PC/GB-10 for local prototyping.

## Proposed Solution

A secure web platform that ingests responder video, location, device status, and C&C annotations, then provides a command dashboard with:

- Live or near-live video tiles from responders.
- AI detection for visible fire, smoke density, trapped persons, exits, cylinders, vehicles, electrical panels, blocked paths, and PPE issues.
- Responder location map with status indicators.
- Optional pre-plan layers for warehouse incidents, including floor plans, hydrants, access points, exits, risers, and known hazard zones.
- Heatmap of detected hazards and smoke-heavy areas.
- Timeline of key events, such as "heavy smoke detected at 14:03" or "possible casualty visible at stairwell".
- AI-generated command summary in plain English.
- Manual C&C annotations for confirmed hazards.
- Audit log of AI alerts, C&C confirmations, responder status changes, and report exports.

## Deployment Concept

### Current Workflow

1. Firefighter bodycams connect to the Drager FireGround Hub.
2. The FireGround Hub is deployed at the incident ground.
3. C&C receives the bodycam feeds and monitors the situation.

### Proposed Workflow

1. FireGround Hub is configured en route and mounted on the fire appliance where practical.
2. The hub is powered and ready when the appliance arrives.
3. First-arriving firefighters can move directly from appliance to incident scene without a separate hub setup step.
4. Bodycam feeds are relayed to C&C and 1stSight performs AI analysis on the feeds.
5. C&C receives live or near-live video, AI alerts, C&C-confirmed events, and a running scene summary.

This is a recommendation, not a separate product. It is the operational bridge that makes the AI dashboard easier to adopt, because 1stSight improves the existing bodycam and FireGround setup instead of replacing it.

## User Flow

### Firefighter Mode

The firefighter experience should be minimal, reliable, and hands-free once crews arrive at the incident scene. Firefighters should not need to touch the phone or bodycam during firefighting operations.

1. During turnout or while travelling to the incident, firefighter selects **Firefighter Mode** from the demo login screen.
2. The browser requests camera and location permission.
3. Firefighter starts the stream before alighting or before beginning the scenario.
4. The app shows a full-screen camera preview with connection status, battery indicator, incident ID, and responder callsign.
5. Once operations begin, the phone or bodycam runs without manual input.
6. The app periodically sends frames, location, and status metadata to the backend.
7. If connection drops, the app attempts to reconnect automatically and the dashboard shows degraded-feed status to C&C.

### Command & Control Mode

The primary user is the C&C ops room officer. The experience should reduce monitoring burden rather than create another noisy screen.

1. Ops room officer selects **Command & Control Mode** from the demo login screen and opens the active incident.
2. Dashboard shows responder feeds, status, location map, alerts, and event timeline.
3. AI flags smoke, fire, possible casualties, and exit-related issues with confidence scores and source frames.
4. Ops room officer confirms, dismisses, or annotates AI alerts.
5. The incident summary updates continuously, separating AI-suggested observations from C&C-confirmed facts.
6. At handover, the system exports a concise incident snapshot with timeline, confirmed hazards, responder status, and key screenshots.

## Prototype Implementation Approach

The fastest credible prototype is a mobile web PWA, not a native app.

### Recommended MVP Streaming Method

Use near-live frame streaming first:

- Smartphone captures frames from the camera every 0.5 to 1 second.
- Frames are compressed and sent with timestamp, responder ID, incident ID, and optional GPS.
- AI runs on sampled frames instead of every video frame.
- C&C dashboard displays the latest frame sequence as a near-live feed.

This is easier to build and demo than full livestreaming, while still proving the AI command dashboard concept. Production can later move to proper WebRTC or direct bodycam stream ingestion.

### Candidate Prototype Stack

| Layer | Candidate Choice | Reason |
| --- | --- | --- |
| Frontend | Next.js PWA on Vercel | Fast deployment, good mobile browser support, easy dashboard build. |
| Auth | Demo role switch | Fastest for judging demo while still showing role separation. |
| Realtime data | Polling or lightweight realtime service | Keeps dashboard updated with frames, alerts, and status without overbuilding streaming infrastructure. |
| Frame storage | Object storage or database blob reference | Stores sampled frames for demo replay, with AI-alert and C&C-confirmed evidence frames indexed for quick zoom-in. |
| AI detection | Vision API on sampled frames | Fastest path to useful detection for smoke, fire, possible casualties, exits, blocked paths, and scene changes. |
| Scene summary | Vision-language model plus event log summarisation | Converts frame observations, AI events, and C&C annotations into command-ready text. |
| Target deployment | Dell Cloud Native Platform | Aligns with required sponsor platform. |

Vercel is suitable for the prototype web app. For production or sponsor alignment, the same services can be containerised and deployed on Dell's OpenShift-based Cloud Native Platform.

## AI Pipeline

1stSight should use AI as decision support, not automated command.

1. **Frame sampling:** firefighter device sends sampled frames and metadata.
2. **Vision analysis:** a vision API reviews sampled frames for smoke, fire, possible casualty, exit, blocked path, and low visibility cues. Secondary hazard classes can include cylinders, vehicles, electrical panels, and PPE issues.
3. **Alert scoring:** detections are filtered by confidence, repetition, and severity.
4. **Event creation:** high-value detections become timeline events.
5. **C&C confirmation:** ops room officer confirms, dismisses, or annotates the alert.
6. **Scene summary:** model generates a short operational summary using confirmed events, AI-suggested events, responder status, and C&C annotations.

Example summary:

> Alpha 1 feed shows heavy smoke near rear loading bay. AI has repeatedly detected possible fire growth near the loading area, pending ops room confirmation. Bravo 2 feed shows a possible blocked exit at 14:06. No confirmed casualties visible from current feeds.

## Effective Use Of AI

- Vision-based hazard detection from sampled fireground frames.
- Video or frame summarisation to reduce monitoring burden.
- Multimodal AI to convert sampled frames, device metadata, and C&C annotations into scene notes.
- Alert prioritisation so command sees high-risk changes first.
- Retrieval over incident pre-plan documents, if available, to explain hydrants, access points, and hazard zones.
- Human-in-the-loop confirmation to prevent unsafe automated decisions.

## Demo Scenarios

Use two or three smartphones as firefighter bodycams and one laptop as the C&C ops room view.

### Main Scenario: Warehouse Fire

1. Firefighter A enters with phone camera active and sees smoke or a smoke-like visual cue.
2. Firefighter B approaches a different area where an exit is visibly blocked.
3. AI detects smoke, fire cues, possible person shape, and blocked exit from sampled frames.
4. C&C dashboard shows the feeds, flags high-priority alerts, plots responder positions on a simple map or floor plan, and updates the timeline.
5. C&C opens the evidence frame linked to a casualty or blocked-exit alert, zooms in, and confirms or dismisses it.
6. Dashboard generates a concise command summary and exports the incident snapshot.

### Secondary Scenario: HDB Fire

1. Firefighter A approaches an HDB corridor or unit entrance with phone camera active.
2. AI detects smoke, a blocked corridor, or a possible PMD/PAB-related hazard from sampled frames.
3. C&C dashboard compares the scene against a simple HDB floor or corridor layout.
4. Dashboard generates a short summary for handover, reducing repeated radio updates.

This demo proves the workflow without requiring actual SCDF bodycam integration.

## 2-Month Prototype Plan

| Week | Deliverable |
| --- | --- |
| 1 | Build demo role-switch app shell: Firefighter mode and C&C mode. |
| 2 | Add pre-arrival Firefighter setup flow, smartphone camera capture, and near-live frame upload. |
| 3 | Build C&C dashboard with responder tiles, status indicators, and event timeline. |
| 4 | Add vision API analysis on sampled frames for smoke, fire, possible casualty, exits, and blocked paths. |
| 5 | Add approximate warehouse and HDB floor-plan views with simulated responder positions and hazard pins. |
| 6 | Add AI scene summary, C&C confirmation, and manual annotation workflow. |
| 7 | Add audit log, confidence scores, false-positive handling, and exportable incident snapshot. |
| 8 | Polish warehouse and HDB demo scenarios, rehearse fail cases, and prepare business proposal visuals. |

## Data Needed For Prototype

- Sample fire, smoke, warehouse, blocked-exit, exit-sign, and casualty-like images or videos.
- Sample building floor plan or warehouse layout for approximate location display.
- Simulated bodycam GPS or indoor coordinate data.
- Synthetic incident timeline and responder callsigns.
- Manually labelled test frames for simple accuracy evaluation.

## Success Metrics

| Metric | Prototype Target |
| --- | --- |
| Monitoring load | Commander can identify key incident events without watching every feed continuously. |
| Alert usefulness | AI alerts include confidence, source frame, and C&C confirmation state. |
| Latency | Frame-to-dashboard update feels near-live for demo purposes. |
| Safety support | System highlights hazards, degraded feeds, and responder status indicators without issuing autonomous tactical commands. |
| Hands-free operation | Firefighter-side app requires no interaction after arrival or scenario start. |
| Earlier C&C visibility | FireGround Hub can be configured en route so first-arriving crews can provide feeds without waiting for later setup. |
| Reduced radio load | AI-generated summaries reduce repeated verbal updates for obvious visual conditions. |
| Economic viability | Prototype works using smartphones, web app, and existing bodycam deployment story. |

## Judging Criteria Fit

| Criteria | Fit |
| --- | --- |
| Problem Definition and Analysis (20%) | Addresses delayed C&C visibility, feed-monitoring overload for ops room officers, setup friction around FireGround deployment, and rising complexity of warehouse and industrial fires. |
| Strategies and Recommendations (30%) | Clear recommendation: keep the FireGround workflow, configure the hub en route, mount the hub on the appliance where feasible, and add AI decision support at C&C. The 2-month prototype has defined deliverables. |
| Effective Use of AI (20%) | Uses vision analysis, multimodal summarisation, alert prioritisation, and human confirmation to reduce monitoring load while preserving commander judgement. |
| Solution Evaluation (30%) | Demonstrable proof-of-concept with smartphone bodycam simulation, near-live feeds, AI alerts, timeline, dashboard summary, economic viability, deployment readiness, audit logs, and an architecture path toward Dell Cloud Native Platform. |

## Economic Viability

| Factor | Assessment |
| --- | --- |
| Hardware cost | Low to medium. Prototype uses smartphones. Production reuses bodycams and FireGround Hub, with possible mounting, power, and weatherproofing work on selected appliances. |
| Software cost | Medium, mainly dashboard, streaming, AI integration, and audit workflow. |
| Deployment complexity | Moderate, depending on real bodycam stream access, FireGround Hub mounting feasibility, appliance power integration, network reliability, and indoor location accuracy. |
| Impact | High for earlier C&C visibility from first-arriving crews, reduced radio load, safer commander decisions through better ops-room support, incident handover, and post-incident review. |

## Responsible AI And Security

- Process sensitive video within SCDF-controlled infrastructure where possible.
- Store sampled frames for prototype replay and evidence review; in production, retention should follow SCDF policy and distinguish routine sampled frames from evidence frames.
- Show confidence scores and require human confirmation for critical alerts.
- Separate AI-suggested observations from C&C-confirmed facts.
- Maintain an audit trail of AI alerts, C&C actions, manual annotations, and report exports.
- Avoid facial recognition unless explicitly approved and governed.
- Protect responder location and operational movement data.

## Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| Smoke, low light, water spray, and camera movement may reduce model accuracy. | Use confidence scores, repeated detection thresholds, C&C confirmation, and explicit uncertain states. |
| Indoor location may be unreliable. | Prototype with GPS or simulated coordinates; position production as approximate tracking unless indoor infrastructure is available. |
| Network conditions may degrade streaming. | Use sampled frames, compression, retry logic, and degraded mode instead of relying only on full livestream. |
| Appliance-mounted hub may face power, weatherproofing, vibration, or signal-shadowing constraints. | Pilot on one appliance with non-invasive mounting, vehicle power review, range testing, and fallback to ground deployment. |
| Too many alerts may distract command. | Prioritise alerts by severity, repetition, and commander feedback. |
| AI may appear to make tactical decisions. | Keep the product framed as decision support and require human confirmation for operational conclusions. |

## Why It Could Win

1stSight is visually demonstrable, AI-heavy, and directly tied to frontline operations. It improves responder safety and command effectiveness while staying economically defensible because it upgrades existing bodycam workflows rather than proposing a fully new hardware platform.

The smartphone PWA prototype makes the idea buildable in two months. The Dell Cloud Native Platform story makes it credible beyond the demo.

## Remaining Decisions

- Which vision API or model provider to use for the build.
- Engineering feasibility of mounting and powering the FireGround Hub on selected appliance types.
- Production retention period for routine sampled frames versus AI-alert and C&C-confirmed evidence frames.
