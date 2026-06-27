# Design

## Theme

1stSight uses a flat graphite command-console system adapted for `impeccable`: charcoal app shell, graphite command panels, deep black evidence and video canvases, light paper insets for forms and AAR briefing slides, terse labels, grid-line structure, restrained emergency red, and sparse signal-like motion.

The product is a dashboard and review tool, so design serves the task. Use familiar product UI patterns, preserve C&C officer trust, and avoid ornamental strangeness. The physical scene is an Ops Centre officer monitoring a live residential fire under time pressure, then reviewing responder-safety evidence from a separate medical assistance incident; the interface should be legible, calm, and evidence-dense rather than cinematic, decorative, or wallpaper-driven.

## Color

Use OKLCH tokens and semantic roles. Graphite is the app-shell default. Command panels use graphite; evidence/video canvases use deeper near-black; paper appears only as an inset material for forms, slide/PDF areas, text-heavy document controls, and map callouts where readability needs a light surface. Do not return to pale admin cards pasted over dark imagery.

```css
/* Tailwind CSS theme variables: https://tailwindcss.com/docs/theme */
@theme {
  --font-sans: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, monospace;

  --color-background: oklch(19% 0.004 260);
  --color-surface: oklch(24% 0.004 260);
  --color-foreground: oklch(93% 0.002 260);
  --color-muted-foreground: oklch(73% 0.006 260);
  --color-border: oklch(34% 0.006 260);

  --color-accent: oklch(67% 0.12 67);
  --color-accent-foreground: oklch(15% 0.004 260);

  --color-success: oklch(52% 0.18 145);
  --color-destructive: oklch(55% 0.22 25);
  --color-destructive-foreground: oklch(98% 0.002 260);
  --color-warning: oklch(60% 0.18 55);
  --color-info: oklch(55% 0.15 240);

  --color-screen: oklch(10% 0.002 260);
  --color-screen-foreground: oklch(95% 0.002 260);
  --color-screen-border: oklch(25% 0.004 260);

  --color-command: oklch(22% 0.005 260);
  --color-command-foreground: oklch(93% 0.002 260);
  --color-command-muted-foreground: oklch(73% 0.006 260);
  --color-command-border: oklch(34% 0.006 260);
  --color-paper: oklch(96.5% 0.002 260);
  --color-paper-foreground: oklch(18% 0.004 260);
  --color-disabled: oklch(30% 0.004 260);
  --color-disabled-foreground: oklch(66% 0.006 260);
  --color-disabled-border: oklch(42% 0.006 260);

  --radius-none: 0px;
  --radius-sm: 2px;
  --radius-md: 2px;
  --radius-lg: 2px;
  --radius-xl: 2px;
  --radius-shell: 10px;
}
```

Use `--color-accent` for restrained amber/oxide focus, selection, ordinary active states, and rare editorial emphasis. Active route tabs use graphite/black neutral treatment, not red. Reserve red for destructive, high-impact, escalation, rejected, and error states. Use semantic status tokens only for their operational meanings.

Full-page backgrounds use a flat graphite texture, not AI hero imagery. Use low-contrast grid/noise texture only as operational material behind the app shell. Route hero strips may use AI-generated background images for map, live, and review context, but those images must stay clipped to the local hero/header container and never become page-wide wallpaper. Do not use decorative gradients, radial washes, vignettes, glowing backdrops, gradient text, or image treatments that make the product read like a generic AI/SaaS dashboard. Route-specific texture tone may subtly shift for map, live, and review contexts, but foreground panels must stay readable and mostly opaque.

## Typography

IBM Plex is the only type system.

- Use IBM Plex Sans for page titles, headings, body copy, button labels, and descriptive text.
- Use IBM Plex Mono for timestamps, responder IDs, event IDs, table headers, evidence metadata, status labels, numeric values, code, logs, and model traces.
- Keep product headings on a fixed rem scale rather than fluid marketing clamps.
- Use `font-weight` `400`, `500`, and `600`; avoid `700` as the default contrast step.
- Keep body copy around `text-sm leading-relaxed`; use mono micro-labels sparingly with `text-xs uppercase tracking-widest`.
- Numbers are mono; prose is sans.

## Layout

The interface is structured by borders, dividers, and ownership of panels, not floating cards or soft depth.

- Page substrate: graphite `background`.
- Outer section shell: graphite `command`, `border`, `overflow-hidden`, and `--radius-shell` only where the major shell needs a contained edge.
- Inner panels: step to `screen`, `paper`, or a semantic treatment instead of stacking pale cards on command panels.
- Use `border`, `divide-x`, and `divide-y` to create a shared blueprint grid.
- Avoid double borders.
- Do not use soft shadows as hierarchy.

Desktop app shell:

