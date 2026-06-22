# Hybrid Operational Backgrounds Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Replace 1stSight's generic warm ambient gradient treatment with a route-aware hybrid background system: ash command shell, dark evidence/live surfaces, and readable static AI-image backdrops without decorative SaaS gradients.

**Architecture:** Keep the existing `PageAmbientBackground` / `OpsDashboardShell` structure, but make the overlay intentional instead of decorative. Remove the current radial accent glow and warm wash from the full-page background. Add explicit route background tone metadata so map stays lighter, live/review become darker and evidence-led, and foreground panels remain readable.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4 OKLCH tokens, existing shadcn/ui primitives, existing AI image assets under `public/ai-images/`.

---

## Recommendation

Yes: remove the current ambient/radial-gradient layer shown in the question.

Specifically, this line in `src/components/ops-dashboard.tsx` should go:

```tsx
<div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,color-mix(in_oklch,var(--accent),transparent_88%),transparent_32rem),linear-gradient(to_bottom,color-mix(in_oklch,var(--background),transparent_34%)_0%,color-mix(in_oklch,var(--background),transparent_48%)_48%,color-mix(in_oklch,var(--background),transparent_24%)_100%)]" />
```

Reason: it is decorative, generic, and it partially turns the generated AI image into a warm SaaS-ish wash. For 1stSight, the background should either support readability or carry operational evidence texture. It should not add a floating accent glow.

Do not remove every overlay. Keep a functional scrim/vignette so text and panels remain legible. Replace the current ambient gradient stack with a simple route-aware scrim:

- map: lighter ash wash, because map/dispatch readability matters
- live: darker neutral scrim, because video feeds and current events are the task
- review: darkest evidence scrim, because the `evidence-review-hero.png` already reads as dark contact-sheet material
- neutral: ash fallback

---

## Current Context / Assumptions

- `PROJECT_CONTEXT.md` says 1stSight is a command-and-control dashboard for live operations and post-incident review.
- `PRODUCT.md` says the interface should be controlled, operational, evidence-first, and should avoid generic SaaS dashboards and cinematic full-dark command-center tropes.
- `DESIGN.md` currently says: warm paper substrate, dark inset screen surfaces, and light mode as the default.
- The actual attached image `public/ai-images/evidence-review-hero.png` reads dark: black/charcoal contact-sheet evidence board, amber annotations, low-light frames, and warm paper at the edges.
- Current `src/app/globals.css` uses a warm-tinted background: `--background: oklch(96.5% 0.01 85)`.
- Current `src/components/ops-dashboard.tsx` uses:
  - `PageAmbientBackground`
  - `HeroImageBackdrop`
  - `page-ambient-vignette`
  - `bg-background/78` over the full app shell
  - a decorative radial accent + warm vertical wash in `PageAmbientBackground`
- Plan mode is active, so this document does not implement changes.

---

## Proposed Approach

Move from:

```text
warm paper page + dark insets + decorative ambient gradient
```

To:

```text
ash command shell + route-aware image scrim + dark live/review instruments + light reports
```

Keep the app from becoming full dark mode by preserving light/ash navigation, map, sidebars, reports, forms, and long text surfaces. Let live feed/video/evidence/timeline panels use dark `screen` surfaces.

The implementation should not introduce new assets, new animation, or new design abstractions. This is a cleanup and tightening pass.

---

## Task 1: Update Design Language In Documentation

**Objective:** Make `DESIGN.md` match the hybrid direction before code changes, so future agents do not reintroduce warm-white dominance or full dark mode.

**Files:**
- Modify: `DESIGN.md:3-46`

**Step 1: Replace the Theme paragraph**

Replace:

```markdown
1stSight uses an operational Editorial Factory visual system adapted for `impeccable`: warm paper substrate, dark inset screen surfaces, terse labels, grid-line structure, restrained emergency red, and sparse signal-like motion.
```

With:

```markdown
1stSight uses an operational Editorial Factory visual system adapted for `impeccable`: ash command substrate, dark evidence and video surfaces, terse labels, grid-line structure, restrained emergency red, and sparse signal-like motion.
```

**Step 2: Replace the light-mode sentence**

Replace:

```markdown
Use OKLCH tokens and semantic roles. Light mode is the default; dark appears only as inset surfaces for video, logs, terminal-like output, or AI trace review.
```

With:

```markdown
Use OKLCH tokens and semantic roles. Ash light mode is the app-shell default; dark appears as the dominant material for live video, evidence review, logs, terminal-like output, AI trace review, and frame timelines. Do not make the full C&C dashboard a cinematic dark-mode app.
```

