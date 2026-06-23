# 1stSight TODO

## Technical

### Consolidate the demo into one Punggol scenario

Status: TODO

Purpose: reduce narrative/context drift by using Punggol as the single stage scenario across live operations, post-fire welfare check, responder safety, recommendations, and AAR briefing slides while keeping Woodlands as a booth/secondary demo only.

Deliverable: the app and presentation use one continuous Punggol incident flow: residential fire response, post-fire welfare check, physical-contact responder-safety event, evidence-linked timeline, officer-reviewed guidance, and AAR briefing slide output from the full incident timeline.

Scope:

- Update scenario data so Punggol covers fire response and the post-fire welfare / responder-safety event.
- Keep Woodlands medical assistance available as a booth or secondary demo, but remove stale references that present it as the primary on-stage AAR story.
- Keep the initial Punggol caller/fire context separate from footage-derived responder-safety evidence.
- Assign Wei Jie to Bodycam A and Hafiz to Bodycam B; keep Bodycam C for the fire-response phase only.
- Show Bodycam C as intentionally absent / not attached during the post-fire welfare phase, not as a broken feed.
- Generate AAR briefing slides from the full Punggol timeline first, then allow the officer to choose what is presented.
- Ensure every claimed event has a source feed, timestamp, selected frame, or officer-provided provenance.

Acceptance criteria:

- Main presenter flow can run end-to-end from Punggol map dispatch to live dashboard to post-fire review/AAR output.
- Punggol timeline includes fire events and the post-fire responder-safety event without mixing unsupported facts into caller context.
- Recommendations are worded for officer / Ground Commander consideration, not automatic command.
- Search, export, and dashboard copy all align to the single Punggol stage story.
- Woodlands is discoverable for booth use but does not interrupt the main stage flow.

### Add Punggol post-fire responder-safety evidence

Status: DONE

Purpose: make the post-fire responder-safety moment concrete and evidence-backed.

Deliverable: Punggol includes the recorded drunk aggressive bystander sequence after the fire sweep, with welfare check, verbal aggression, physical contact / shove, responder restraint, and on-site police-support guidance captured as timestamped evidence.

Scope:

- Add the post-fire sweep, welfare check, verbal aggression, physical shove, and de-escalation events to the Punggol timeline.
- Tag the event as responder safety / medical-welfare follow-up evidence, not as initial caller context.
- Add source references for both Wei Jie and Hafiz POV/bodycam clips and important timestamps.
- Use Wei Jie's POV as the clearest 00:37 visible shove/contact evidence and Hafiz's POV as the supporting impact/recovery perspective.
- Surface on-site police-support notification / confirmation as reviewable guidance for the officer/GC, not autonomous external dispatch.

Acceptance criteria:

- Evidence cards identify the physical-contact / responder-safety moments with source, timestamp, and short description.
- The live/review UI can show the event without claiming AI independently concluded a legal assault or commanded police deployment.
- AAR briefing slides can cite the event from the Punggol evidence timeline.

### Sequence Punggol feeds across fire and post-fire phases

Status: DONE

Purpose: make the Punggol footage feel like one continuous incident rather than separate video demos.

Deliverable: the live dashboard plays the fire-response bodycam feeds first, then continues Wei Jie / Hafiz into the post-fire welfare-check POV clips while Bodycam C becomes intentionally unavailable for that phase.

Scope:

- Map Bodycam A to Wei Jie and Bodycam B to Hafiz across both phases.
- Keep Bodycam C visible during fire response and absent during the welfare sweep with explicit copy such as `Bodycam C not attached to post-fire sweep`.
- Append or phase-switch Wei Jie POV and Hafiz POV immediately after the existing A/B fire clips.
- Keep evidence timestamps clear so 00:37 in the post-fire POV clips is not confused with the earlier fire-response timeline.
- Avoid visible presenter controls such as `Advance feeds` on the stage-facing dashboard.

Acceptance criteria:

- Presenter can move from fire response into welfare check without switching incidents.
- A and B retain stable identities across both phases.
- C absence is explained as available-footage coverage, not a failed stream.
- The post-fire physical-contact event creates timeline evidence from both POVs.

