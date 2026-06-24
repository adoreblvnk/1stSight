# 1stSight TODO

## Technical

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
