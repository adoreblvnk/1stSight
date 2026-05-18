# Components

## Canonical Component Selection

Do not invent component structure when a canonical primitive already exists.

Use:

* `Button` for primary and navigation actions
* `AlertDialog` for destructive confirmation
* `Dialog` for editorial modal workflows
* `Sheet` for side panels and mobile navigation
* `Badge` for statuses and chips
* `Empty` for empty states
* `Skeleton` for loading placeholders
* `Table` for data grids
* `Sidebar`, `Breadcrumb`, `Tabs`, `Pagination` for navigation structure
* `Separator` for dividers
* `FieldGroup` + `Field` + `FieldLabel` + `FieldDescription` + `FieldError` for forms

If a pattern is reused and no primitive exists, create one reusable local wrapper. Do not duplicate bespoke markup across pages.

## Buttons

Buttons should feel like machined factory switches.

Variants:

* primary
* secondary
* destructive
* ghost

Use the template in `assets/factory-button.tsx`.

Rules:

* keep `rounded-sm`
* use the internal diagonal-line hover treatment
* tactile tap state is allowed, but it must be rigid and fast
* icons inside buttons use `data-icon`

## Compact Control Hovers

The factory diagonal-line hover treatment may extend beyond buttons, but only on compact, button-like control triggers.

Allowed default cases:

* `TabsTrigger` when the tabs behave like a mode switch or operational section selector
* `SelectTrigger` on the closed trigger surface only

Rules:

* keep the treatment low-contrast and hover-only or focus-visible-only
* preserve active-state clarity first; the stripe is secondary to the selected indicator
* do not carry the stripe treatment into select popup items or menu rows
* do not spread the treatment across structural containers just because they are interactive

## Data Tables

Table treatment:

* container: `w-full border border-border rounded-none`
* `thead`: `border-b border-border bg-surface`
* `th`: `px-4 py-2 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground`
* `td`: `px-4 py-3 text-sm font-sans text-foreground`
* numeric/timestamp cells: monospace
* row hover: `hover:bg-surface`
* active row: `bg-accent/5 border-l-2 border-l-accent`

Do not use percentage widths for columns. Use fixed or minimum widths.

## Badges And Status Indicators

Badges are strict rectangles, never pills.

Structure:

```tsx
// editorial-factory-ui pattern: rectangular mono status badge
inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-mono text-xs border
```

RUNNING may use a flicker or pulse dot, but keep it subtle.

Never use emoji dots.

## Forms

Every form uses the `FieldGroup` + `Field` pattern.

Rules:

* no raw `div` + `grid gap-*` form layout
* inputs and textareas use `rounded-sm border-border bg-surface`
* focus uses accent ring and border
* secrets may use `font-mono tracking-widest`
* invalid state uses `data-invalid` on `Field` and `aria-invalid` on the control
* do not add `FieldDescription` by default
* use `FieldDescription` only for non-obvious constraints, dangerous consequences, required formats, security facts users need before acting, or distinctions the label/placeholder cannot express
* never use helper text to restate the label, placeholder, current value, button action, or adjacent section copy
* if a fact applies to the whole form, put it once in section copy instead of repeating it under every field
* keep one owner for each state and action: no readonly summary beside editable fields unless the summary adds scanning value, and no duplicate primary action for the same destination

## Navigation

TopNav:

* `h-14 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50 flex items-center px-4 sm:px-6 gap-4 sm:gap-6`
* collapse secondary actions behind a `Sheet` trigger or overflow menu below `lg:`

Sidebar:

* `w-60 border-r border-border bg-background flex flex-col h-full overflow-y-auto`
* active item uses accent wash and a motion indicator bar
* mobile sheet should preserve the exact same item order and structure as desktop

## Code And Logs

Read `references/motion-and-screen.md` before implementing code surfaces.

## Empty States

Always use `Empty`.

Rules:

* left-align empty states inside their content column
* use `[ ]` or `00` style mono anchors for the icon treatment
* use the template in `assets/empty-state.tsx`

## Loading States

Use `Skeleton` and paper-scan treatments.

Rules:

* no circular spinners
* use a mono cursor `█` or a dot sequence when needed
* page-level loading may use a 1px accent progress line above the TopNav
