# Svelte state and lifecycle regression

This fixture checks Svelte-specific behavior after replacing React-style state
mirrors and moving historical writes out of computed values. It does not require
the React reference clone. It uses the existing pinned Playwright runtime:

```sh
vp install --frozen-lockfile
cd tests/phase5/dependencies
vp install --frozen-lockfile
vp exec playwright install chromium
cd ../../..
vp run test:svelte-state
```

The workflow renders the fixture on the server, then runs nine behavior groups
with normal and reduced motion (20 cases total, including paused-clock fixture readiness). It checks:

- A parent changes NumberField's value and dispatches an increment before effects
  can flush: the proposal must use the new value; controlled rejection stays shown.
- A parent changes MentionInput's value and submits in the same turn: the callback
  must receive the new text.
- Mention navigation resets on a changed query; Escape dismissal persists through
  edits at that trigger and resets on moving to another trigger.
- MoneyInput external changes, keyboard increments and rejected edits.
- Select/TimePicker external changes, OTP replacement, glyph and calendar reversal.
- Tabs context refs at selection time and aborting an upload when its owner unmounts.

The readiness regression publishes a fixture after polling starts, with RAF paused,
and checks that setup progresses without advancing animation time. The release
comparison uses the same Node-side polling with its existing ten-second deadline.

A single Svelte SSR runtime renders the fixture; client readiness is exposed from
`onMount`. The assertions use public DOM and callback behavior. They do not claim
exact motion trajectories for earlier components still awaiting verification.
The runner owns and closes its Vite server (port 5232) and browser. Reports go to
ignored `handoff/svelte-audit/`. Do not run SvelteKit sync/build concurrently with
browser comparisons.
