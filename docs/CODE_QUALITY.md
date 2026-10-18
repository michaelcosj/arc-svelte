# Code quality checks

Use the standard checks before opening a pull request:

```sh
vp check
vp test
vp run check
vp run lint
vp run build
```

The [Svelte state regression](../tests/svelte-state/README.md) adds SSR, immediate
parent-update/event handling, controlled rejection, history reversal and lifecycle
checks. The [Phase 5 comparison suite](../tests/phase5/README.md) checks native
motion against the pinned React source. Both browser workflows need their documented
Playwright setup; unit tests do not run those workflows automatically.

## Validation — 2026-10-18

The standard checks above passed, including 54 unit tests, zero Svelte diagnostics
and the production build. The new state/lifecycle workflow passed 20 cases, and
all 16 Phase 5 browser workflows completed, including 60 release runs, 30 CardStack
scenarios and all 46 gallery cases.

An initial release attempt had two fixture-readiness timeouts before motion
assertions. Readiness now polls from Node independently of browser frames; its
ten-second deadline, action-clock alignment and motion bounds are unchanged.
The full release rerun passed. The exact cause of the original timeouts remains
unproven; the original reports are retained locally.

## Svelte autofixer

The 2026-10-18 pass used the official `@sveltejs/mcp` autofixer, version `0.1.26`,
targeting Svelte 5 with async compilation disabled, across all 338 `.svelte` and
`.svelte.ts` files under `src/`. The batch called the package's exported
`svelteAutofixer` handler, which is also used by its CLI and MCP tool.

Run a focused check with:

```sh
vp dlx -- @sveltejs/mcp@0.1.26 svelte-autofixer src/lib/components/slider/Slider.svelte
```

The tool returns findings and suggested changes; review and apply them, then run
it again. The initial missing-key findings were resolved. Broad suggestions about
effect callbacks, DOM refs, ignore comments and literal interpolation still require
context; neither suppress them wholesale nor treat each as a confirmed defect.
Keep local raw reports under ignored `handoff/`.

### TypeScript analysis limitation

Five modules trigger an internal autofixer error:
`Cannot read properties of undefined (reading 'text')`. A minimal reproduction is:

```ts
export class Example {
	value = $state(0);
	constructor(private initial = 0) {
		this.value = initial;
	}
}
```

Affected modules: `toast-stack-state.svelte.ts`, `follow-spring.svelte.ts`,
`pointer-highlight.svelte.ts`, `target-spring.svelte.ts` and `timed-tween.svelte.ts`.
For these five, TypeScript's `transpileModule` erased types and expanded constructor
parameter properties using an ESNext target, then the same autofixer checked the
result. That fallback reported no issues. The original modules were unchanged;
`svelte-check` validates their TypeScript directly. This workaround does not mean
the autofixer successfully analyzed the original TypeScript inputs.

## Manual reactivity review

The [reactivity review](./SVELTE_PATTERNS.md) examined every effect body and library
`$derived.by` callback, removed avoidable state mirrors and lifecycle effects,
and moved historical writes out of computed values. New regressions reproduce
stale-value failures in the pre-review NumberField and MentionInput components.
The earlier automated checks alone did not establish idiomatic Svelte design.

Some generic suggestions describe deliberate behavior: `PhysicalSpring.set()` is
a class method, FileUpload's plain Map stores imperative focus refs, and `today`
reads a plain Date through an explicit subscription. Effects that coordinate
measurement, animation clocks, editing and teardown need behavior checks before
a rewrite. The review documents those boundaries and the remaining verification
scope; see the [roadmap](../ROADMAP.md) for components awaiting further checks.
