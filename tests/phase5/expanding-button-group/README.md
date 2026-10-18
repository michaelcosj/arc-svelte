# ExpandingButtonGroup regressions

See [the Phase 5 setup](../README.md) for pinned reference-only dependencies.
Run from the repository root; each workflow owns port 5221 and closes it.

```sh
node tests/phase5/expanding-button-group/regression.mjs
node tests/phase5/phase5-ebg-clock.mjs
node tests/phase5/expanding-button-group/live.mjs
```

The native-clock regression checks font-ready first-render stability over 20
frames, reduced zero-duration outgoing-node teardown, interrupted overlap,
returning node identity, unique keys, exit completion and browser errors.
The paired clock test asserts width, label easing and glyph/word presence for
hover, reversal, normal/75ms/zero confirmation in normal and reduced motion.
The live workflow checks hydrated docs interactions against uiarc.dev with real
mouse input. It waits for the reference site's hydration and requires network
access. `timing.mjs` and `inspect.mjs` are optional diagnostics, not extra gates.

`EBG_BASELINE=1` loads the committed ExpandingItem from HEAD without changing
working files. This only reproduces the old defect before the fix is committed;
it is not a pinned historical oracle.
