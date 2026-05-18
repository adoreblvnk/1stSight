# Implementation

## Stack Lock

This skill assumes this stack:

* Next.js App Router
* Tailwind CSS v4
* shadcn/ui v4
* Motion 12 via `motion/react`
* CodeMirror 6
* IBM Plex Sans + IBM Plex Mono

Do not generalize the stack in this skill unless the user explicitly asks.

## Tailwind CSS v4

Use CSS-first tokens in `app/globals.css`.

Start from `assets/globals.css`.

Rules:

* use semantic tokens, not raw palette drift
* override radii so structure stays `0px` and interactives stay `2px`
* remove shadows globally from the design system layer
* keep blueprint and signal keyframes in the global CSS token file

## shadcn/ui

Rules:

* compose primitives before custom markup
* use `cn()` for conditional classes
* keep forms on `FieldGroup` / `Field`
* use semantic tokens instead of ad hoc colors
* do not introduce a separate dark theme via `dark:` variants

## Next.js

Rules:

* keep motion in client components only
* keep static layout structure in server components where possible
* use App Router conventions
* preserve the product shell and route hierarchy

## Motion

Read `references/motion-and-screen.md` before writing motion code.

## Code Snippet Policy

When implementing code from this skill:

* prefer the exact templates in `assets/`
* adapt only the content, not the visual system
* keep code snippets copy-paste safe for TypeScript / TSX
