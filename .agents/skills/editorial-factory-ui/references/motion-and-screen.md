# Motion And Screen

## Motion Philosophy

Motion confirms signal and state change. It must never feel playful.

The target feel is:

* electrically unstable
* mechanically precise
* brief
* sparse

Not:

* springy
* bouncy
* soft
* decorative hero choreography

## Motion 12 Rules

Import from Motion 12 like this:

```tsx
// Motion React: https://motion.dev/docs/react
import { motion, AnimatePresence, MotionConfig } from "motion/react"
```

For files using motion in Next.js App Router:

```tsx
"use client"
```

Set reduced motion at the highest intentional motion boundary:

```tsx
// MotionConfig reducedMotion: https://motion.dev/docs/react-motion-config
<MotionConfig reducedMotion="user">...</MotionConfig>
```

Never use Tailwind `transition-*` classes on `motion` elements.

### Default Transitions

* default: `{ duration: 0.12, ease: "circOut" }`
* fast: `{ duration: 0.08, ease: "linear" }`

Do not use springs.

## Division Of Labor

Use Motion for:

* mount / unmount
* layout changes
* tap feedback
* dialog and sheet transitions
* active nav indicator movement

Use CSS keyframes for:

* glitch
* flicker
* signal jitter
* scanline effects
* blinking cursors

## Where Motion Is Allowed

### Preferred Motion Zones

These are the strongest default places to use Motion in Editorial Factory UI.

* button tap feedback
* dialog open / close
* sheet open / close, including the mobile sidebar
* accordion, drawer, and inspector panel expand / collapse
* active nav indicator movement
* tab underline or active section indicator movement
* selected file, run, or record indicator movement in explorers
* diff panel open / close
* side-by-side to stacked panel reflow when layout changes
* command bar or prompt composer expansion
* toast and inline notice entry / exit
* one-shot empty-state reveal
* dark inset editor, log, or terminal surface reveal when it communicates boot or focus acquisition

### Good Conditional Motion Zones

Use Motion here only when the interaction benefits from explicit state confirmation.

* status transitions such as `PENDING -> RUNNING -> PASSED` or `FAILED`
* breadcrumb or header state swaps when route context changes
* filter trays or advanced controls appearing and disappearing
* settings sections expanding during credential or environment editing
* split-pane reconfiguration when focus mode changes
* progress line state changes during bootstrap, run, or repair flows

### CSS-Only Motion Zones

These should stay on CSS keyframes or static styling, not Motion.

* button hover line treatment
* `RUNNING` status flicker on the live indicator only
* loading cursor blink
* scanline sweeps on dark screen boot or live-acquisition surfaces only
* subtle text jitter on one active log or terminal line at a time
* terminal noise

### Forbidden Motion Zones

Do not use Motion for these patterns.

* decorative hero choreography
* generic card hover scaling or floating
* springy or rubber-band interactions
* continuous ambient dashboard motion
* whole-page shimmer or persistent atmospheric movement
* table rows constantly animating on load for decoration alone
* marketing motion that exists only to feel impressive rather than operational

## Glitch Doctrine

Flicker is intentional but sparse.

Apply it to:

* status indicators
* loading cursors
* terminal or code insets
* rare emphasis moments tied to machine state

For `RUNNING`, prefer flicker on a small dot or cursor-sized marker rather than the entire badge body.

## Scanline Doctrine

Scanline motion is for dark screen surfaces that are booting, connecting, or actively acquiring signal.

Apply it to:

* terminal or log panes during active runs
* dark code or trace insets during boot or restore
* transient loading states inside screen surfaces

Do not run scanlines across paper surfaces, cards, tables, or the whole page.

## Jitter Doctrine

Jitter is a narrow accent, not a general text style.

Apply it to:

* one active command line
* one live telemetry line
* one unstable trace line

Do not jitter multiple lines in the same panel, and do not jitter standard interface copy.

Do not make entire pages shimmer continuously.

## Page Load Rule

No decorative hero entrance animation.

Allowed one-shot reveals:

* dark screen inset mounting
* dialog and sheet appearance
* loading-state transitions
* system-boot or signal-acquisition moments

## CodeMirror And Screen Surfaces

Use the dark screen treatment for:

* code editors
* terminal output
* log panes
* generated code or trace text

Rules:

* prefer CodeMirror 6 for code-editor surfaces rather than plain `pre` blocks when the surface is meant to read like an editor
* `@codemirror/lang-javascript` for JS, TS, TSX
* enable line wrapping when the surface is for review, inspection, or comparison rather than raw editing
* gutter is darker than the main editor body
* lines are 1-indexed
* read document content via `view.state.doc.toString()`
* syntax theme stays restrained: strings, keywords, variables, comments only