### Implement full-incident AAR selection workflow

Status: DONE

Purpose: reflect mentor guidance that AAR should encompass the whole case first, then let the officer choose what is presented.

Deliverable: AAR briefing slide generation starts from the full Punggol incident timeline, including fire response, welfare check, responder-safety event, recommendations, and officer decisions, with selectable evidence/milestones for the final slide deck.

Scope:

- Generate or assemble AAR material from the full selected incident timeline, not only the active search/filter results.
- Keep search useful for finding abuse/responder-safety evidence without narrowing the exported incident scope by default.
- Add officer selection controls or review state for which evidence/milestones appear in the final AAR briefing slides.
- Make unavailable formal data fields explicit instead of fabricating fire, medical, police, or casualty details.
- Ensure AAR copy says briefing slides / officer-reviewed output, not official report.

Acceptance criteria:

- Searching `physical contact` or `police support` still preserves fire-response and welfare-check context for AAR generation.
- Officer can include or exclude selected evidence/milestones before export.
- Exported slides show the full Punggol sequence unless the officer intentionally narrows the presentation.
- Slides keep caller context, footage-derived evidence, and officer decisions separate.

### Wire Punggol post-fire POV footage

Status: DONE

Purpose: use the uploaded Wei Jie and Hafiz POV clips in the Punggol stage flow.

Deliverable: the Punggol dashboard/review flow plays the post-fire POV clips after the fire-response feeds and can extract evidence around `00:37`.

Scope:

- Reference `/videos/fire/punggol-post-fire-wei-jie-pov.mp4` and `/videos/fire/punggol-post-fire-hafiz-pov.mp4` from the Punggol scenario/dashboard data.
- Sequence the clips after Wei Jie / Hafiz fire-response feeds while marking Bodycam C as not attached to the welfare sweep.
- Verify browser playback and frame extraction around `00:37`.

Acceptance criteria:

- App uses both post-fire clips in the Punggol flow.
- Evidence cards cite both POVs with correct timestamps.
- Missing clips show a clear unavailable state.

### Harden stage-facing live dashboard controls

Status: DONE

Purpose: avoid making the live dashboard look like staged playback or pre-analyzed footage during judging.

Deliverable: the stage-facing dashboard hides or renames controls that imply recorded playback control, while preserving reliable presenter control behind a debug or operator-only mode if needed.

Scope:

- Remove visible `Pause`, `Resume`, and `Advance feeds` controls from the judge-facing live dashboard.
- Move presenter-only controls behind a query flag, debug panel, keyboard shortcut, or non-stage route if still needed.
- Replace playback-like labels with operational status labels such as `Analyzing current feed window`, `Evidence window`, or `Current source frame`.
- Remove UI/API-visible wording such as deterministic demo analysis, presentation cue, seeded analysis, or analysis fallback from stage outputs.

Acceptance criteria:

- Judges see live-analysis language, source feed IDs, timestamps, and evidence windows rather than playback controls.
- Presenter can still run a reliable demo without exposing stage mechanics.
- Failure states say analysis unavailable instead of substituting hidden fabricated evidence.

### Correct AI pipeline and pitch wording

Status: TODO

Purpose: keep the hackathon story focused and avoid stale model/provider claims.

Deliverable: docs, slides, and demo copy describe the AI path as vision-to-text evidence extraction followed by GPT-5.4 mini structuring.

Scope:

- Use the core feature framing: bodycam vision-to-text timeline generation.
- Describe the pipeline as vision-to-text model → GPT-5.4 mini.
- Say GPT-5.4 mini structures evidence into timeline, reviewable recommendations, summaries, and AAR briefing slide content.
- Remove or de-emphasize model-routing/provider details that are not part of the main demo.
- Avoid generic “report generation”; use “AAR briefing slide generation”.

Acceptance criteria:

- Main pitch uses one high-value AI feature instead of a long list of AI features.
- AI claims are grounded in evidence extraction, structured timeline generation, recommendations, and AAR briefing slides.
- Human-in-the-loop wording is present wherever recommendations appear.

### Host the app on OpenShift

Status: TODO

Purpose: deploy 1stSight on the Dell Cloud Native Platform / OpenShift environment for the final presentation.

