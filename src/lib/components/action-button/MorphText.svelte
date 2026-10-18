<script lang="ts">
	import { untrack } from 'svelte';
	import { flip } from 'svelte/animate';
	import {
		WidthMorph,
		PopLayout,
		Mounted,
		createGlyphRun,
		updateGlyphRun,
		swap,
		motionTokens as m
	} from '#lib/motion';
	let { text, reduced }: { text: string; reduced: boolean } = $props();
	const mounted = new Mounted();
	let glyphState = $state(untrack(() => createGlyphRun(text)));
	let row = $state<HTMLSpanElement>();
	const width = new WidthMorph(() => ({ reduced, pinned: true, window: 700 })),
		layout = new PopLayout();
	$effect.pre(() => {
		const nextText = text;
		untrack(() => {
			if (glyphState.text === nextText) return;
			layout.capture(row);
			width.changed();
			glyphState = updateGlyphRun(glyphState, nextText);
		});
	});
</script>

<span class="arc-action-button__morph" aria-hidden="true" {@attach width.body}
	><span bind:this={row} class="arc-action-button__glyphs" {@attach width.content}
		>{#each glyphState.glyphs as glyph (glyph.id)}<span
				class="arc-action-button__glyph"
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
	></span
>
