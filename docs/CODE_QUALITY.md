# Code quality checks

## Svelte autofixer pass — 2026-10-18

Ran the official `@sveltejs/mcp` autofixer, version `0.1.26`, targeting Svelte 5
with async compilation disabled, across all 338 `.svelte` and `.svelte.ts` files
under `src/`. The batch called the package's exported `svelteAutofixer` handler,
which is also used by its CLI and MCP tool.

The first pass found 14 missing loop keys in five files. Added explicit keys in
the BottomSheet and ResizablePanels demos, MentionInput, Slider and SwipeActionsRow.
Index keys retain the existing positional identity of editable slider thumbs,
repeated marks, mirror segments and action slots; changing values must not remount
these elements. Demo records with stable identifiers use those identifiers.
The second pass reported no remaining missing-key issues.

### Autofixer limitation

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

### Advisory suggestions

The tool also emits suggestions about effect callbacks/state writes, DOM refs,
ignore comments and literal interpolation. They are not all confirmed defects,
and this pass is not an exhaustive manual review of those suggestions.
For example, `PhysicalSpring.set()` is an intentional class method, FileUpload's
plain Map stores imperative focus refs, and the plain Date read in `today` uses
an explicit subscription. Effects that coordinate measurement, animation clocks
and teardown require behavior checks before a derived-state rewrite.

## Running a focused check

```sh
vp dlx -- @sveltejs/mcp@0.1.26 svelte-autofixer src/lib/components/slider/Slider.svelte
```

The tool returns findings and suggested changes; review and apply them, then run
it again. Keep local raw reports under the ignored `handoff/` directory. Continue
to run the compiler, lint, unit and relevant browser checks described in
[contributing](../CONTRIBUTING.md); autofixer output alone does not establish
behavior or motion parity.

## Validation of the loop-key changes

`vp check`, `vp run check` (zero errors/warnings), `vp run lint` and all 54 unit
tests passed. The production build also passed. The swipe regression and all 60 slider/bottom-sheet release runs
passed. The integrated gallery passed 45 of 46 cases on its first run, with a
normal-motion HoldToConfirm timeout. A focused repeat of the same gallery
assertions passed both normal and reduced-motion HoldToConfirm cases without
code changes or timing adjustments. The first failure report is retained locally;
its exact cause remains unproven. Existing gallery console warnings also remain.
