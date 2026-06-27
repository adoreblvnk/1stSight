# Punggol Live Demo Reliability Investigation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Explain and fix two live-demo reliability issues without changing the user’s code in this planning turn: the missing Enhanced Task Force recommendation around 1:17/1:18, and lag when advancing into the post-fire medical/responder-safety POV footage.

**Architecture:** The live demo currently combines browser video playback state in `src/components/ops-dashboard.tsx` with server-side live analysis in `src/app/api/live/analyze/route.ts`. Enhanced Task Force behavior is seeded only when the live-analysis request reaches the API with `operatorEvidenceSupport: true` and the seeded fire frames are visible through the current Bodycam B time. The post-fire lag likely comes from switching `<video key={videoSrc}>` sources only after clicking Advance feeds, causing the browser to fetch/decode large MP4s at the transition moment.

**Tech Stack:** Next.js 16 App Router, React client components, HTMLVideoElement playback, server route handlers, ffmpeg/ffprobe via `execa`, AI SDK structured vision analysis, seeded demo evidence in TypeScript.

---

## Direct answer to the two questions

### Why did 1:17/1:18 not suggest Enhanced Task Force?

Most likely because the “hardcoded” Enhanced Task Force path is gated, not unconditional.

Relevant code:
- `src/lib/scenario.ts:97-100`
  - `liveAnalysisCue.responderId = "ff-b"`
  - `liveAnalysisCue.timestampSeconds = 77.5`
- `src/lib/demo-evidence.ts:53-61`
  - seeded frame `demo-fire-b-77_5s-escalation-etf`
- `src/app/api/live/analyze/route.ts:289-293`
  - seeded demo frames are only included when `operatorEvidenceSupport === true`
- `src/app/api/live/analyze/route.ts:317-329`
  - seeded recommendation is only used when `operatorEvidenceSupport && isDemoFireIncident(incident) && seededFrames.length > 0 && !modelEnhancedTaskForce`

So if the live analysis request was not sent with `operatorEvidenceSupport: true`, the route relies on the vision model and regex fallback instead of the seeded ETF recommendation. Also, if the bodycam’s reported `currentTime` is just before the seeded threshold, `buildPunggolFireDemoFrames(...)` may not include the 77.5s seed yet.

Expected fix direction:
- For the Punggol stage demo, make the client send `operatorEvidenceSupport: true` by default for live analysis.
- Add a small threshold buffer around the 77.5s cue so arriving at ~1:17/1:18 reliably includes the seeded ETF evidence.
- Add a regression test or route smoke check to prove Bodycam B at 77.5s returns `Flag Enhanced Task Force consideration for Ground Commander`.

### Why does Advance feeds lag before playing the post-fire medical POV?

Most likely because Advance feeds switches the active video source at click time.

Relevant code:
- `src/components/ops-dashboard.tsx:153`
  - `liveFeedSource(...)` changes from fire video to `reviewVideoSrcs[0]` in post-fire mode.
- `src/components/ops-dashboard.tsx:1026-1033`
  - `<video key={videoSrc} src={videoSrc} ... />` remounts when the source changes.
- `src/components/ops-dashboard.tsx:1838-1843`
  - `continuePostFireSweep()` flips `mode` to `post-fire`, then playback starts.

Because the two post-fire MP4s are large local assets, the browser may not have decoded or buffered them before the click. The `key={videoSrc}` remount makes the transition clean, but it also forces a fresh video element/source load at exactly the demo transition.

Expected fix direction:
- Preload post-fire POV videos while still in the fire phase.
- On Advance feeds, set the new video elements to `currentTime = 0`, call `load()` if needed, then call `play()` after metadata/canplay is available.
- Optionally render hidden preload `<video preload="auto">` elements for `punggol-post-fire-wei-jie-pov.mp4` and `punggol-post-fire-hafiz-pov.mp4`.

---

## Current context / assumptions

- The user explicitly requested planning only and no code edits.
- The repo is on `main` and the most recent relevant pushed commit is `b26fafb fix(aar): paginate evidence slides`.
- The Punggol live demo uses incident ID `punggol-residential-fire` even though visible wording now describes a landed house fire.
- The hardcoded ETF seed exists, but is conditional.
- The post-fire videos are large:
  - `public/videos/fire/punggol-post-fire-hafiz-pov.mp4`
  - `public/videos/fire/punggol-post-fire-wei-jie-pov.mp4`
