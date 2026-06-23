# 1stSight TODO

## Technical

### Add visual presentation of firetruck map marker movement

Status: TODO

Purpose: make the response journey visible before the live incident dashboard opens.

Deliverable: the map shows the Basic Task Force / firetruck marker moving from Punggol Fire Station toward the Punggol residential fire location, with a clear handoff into the live incident dashboard.

Scope:

- Show motion on the existing map page rather than creating a separate page.
- Keep the movement presenter-controllable or deterministic for a reliable demo.
- Preserve the current Singapore map, Punggol Fire Station marker, Punggol incident marker, and incident selector.
- Add only enough animation/state to communicate dispatch-to-arrival progression.

Acceptance criteria:

- The marker visibly moves along a route or staged path toward the incident.
- The arrival state enables or highlights entry into the live dashboard.
- The flow works without requiring external route APIs beyond the existing map setup.
- The presentation can be reset or replayed without refreshing the whole app if practical.

### Consolidate the demo into one Punggol scenario

Status: TODO

Purpose: reduce narrative/context drift by using Punggol as the single scenario across live operations, medical/welfare check, responder safety, recommendations, and AAR briefing slides.

Deliverable: the app and presentation use one Punggol incident flow: residential fire response, post-fire welfare/medical check, drunk aggressive bystander assault, evidence-linked timeline, officer-reviewed recommendation, and AAR briefing slide output.

Scope:

- Update scenario data so Punggol covers both fire response and the post-fire medical/welfare responder-safety event.
- Remove stale main-demo references that present a second separate scenario as the primary AAR story.
- Keep the initial Punggol caller/fire context separate from footage-derived responder-safety evidence.
- Ensure every claimed event has a source feed, timestamp, selected frame, or officer-provided provenance.

Acceptance criteria:

- Main presenter flow can run end-to-end from Punggol map dispatch to live dashboard to review/AAR output.
- Punggol timeline includes fire events and the post-fire responder-safety event without mixing unsupported facts into caller context.
- Recommendations are worded for officer / Ground Commander consideration, not automatic command.
- Search, export, and dashboard copy all align to the single Punggol story.

### Add Punggol drunk bystander assault evidence

Status: TODO

Purpose: make the post-fire responder-safety moment concrete and evidence-backed.

Deliverable: Punggol includes the recorded drunk aggressive bystander sequence after the fire sweep, with verbal aggression, physical shove/assault, responder restraint, and police-support recommendation captured as timestamped evidence.

Scope:

- Add the post-fire sweep, welfare check, verbal aggression, physical shove, and de-escalation events to the Punggol timeline.
- Tag the event as responder safety / medical-welfare follow-up evidence, not as initial caller context.
- Add source references for both POV/bodycam clips and important timestamps.
- Surface the police-support recommendation as reviewable guidance for the officer/GC.

Acceptance criteria:

- Evidence cards identify the bystander-assault moments with source, timestamp, and short description.
- The live/review UI can show the event without claiming AI independently commanded police deployment.
- AAR briefing slides can cite the event from the Punggol evidence timeline.

### Compile and upload Punggol demo footage

Status: TODO

Purpose: make the final single-scenario demo runnable from real uploaded media instead of loose chat/video references.

Deliverable: final Punggol bodycam/POV clips are stored in the app media path and referenced by scenario data.

Scope:

- Compile the fire-response POV/bodycam clips and drunk-bystander POV/bodycam clips.
- Upload final assets under the app video folder.
- Name files by incident, source/bodycam, and sequence/timestamp.
- Update scenario references to point at the final files.
- Verify the clips play in-browser and can be processed for frame extraction.

Acceptance criteria:

- All referenced Punggol video files exist under `public/videos/...`.
- Browser playback works from the app.
- Frame/timestamp references in evidence cards match the final clips.
- Missing footage produces a clear unavailable state rather than fabricated analysis.

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
- Use the single Punggol story across fire response, welfare/medical check, responder safety, and AAR briefing slides.
- Include screenshots or clean visuals from the final app.
- Keep AI claims grounded in what the app actually performs.

Acceptance criteria:

- Deck supports a 10-minute presentation.
- Slides align with the final app state and presenter flow.
- Screenshots match the current UI.
- AAR briefing slide boundaries are clear.

### Rehearse final presentation flow

Status: TODO

Purpose: make the live presentation reliable, timed, and easy to run.

Deliverable: a run-of-show that maps each spoken section to a specific slide, app screen, or demo action.

Scope:

- Use the Punggol-only flow from map dispatch to live dashboard to review/AAR output.
- Specify transitions between slides, app screens, evidence timeline, recommendation review, and AAR export.
- Include fallback lines if AI analysis or hosted deployment fails during presentation.
- Keep transitions short and operational.

Acceptance criteria:

- Flow fits within 10 minutes with buffer.
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
- Emphasize evidence-linked live awareness and faster AAR briefing slide preparation.

Acceptance criteria:

- Poster exports at print-ready A1 size.
- Text is readable and not overcrowded.
- Visuals match final product positioning.
- Boundaries around official reports and human review are clear.

### Optional: film and edit full product walkthrough

Status: OPTIONAL TODO

Purpose: create a backup or supplementary walkthrough if live presentation time, network, or deployment conditions are unreliable.

Deliverable: an edited product walkthrough showing the final Punggol 1stSight flow from map to live analysis to post-incident AAR briefing slide export.

Scope:

- Record the final app in a clean browser window.
- Show Punggol firetruck movement, live dashboard, runtime analysis, recommendation review, evidence timeline, and AAR briefing slide PDF export.
- Add light editing only where it improves pacing or hides waiting time.
- Keep the walkthrough aligned with the final slides.

Acceptance criteria:

- Video can be used as a fallback if the hosted app or model endpoint fails.
- Walkthrough is short enough to support the final presentation rather than replace it.
- Captions or narration are accurate and avoid overclaiming AI capabilities.
