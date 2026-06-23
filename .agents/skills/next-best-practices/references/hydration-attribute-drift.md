# Hydration attribute drift in component wrappers

Use this when React's hydration diff shows a native attribute present on one side and absent on the other, for example `disabled={true}` vs `disabled={null}` on a wrapped button.

## Pattern

Some component primitives normalize native attributes differently on the server and client. The app may render an SSR-safe `data-*` state server-side, then the client adds or removes the native prop during hydration.

## Debugging sequence

- read the exact React hydration diff before changing code
- inspect the wrapped component or primitive to see how native props are forwarded
- identify whether the attribute is required for true browser semantics or only for a gated visual state before interaction
- for SSR-visible gated CTAs, prefer a stable combination of `aria-disabled`, `data-disabled`, disabled styling, and a guarded handler instead of a native attribute that drifts
- rerun `npm run lint`, `npx tsc --noEmit`, and `npm run build`
- verify in a production browser session on the exact route that triggered the warning and check the console for hydration messages

## Example

```tsx
// risky when the wrapper renders different server/client native attributes
<Button disabled={!canProceed} onClick={routeToNext}>Continue</Button>

// stable for pre-hydration visual gating
<Button
  aria-disabled={!canProceed}
  data-disabled={!canProceed ? "" : undefined}
  className={cn(!canProceed && "pointer-events-none opacity-50")}
  onClick={() => {
    if (!canProceed) return;
    routeToNext();
  }}
>
  Continue
</Button>
```

## Generated Next dev type noise

If `npx tsc --noEmit` fails inside `.next/dev/types/*` after dev-server churn, do not immediately treat it as a source error. Stop old Next dev processes, remove `.next/dev`, then rerun typecheck. Capture the source fix only after the generated cache is clean.