- The goal is demo reliability, not perfect production inference.

---

## Proposed approach

1. Make Punggol live analysis deterministic at the ETF cue by ensuring `operatorEvidenceSupport` is enabled for the staged demo path.
2. Add a small cue tolerance so the seeded 77.5s ETF evidence appears if the UI/request lands near 1:17 or 1:18.
3. Preload post-fire videos during the fire phase so Advance feeds only switches already-warmed media.
4. Keep labels and control behavior unchanged except for smoother playback and reliable ETF recommendation.
5. Validate with targeted API smoke tests and browser demo checks.

---

## Step-by-step plan

### Task 1: Trace the live analysis request payload

**Objective:** Confirm whether `operatorEvidenceSupport` is currently sent from the live dashboard when analyzing Punggol fire footage.

**Files:**
- Inspect: `src/components/ops-dashboard.tsx`
- Inspect: `src/app/api/live/analyze/route.ts`

**Step 1: Search for the live analysis fetch call**

Run:
```bash
rg -n "operatorEvidenceSupport|/api/live/analyze|fetch\(" src/components/ops-dashboard.tsx src/app/api/live/analyze/route.ts
```

Expected:
- Find the client-side POST to `/api/live/analyze`.
- Determine whether `operatorEvidenceSupport` is included in the JSON body.

**Step 2: Read the surrounding client code**

Run:
```bash
sed -n '1700,1835p' src/components/ops-dashboard.tsx
```

Expected:
- Identify how `feeds` are built.
- Identify whether Punggol demo mode has a conditional flag.

**Step 3: Document the exact cause**

Expected conclusion:
- If `operatorEvidenceSupport` is absent/false, the seeded ETF path is not activated.
- If present, inspect whether `currentTime` reaching 77.5 is the issue.

---

### Task 2: Add a failing ETF route smoke test script

**Objective:** Prove the current live-analysis route does or does not return the seeded ETF recommendation at Bodycam B 77.5s.

**Files:**
- Create or temporarily run: `scripts/smoke-live-etf.mjs` if the project keeps scripts, otherwise use an inline `node` command.

**Step 1: Start dev server**

Run:
```bash
npm run dev
```

Expected:
- Next.js dev server available on `http://localhost:3000`.

**Step 2: POST a deterministic payload**

Run:
```bash
node - <<'NODE'
const res = await fetch('http://localhost:3000/api/live/analyze', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    incidentId: 'punggol-residential-fire',
    operatorEvidenceSupport: true,
    feeds: [
      { responderId: 'ff-b', videoSrc: '/videos/fire/fire-feed-b-escalation.mp4', currentTime: 77.5 }
    ]
  })
});
const json = await res.json();
console.log(JSON.stringify({
  status: res.status,
  recommendation: json.recommendation,
  eventTitles: json.events?.map((event) => event.title)
}, null, 2));
NODE
```

Expected before fix:
- If the API seed works, response recommendation should include `Flag Enhanced Task Force consideration for Ground Commander`.
- If it does not, the route logic needs fixing.

**Step 3: Repeat without `operatorEvidenceSupport`**

Run:
```bash
node - <<'NODE'
const res = await fetch('http://localhost:3000/api/live/analyze', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    incidentId: 'punggol-residential-fire',
    feeds: [
      { responderId: 'ff-b', videoSrc: '/videos/fire/fire-feed-b-escalation.mp4', currentTime: 77.5 }
    ]
  })
});
const json = await res.json();
console.log(JSON.stringify({
  status: res.status,
  recommendation: json.recommendation,
  eventTitles: json.events?.map((event) => event.title)
}, null, 2));
NODE
```

Expected:
- This likely depends on the model and may not reliably return ETF.
- This explains the user-visible miss if the client does not set the flag.

---

### Task 3: Make Punggol live analysis send seeded demo support

**Objective:** Ensure the live dashboard activates seeded Punggol evidence/recommendations during the staged demo.

**Files:**
- Modify: `src/components/ops-dashboard.tsx`

**Step 1: Locate the live analysis request body**

Find the POST body to `/api/live/analyze`.

**Step 2: Add a Punggol-specific flag**

Add logic equivalent to:
```ts
const operatorEvidenceSupport = selectedIncident.id === punggolIncidentId;
```

Then include it in the request:
```ts
body: JSON.stringify({
  incidentId: selectedIncident.id,
  feeds,
  operatorEvidenceSupport,
}),
```

