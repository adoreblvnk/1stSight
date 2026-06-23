# Slide-style PDF exports for operational evidence briefings

Use this reference when a Next.js app must generate a presentation-ready PDF from runtime evidence, especially AAR / incident-review outputs.

## Design pattern

Prefer slide-style pages over report pages when the output is meant to be shown in a presentation:

- landscape page size, often `A4` or `LETTER`
- one clear purpose per page
- large title, small eyebrow/section label, page counter
- short operational copy, not dense paragraphs
- evidence frames as the main visual element
- footer with scope/provenance boundary

Typical page sequence:

1. incident overview
2. milestone timeline with timestamp provenance
3. selected evidence frames
4. AAR findings / recommendations
5. officer follow-up / pending formal data

## Evidence and provenance rules

Every claim in the PDF should point to one of:

- a selected frame source ID
- a source video filename/path
- a bodycam / responder ID
- a frame timestamp label
- a dispatch/system record
- officer-entered data

For formal data not provided to the workflow, explicitly mark it as pending officer input or unavailable. Do not infer dispatch-system milestones such as call received, dispatch, acknowledge, or move-out from bodycam footage unless external/system data supplied them.

## React PDF route handler notes

For Next.js route handlers using `@react-pdf/renderer` directly:

```ts
// React PDF Node API: https://react-pdf.org/node
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

export const runtime = "nodejs";
```

Return the buffer with PDF headers:

```ts
return new Response(buffer, {
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": 'attachment; filename="briefing-slides.pdf"',
  },
});
```

Use data URLs or reachable URLs for `Image` sources. For smoke tests, generate real frames with ffmpeg and embed them as `data:image/png;base64,...` so the PDF export exercises real image layout.

## Layout pitfalls

- React PDF flex behavior can differ from browser CSS; when placing two cards in a row, give children explicit `flex: 1` rather than assuming width from parent `gap`.
- Long provenance strings can overflow cards. Prefer concise source references such as `Bodycam W1 / file.mp4 / BWC 0:22` instead of full public paths.
- Dense timeline cards need short notes and truncation; full operational narratives should not live inside milestone cells.
- Valid `%PDF-` output is not enough. Rasterize representative pages with `pdftoppm` and inspect visually for clipping/overlap.

## Incident metadata and route-state pitfalls

- Export routes should derive the incident title, location, milestone list, and PDF metadata from the request payload or the requested incident id. Do not call a global default scenario/state helper inside the route unless the export is truly for that default incident; this can leak default/Punggol metadata into a Woodlands AAR PDF.
- If only one incident should export slides in the presentation flow, enforce that on both client and server. The client disables the button, and the route returns a clear 4xx for unsupported incidents.
- Validate runtime evidence provenance before rendering. Reject selected evidence whose `incidentId`, responder/source ID, or source video path belongs to a different scenario, even if the request-level incident id is eligible. This prevents cross-incident frames from appearing in an otherwise valid AAR PDF.
- Keep wording slide-oriented: “AAR briefing slides”, “briefing PDF”, “selected evidence frames”, “officer input pending”. Avoid “official report”, “fire report”, or “ambulance report” unless the app has those formal records and the user explicitly asks for that artifact.

## Verification recipe

- Run typecheck/lint/build.
- Direct API smoke: POST a representative payload and assert:
  - status 200
  - `Content-Type: application/pdf`
  - bytes start with `%PDF-`
  - `pdfinfo` reports expected page count and landscape page size
- Negative API smoke: POST an unsupported incident and assert a clear 4xx error.
- Browser flow: load the presentation/review page, wait for analysis, click the export button, and check console errors.
- Visual check: rasterize key pages with `pdftoppm -png` and inspect overview, timeline, and evidence pages.
