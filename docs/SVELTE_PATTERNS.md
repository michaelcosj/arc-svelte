# Svelte reactivity and lifecycle conventions

The port uses Svelte 5 runes, snippets, bindings, Bits UI, attachments and native
Svelte/browser motion. Using runes does not by itself make a React port idiomatic.
Review what a hook did before choosing the Svelte mechanism.

## Choosing a mechanism

| Need                                                                | Preferred Svelte mechanism                                                |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Compute from props or state                                         | Pure `$derived` / `$derived.by`                                           |
| Temporarily override a computed value                               | Writable `$derived`, retaining the component's controlled-update contract |
| Respond to user input                                               | Event handlers and bindings                                               |
| Expose current reactive state through context                       | Getters rather than effects that copy it                                  |
| Client initialization without reactive dependencies                 | `onMount`                                                                 |
| Component-lifetime cleanup                                          | `onDestroy`                                                               |
| Resources tied to a DOM element                                     | Attachments, with cleanup                                                 |
| Browser state with an existing reactive primitive                   | For example, `MediaQuery` from `svelte/reactivity`                        |
| Synchronize reactive targets with imperative animation/browser APIs | `$effect`, with cleanup where needed                                      |
| Capture old layout or animation history before a DOM update         | A narrowly scoped `$effect.pre` or a setter                               |

Svelte advises against using effects to compute or synchronize ordinary state.
Its guidance also requires derived expressions to be free of side effects.
See the official [`$effect`](https://svelte.dev/docs/svelte/$effect#When-not-to-use-$effect)
and [`$derived`](https://svelte.dev/docs/svelte/$derived) documentation.

`untrack` is not a way to make a duplicated-state design correct. Use it for
incidental reads when issuing an imperative command or comparing a deliberate
history snapshot. Do not mutate previous-value caches while evaluating a derived
value: evaluation is lazy and can happen during rendering.

## Review scope — 2026-10-18

Reviewed the bodies of all 281 effect registrations under `src/` (267 in the
library), including nested effects, and all 35 library `$derived.by` callbacks.
The review followed relevant input handlers and state contracts for the changed
components. It is a review of reactivity patterns, not a claim that every prop,
animation, browser and accessibility path is verified; the [roadmap](../ROADMAP.md)
still records the earlier verification work.

Changes from this review:

- Removed three effect-maintained value mirrors in NumberField, MoneyInput and
  MentionInput using writable derived values. Their event-time overrides and
  controlled rejection paths remain explicit.
- Replaced MentionInput's two reset effects with writable derived navigation and
  dismissal state. Query changes reset navigation; trigger-position changes reset
  dismissal, while edits within the same trigger keep it dismissed.
- Made the Tabs context read the root ref through an options getter.
- Replaced 16 teardown-only effects with `onDestroy` and 15 mount-only effects
  with `onMount`, including the shared `Mounted` helper.
- Replaced UserMenu's manual media-query state bridge with `MediaQuery`, behind
  its existing hydration gate.
- Removed writes hidden inside six computed values: Select and TimePicker roll
  direction, OTP paste-wave history, CopyButton glyph history, TextMorph label
  history and Calendar selection handoff. History now updates explicitly before
  rendering; CopyButton and TextMorph reuse their existing layout effects.

There are now 247 effect registrations under `src/`, including 241 in the library.
The count is inventory evidence, not a quality target. Four new pre-update effects
record animation history; removing them merely to reduce the count would conceal
stateful work inside computations again.

## Why effects remain

Most remaining effects have a concrete browser or animation boundary: starting
or retargeting a spring/tween, sampling velocity, observing size, moving a focus
highlight, restoring selection, managing timers/listeners or retaining an outgoing
node until its animation finishes. These are imperative operations, not computed
render values. Initial animation suppression uses a client-only mount gate so SSR
and the first hydrated render agree.

Some state-writing effects deliberately coordinate editing or presence state:

- MoneyInput and PhoneInput reconcile external controlled values with editable
  drafts; incomplete input and rejected proposals must survive appropriately.
- ColorPicker preserves hue, the last valid parsed color and local edits while
  accepting external values.
- InlineEdit coordinates committed text, a pending save and the visible draft.
- Animated counters and rolling labels retain the previous committed value to
  choose motion direction; current props alone cannot determine that history.
- ToastStack and ExpandingButtonGroup retain departing entries and can restore
  them during interrupted exits. A derived copy of the current list would remove
  those nodes before their exit lifecycle finishes.

These cases still warrant review when modified. Do not generalize their use of
`untrack` or state writes into a default translation of React's `useEffect`.

## Verification

[The focused regression](../tests/svelte-state/README.md) covers immediate parent
updates followed by events in the same JavaScript turn, controlled rejection,
mention navigation/dismissal, history reversals, Tabs refs, upload teardown and SSR.
The same NumberField and MentionInput assertions were also run against their
pre-review components to establish that the old mirrors read stale values.

The autofixer still emits broad advisories about effect calls, DOM refs and
ignore comments; those messages are not equivalent to confirmed defects. Its
known TypeScript limitation is recorded in the [code quality notes](./CODE_QUALITY.md).
Compiler/lint/unit and the relevant browser comparisons supplement this review;
a clean tool report alone is not evidence of idiomatic design.
