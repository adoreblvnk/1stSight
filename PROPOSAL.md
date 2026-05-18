# 1stSight: Command & Control Dashboard For Structured Incident Intelligence

## Team Details

| Field | Details |
| --- | --- |
| Team name | 1stSight |
| Team members | Joseph Poon, Tze Kai Lim |
| Institution | Singapore Institute of Technology (SIT) |
| Challenge | SCDF-Dell Lifesavers' Innovation Challenge 2026 |
| Proposed solution | Command & Control dashboard that turns bodycam footage into structured incident intelligence |

## Current Positioning

1stSight is a Command & Control dashboard, not a new bodycam or frontline hardware product.

It turns bodycam footage into structured incident intelligence: AI alerts, source-frame evidence, live timeline events, officer confirmations, and handover/reporting summaries.

The firefighter-side prototype is intentionally lightweight. A phone PWA acts as a hands-free capture layer and sends sampled frames. The main product is the C&C dashboard where officers review, confirm, summarise, and export incident intelligence.

## Core Selling Point

1stSight makes bodycam footage useful beyond major crises.

For one responder or many, the dashboard flags hazards, possible victim distress, blocked access, smoke conditions, fire cues, and changing scene context. It then turns those cues into evidence, timeline events, confirmations, and handover/reporting summaries.

This matters because SCDF may not activate bodycam workflows for every routine case. The product must therefore show value even in smaller incidents:

1. C&C gets useful visual context without repeatedly asking crews to describe the same scene.
2. Officers can spot earlier cues such as smoke changes, blocked access, or possible victim distress.
3. The timeline preserves what happened, when it happened, and which source frame supports it.
4. Handover and reporting are cleaner because confirmed facts are separated from AI suggestions.
5. Firefighters are not asked to type, tag, or manage a complex app during the incident.

## Problem

Raw bodycam video is not enough. It may give C&C more visibility, but it can also become another stream officers must monitor manually.

1stSight addresses three practical gaps:

| Gap | Why it matters | 1stSight response |
| --- | --- | --- |
| Raw video is unstructured | C&C still has to interpret feeds, remember key moments, and prepare updates. | Convert footage into alerts, evidence, timeline events, confirmed facts, and summaries. |
| Multiple feeds increase monitoring load | During larger incidents, C&C may have several views competing for attention. | Prioritise repeated or high-risk visual cues across one or multiple feeds. |
| Frontline workload must stay low | Firefighters should not operate another complex tool during emergency response. | Keep capture hands-free after setup and put the intelligence workflow at C&C. |

## Proposed Solution

1stSight has two modes.

| Mode | Purpose | Key behaviour |
| --- | --- | --- |
| Firefighter capture layer | Provide a bodycam-like feed for the prototype. | Phone PWA captures sampled frames hands-free and sends responder, timestamp, status, and incident context. |
| Command & Control dashboard | Turn visual footage into usable incident intelligence. | Shows near-live feeds, AI alerts, source-frame evidence, responder status, approximate floor plan, timeline, officer confirmations, summary, and export. |

The production direction can align with SCDF bodycam and Drager FireGround workflows. The prototype uses phones only to prove the dashboard value quickly.

## How It Works

### Firefighter Capture Layer

The firefighter-side experience must stay minimal.

1. Firefighter starts the phone PWA before entry or before the scenario begins.
2. The app requests camera permission and receives or enters incident/responder details.
3. Once active, the app captures sampled frames automatically.
4. If connection quality degrades, C&C sees the feed health clearly instead of assuming the feed is current.

### Command & Control Dashboard

The C&C officer should not need to watch every frame continuously.

1. Dashboard displays one or multiple responder feed tiles.
2. AI analyses sampled frames for smoke, fire cues, blocked access, exits, possible victim distress, and changing scene conditions.
3. Alerts appear with confidence, responder source, timestamp, and source frame.
4. Officer confirms, dismisses, or annotates alerts.
5. Timeline records AI suggestions, confirmations, annotations, feed degradation, and exports.
6. Dashboard generates a summary that separates AI-suggested observations from C&C-confirmed facts.

## AI Strategy

1stSight uses AI for operational sensemaking, not autonomous firefighting decisions.

AI can suggest what deserves attention, but C&C decides what becomes an operational fact.

| AI capability | Prototype behaviour | Operational value |
| --- | --- | --- |
| Smoke and fire cue review | Flags visible smoke, low visibility, flame, glow, or fire-like cues. | Helps C&C notice worsening conditions or fire growth earlier. |
| Possible victim distress | Flags human-like shapes, casualty-like posture, or concerning visible conditions. | Helps C&C inspect potential life-risk cues earlier without claiming medical diagnosis. |
| Exit and blocked access review | Flags visible exits, exit signs, blocked paths, narrowed corridors, and obstructions. | Supports access, egress, and evacuation awareness. |
| Alert prioritisation | Reduces repeated low-value alerts and highlights repeated or high-risk cues. | Lowers monitoring burden for C&C. |
| Source-frame evidence | Links every alert to the frame that triggered it. | Keeps AI explainable and reviewable. |
| Incident summary | Converts confirmed events into plain-English handover/reporting notes. | Reduces repeated radio-style updates and improves continuity. |

