# Product

## Register

product

## Users

Primary users are SCDF Ops Centre / Command & Control officers using 1stSight during live operations and post-incident review. They are monitoring responder bodycam footage, reviewing AI-created incident evidence, approving high-impact recommendations, searching incident timelines, and preparing structured observation reports.

Responder footage comes from firefighters or responders, but responders are not the primary app users in the first demo. SCDF/Dell mentors and judges are the secondary audience for the hackathon presentation.

## Product Purpose

1stSight is a Command & Control dashboard for live operations and post-incident review. It turns responder bodycam footage into event timelines, suggested actions, evidence frames, and draft reports so Ops Centre officers can focus on the broader incident picture instead of watching every individual feed.

The current demo must make one thing obvious: 1stSight catches operationally important fire-response moments, such as fire escalation, even when they are not verbally escalated by the front line. Responder-abuse review remains evidence-dependent and should only appear after separate footage is ingested.

## Brand Personality

Controlled, operational, evidence-first.

The interface should feel like a serious command tool: calm under pressure, dense enough for real operational review, and explicit about what the system observed versus what a human approved. It should not feel playful, speculative, consumer-grade, or like a generic AI dashboard.

## Anti-references

- Generic SaaS dashboards with soft shadows, floating cards, excessive whitespace, and decorative gradients.
- Full dark-mode command center tropes where everything becomes cinematic instead of readable.
- AI-agent dashboards that over-emphasize magic, autonomy, or chat instead of evidence and review.
- Consumer video-feed apps that make the footage the whole product and hide operational decisions.
- Official-report generators that imply 1stSight autonomously produces SCDF Fire Reports or Ambulance Reports.

## Design Principles

- Evidence before assertion: every incident, recommendation, and report claim should link back to a timestamped source or selected frame.
- Human authority stays visible: high-impact actions and final report conclusions remain reviewable decisions, not autonomous commands.
- Operational density with discipline: show enough context for C&C work, but use grid lines, panel ownership, and terse labels to avoid clutter.
- Live view stays calm: bodycam footage, event stream, and recommendations stay visually distinct.
- Runtime evidence beats technical theater: staged footage can seed the scenario, but post-incident findings, selected frames, bounding boxes, search answers, and exported evidence must come from request-time analysis or fail visibly.

## Accessibility & Inclusion

Target WCAG AA contrast for all body text, controls, status labels, and evidence metadata. Do not rely on color alone for safety, warning, success, or review state. Support reduced motion for all signal, scan, and transition effects. Keep touch targets at least `h-9` in dense layouts, preserve keyboard focus visibility, and avoid page-level horizontal scrolling on mobile.
