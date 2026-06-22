# 1stSight TODO

## Technical

### Add visual presentation of firetruck map marker movement

Status: TODO

Purpose: make the response journey visible before the live incident dashboard opens.

Deliverable: the map should show the Basic Task Force / firetruck marker moving from Punggol Fire Station toward the Punggol residential fire location, with a clear moment where the officer can enter the live incident dashboard.

Scope:

- Show motion on the existing map page rather than creating a separate page.
- Keep the marker movement presenter-controllable or deterministic so it is reliable during presentation.
- Preserve the current Singapore map, Punggol Fire Station marker, incident marker, and incident selector.
- Add only enough animation/state to communicate dispatch-to-arrival progression.

Acceptance criteria:

- The marker visibly moves along a route or staged path toward the incident.
- The arrival state enables or highlights entry into the live dashboard.
- The flow works without requiring external route APIs beyond the existing map setup.
- The presentation can be reset or replayed without refreshing the whole app if practical.

### Add stream analysis support for evaluators to try

Status: TODO

Purpose: let evaluators interact with 1stSight by analyzing their own current footage or a controlled stream-like input instead of only watching preset incident footage.

Deliverable: an evaluator-facing path where a user can provide a video/stream input and trigger the same runtime analysis pipeline used by the incident workflow.

Scope:

- Support a practical first version, such as uploaded video, selected local test feed, or browser-accessible stream URL.
- Reuse the existing ffmpeg frame extraction and structured AI analysis pipeline where possible.
- Show clear loading, unavailable, and error states when stream input or AI analysis fails.
- Keep generated outputs evidence-linked with frame/source/timestamp references.

Acceptance criteria:

- A user can provide or select a stream-like source from the UI.
- The backend extracts frames from that source and sends them through runtime analysis.
- Results appear as events, evidence cards, or review outputs with source references.
- The app does not fabricate analysis if the stream, ffmpeg, or model call fails.

### Shift model routing to GB10 endpoint + OpenAI

Status: TODO

Purpose: move away from the current Codex subscription development path and align the running app with the intended model architecture.

Deliverable: production-shaped model routing where GB10 handles local/OpenAI-compatible text reasoning and OpenAI handles cloud vision or higher-accuracy multimodal analysis.

Scope:

- Configure GB10 through OpenAI-compatible environment variables.
- Configure OpenAI through server-side `OPENAI_API_KEY` only.
- Keep Codex subscription fallback limited to local development if it remains useful.
- Preserve Zod-validated structured outputs across all providers.
- Avoid exposing model secrets through browser-visible environment variables.

Acceptance criteria:

- Local/deployed model routing can select GB10 for text use cases.
- Vision-heavy analysis can use OpenAI when configured.
- Missing credentials produce clear unavailable/error states instead of fake results.
- `.env.example` documents required variable names without real secrets.

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

### Generate AAR briefing slide PDF

Status: TODO

Purpose: align the output with SCDF officer feedback: concise, visual AAR briefing slides in PDF format.

Deliverable: generated PDF pages that look and read like presentation slides for the Woodlands medical / responder-safety scenario.

Scope:

- Create slide layouts for incident overview, milestone timeline, selected evidence frames, recommendation/AAR findings, and officer-reviewed follow-up.
- Use slide-style pages instead of dense report pages.
- Keep wording short, operational, and visual-first.
- Include selected evidence frames, BWC/source IDs, timestamps, short descriptions, key milestones, main challenges, areas done well, and areas for improvement.
- Preserve source references for every selected frame.
- Mark unavailable formal data as pending officer input instead of fabricating it.
- Do not call the output an official SCDF Fire Report or Ambulance Report.

Acceptance criteria:

- PDF reads like briefing slides, not a long written report.
- Generated PDF can be shown directly in a presentation.
- Visual evidence is prominent.
- Every evidence claim links back to source footage, timestamp, or officer-provided data.
- Woodlands scenario can generate the slide PDF in the main presentation flow.
- Punggol scenario does not generate a fire report or slide PDF in the main flow.

### Track critical incident milestones with timestamps

Status: TODO

Purpose: show important operational milestones in the incident timeline and AAR briefing slides with correct timestamp provenance.

Deliverable: milestone timeline support that can display timestamps from footage, dispatch/ACES-style records, or officer-entered data.

Milestones to support:

- Call received
- Dispatch
- Acknowledge
- Move out
- Arrive at scene
- At patient side
- After patient assessment
- Moving out to hospital
- Arrive hospital
- First jet out
- BA entry
- Damping down
- Investigation / cause search
- Hand over