**Step 3: Update the token example**

Replace the warm background/border token example:

```css
  --color-background: oklch(96.5% 0.01 85);
  --color-surface: oklch(98.5% 0 0);
  --color-foreground: oklch(20% 0 0);
  --color-muted-foreground: oklch(55% 0 0);
  --color-border: oklch(90% 0.01 85);
```

With:

```css
  --color-background: oklch(94.5% 0.006 85);
  --color-surface: oklch(98% 0 0);
  --color-foreground: oklch(20% 0 0);
  --color-muted-foreground: oklch(43% 0 0);
  --color-border: oklch(86.5% 0.008 85);
```

**Step 4: Add a background rule**

After the paragraph ending with `Use semantic status tokens only for their operational meanings.`, add:

```markdown
Full-page AI images are background evidence textures, not hero art. Use route-aware neutral scrims for readability. Avoid decorative radial accent glows and broad warm gradient washes over the generated images; they make the product read like a generic AI/SaaS dashboard and hide the actual bitmap.
```

**Step 5: Verify docs diff**

Run:

```bash
git diff -- DESIGN.md
```

Expected: only design-language and token guidance changes.

**Step 6: Commit**

```bash
git add DESIGN.md
git commit -m "docs: update operational background direction"
```

---

## Task 2: Neutralize Warm Shell Tokens

**Objective:** Reduce the warm-white page identity without switching the whole app to full dark mode.

**Files:**
- Modify: `src/app/globals.css:59-98`

**Step 1: Replace root light tokens**

In `:root`, replace:

```css
  --background: oklch(96.5% 0.01 85);
  --surface: oklch(98.5% 0 0);
  --foreground: oklch(20% 0 0);
  --muted-foreground: oklch(43% 0 0);
  --border: oklch(88% 0.012 85);
```

With:

```css
  --background: oklch(94.5% 0.006 85);
  --surface: oklch(98% 0 0);
  --foreground: oklch(20% 0 0);
  --muted-foreground: oklch(43% 0 0);
  --border: oklch(86.5% 0.008 85);
```

**Step 2: Replace secondary/muted/input/sidebar light tokens**

In `:root`, replace:

```css
  --secondary: oklch(92.5% 0.012 85);
  --muted: oklch(93.5% 0.01 85);
  --input: oklch(88% 0.012 85);
  --sidebar: oklch(94% 0.012 85);
  --sidebar-accent: oklch(91% 0.012 85);
```

With:

```css
  --secondary: oklch(90.5% 0.006 85);
  --muted: oklch(91.5% 0.006 85);
  --input: oklch(86.5% 0.008 85);
  --sidebar: oklch(92.5% 0.006 85);
  --sidebar-accent: oklch(89.5% 0.006 85);
```

**Step 3: Keep dark tokens unchanged**

Do not change `.dark` in this task. The app is not being converted into full dark mode.

**Step 4: Run static checks**

```bash
npm run lint
npx tsc --noEmit
```

Expected: both pass, or only pre-existing unrelated failures appear.

**Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "style: shift shell tokens to ash operational neutral"
```

---

## Task 3: Replace Decorative Ambient Gradient With Route-Aware Scrim

**Objective:** Remove the radial accent glow / warm full-page wash and replace it with functional overlays that preserve AI image visibility and foreground readability.

**Files:**
- Modify: `src/components/ops-dashboard.tsx:94-155`

**Step 1: Add route scrim metadata**

Below `pageBackgroundImages`, add:

```tsx
const pageBackgroundScrims = {
  map: "bg-[linear-gradient(to_bottom,color-mix(in_oklch,var(--background),transparent_16%)_0%,color-mix(in_oklch,var(--background),transparent_26%)_52%,color-mix(in_oklch,var(--background),transparent_12%)_100%)]",
  live: "bg-[linear-gradient(to_bottom,color-mix(in_oklch,var(--screen),transparent_20%)_0%,color-mix(in_oklch,var(--screen),transparent_32%)_52%,color-mix(in_oklch,var(--screen),transparent_18%)_100%)]",
  review: "bg-[linear-gradient(to_bottom,color-mix(in_oklch,var(--screen),transparent_12%)_0%,color-mix(in_oklch,var(--screen),transparent_24%)_48%,color-mix(in_oklch,var(--screen),transparent_10%)_100%)]",
  neutral: "bg-[linear-gradient(to_bottom,color-mix(in_oklch,var(--background),transparent_14%)_0%,color-mix(in_oklch,var(--background),transparent_24%)_52%,color-mix(in_oklch,var(--background),transparent_12%)_100%)]",
} as const;
```

**Step 2: Replace `PageAmbientBackground` overlay JSX**

Replace:

```tsx
function PageAmbientBackground({ background }: { background: PageBackgroundKey }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background" aria-hidden="true">
      <Image src={pageBackgroundImages[background]} alt="" fill priority unoptimized className="object-cover " sizes="100vw" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,color-mix(in_oklch,var(--accent),transparent_88%),transparent_32rem),linear-gradient(to_bottom,color-mix(in_oklch,var(--background),transparent_34%)_0%,color-mix(in_oklch,var(--background),transparent_48%)_48%,color-mix(in_oklch,var(--background),transparent_24%)_100%)]" />
      <div className="page-ambient-vignette absolute inset-0" />
    </div>
  );
}
```

With:

```tsx
function PageAmbientBackground({ background }: { background: PageBackgroundKey }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background" aria-hidden="true">
      <Image src={pageBackgroundImages[background]} alt="" fill priority unoptimized className="object-cover" sizes="100vw" />
      <div className={cn("absolute inset-0", pageBackgroundScrims[background])} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_52%,color-mix(in_oklch,var(--screen),transparent_22%)_100%)]" />
    </div>
  );
}
```

**Notes:**
- The second overlay is a vignette, not a decorative accent glow.
- It darkens edges and improves foreground focus.
- It does not add red/orange SaaS glow.
- `cn` is already imported in `ops-dashboard.tsx`; verify before editing. If not imported, import it from the existing utility path used in the file.

**Step 3: Remove `page-ambient-vignette` usage from `PageAmbientBackground`**

Confirm no JSX references remain:

```bash
rg "page-ambient-vignette" src/components/ops-dashboard.tsx
```

Expected: no matches in `ops-dashboard.tsx`.

**Step 4: Run checks**

```bash
npm run lint
npx tsc --noEmit
```

Expected: both pass, or only pre-existing unrelated failures appear.

**Step 5: Commit**

```bash
git add src/components/ops-dashboard.tsx
git commit -m "style: replace ambient glow with route scrims"
```

---

## Task 4: Remove Unused Ambient CSS

**Objective:** Delete the old CSS helper if it is no longer used after replacing `PageAmbientBackground`.

**Files:**
- Modify: `src/app/globals.css:169-173`

**Step 1: Verify usage**

Run:

```bash
rg "page-ambient-vignette" .
```

Expected: only `src/app/globals.css` remains.

**Step 2: Delete the class**

Remove:

```css
.page-ambient-vignette {
  background:
    radial-gradient(circle at 50% 12%, transparent 0, transparent 34rem, color-mix(in oklch, var(--background), transparent 22%) 78%),
    linear-gradient(to right, color-mix(in oklch, var(--background), transparent 18%), transparent 22%, transparent 78%, color-mix(in oklch, var(--background), transparent 18%));
}
```

**Step 3: Run checks**

```bash
npm run lint
npx tsc --noEmit
```

Expected: both pass, or only pre-existing unrelated failures appear.

**Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "style: remove unused ambient vignette helper"
```

---

## Task 5: Make Review Route Dark-Dominant Without Global Dark Mode

**Objective:** Let the post-incident review page match the dark evidence image while preserving a readable app shell.

**Files:**
- Modify: `src/components/ops-dashboard.tsx` around `OpsDashboardShell` and review panel sections
- Inspect before editing: `src/app/review/page.tsx`

**Step 1: Find shell root**

Locate this current shell root in `src/components/ops-dashboard.tsx`:

```tsx
<div className="relative isolate min-h-[100dvh] bg-background/78 text-foreground">
```

**Step 2: Make shell opacity route-aware**

If `OpsDashboardShell` already receives `background`, replace the class with:

```tsx
<div
  className={cn(
    "relative isolate min-h-[100dvh] text-foreground",
    background === "review" ? "bg-screen/72 text-screen-foreground" : "bg-background/82",
  )}
>
```

If this would cause too much text contrast churn across all child panels, do not apply `text-screen-foreground` globally. Use instead:

```tsx
<div
  className={cn(
    "relative isolate min-h-[100dvh] text-foreground",
    background === "review" ? "bg-screen/62" : "bg-background/82",
  )}
>
```

Prefer the second version if most panels stay light.

**Step 3: Keep header readable**

Keep this kind of header treatment for all routes:

