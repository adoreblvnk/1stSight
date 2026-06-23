# Map Marker Location Icons Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Replace the current square map glyph treatment with location-pin style markers while keeping fire stations, incidents, firetrucks, and ambulances visually distinct.

**Architecture:** Keep the existing fire station data and dispatch movement logic. Only change the marker presentation layer in `src/components/ops-dashboard.tsx`, using custom AdvancedMarker children shaped like operational map pins instead of square badges. Preserve the fallback map list, but make its marker glyphs match the new pin vocabulary.

**Tech Stack:** Next.js App Router, React, TypeScript, `@vis.gl/react-google-maps`, Tailwind CSS utility classes, existing design tokens.

---

## Recommendation

Yes — we should use marker-location style pins rather than plain squares for the Google Map view.

Reasoning:
- The current square `FS/FI/MI/FT/AM` badges are readable, but they look like UI labels floating over the map rather than map markers.
- Location-pin silhouettes make the map affordance immediately clearer: “this is a location.”
- We can keep the same compact operational labels inside the pins, so the command-console style remains intact.
- For moving vehicles, a slightly different vehicle marker shape or compact lozenge/pin hybrid will make movement easier to perceive.

Do not switch to decorative generic Google-style colorful pins. Use restrained, flat, bordered operational pins aligned with `DESIGN.md`.

---

## Current context / assumptions

- Current feature files already exist:
  - `src/lib/fire-stations.ts`
  - `src/lib/scenario.ts`
  - `src/components/ops-dashboard.tsx`
- Current marker rendering is handled by `MapMarkerGlyph` in `src/components/ops-dashboard.tsx`.
- Current legend rendering is handled by `MapLegend` in `src/components/ops-dashboard.tsx`.
- Current dispatch preview logic should remain unchanged.
- Tests directory has intentionally been removed; do not recreate it.
- Validate with:
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm run build`
- Do not commit unless explicitly requested.
- Do not add/touch `png` or `jpg` files.

---

## Proposed approach

Use one reusable marker component vocabulary:

- Fire station: outlined location pin, info-blue border/text, label `FS`.
- Fire incident: outlined or filled warning/orange location pin, label `FI`.
- Medical incident: outlined or filled success/green location pin, label `MI`.
- Firetruck dispatch/unit: compact vehicle pin or square-tail marker, warning/orange fill, label `FT`.
- Ambulance dispatch/unit: compact vehicle pin or square-tail marker, success/green fill, label `AM`.

The simplest robust implementation is CSS-only:
- Marker wrapper: vertical flex container.
- Main pin body: rounded top / pointed bottom using a rotated square pseudo-element or child span.
- Inner label: monospace two-letter code.
- Optional active selection ring: existing outline offset.

No new icon libraries. No image assets.

---

## Step-by-step plan

### Task 1: Rename marker glyph intent without changing behavior

**Objective:** Make the marker rendering code clearer before changing visual shape.

**Files:**
- Modify: `src/components/ops-dashboard.tsx`

**Step 1: Locate marker helpers**

Inspect:
```bash
sed -n '150,230p' src/components/ops-dashboard.tsx
```

Expected: shows `interpolatePosition`, `incidentMarkerLabel`, `markerCategory`, `MapMarkerGlyph`, and `MapLegend`.

**Step 2: Rename local variables inside `MapMarkerGlyph` only**

Change:
```tsx
const markerClassName = cn(...);
const glyph = ...;
```

to:
```tsx
const markerToneClassName = cn(...);
const markerCode = ...;
```

Also update JSX references.

**Step 3: Validate**

Run:
```bash
npm run lint
npx tsc --noEmit
```

Expected: both pass.

---

### Task 2: Replace square marker with CSS location-pin marker

**Objective:** Change `MapMarkerGlyph` from a square badge to a location-pin shaped marker.

**Files:**
- Modify: `src/components/ops-dashboard.tsx`

**Step 1: Replace the returned JSX in `MapMarkerGlyph`**

Use this structure:

```tsx
return (
  <span className="relative grid h-11 w-9 place-items-start justify-center" aria-hidden="true">
    <span className={markerPinClassName}>
      <span className="relative z-10 grid size-7 place-items-center rounded-full border border-current bg-screen font-mono text-[9px] font-semibold uppercase leading-none">
        {markerCode}
      </span>
      <span className="absolute bottom-0 left-1/2 size-3 -translate-x-1/2 translate-y-1 rotate-45 border-b border-r border-current bg-inherit" />
    </span>
  </span>
);
```

**Step 2: Replace marker class calculation**

Use a pin body class similar to:

```tsx
const markerPinClassName = cn(
  "relative grid size-9 place-items-center rounded-t-full rounded-b-md border bg-screen text-screen-foreground transition-colors",
  marker.kind === "station" && "border-info text-info",
  marker.kind === "incident" && linkedIncident?.type === "medical" && "border-success text-success",
  marker.kind === "incident" && linkedIncident?.type === "fire" && "border-warning text-warning",
  marker.kind === "unit" && isAmbulance && "border-success bg-success text-background",
  marker.kind === "unit" && !isAmbulance && "border-warning bg-warning text-background",
  selected && "outline outline-2 outline-accent outline-offset-2",
);
```

**Step 3: Preserve provenance comment**

Keep the existing comment above `interpolatePosition` and do not add noisy comments inside JSX.

**Step 4: Validate**

Run:
```bash
npm run lint
npx tsc --noEmit
```

Expected: both pass.

---

### Task 3: Make vehicle markers visually distinct from static location pins

**Objective:** Ensure moving firetruck/ambulance markers are not confused with station/incident pins.

**Files:**
- Modify: `src/components/ops-dashboard.tsx`

**Step 1: Add a vehicle-specific branch inside `MapMarkerGlyph`**

Before the normal location pin return, add:

```tsx
if (marker.kind === "unit") {
  return (
    <span className="relative grid h-10 w-11 place-items-center" aria-hidden="true">
      <span className={markerVehicleClassName}>
        <span className="font-mono text-[9px] font-semibold uppercase leading-none">{markerCode}</span>
        <span className="absolute -bottom-1 left-1 size-1.5 border border-current bg-screen" />
        <span className="absolute -bottom-1 right-1 size-1.5 border border-current bg-screen" />
      </span>
    </span>
  );
}
```

**Step 2: Add vehicle class calculation**

Add before the return:

```tsx
const markerVehicleClassName = cn(
  "relative grid h-7 w-10 place-items-center border font-mono transition-colors",
  isAmbulance ? "border-success bg-success text-background" : "border-warning bg-warning text-background",
  selected && "outline outline-2 outline-accent outline-offset-2",
);
```

**Step 3: Validate the marker category text still works**

Run:
```bash
npm run lint
npx tsc --noEmit
```

Expected: both pass.

---

### Task 4: Update legend to match pin vocabulary

**Objective:** Make the legend show pin-shaped samples instead of square badges.

**Files:**
- Modify: `src/components/ops-dashboard.tsx`

**Step 1: Add a small legend sample helper**

Near `MapLegend`, add:

```tsx
function MapLegendSample({ glyph, className, vehicle = false }: { glyph: string; className: string; vehicle?: boolean }) {
  if (vehicle) {
    return <span className={cn("grid h-5 min-w-9 place-items-center border px-1 font-mono text-[9px] font-semibold uppercase", className)}>{glyph}</span>;
  }

  return (
    <span className="relative grid h-6 w-6 place-items-start justify-center">
      <span className={cn("relative grid size-5 place-items-center rounded-t-full rounded-b-sm border bg-screen font-mono text-[8px] font-semibold uppercase", className)}>
        {glyph}
        <span className="absolute bottom-0 left-1/2 size-2 -translate-x-1/2 translate-y-1 rotate-45 border-b border-r border-current bg-inherit" />
      </span>
    </span>
  );
}
```

**Step 2: Update legend item data**

Change the dispatch legend item to include `vehicle: true`:

```tsx
{ label: "Dispatch unit", className: "border-warning bg-warning text-background", glyph: "FT/AM", vehicle: true },
```

**Step 3: Replace legend sample span**

Replace:

```tsx
<span className={cn("grid h-5 min-w-8 place-items-center border px-1 font-mono text-[9px] font-semibold uppercase", item.className)}>{item.glyph}</span>
```

with:

```tsx
<MapLegendSample glyph={item.glyph} className={item.className} vehicle={item.vehicle} />
```

**Step 4: Validate**

Run:
```bash
npm run lint
npx tsc --noEmit
```

Expected: both pass.

---

### Task 5: Browser-verify marker affordance and dispatch routing

**Objective:** Confirm the UI reads as map markers and the existing dispatch flow still works.

**Files:**
- No code changes expected.

**Step 1: Build**

Run:
```bash
npm run build
```

Expected: Next build completes successfully.

**Step 2: Start production server on a free port**

Run:
```bash
npx next start -p 3017
```

Expected: server listens on `http://localhost:3017`.