Scope:

- Distinguish footage-derived timestamps from dispatch/system timestamps and officer-entered timestamps.
- Allow milestones to be pending or unavailable when the source is not present.
- Use these milestones in both the incident timeline and AAR briefing slides where relevant.
- Avoid implying bodycam vision can detect dispatch-system events such as call received or dispatch unless supplied by external data.

Acceptance criteria:

- Each milestone can show a timestamp, source type, and status.
- Missing milestones are clearly marked pending/unavailable.
- Slide PDF can include a concise milestone timeline.
- Fire and medical/responder-safety workflows can share the same milestone model.

## Non-technical

### Create final slides

Status: TODO

Purpose: produce the main presentation deck for SCDF/Dell mentors and judges.

Deliverable: a polished final slide deck covering problem, 1stSight workflow, evidence-first AI approach, architecture, two incident scenarios, impact, limitations, and next steps.

Scope:

- Lead with operational value rather than model/provider details.
- Use the two-scenario story: Punggol live fire operations and Woodlands responder-safety AAR briefing slide preparation.
- Include screenshots or clean visuals from the final app.
- Keep AI claims grounded in what the app actually performs.

Acceptance criteria:

- Deck supports a 10-minute presentation.
- Slides align with the final app state and presenter flow.
- Screenshots match the current UI.
- AAR slide PDF boundaries are clear.

### Finalize script / presentation flow

Status: TODO

Purpose: make the live presentation reliable, timed, and easy to rehearse.

Deliverable: a presenter script and run-of-show that maps each spoken section to a specific app screen or slide.

Scope:

- Use the 10-minute flow from project context as the starting point.
- Specify what to say for caller context, live fire analysis, recommendation review, Woodlands review, AAR briefing slide export, and closing value.
- Include fallback lines if AI analysis or hosted deployment fails during presentation.
- Keep transitions short and operational.

Acceptance criteria:

- Script fits within 10 minutes with buffer.
- Presenter knows exactly when to switch slides, app screens, and analysis actions.
- No later Woodlands case facts are introduced as caller context.
- Human-in-the-loop and evidence-first boundaries are stated clearly.

### Create A1 poster

Status: TODO

Purpose: create the physical or printable poster summary for judging/exhibition.

Deliverable: an A1 poster that explains 1stSight at a glance with a strong visual hierarchy.

Scope:

- Include problem, solution, workflow, architecture, scenario screenshots, and impact.
- Use the final visual language from the app and slides.
- Make the poster readable at distance, with minimal dense text.
- Emphasize evidence-linked live awareness and faster AAR briefing slide preparation.

Acceptance criteria:

- Poster exports at print-ready A1 size.
- Text is readable and not overcrowded.
- Visuals match final product positioning.
- Boundaries around official reports and human review are clear.

### Film SCDF responder-safety video

Status: TODO

Purpose: create or finalize the responder-safety footage needed for the Woodlands post-incident review scenario.

Deliverable: a usable bodycam-style video for the Woodlands medical assistance / responder-safety workflow.

Scope:

- Film a controlled, safe, staged responder-safety scene suitable for analysis.
- Keep the scenario visually consistent with a public walkway near a residential estate.
- Capture enough visible moments for unsafe proximity, obstruction, crew intervention, or physical-contact review if those moments are part of the staged scene.
- Avoid including sensitive personal data, real patient details, or identifiable bystanders without consent.
- Rename and store the final footage under the app media path when ready.

Acceptance criteria:

- Video is clear enough for frame extraction and evidence selection.
- Footage supports the Woodlands AAR story without mixing with Punggol.
- Final file plays in browser and can be processed by ffmpeg.
- Public-facing references use responder-safety / medical assistance wording, not raw source-case wording.

### Optional: film and edit full product walkthrough

Status: OPTIONAL TODO

Purpose: create a backup or supplementary walkthrough if live presentation time, network, or deployment conditions are unreliable.

Deliverable: an edited product walkthrough showing the final 1stSight flow from map to live analysis to post-incident AAR briefing slide export.

Scope:

- Record the final app in a clean browser window.
- Show the Punggol firetruck movement, live fire dashboard, runtime analysis, recommendation review, Woodlands review, responder-safety search, and AAR briefing slide PDF export.
- Add light editing only where it improves pacing or hides waiting time.
- Keep the walkthrough aligned with the final script and slides.

Acceptance criteria:

- Video can be used as a fallback if the hosted app or model endpoint fails.
- Walkthrough is short enough to support the final presentation rather than replace it.
- Captions or narration are accurate and avoid overclaiming AI capabilities.