```tsx
<header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
```

Do not make nav/header full black unless text contrast and active route states are audited.

**Step 4: Darken only evidence canvases**

For review-specific evidence frames/timeline panels, prefer:

```tsx
className="border-screen-border bg-screen text-screen-foreground"
```

Use light panels for search inputs, report controls, and long explanatory text unless the component is visually part of the evidence canvas.

**Step 5: Run checks**

```bash
npm run lint
npx tsc --noEmit
```

Expected: both pass, or only pre-existing unrelated failures appear.

**Step 6: Commit**

```bash
git add src/components/ops-dashboard.tsx src/app/review/page.tsx
git commit -m "style: make review route evidence-dominant"
```

---

## Task 6: Audit Background Image Visibility In Browser

**Objective:** Verify the generated background images are visible enough to matter, but not competing with dashboard panels.

**Files:**
- No intended file changes unless visual QA finds issues.

**Step 1: Start dev server**

```bash
npm run dev
```

Expected: Next.js dev server starts successfully.

**Step 2: Open routes**

Visit:

```text
http://localhost:3000/
http://localhost:3000/live
http://localhost:3000/review
```

If the dev server uses a different port, use that port.

**Step 3: Visual checks**

For `/`:
- Map/dispatch should stay legible.
- Background image should be visible in gutters only.
- It should not feel like a full dark command-center poster.

For `/live`:
- Bodycam/video panels should dominate.
- Background should feel dark-operational, not warm-gradient.
- Event and recommendation panels must remain readable.

For `/review`:
- `evidence-review-hero.png` should visibly read as a dark evidence contact sheet in page gutters.
- Foreground evidence frames should not disappear into the background.
- Search/report controls should remain readable.

**Step 4: Capture screenshots if possible**

Use browser screenshot tooling or Playwright if available. Save screenshots outside app source or in a temporary ignored location, for example:

```text
/tmp/1stsight-map.png
/tmp/1stsight-live.png
/tmp/1stsight-review.png
```

**Step 5: Adjust only if required**

If image is too hidden:
- reduce scrim opacity by increasing `transparent_` percentage by 6-10 points

If image competes with controls:
- increase scrim strength by reducing `transparent_` percentage by 6-10 points
- keep panels more opaque before darkening the entire page

**Step 6: Run final checks**

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Expected: all pass.

**Step 7: Commit visual adjustments**

```bash
git add src/app/globals.css src/components/ops-dashboard.tsx DESIGN.md
git commit -m "style: tune operational background readability"
```

Skip this commit if Task 6 made no changes.

---

## Files Likely To Change

- `DESIGN.md`
- `src/app/globals.css`
- `src/components/ops-dashboard.tsx`
- Possibly `src/app/review/page.tsx` if review-specific page-level treatment is outside `OpsDashboardShell`

---

## Tests / Validation

Run after implementation:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Manual browser validation:

```text
/       map/dispatch remains readable and not future-knowledge/cinematic
/live   dark operational mood supports video and event monitoring
/review evidence-review image is visible, dark, and not fighting foreground evidence panels
```

Source-text validation:

```bash
rg "radial-gradient\(circle_at_18%|page-ambient-vignette|warm paper substrate|Full-page dark mode" DESIGN.md src/components/ops-dashboard.tsx src/app/globals.css
```

Expected:
- no `radial-gradient(circle_at_18%` match
- no `page-ambient-vignette` match unless intentionally kept
- no stale `warm paper substrate` phrase
- `Full-page dark mode` may remain only as a ban, not as implementation guidance

---

## Risks / Tradeoffs / Open Questions

- Darkening `/review` too much can make search/report controls feel inconsistent. Keep those controls light unless they sit inside the evidence canvas.
- Removing the decorative gradient may make the AI image feel too literal or contrasty. The route scrim and vignette should handle this without reintroducing accent glow.
- Projector demos often crush dark detail. During browser QA, test at normal laptop brightness and at reduced brightness. If the review route loses detail, lighten foreground panels before lightening the whole background.
- The current UI components include some rounded shadcn defaults (`rounded-lg`, pill badges). This plan does not address those broader design-system mismatches; keep scope to background/theming.
- Reports should remain light/printable. Do not apply the review dark treatment to PDF output or report preview content unless explicitly requested.

---

## Final Position

Remove the ambient/radial gradient from the page background. Keep functional scrims. Use the AI images as visible operational textures. Make review/live darker where evidence and video live, but keep the global shell ash/light enough for dense C&C readability.