**Step 3: Verify Punggol fire flow**

Open:
```text
http://127.0.0.1:3017/map?incident=punggol-residential-fire
```

Verify:
- fire station markers show as pin-shaped `FS` markers.
- Punggol incident marker shows as pin-shaped `FI` marker.
- selecting Punggol incident starts a `FT` vehicle marker movement.
- after arrival, CTA says `Enter live dashboard`.
- clicking CTA routes to `/live?incident=punggol-residential-fire`.

**Step 4: Verify Woodlands medical flow**

Open:
```text
http://127.0.0.1:3017/map?incident=woodlands-medical-responder-safety
```

Verify:
- Woodlands incident marker shows as pin-shaped `MI` marker.
- selecting it starts an `AM` vehicle marker movement.
- after arrival, CTA says `Enter review dashboard`.
- clicking CTA routes to `/review?incident=woodlands-medical-responder-safety`.

**Step 5: Stop server**

Stop the `next start` process.

---

## Files likely to change

- `src/components/ops-dashboard.tsx`
  - `MapMarkerGlyph`
  - `MapLegend`
  - possible new `MapLegendSample`

No changes expected to:
- `src/lib/fire-stations.ts`
- `src/lib/scenario.ts`
- `src/lib/domain.ts`

---

## Tests / validation

Run after implementation:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Expected:
- lint passes
- TypeScript passes
- Next build passes

Manual/browser validation:
- `/map?incident=punggol-residential-fire`
- `/map?incident=woodlands-medical-responder-safety`

---

## Risks, tradeoffs, and open questions

- CSS-only pins may overlap more than square badges at low zoom. Keep them compact: around `h-11 w-9`.
- Google Maps AdvancedMarker collision behavior may hide some markers when zoomed out. This is already true for current markers; the pin shape does not materially worsen it if kept compact.
- The square fallback list is still useful as a dense operational table. We should update its glyph sample but not over-style the list into a fake map.
- Open question: should station pins be smaller/lower priority than incident pins? Recommendation: yes, but only subtly. Keep station pins outlined and incidents more prominent.