Deliverable: a working OpenShift-hosted app reachable through an OpenShift route, with runtime secrets configured and the container listening on port `8080`.

Scope:

- Build the Next.js app container.
- Push the image to Harbor or the required registry.
- Create/update OpenShift deployment, service, route, and secrets.
- Verify map loading, video serving, API routes, PDF export, and AI calls in the hosted environment.
- Keep deployment credentials and runtime secrets out of source control and written notes.

Acceptance criteria:

- OpenShift route loads the app successfully.
- Container health and logs show the app listening on port `8080`.
- Public video assets load from the deployed app.
- Runtime API routes work or fail with clear configuration errors.
- Final deployment steps are documented enough to repeat.

## Non-technical

### Create final slides

Status: TODO

Purpose: produce the main presentation deck for SCDF/Dell mentors and judges.

Deliverable: a polished final slide deck covering problem, Punggol end-to-end workflow, evidence-first AI approach, architecture, impact, limitations, and next steps.

Scope:

- Lead with operational value rather than model/provider details.
- Use the single Punggol story across fire response, post-fire welfare check, responder safety, and AAR briefing slides.
- Mention Woodlands only as a booth/secondary demo if needed, not as the main stage AAR story.
- Include screenshots or clean visuals from the final app.
- Keep AI claims grounded in what the app actually performs.

Acceptance criteria:

- Deck supports the stage presentation with time for Q&A.
- Slides align with the final app state and presenter flow.
- Screenshots match the current UI.
- AAR briefing slide boundaries are clear: full-incident timeline first, officer chooses what appears, not an official report.

### Rehearse final presentation flow

Status: TODO

Purpose: make the live presentation reliable, timed, and easy to run.

Deliverable: a run-of-show that maps each spoken section to a specific slide, app screen, or demo action.

Scope:

- Use the Punggol-only stage flow from map dispatch to fire-response live dashboard to post-fire welfare/responder-safety review to AAR output.
- Specify transitions between slides, app screens, evidence timeline, recommendation review, and AAR export.
- Include fallback lines if AI analysis or hosted deployment fails during presentation.
- Keep transitions short and operational.
- Keep Woodlands and Ubi as booth follow-up demos, not stage transitions.

Acceptance criteria:

- Flow fits within the stage presentation slot with buffer.
- Presenter knows exactly when to switch slides, app screens, and analysis actions.
- Caller context, footage-derived evidence, and post-incident review points stay separate.
- Human-in-the-loop and evidence-first boundaries are stated clearly.

### Create A1 poster

Status: TODO

Purpose: create the physical or printable poster summary for judging/exhibition.

Deliverable: an A1 poster that explains 1stSight at a glance with a strong visual hierarchy.

Scope:

- Include problem, solution, workflow, architecture, Punggol scenario screenshots, and impact.
- Use the final visual language from the app and slides.
- Make the poster readable at distance, with minimal dense text.
- Emphasize evidence-linked live awareness, responder-safety evidence, and faster full-incident AAR briefing slide preparation.

Acceptance criteria:

- Poster exports at print-ready A1 size.
- Text is readable and not overcrowded.
- Visuals match final product positioning.
- Boundaries around official reports and human review are clear.

### Optional: film and edit full product walkthrough

Status: OPTIONAL TODO

Purpose: create a backup or supplementary walkthrough if live presentation time, network, or deployment conditions are unreliable.

Deliverable: an edited product walkthrough showing the final Punggol 1stSight flow from map to live fire analysis to post-fire responder-safety review to AAR briefing slide export.

Scope:

- Record the final app in a clean browser window.
- Show Punggol firetruck movement, live dashboard, runtime fire analysis, post-fire welfare check, 00:37 responder-safety evidence, recommendation review, full incident evidence timeline, and AAR briefing slide PDF export.
- Add light editing only where it improves pacing or hides waiting time.
- Keep the walkthrough aligned with the final slides.

Acceptance criteria:

- Video can be used as a fallback if the hosted app or model endpoint fails.
- Walkthrough is short enough to support the final presentation rather than replace it.
- Captions or narration are accurate and avoid overclaiming AI capabilities.