**Step 3: Keep scope narrow**

Do not enable this globally for every incident unless required. Keep it to Punggol demo fire analysis to avoid changing non-demo behavior.

**Step 4: Verify with route and browser**

Run:
```bash
npm run lint && npm run build
```

Expected:
- Pass.

Run the smoke test from Task 2.

Expected:
- Recommendation includes `Flag Enhanced Task Force consideration for Ground Commander` at Bodycam B 77.5s.

**Step 5: Commit**

```bash
git add src/components/ops-dashboard.tsx
git commit -m "fix(live): seed Punggol ETF cue"
```

---

### Task 4: Add a small cue tolerance for the ETF seed

**Objective:** Make the seed reliable if analysis lands slightly before/after 77.5s due to playback timing or request cadence.

**Files:**
- Modify: `src/lib/demo-evidence.ts`

**Step 1: Inspect `buildPunggolFireDemoFrames`**

Run:
```bash
rg -n "function buildPunggolFireDemoFrames|visibleThroughSeconds" src/lib/demo-evidence.ts
sed -n '180,260p' src/lib/demo-evidence.ts
```

**Step 2: Add a cue tolerance constant**

Add near the demo frame builder:
```ts
const demoCueToleranceSeconds = 1.5;
```

When comparing frame timestamp against visible-through time, use:
```ts
frame.timestampSeconds <= visibleThroughSeconds + demoCueToleranceSeconds
```

**Step 3: Verify 76.5s and 77.5s**

Run smoke requests with `currentTime: 76.5`, `77.0`, and `77.5`.

Expected:
- ETF seed appears by the time the demo visually reaches 1:17/1:18.

**Step 4: Commit**

```bash
git add src/lib/demo-evidence.ts
git commit -m "fix(live): tolerate Punggol ETF cue timing"
```

---

### Task 5: Preload post-fire POV videos during the fire phase

**Objective:** Reduce Advance feeds lag by warming browser media before switching to post-fire mode.

**Files:**
- Modify: `src/components/ops-dashboard.tsx`

**Step 1: Add hidden preload videos in `BodycamGrid`**

Inside `BodycamGrid`, derive post-fire sources:
```ts
const postFireVideoSources = incident.id === punggolIncidentId && !isPunggolPostFirePhase
  ? responders.flatMap((responder) => responder.reviewVideoSrcs ?? [])
  : [];
```

Render hidden preload elements near the grid root:
```tsx
{postFireVideoSources.map((src) => (
  <video key={`preload-${src}`} src={src} preload="auto" muted playsInline className="hidden" aria-hidden="true" />
))}
```

**Step 2: Avoid visible layout changes**

The preload elements must not affect grid dimensions or keyboard navigation.

**Step 3: Verify network/media behavior**

Use browser devtools or console:
```js
[...document.querySelectorAll('video')].map((video) => ({ src: video.currentSrc || video.src, readyState: video.readyState, preload: video.preload }))
```

Expected before clicking Advance feeds:
- Hidden post-fire videos exist with `preload: "auto"`.
- `readyState` should increase after the page has been open briefly.

**Step 4: Commit**

```bash
git add src/components/ops-dashboard.tsx
git commit -m "fix(live): preload Punggol post-fire feeds"
```

---

### Task 6: Make Advance feeds wait for post-fire video readiness

**Objective:** Ensure clicking Advance feeds starts playback only after the switched post-fire videos can play.

**Files:**
- Modify: `src/components/ops-dashboard.tsx`

**Step 1: Update the post-fire mode effect in `BodycamGrid`**

Current relevant logic:
```ts
if (isPunggolPostFirePhase && responder.reviewVideoSrcs?.length && video.currentTime > 44) video.currentTime = 0;
if (playing) void video.play();
else video.pause();
```

Replace with readiness-aware logic:
```ts
if (isPunggolPostFirePhase && responder.reviewVideoSrcs?.length) {
  if (video.currentTime > 44) video.currentTime = 0;
  if (video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) video.load();
}

if (playing) {
  const playWhenReady = () => void video.play();
  if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) playWhenReady();
  else video.addEventListener("canplay", playWhenReady, { once: true });
} else {
  video.pause();
}
```

**Step 2: Clean up event listeners**

If adding listeners inside `useEffect`, return a cleanup function or keep the listener `{ once: true }` and avoid stacking repeated listeners.

