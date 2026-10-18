# Porting notes

This independent port follows Arc's public React components, using Svelte 5,
Bits UI and native Svelte/browser motion. Preserve upstream defaults, design
tokens, keyboard behavior and reduced-motion behavior when adapting components.

## Svelte API conventions

| React API                      | Svelte equivalent                                     |
| ------------------------------ | ----------------------------------------------------- |
| `children` and render props    | Snippet props                                         |
| `className`                    | `class`; styles use plain CSS classes and style props |
| Forwarded DOM refs             | Bindable `ref` props                                  |
| Mutable component state        | Bindable state plus component change callbacks        |
| Radix primitives and `asChild` | Bits UI primitives and `child` snippets               |
| Provider link/image adapters   | `src/lib/arc-provider.svelte.ts` context              |

Check each component's exported props for its controlled-state contract. In
components with caller-owned updates, callbacks can reject a proposed value;
keep that behavior when translating to bindings.

## Reactivity and lifecycle

- Compute values with pure `$derived` / `$derived.by`; use writable derived values
  for temporary overrides while preserving controlled-update rejection behavior.
- Handle user input in events and bindings. Expose current context state through
  getters instead of effects that copy it.
- Use `onMount` for client setup without reactive dependencies, `onDestroy` for
  component cleanup, and attachments for resources tied to a DOM element.
  Prefer existing reactive browser primitives such as `MediaQuery`.
- Reserve `$effect` for imperative browser/animation work. Capture old layout or
  animation history with a narrowly scoped `$effect.pre` or setter when needed.
  Do not mutate history caches while evaluating a derived value or use `untrack`
  to hide avoidable duplicated state.
- Editing drafts, previous-value animation history and outgoing presence have
  their own lifetimes. Preserve incomplete edits, rejected proposals and departing
  nodes when changing these effects; current props alone cannot represent them.

See Svelte's [`$effect`](https://svelte.dev/docs/svelte/$effect#When-not-to-use-$effect)
and [`$derived`](https://svelte.dev/docs/svelte/$derived) guidance. The
[state regression guide](../tests/svelte-state/README.md) covers controlled updates,
history reversal, context refs and lifecycle cleanup.

## Motion

Animation helpers live in `src/lib/motion/`. Moving pointer targets and fixed-target
releases need different spring handling; use the existing follow/target/physical
helpers rather than assuming native spring parameters reproduce Motion's trajectory.
Keep timing measurements aligned to the action frame and test interruptions.

## Intentional behavior difference

ResizablePanels fixes the upstream rapid-arrow freeze. Repeated outward arrow
keys during a collapse previously cancelled the animation and left the painted
layout between states, with constraints released. The port finishes the collapse,
restores constraints and publishes the final layout callback. This is a deliberate
bug fix rather than exact reproduction of the source defect.

The [Phase 5 verification notes](../tests/phase5/VERIFICATION.md) and
[browser test guide](../tests/phase5/README.md) document regression coverage in both
collapse directions, narrow/wide layouts and reduced motion.

## Verification and inherited behavior

Implemented components are not automatically fully verified. The
[roadmap](../ROADMAP.md) distinguishes implementation from remaining verification;
include untested variants and device limitations when reporting results.

Phase 5 comparisons cover the states described in its verification notes using
Chromium. Physical touch/pen hardware, IME/mobile autofill, screen-reader speech
and alternate browser engines remain outside that evidence.

RichTextEditor retains upstream handling of explicit URL schemes. Consumers
must sanitize untrusted output before rendering it. The upstream live demo hides
the editor toolbar; visible comparison screenshots override only its visibility,
while the isolated source fixture checks normal geometry and link behavior.