## Gemini, Dell, And NVIDIA Positioning

Dell should remain the main platform story. The required Dell Cloud Native Platform can host the secure C&C dashboard, backend services, frame ingestion, event APIs, database services, and deployment workflow.

Gemini Flash/Pro can be described as an external multimodal inference option for the prototype, not as a replacement for Dell.

| Component | Recommended positioning |
| --- | --- |
| Dell Cloud Native Platform | Required secure deployment foundation for the C&C dashboard and backend. |
| Dell CSC Demo Studio | Useful environment to evaluate and demonstrate AI/dashboard capabilities if available. |
| NVIDIA NIM | Dell-aligned model path for future containerised or self-hosted inference options. |
| Gemini Flash | External fast triage option for sampled-frame review during the prototype. |
| Gemini Pro | External deeper review option for uncertain or high-impact frames, such as possible victim distress. |

Best message: Dell hosts and secures the dashboard. Gemini Flash/Pro can accelerate prototype vision analysis. Dell/NVIDIA options provide a credible future deployment path.

## Responsible AI Principles

1stSight should be presented as safe decision support.

| Principle | Meaning |
| --- | --- |
| Human confirmation | AI suggestions do not become operational facts until C&C confirms them. |
| Evidence-linked alerts | Every alert keeps its source frame, timestamp, confidence, and responder source. |
| Clear separation | Summaries must separate AI-suggested observations from C&C-confirmed facts. |
| No autonomous command | 1stSight does not route firefighters, issue tactical commands, or replace commander judgement. |
| No facial recognition by default | No facial recognition or identity matching unless explicitly approved and governed. |
| Degraded-feed transparency | Delayed, disconnected, or stale feeds are shown clearly. |

## Prototype Scope

The prototype should prove the C&C value with a small, controlled demonstration.

| Deliverable | Purpose |
| --- | --- |
| Phone-based hands-free capture | Simulate bodycam footage without waiting for hardware integration. |
| C&C dashboard | Show feed tiles, responder status, alerts, timeline, floor plan, confirmation states, summary, and export. |
| AI alerting | Flag smoke, fire cues, possible victim distress, exits, blocked access, and scene changes. |
| Source-frame review | Let officers inspect the evidence behind each alert. |
| Timeline and summary | Convert confirmed observations into handover/reporting output. |
| One-feed and multi-feed scenarios | Prove value for both smaller incidents and larger incidents. |
| Dell deployment story | Show how the prototype can run on Dell Cloud Native Platform and later explore Dell/NVIDIA AI paths. |

## Prototype Rollout Sequence

Use this sequence to explain how the prototype becomes credible in order without presenting the work as a fixed delivery schedule.

| Sequence | Focus | Outcome |
| --- | --- | --- |
| 1. Foundation | Role-switch prototype with Firefighter and C&C views. | The basic product flow is visible. |
| 2. Capture | Hands-free camera capture and secure frame upload. | Firefighter workload remains low. |
| 3. Dashboard | Feed tiles, responder status, and timeline. | C&C can see the incident state. |
| 4. AI cues | Hazards, possible victim distress, exits, and blocked access. | AI value becomes demonstrable. |
| 5. Scenarios | One-feed and multi-feed incidents with approximate floor plan pins. | Small and large incident value is clear. |
| 6. Confirmation | Officer confirmation, dismissal, annotation, and summary. | Human control is explicit. |
| 7. Evidence | Audit trail, confidence states, degraded-feed handling, and export. | Review and handover become credible. |
| 8. Readiness | Dell platform deployment, scenario rehearsal, and reliability polish. | The prototype is ready for judging and pilot discussion. |

## Demonstration Scenarios

Use scenarios that show usefulness across incident sizes.

### One-Responder Or Smaller Incident Scenario

Purpose: prove 1stSight is useful before an incident becomes a major crisis.

1. A responder approaches an HDB corridor, small industrial unit, or room entrance.
2. The feed shows smoke, narrowed access, possible obstruction, or possible victim distress.
3. AI flags the cue and links the source frame.
4. C&C confirms or dismisses the cue.
5. Timeline and summary preserve the confirmed observation for handover/reporting.

### Multi-Responder Or Larger Incident Scenario

Purpose: prove 1stSight helps C&C prioritise across multiple feeds.