**Step 3: Verify no regression in fire phase**

Run:
```bash
npm run lint && npm run build
```

Expected:
- Pass.

**Step 4: Browser demo check**

Open:
```text
/live?incident=punggol-residential-fire
```

Expected:
- Fire videos play as before.
- Clicking Advance feeds switches to post-fire mode with much less delay.
- Bodycam C still shows `Bodycam C not attached to post-fire sweep`.

**Step 5: Commit**

```bash
git add src/components/ops-dashboard.tsx
git commit -m "fix(live): smooth post-fire feed switch"
```

---

### Task 7: Final validation pass

**Objective:** Prove both user-observed issues are fixed.

**Files:**
- No file changes expected.

**Step 1: Run quality gates**

```bash
npm run lint && npm run build
```

Expected:
- Pass with no errors.

**Step 2: Verify ETF smoke test**

Run the Task 2 POST with:
- `currentTime: 76.5`
- `currentTime: 77.5`
- `currentTime: 78`

Expected:
- All return ETF recommendation for Punggol Bodycam B.

**Step 3: Browser live demo verification**

Open:
```text
/live?incident=punggol-residential-fire
```

Checklist:
- Bodycam B reaches around 1:17/1:18.
- Live recommendations show `Flag Enhanced Task Force consideration for Ground Commander`.
- Click Advance feeds.
- Post-fire Wei Jie and Hafiz POVs start without noticeable long lag.
- Bodycam C remains unavailable in post-fire mode.

**Step 4: Commit final verification note if needed**

If code changes were already committed task-by-task, do not create an empty commit unless the user wants one.

---

## Files likely to change

- `src/components/ops-dashboard.tsx`
  - Send `operatorEvidenceSupport` for Punggol live demo analysis.
  - Preload post-fire POV videos.
  - Make post-fire playback readiness-aware after Advance feeds.

- `src/lib/demo-evidence.ts`
  - Add tolerance around Punggol seeded ETF cue inclusion.

Optional only if route smoke testing reveals the seed is still not returned:
- `src/app/api/live/analyze/route.ts`
  - Adjust `shouldUseSeededRecommendation` logic so the seeded ETF recommendation wins in the Punggol demo at/near 77.5s.

---

## Tests / validation

Primary commands:
```bash
npm run lint && npm run build
```

ETF API smoke test:
```bash
node - <<'NODE'
const res = await fetch('http://localhost:3000/api/live/analyze', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    incidentId: 'punggol-residential-fire',
    operatorEvidenceSupport: true,
    feeds: [
      { responderId: 'ff-b', videoSrc: '/videos/fire/fire-feed-b-escalation.mp4', currentTime: 77.5 }
    ]
  })
});
const json = await res.json();
console.log(json.recommendation);
NODE
```

Expected:
```text
Flag Enhanced Task Force consideration for Ground Commander
```

Browser readiness check before Advance feeds:
```js
[...document.querySelectorAll('video')].map((video) => ({
  src: video.currentSrc || video.src,
  readyState: video.readyState,
  preload: video.preload,
  hidden: video.classList.contains('hidden')
}))
```

Expected:
- Hidden post-fire preload videos exist before Advance feeds.
- Their `readyState` increases after a short wait.

---

## Risks, tradeoffs, and open questions

- Enabling `operatorEvidenceSupport` by default for Punggol makes the stage demo more deterministic, but it intentionally reduces reliance on the live vision model for that cue.
- A tolerance around 77.5s may make the recommendation appear slightly earlier than the exact seed timestamp. This is acceptable for demo reliability if kept small, e.g. 1-1.5 seconds.
- Hidden preload videos increase bandwidth/memory use. This should be acceptable for two local MP4s in a stage demo, but avoid globally preloading all incident videos.
- `video.load()` / `canplay` handling must avoid repeated event-listener buildup inside React effects.
- If lag remains after preloading, the next likely bottleneck is MP4 encoding/keyframe placement. In that case, transcode the post-fire POVs for web playback with faststart and more frequent keyframes.

---

## Suggested execution order

1. Confirm payload behavior with Task 1 and Task 2.
2. Implement deterministic ETF activation with Task 3.
3. Add timing tolerance with Task 4.
4. Add preload behavior with Task 5.
5. Add readiness-aware playback with Task 6.
6. Run final validation with Task 7.