- Top nav: `h-14`, sticky, graphite background, `border-b`, and high enough z-index for app navigation.
- Sidebar: `lg:w-60`, graphite command background, `border-r`, scrollable when needed.
- Main content: `min-w-0 flex-1 overflow-auto bg-background`.

Responsive behavior:

- Build mobile-first, one column by default, expanding dense dashboard regions at `lg:`.
- Convert the sidebar to a `Sheet` on mobile; do not keep a collapsed desktop icon rail.
- Use `min-h-[100dvh]`, not `h-screen`, when viewport height matters.
- The page must never scroll horizontally; contain overflow inside the exact table, trace, video, or log surface that needs it.
- Keep controls at least `h-9`.

## Components

Use shadcn/ui primitives first and wrap locally only when a repeated pattern has no primitive.

- Use `Button`, `AlertDialog`, `Dialog`, `Sheet`, `Badge`, `Empty`, `Skeleton`, `Table`, `Sidebar`, `Breadcrumb`, `Tabs`, `Pagination`, `Separator`, `FieldGroup`, `Field`, `FieldLabel`, `FieldDescription`, and `FieldError` before bespoke markup.
- Buttons are compact machined controls: `rounded-sm`, clear focus, rigid tap feedback, no glow, no broad shadow.
- Badges are rectangular mono labels, not pills.
- Tables use bordered containers, mono headers, sans body cells, mono numeric/timestamp cells, and contained horizontal scroll only when required.
- Forms use `FieldGroup` and `Field`; helper text appears only for non-obvious constraints, risk, format, or security facts.
- Loading uses skeletons, progress lines, cursor marks, or screen-local acquisition effects; no centered circular spinners.
- Empty states are left-aligned inside their content column and should teach the next action without filler copy.

Post-incident evidence cards may show bounding boxes and one-phrase labels. Live bodycam cards use feed identity and event references.

## Motion

Motion confirms signal and state change. It should feel mechanically precise, brief, sparse, and serious.

```tsx
// Motion React: https://motion.dev/docs/react
import { motion, AnimatePresence, MotionConfig } from "motion/react"
```

Use `MotionConfig reducedMotion="user"` at the highest intentional motion boundary.

- Default transition: `{ duration: 0.12, ease: "circOut" }`.
- Fast transition: `{ duration: 0.08, ease: "linear" }`.
- Do not use springs, bounce, rubber-band motion, decorative hero choreography, generic card hover scaling, or continuous ambient dashboard animation.
- Use Motion for tap feedback, dialogs, sheets, active nav indicators, tab indicators, inspector panels, and stateful panel reflow.
- Use CSS keyframes for small flicker, scanline, cursor, and signal effects.
- Limit flicker to live indicators, loading cursors, screen insets, and rare machine-state emphasis.
- Limit scanline motion to dark screen surfaces that are booting, connecting, or acquiring signal.

## Screen Surfaces

Use deep black inset treatment for video frames, evidence canvases, logs, AI traces, terminal output, generated code, and code-editor surfaces. Graphite is the shell and command material; near-black is the evidence/video material; paper is an inset material only.

- Prefer CodeMirror 6 for editor-like code surfaces.
- Keep gutters darker than the editor body.
- Use line wrapping when content is for review rather than raw editing.
- Syntax highlighting stays restrained: strings, keywords, variables, and comments only.

## Data And Evidence

- Every recommendation should include reason and evidence fields instead of confidence theater.
- Every incident event should carry timestamp, source feed, review state, and linked evidence reference.
- Review-only annotations include bounding boxes and short labels; live monitoring uses alerts and linked references instead.
- Use `abuse`, `fire escalation`, `blocked access`, `unsafe entry`, and similar tags as operational filters, not decorative chips.
- AAR briefing PDFs should look like concise presentation slides, not dense long-form documents or official SCDF forms.

## Bans

- Generic SaaS glow, gradient text, decorative gradients, vignettes, soft card stacks, glassmorphism, and decorative shadows.
- Pale admin cards as default live/review panel material.
- Extra font families.
- Oversized card radii; use square structure and `rounded-sm` controls.
- Pill badges for operational statuses.
- Repeating stripe backgrounds as decoration; preserve factory character through borders, grid structure, labels, and state motion instead.
- Decorative page-load animations.
- Centered mobile hero layouts for public-facing pages.
- Duplicate status, helper text, or primary actions across adjacent surfaces.

## Implementation Notes

When the Next.js app is scaffolded, put CSS-first Tailwind tokens in `app/globals.css`, use App Router conventions, keep Motion in client components only, and keep static layout structure in server components where possible.

Use `@vis.gl/react-google-maps` for the deployment map, `@react-pdf/renderer` for slide-style AAR briefing PDFs, and keep model calls behind backend/API boundaries. Do not expose `OPENAI_API_KEY`, `GB10_OPENAI_BASE_URL`, or `GB10_OPENAI_API_KEY` through `NEXT_PUBLIC_*`; only `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is browser-exposed.
