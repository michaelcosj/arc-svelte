<script lang="ts">
	import { untrack } from 'svelte';
	import { flip } from 'svelte/animate';
	import {
		Mounted,
		PopLayout,
		createGlyphRun,
		updateGlyphRun,
		swap,
		motionTokens as m
	} from '#lib/motion';
	let { text, reduced }: { text: string; reduced: boolean } = $props();
	const mounted = new Mounted();
	const layout = new PopLayout();
	let run = $state(untrack(() => createGlyphRun(text)));
	let row = $state<HTMLSpanElement>();
	// Shared leading and trailing characters keep their identity; only the changed letters swap.
	$effect.pre(() => {
		const next = text;
		untrack(() => {
			if (run.text === next) return;
			layout.capture(row);
			run = updateGlyphRun(run, next);
		});
	});
</script>

<span bind:this={row} class="arc-split-button__glyphs"
	>{#each run.glyphs as glyph (glyph.id)}<span
			class="arc-split-button__glyph"
			data-pop-key={glyph.id}
			animate:flip={reduced ? { duration: 0 } : m.spring.morph}
			in:swap={{
				y: reduced ? 0 : 5,
				blur: reduced ? 0 : m.blur.soft,
				duration: reduced ? m.duration.instant : m.duration.standard,
				easing: reduced ? undefined : m.ease.enter,
				delay: reduced ? 0 : Math.min(glyph.order * m.stagger.char, 100),
				skip: !mounted.current
			}}
			out:swap={{
				y: reduced ? 0 : -4,
				blur: reduced ? 0 : m.blur.subtle,
				duration: reduced ? m.duration.instant : m.duration.fast,
				easing: reduced ? undefined : m.ease.standard,
				pop: layout.box(glyph.id)
			}}>{glyph.char}</span
		>{/each}</span
>
