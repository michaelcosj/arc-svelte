# Phase 5 verification

The motion oracle is the untouched React registry at
`86330cc9270c4acc55b7204c9583fcbaa378192c`, with the isolated runtime pinned in
`dependencies/pnpm-lock.yaml`. Production code uses Svelte motion clocks and
native browser animation; React/Motion/Radix are fixture dependencies only.
Run the reproducible browser gates with `vp run test:phase5` (setup in README).

## Final validation — 2026-10-18

`vp check`, `vp test` (54 tests in 18 files), `vp run check` (zero errors and
warnings), `vp run lint` and `vp run build` passed. All 16 browser workflows
passed, including 60 Slider/BottomSheet release runs, 24 bubble runs with exact
endpoint presence, 30 CardStack scenarios and 46 integrated gallery cases.
The release comparisons' largest painted position error was 0.000001px;
bubble travel differed by at most 0.00029px. These are recorded measurements,
not claims of pixel identity across devices.

## What the regression suite checks

| Area                 | Checks                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pointer highlights   | Hover, rapid reversal, leave/fade; ButtonGroup and FloatingButtonGroup, normal/reduced motion                                                    |
| Gesture releases     | Slider, ElasticSlider, BottomSheet, SwipeActions, Carousel, CardStack and ToastStack: release, catch, reversal, cancellation and boundary return |
| ResizablePanels      | Collapse/restore, catches, separator fade/geometry; native rapid arrows in both collapse directions, narrow/wide and reduced motion              |
| ExpandingButtonGroup | Async confirmation, interrupted word/glyph presence, zero-duration confirmation, retained node identity, initial render and native observation   |
| ToastStack           | Wrapped action removal, stack height/offsets, return/catch/throw, opacity and teardown                                                           |
| HoldToConfirm        | Hold, release, interrupted width/scale/fill and reduced motion                                                                                   |
| Numeric inputs       | Slider/NumberField digit rolls, `9 → 10 → 9`, changing a departing wheel; MoneyInput scale-to-fit and menu highlight                             |
| Measured surfaces    | ConfirmMorph face resurrection, PhoneInput filtered-search shape, RichTextEditor selection/link toolbar, UserMenu highlight/mobile return        |
| Integration          | All 18 Phase 5 demos and five earlier/shared demos in normal/reduced motion (46 cases), keyboard/ARIA/state and browser exceptions               |

Each comparison asserts its measured properties and records actual maxima in
`handoff/`. Typical trajectory bounds are 0.001px; measured widths and painted
digit positions allow Chromium's 1/64px layout quantization. Opacity allows
0.001, except the ExpandingButtonGroup label's explicitly sampled approximation
(0.003). Invisible endpoint teardown can differ by a frame. Tests do not add
arbitrary delays or broaden bounds to disguise animation-start differences.

The deterministic harness advances RAF, finite WAAPI tracks and, where needed,
ResizeObserver delivery at explicit layout steps. Native-clock EBG/panel checks
and live comparisons supplement it. Setup lets fonts, initial observation and
framework commits settle before aligning the action frame. This avoids
misidentifying a start-frame offset as a spring-curve difference. Reduced-motion
release comparisons start at the first painted frame when React queues a commit
and Svelte updates synchronously.

Additional completed browser checks include caller-owned rejection/external
updates/binding, forms, disabled/default behavior, paste and teardown for the
numeric inputs; async rejection/timeout/unmount for ConfirmMorph; queue IDs,
version guards and lifetime for ToastStack; and 21 editor behavior groups plus
40 untouched-source HTML/Markdown converter comparisons. Live docs comparisons
cover light/dark/narrow and reduced motion. The upstream live editor toolbar is
hidden; its visible screenshots override only visibility, while the standalone
source fixture tests its normal geometry and link behavior.

## Deliberate upstream departure

ResizablePanels now finishes a collapse when repeated outward arrow keys arrive
during that collapse. Upstream cancels the flight, then returns early because
the logical pane is already collapsed, leaving painted geometry between states
and constraints released. The port settles the collapsed layout, restores its
constraints and publishes the final layout callback. This fix was explicitly
requested. Native regressions reproduce the source freeze and assert the port
settles in both directions, including reduced motion.

## Scope of evidence

These checks establish parity for the exercised states and interrupts, rather
than every possible browser/device combination. Physical touch/pen hardware,
IME/mobile autofill, screen-reader speech and alternate browser engines remain
outside this Chromium verification. API differences are Svelte snippets,
bindable refs/state and plain CSS class/style props as documented in the
[porting notes](../../docs/PORTING.md).
The integrated demo can emit existing shared-component console warnings;
individual Phase 5 regression cases assert no browser exceptions.
