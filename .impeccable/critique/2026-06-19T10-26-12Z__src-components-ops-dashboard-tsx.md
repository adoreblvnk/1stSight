---
target: 1stSight color scheme across map/live/review
total_score: 24
p0_count: 0
p1_count: 2
timestamp: 2026-06-19T10-26-12Z
slug: src-components-ops-dashboard-tsx
---
# 1stSight Color Scheme Critique

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | active route and analysis states are visible, but disabled/inactive tones blend into the ash panels |
| 2 | Match System / Real World | 3 | operational language is strong; color language feels more admin-console than command/evidence system |
| 3 | User Control and Freedom | 3 | main actions are visible; route states are clear enough |
| 4 | Consistency and Standards | 2 | light shells, black evidence surfaces, red CTAs, Google map colors, and washed AI imagery do not yet form one palette |
| 5 | Error Prevention | 2 | not color-specific, but disabled/destructive/control states are not strongly differentiated by semantics |
| 6 | Recognition Rather Than Recall | 3 | labels and route states are readable; visual grouping is clear |
| 7 | Flexibility and Efficiency | 2 | no strong color support for rapid scan priority beyond red buttons and dark video |
| 8 | Aesthetic and Minimalist Design | 2 | too many competing neutrals: ash header, white panels, black gutters, gray map, red actions |
| 9 | Error Recovery | 2 | unavailable/loading states are present but visually low-confidence |
| 10 | Help and Documentation | 2 | enough inline hints, but color does not teach state hierarchy |
| **Total** | | **24/40** | **Acceptable but visually incoherent** |

## Anti-Patterns Verdict

**LLM assessment:** This does not look like generic cream SaaS anymore, which is good. But it now has a different problem: split-personality color. The screen oscillates between light enterprise admin UI and dark evidence dashboard without a disciplined bridge color. The dark background feels like a poster layer behind ordinary light cards rather than a coherent command surface.

**Deterministic scan:** `detect.mjs --json src/components/ops-dashboard.tsx` returned `[]`. No bundled slop-pattern findings. This is expected because the issue is not obvious forbidden patterns; it is palette orchestration and contrast hierarchy.

**Visual overlays:** Injection was attempted on the browser target via the impeccable live server. Script injection succeeded, but no console findings were emitted. No user-visible overlay findings are available for this run.

## Overall Impression

Your instinct is right: the color scheme feels off. The removal of the warm glow helped, but the result is now too binary: pale gray UI sheets floating over nearly black evidence imagery. It reads as “light dashboard pasted onto dark wallpaper,” not “one operational system.”

The single biggest opportunity is to choose a real bridge material between shell and evidence: a deeper graphite/ash panel language for command surfaces, with light/white reserved for reports, forms, and map callouts.

## What's Working

1. **The red active route is clear.** The selected route and high-risk actions are easy to spot. The product does not feel passive.
2. **Dark video/evidence regions fit the product.** The bodycam cards and review timeline dark body areas are the closest to the right mood.
3. **Text contrast is mostly safe.** Primary text on light panels and screen text on black surfaces are readable.

## Priority Issues

### [P1] The palette is split between two products

**Why it matters:** The header and panels feel like a bright admin system, while the background and video feel like an incident command wall. Operators should feel like they are in one reliable tool, not a light CRUD app layered over dark imagery.

**Fix:** Introduce a middle operational surface: graphite ash. Use it for major dashboard panels on `/live` and `/review`, not pure white. Keep true light surfaces for reports, map summary, and text-heavy controls.

**Suggested command:** `$impeccable colorize`

### [P1] The white/gray panels are too bright against the dark background

**Why it matters:** On `/review`, the evidence background is dark and serious, but the large pale cards dominate the scene. The evidence texture becomes wallpaper instead of context. On `/live`, the right-side cards look detached from the video grid.

**Fix:** Change live/review panels from `bg-card/92` to route-aware surfaces: `bg-surface/88` for map, `bg-[oklch(22% 0.003 85)]`-like dark graphite for live/review container headers, and light subpanels only where input/report readability needs it.

**Suggested command:** `$impeccable colorize`

### [P2] The accent red is doing too many jobs

**Why it matters:** Red currently marks active nav, destructive/conclude action, and primary emphasis. In emergency interfaces red should be reserved or carefully tiered; otherwise everything reads as alarm.

**Fix:** Keep SCDF red for high-impact/destructive action and selected critical states. Use a less alarming amber/oxide or monochrome active marker for ordinary navigation selection.

**Suggested command:** `$impeccable quieter`

### [P2] The map page and live/review pages do not share a color grammar

**Why it matters:** The map page has Google’s blue/green map palette plus light ash UI. Live/review has black evidence/video plus red-heavy controls. The transition feels abrupt.

**Fix:** Add consistent command-shell elements across all routes: same header tone, same border tone, same active-marker logic, and a controlled status palette. Let the map itself stay dark, but wrap it in the same graphite/ash frame language used by live/review.

**Suggested command:** `$impeccable polish`

### [P2] Disabled/loading states look weak rather than unavailable

**Why it matters:** Buttons like “Analyzing,” “Export PDF,” “Mute all,” and “Advance feeds” are readable but visually washed out. In an Ops Centre UI, unavailable controls should be unmistakably disabled, not merely low contrast.

**Fix:** Use explicit disabled tokens: darker text on light disabled surfaces, reduced but not vague borders, and consistent icon/text opacity. Avoid low-contrast gray-on-gray combinations.

**Suggested command:** `$impeccable audit`

## Persona Red Flags

**Alex, Ops Centre power user:** The red active nav and red destructive action compete, so Alex cannot scan instantly for “where am I?” versus “what is dangerous?” The dashboard gives him readable panels, but not a mature priority color system.

**Sam, accessibility-dependent user:** Primary contrast is mostly okay, but gray disabled controls and muted mono labels are close to the danger zone on pale panels. Since status is often conveyed by red/green accents, all states need redundant text or icons.

**SCDF/Dell judge persona:** The product now looks more serious than before, but the visual system still exposes its construction: light web cards over dark generated backgrounds. Judges may read it as a prototype skin rather than a coherent operational command product.

## Minor Observations

- The header ash is slightly too warm/flat; it feels like browser chrome, not command hardware.
- The dark gutters are almost pure black, which makes panel edges harsh.
- The review hero card’s image wash is too pale; it muddies the contact-sheet texture.
- The red active route blocks are heavy compared with the otherwise restrained UI.
- The map itself is the strongest color object on the map route; the app chrome does not yet frame it confidently.

## Questions to Consider

- What if ordinary navigation used graphite/amber instead of emergency red, reserving red for operational consequence?
- Should `/live` and `/review` use dark graphite panels by default, with light panels only for forms/report text?
- Is the AI background meant to be ambient texture, or should evidence/video surfaces themselves carry the dark identity?
