# Phase 5 motion regressions

Run these browser workflows from the repository root. They mount the untouched
React implementation beside the Svelte implementation at the same viewport,
advance their clocks together, and assert geometry, presence and callbacks.
React, Motion and Radix are test-only dependencies in `dependencies/`; the
library has no imports from them.

Setup:

```sh
vp install
# Clone the upstream repository here if it is missing; never modify its sources.
git clone https://github.com/kuratlielia/arc-library reference/arc-library
git -C reference/arc-library checkout 86330cc9270c4acc55b7204c9583fcbaa378192c
cd tests/phase5/dependencies
vp install
vp exec playwright install chromium
cd ../../..
vp run test:phase5
```

The dependency lock pins the oracle's runtime as well as its React source.
Each workflow closes its browser and Vite server. The runner executes them
sequentially with a five-minute limit per workflow. Reports and screenshots go
to the untracked `handoff/` directory. Do not run SvelteKit sync/check/build or
another instance of this suite at the same time.

The suite exercises normal and reduced motion, interruptions and reversals,
gesture release/catch/cancel, bubble close/re-entry (including the exact exit endpoint), digit carry and departing
wheel updates, measured surface reversals, panel collapse and restore, keyed confirmation
presence, wrapped toast actions, slider edge kicks, and card stack decisions.
`expanding-button-group/regression.mjs` also checks native-clock first render,
node identity and zero-duration confirmation teardown. Its `live.mjs` compares
the docs demo against uiarc.dev using native browser animation and observation.

Controlled fixtures advance finite WAAPI animations with the RAF clock because
Chromium's compositor normally keeps running independently. Fixtures that
measure changing labels also deliver ResizeObserver at explicit layout steps;
native observer and real-pointer checks are separate from these motion tests.
CSS transitions are disabled in the highlight/swipe/carousel/hold/toast fixtures
to isolate the JavaScript tracks. This suite does not replace live screenshots,
accessibility checks, or integration tests.

Bounds reflect paint and measurement precision: most trajectories are asserted
within 0.001px; presence opacity within 0.001; browser width quantization within
1/64px; card depth following within 1/64px. Tests record the actual maxima. An
absent node may differ for an endpoint frame only when its opacity is already
below 0.001. Toast content height is measured in whole pixels in both sources.

ResizablePanels intentionally departs from upstream: rapid outward arrow keys
during a collapse finish that collapse instead of canceling it and leaving the
panes frozen with their size constraints released. The native-clock regression
checks settlement, restored constraints and the layout callback at narrow and
wide widths, including reduced motion, and records the upstream defect.

See [VERIFICATION.md](./VERIFICATION.md) for coverage and the deliberate upstream departure.

After fixing a failure, resume at that workflow without repeating passed suites:

```sh
node tests/phase5/run.mjs --from phase5-bubble-clock.mjs
```
