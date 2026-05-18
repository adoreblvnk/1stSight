# Review Checklist

Use this checklist before finalizing an Editorial Factory UI change or when reviewing an existing one.

## Brand

* Does the UI still read as warm paper plus dark screen insets?
* Is IBM Plex still the only type system?
* Are borders doing the structural work instead of shadows?
* Is the red accent restrained and intentional?

## Layout

* Does the page collapse intentionally on mobile?
* Is there any page-level horizontal scroll?
* Are dense desktop regions stacked instead of squashed on mobile?
* Is the sidebar correctly turned into a mobile sheet?

## Components

* Were canonical shadcn primitives used first?
* Did the implementation avoid bespoke duplicate patterns?
* Are forms on the `FieldGroup` / `Field` pattern?
* Does every `FieldDescription` add a non-obvious constraint, risk, format, or security fact instead of repeating the label, placeholder, or button action?
* Is each status, fact, and primary action owned by one surface rather than repeated across adjacent cards, headers, and forms?
* Are statuses rectangular, monospace, and semantically colored?

## Motion

* Is the motion brief, sparse, and signal-like?
* Were springs avoided?
* Is glitch / flicker limited to the right surfaces?
* Is reduced-motion support present where needed?

## Screens And Data

* Are code, logs, and terminal surfaces dark insets rather than full-page dark mode?
* Are numbers and operational metadata monospace?
* Do tables use the correct responsive pattern?

## Drift

Reject the change if it introduces:

* generic SaaS glow
* extra font families
* soft dashboard cards as the default pattern
* centered mobile hero layouts
* playful motion or decorative animation drift
