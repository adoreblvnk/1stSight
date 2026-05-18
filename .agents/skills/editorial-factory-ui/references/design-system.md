# Design System

## Editorial Factory

Editorial Factory is a UI language for operational products. The interface should feel like a physical production substrate: editorial, dense, controlled, and tool-first.

The factory inspiration comes from segmented operational surfaces, terse labeling, infrastructural UI density, and clarity under pressure. Do not copy another product palette, soft gradients, or generic startup polish. Translate the operational feel into a warm-paper system.

## Core Philosophy

* **The Medium:** Overwhelmingly light mode. Use a warm paper background. Never default to pure white `#FFFFFF` on primary surfaces.
* **The Bimodal Inversion:** Code editors, logs, traces, and terminal-like surfaces are deep dark insets. Dark is always inset, never the whole page.
* **Utilitarian Density:** Reject empty minimalism. Show operational detail, but organize it through grid lines and spacing discipline.
* **Physicality:** Borders over shadows. No soft drop shadows. No oversized radii. No bouncy motion.

## Color Architecture

All colors are token-driven.

### Substrate And Ink

* `--color-background: oklch(96.5% 0.01 85)`
* `--color-surface: oklch(98.5% 0 0)`
* `--color-foreground: oklch(20% 0 0)`
* `--color-muted-foreground: oklch(55% 0 0)`
* `--color-border: oklch(90% 0.01 85)`

### Accent

For 1stSight, the Editorial Factory accent is a restrained emergency red.

* `--color-accent: oklch(48% 0.18 29)`
* `--color-accent-foreground: oklch(98% 0 0)`

Use the accent for:

* primary CTAs
* focus treatment
* active nav indicators
* editorial emphasis

Never use the accent as a large background wash.

Do not use the accent token as a substitute for destructive/error semantics. Brand emphasis uses `--color-accent`; failed or unsafe states use `--color-destructive`.

### Semantic Status Tokens

Use exactly one semantic token per operational state.

* PASSED / SUCCESS: `--color-success: oklch(52% 0.18 145)`
* FAILED / ERROR: `--color-destructive: oklch(55% 0.22 25)`
* TIMEOUT / WARNING: `--color-warning: oklch(60% 0.18 55)`
* RUNNING / INFO: `--color-info: oklch(55% 0.15 240)`
* PENDING: muted foreground + border treatment

Never reuse semantic status colors for unrelated feature emphasis.

### Screen Tokens

* `--color-screen: oklch(15% 0 0)`
* `--color-screen-foreground: oklch(95% 0 0)`
* `--color-screen-border: oklch(25% 0 0)`

## Typography

The IBM Plex family is the only type system.

### IBM Plex Sans

Use for:

* page titles
* headlines
* body copy
* button labels
* descriptive text

Canonical scales:

* preferred weight ladder: `400 / 500 / 600`
* marketing headline: `text-4xl sm:text-5xl lg:text-[7rem] font-medium tracking-tighter leading-[0.9]`
* page title: `text-2xl font-semibold tracking-tight`
* body: `text-sm leading-relaxed`

Supporting marketing copy can stay at `400` when the page needs a lighter editorial voice.

When editorial headlines get very large, prefer `500` over `600` so the page keeps its thinner factory voice.

Avoid `700` as the default contrast step for marketing surfaces. Use `600` for smaller emphasis tiers and reserve `700` for rare cases where the interface truly needs a heavier title tier.

### IBM Plex Mono

Use for:

* numbers
* timestamps
* table headers
* nav labels
* badges
* status labels
* helper text
* errors
* code and logs

Canonical scales:

* micro-label: `text-xs uppercase tracking-widest`
* code/logs: `text-sm leading-tight`

Rule: numbers are monospace, words are sans.

## Radius And Depth

* macro structure: `rounded-none` by default
* sanctioned outer section shell: `border + overflow-hidden + var(--radius-shell)`
* interactive elements: `rounded-sm`
* no `rounded-xl`
* no soft shadows

Use the larger shell radius in one consistent place only: the first outer layer of a major page section or hero shell. Inner cards, tables, forms, and control surfaces should stay square unless they are standard interactive elements.

## Shell Layering

Use shell contrast to separate page structure before adding more borders or decoration.

* page substrate: `background`
* outer section shell, layer 1: `surface`
* direct children inside the shell, layer 2: should not reuse `surface` by default
* layer 2 should step to `background`, `screen`, or a restrained semantic treatment depending on role
* layer 3 and deeper may use any appropriate semantic surface if contrast and hierarchy stay clear

Avoid `surface` sitting directly on `surface` for the first two layers. If the page background is warm paper and the shell also uses warm paper, the shell boundary becomes too weak.

## Banned Drift

* generic SaaS glow
* purple gradient startup palette
* extra font families
* pill badges
* floating card stacks with heavy elevation
* bounce, spring, rubber-band motion
