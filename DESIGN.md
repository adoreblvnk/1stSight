# Design

## Theme

1stSight uses an operational Editorial Factory visual system adapted for `impeccable`: warm paper substrate, dark inset screen surfaces, terse labels, grid-line structure, restrained emergency red, and sparse signal-like motion.

The product is a dashboard and review tool, so design serves the task. Use familiar product UI patterns, preserve C&C officer trust, and avoid ornamental strangeness. The physical scene is an Ops Centre officer monitoring a live warehouse incident under time pressure, then reviewing evidence after the incident; the interface should be legible, calm, and evidence-dense rather than cinematic.

## Color

Use OKLCH tokens and semantic roles. Light mode is the default; dark appears only as inset surfaces for video, logs, terminal-like output, or AI trace review.

```css
/* Tailwind CSS theme variables: https://tailwindcss.com/docs/theme */
@theme {
  --font-sans: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, monospace;

  --color-background: oklch(96.5% 0.01 85);
  --color-surface: oklch(98.5% 0 0);
  --color-foreground: oklch(20% 0 0);
  --color-muted-foreground: oklch(55% 0 0);
  --color-border: oklch(90% 0.01 85);

  --color-accent: oklch(48% 0.18 29);
  --color-accent-foreground: oklch(98% 0 0);

  --color-success: oklch(52% 0.18 145);
  --color-destructive: oklch(55% 0.22 25);
  --color-warning: oklch(60% 0.18 55);
  --color-info: oklch(55% 0.15 240);

  --color-screen: oklch(15% 0 0);
  --color-screen-foreground: oklch(95% 0 0);
  --color-screen-border: oklch(25% 0 0);

  --radius-none: 0px;
  --radius-sm: 2px;
  --radius-md: 2px;
  --radius-lg: 2px;
  --radius-xl: 2px;
  --radius-shell: 10px;
}
```

Use `--color-accent` for primary actions, active navigation indicators, focus treatment, and rare editorial emphasis. Do not use red as a large background wash, generic decoration, or replacement for destructive/error semantics. Use semantic status tokens only for their operational meanings.

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

- Page substrate: `background`.
- Outer section shell: `surface`, `border`, `overflow-hidden`, and `--radius-shell` only where the major shell needs a contained edge.
- Inner panels: step to `background`, `screen`, or a semantic treatment instead of stacking `surface` on `surface`.
- Use `border`, `divide-x`, and `divide-y` to create a shared blueprint grid.
- Avoid double borders.
- Do not use soft shadows as hierarchy.

Desktop app shell:

- Top nav: `h-14`, sticky, `border-b`, translucent paper background, and high enough z-index for app navigation.
- Sidebar: `lg:w-60`, `border-r`, paper background, scrollable when needed.
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

Post-incident evidence cards may show bounding boxes and one-phrase labels. Live bodycam feed cards must not draw bounding boxes over the feed.

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

Use dark inset treatment for video frames, logs, AI traces, terminal output, generated code, and code-editor surfaces. Dark is an inset material, never the whole app shell.

- Prefer CodeMirror 6 for editor-like code surfaces.
- Keep gutters darker than the editor body.
- Use line wrapping when content is for review rather than raw editing.
- Syntax highlighting stays restrained: strings, keywords, variables, and comments only.

## Data And Evidence

- Every recommendation should include reason and evidence fields instead of confidence theater.
- Every incident event should carry timestamp, source feed, review state, and linked evidence reference.
- Review-only annotations include bounding boxes and short labels; live monitoring uses alerts and linked references instead.
- Use `abuse`, `fire escalation`, `blocked access`, `unsafe entry`, and similar tags as operational filters, not decorative chips.
- Reports should look like structured observation reports, not official SCDF forms unless explicitly approved.

## Bans

- Generic SaaS glow, gradient text, soft card stacks, glassmorphism, and decorative shadows.
- Full-page dark mode for the C&C dashboard.
- Extra font families.
- Oversized card radii; use square structure and `rounded-sm` controls.
- Pill badges for operational statuses.
- Repeating stripe backgrounds as decoration; preserve factory character through borders, grid structure, labels, and state motion instead.
- Decorative page-load animations.
- Centered mobile hero layouts for public/demo pages.
- Duplicate status, helper text, or primary actions across adjacent surfaces.

## Implementation Notes

When the Next.js app is scaffolded, put CSS-first Tailwind tokens in `app/globals.css`, use App Router conventions, keep Motion in client components only, and keep static layout structure in server components where possible.

Use `@vis.gl/react-google-maps` for the deployment map, `@react-pdf/renderer` for structured observation reports, and keep model calls behind backend/API boundaries. Do not expose `OPENAI_API_KEY`, `GB10_OPENAI_BASE_URL`, `GB10_MODEL_ID`, or `GB10_OPENAI_API_KEY` through `NEXT_PUBLIC_*`; only `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is browser-exposed.