1. Two to three responders provide different views of a warehouse or complex premises.
2. AI flags smoke growth, blocked access, exit cues, fire cues, or possible victim distress.
3. C&C reviews source frames and confirms the highest-value cues.
4. Dashboard updates the floor plan, timeline, and summary.
5. Officer exports a concise incident snapshot for handover or review.

## Out Of Scope For The Prototype

The prototype should stay focused and avoid promising production integration too early.

1. Direct integration with actual SCDF bodycam hardware.
2. Direct integration with live Drager FireGround Hub video streams.
3. Precise indoor positioning.
4. Full WebRTC livestreaming.
5. Facial recognition or identity matching.
6. Automated tactical command or route instruction.
7. SCDF-wide production rollout.
8. Formal integration with SCDF iCore or other internal operational systems.

## Safe Path To Adoption

1stSight should be sold as a low-risk way for SCDF to evaluate AI-assisted command visibility.

| Stage | Purpose |
| --- | --- |
| Challenge prototype | Demonstrate the dashboard, AI alerts, source-frame evidence, timeline, confirmation flow, and export. |
| Controlled pilot | Test with selected training scenarios and selected crews before operational integration. |
| Production assessment | Review bodycam integration, retention policy, RBAC, audit requirements, indoor location, and SCDF command-system integration. |

## Operational Value

| Value | Why SCDF should care |
| --- | --- |
| Less repeated radio updates | C&C sees visual cues directly instead of asking crews to describe the same scene repeatedly. |
| Earlier visual cues | Smoke changes, blocked access, unsafe approach conditions, and possible victim distress can surface sooner. |
| Live incident memory | Timeline preserves what happened, when it happened, and which frame supports it. |
| Cleaner handover/reporting | Confirmed facts and evidence links support handover, review, and reporting. |
| Works across incident sizes | One feed helps smaller incidents; multiple feeds help larger incidents. |
| Keeps firefighters focused | Firefighters do not operate a complex app during the incident. |

## Fit With Judging Criteria

| Judging criterion | 1stSight fit |
| --- | --- |
| Problem Definition and Analysis, 20% | Addresses a clear operational gap: raw bodycam footage is not structured incident intelligence. |
| Strategies and Recommendations, 30% | Recommends a practical prototype and staged adoption path without forcing immediate production rollout. |
| Effective Use of AI, 20% | Uses multimodal vision analysis, alert prioritisation, source-frame evidence, incident timeline, and summary generation. |
| Solution Evaluation, 30% | Provides demonstrable outcomes, Dell platform alignment, responsible AI controls, pilot path, and operational value. |

## Fit With SCDF Direction

1stSight supports SCDF's direction toward future-ready operations, connected systems, operational excellence, and intelligence-driven decision-making.

| SCDF direction | 1stSight fit |
| --- | --- |
| Future-ready operations | Gives command earlier and clearer visual context. |
| Connected SCDF | Connects responder feeds, C&C dashboard, event timeline, evidence, and summaries. |
| Digital-first approach | Converts fireground visuals into structured data and reviewable events. |
| Operational excellence | Reduces monitoring burden and improves handover/reporting quality. |
| Responder safety | Keeps firefighters hands-free while C&C receives better situational context. |

## Why 1stSight Can Win

1stSight is strong because it is visible, useful, and buildable.

It is visible because judges can understand the product when they see bodycam feeds become AI alerts, source-frame evidence, timeline updates, and summaries.

It is useful because it does not depend only on major crises. It helps with one-feed incidents and scales up to multi-feed incidents.

It is buildable because the prototype uses phones for capture, sampled frames for practical AI review, Dell Cloud Native Platform for deployment, and Gemini Flash/Pro as an external prototype inference option if needed.

Most importantly, it respects frontline reality. Firefighters should not be asked to operate another complex tool during an emergency. 1stSight puts the intelligence workflow where it belongs: with C&C officers who need to see, prioritise, confirm, and communicate.

## Recommended Closing Message

1stSight is not asking SCDF to change how firefighters work. It gives Command & Control a clearer, faster, evidence-linked view of what crews are already seeing.

Recommended next move: approve a challenge prototype, test one-feed and multi-feed scenarios with SCDF officers, then decide whether a controlled pilot is worth pursuing.

## Source Basis

This document uses the following source basis from the project resources:

1. SCDF-Dell Lifesavers' Innovation Challenge 2026 challenge statement and grading criteria.
2. Dell Sponsor Requirements for Dell Cloud Native Platform, Dell CSC Demo Studio, Dell AI PC, GB-10, and NVIDIA NIM options.
3. SCDF Annual Statistics 2025 for fire call volumes, fire category increases, injuries, fatalities, and fire hazard notice data.
4. SCDF Transformation 2030 for future-ready operations, connected SCDF, digital-first approach, and intelligence-driven organisation direction.
5. SCDF Workplan 2026 themes on readiness, operational excellence, preparedness, partnerships, and future-ready capability.
