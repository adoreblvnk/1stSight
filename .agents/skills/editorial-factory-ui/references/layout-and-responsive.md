# Layout And Responsive

## Blueprint Grid

Elements do not float. They sit on a shared 1px grid.

Use:

* `border-b`, `border-r`, `border-t`, `border-l`
* `divide-x`, `divide-y`

Avoid double borders.

Blueprint background:

```tsx
// editorial-factory-ui pattern: blueprint paper grid
bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:2rem_2rem]
```

## App Shell

### Desktop

The shell has three zones:

1. TopNav: `h-14 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50`
2. Sidebar: `hidden lg:flex lg:w-60 border-r border-border bg-background flex-col shrink-0`
3. Main content: `min-w-0 flex-1 overflow-auto bg-background`

### Mobile And Tablet

* TopNav remains sticky with `px-4 sm:px-6`
* Sidebar becomes a `Sheet`
* Main content must be `min-w-0 overflow-x-hidden`
* if a secondary panel cannot fit beside the main content, stack it below

Never keep a collapsed desktop icon rail on mobile.

## Content Spacing

* page padding: `px-4 py-6 sm:px-6 sm:py-8 lg:p-8`
* major section spacing: `mb-8`
* form field spacing: `gap-6`
* field group spacing: `gap-4`

## Responsive Collapse Rules

* start mobile-first
* render dashboard regions as one column by default
* expand at `lg:`
* never allow horizontal page scroll
* contain overflow within the specific surface that needs it
* do not reduce interactive rows or buttons below `h-9`
* when viewport height matters, use `min-h-[100dvh]`, never `h-screen`

Recommended dashboard split:

```tsx
// editorial-factory-ui pattern: dense dashboard split
grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]
```

Recommended summary grid:

```tsx
// editorial-factory-ui pattern: responsive summary grid
grid-cols-1 sm:grid-cols-2 xl:grid-cols-3
```

## Tables

* wrap tables in `overflow-x-auto`
* let the table use `min-w-[720px]` or larger if needed
* the page itself must not scroll horizontally
* for more than four meaningful columns, use a stacked mobile row layout below `md:`
* exception: trace events, diff hunks, and raw logs may stay horizontally scrollable inside their own container

## Dialogs And Drawers

Dialog panel:

```tsx
// editorial-factory-ui pattern: bounded mobile dialog
w-full max-w-md max-w-[calc(100vw-2rem)]
```

Drawer / Sheet:

```tsx
// editorial-factory-ui pattern: full mobile, fixed desktop sheet
w-full sm:w-[480px]
```

On small screens, the sheet should consume the full width.

## Public And Marketing Layouts

Public pages should feel like printed posters, not generic landing pages.

Use:

* container: `max-w-6xl mx-auto px-4 sm:px-6 lg:px-8`
* left-aligned mobile copy
* vertical CTA stacking on small screens: `flex flex-col sm:flex-row gap-3`
* editorial left-border for subheadline blocks

Never center the mobile hero stack.
