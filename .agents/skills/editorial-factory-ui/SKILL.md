---
name: editorial-factory-ui
description: "Use this skill when designing, implementing, or reviewing 1stSight Editorial Factory UI: warm-paper app shells, dark inset code/log surfaces, IBM Plex typography, grid-line hierarchy, restrained red accents, signal-like motion, and operational interface density across Next.js, Tailwind CSS, shadcn/ui, Motion, and CodeMirror."
compatibility: "Designed for Next.js App Router, Tailwind CSS v4, shadcn/ui v4, Motion 12, CodeMirror 6, IBM Plex Sans, and IBM Plex Mono."
metadata:
  design-system: editorial-factory
---

# Editorial Factory UI

Use this skill for 1stSight product UI work that should follow the Editorial Factory design system. This is a house-style enforcement skill, not a general design inspiration file. Follow the system exactly and do not improvise alternate visual languages.

## Core Rule

The interface must read as **Editorial Factory**:

* warm paper substrate for the app shell
* dark inset screens for code, logs, and terminal-like surfaces
* IBM Plex Sans for prose and interface language
* IBM Plex Mono for numbers, labels, code, and operational metadata
* borders and grid lines over shadows
* restrained red accent
* glitch / flicker / signal motion, not soft or playful motion

## Workflow

1. Confirm the task is UI work that should use the Editorial Factory visual language.
2. Read `references/design-system.md` first.
3. Read only the reference files needed for the task.
4. Reuse the templates in `assets/` instead of inventing structure from scratch.
5. Before finalizing, validate the result against the checklist in `references/review-checklist.md`.

## Load The Right Reference

Read `references/design-system.md` for:

* design philosophy
* color architecture
* typography
* status semantics
* non-negotiable visual rules

Read `references/layout-and-responsive.md` for:

* app shell structure
* mobile collapse behavior
* dashboard and marketing layout rules
* table and drawer responsiveness

Read `references/components.md` for:

* canonical component selection
* button, table, badge, form, nav, dialog, drawer, empty, and loading patterns
* rules that prevent bespoke one-off markup

Read `references/motion-and-screen.md` for:

* Motion 12 usage
* glitch / flicker doctrine
* reduced-motion requirements
* CodeMirror and dark-screen behavior

Read `references/implementation.md` for:

* Tailwind CSS v4 token setup
* Next.js and shadcn constraints
* exact integration rules for Motion and CodeMirror

Read `references/review-checklist.md` when reviewing or before final output.

## Templates

Use `assets/globals.css` for the canonical global token and keyframe template.

Use `assets/factory-button.tsx` for the canonical button treatment.

Use `assets/empty-state.tsx` for the canonical empty-state pattern.

## Non-Negotiables

* Do not switch the product to generic SaaS styling.
* Do not introduce new fonts.
* Do not use shadows as hierarchy.
* Do not use springs, bounce, or decorative hero animation.
* Do not center mobile marketing layouts.
* Do not invent alternate component structures when a canonical one exists.
* Do not add redundant helper text, duplicate status surfaces, or multiple actions for the same destination.
* Do not let the page itself scroll horizontally.

## Default Output Behavior

When implementing UI:

* compose shadcn primitives first
* use semantic Tailwind tokens and local wrappers
* keep motion sparse and signal-like
* preserve the warm-paper / dark-inset identity
* keep operational density intentional: every repeated fact, helper line, status, or action must have a distinct job
* collapse decisively on mobile rather than shrinking dense desktop layouts

When reviewing UI:

* treat brand drift, responsive breakage, motion drift, and component inconsistency as defects
