<script lang="ts">
	import { untrack } from 'svelte';
	import { flip } from 'svelte/animate';
	import { prefersReducedMotion } from 'svelte/motion';
	import { motionTokens as m, PopLayout, swap, WidthMorph, type SwapParams } from '#lib/motion';
	import type { TextMorphProps } from './types';
	import './text-morph.css';

	/**
	 * Morphs one short label into the next in place. Letters both strings share glide to their new
	 * positions, new letters sharpen in, removed letters blur away, and the width follows on a spring
	 * so the surrounding layout glides instead of jumping. Use it for status words that change a few
	 * letters at a time, such as Publish, Publishing, and Published, or Follow and Following. It stays
	 * on one line, and assistive technology reads the plain text.
	 */
	let { text, as = 'span', class: className, id, ref = $bindable(null) }: TextMorphProps = $props();

	const reduced = $derived(prefersReducedMotion.current);
	const soft = m.blur.soft;
	/** Lets leaving letters start to clear before the first new letter sharpens in their place. */
	const HANDOFF = 50;

	/** Letters match by character and occurrence, so the second "i" in one string pairs with the second "i" in the next. */
	function toGlyphs(value: string) {
		const seen: Record<string, number> = {};
		return Array.from(value).map((char) => {
			const count = seen[char] ?? 0;
			seen[char] = count + 1;
			return { char, key: `${char}-${count}` };
		});
	}

	// The previous label tells which letters are new, so only they stagger, in reading order, however far along the word they sit.
	let labels = $state.raw(untrack(() => ({ current: text, previous: text })));
	const glyphs = $derived.by(() => {
		const kept = new Set(toGlyphs(labels.previous).map((glyph) => glyph.key));
		let entering = 0;
		return toGlyphs(text).map((glyph) => ({
			...glyph,
			order: kept.has(glyph.key) ? 0 : entering++
		}));
	});

	// The frame's width springs to the track, which already has the new letters in place; font loads and resizes follow at once.
	const width = new WidthMorph(() => ({ reduced }));
	const layout = new PopLayout();
	let track = $state<HTMLElement>();
	$effect.pre(() => {
		const next = text;
		untrack(() => {
			if (labels.current !== next) labels = { current: next, previous: labels.current };
			layout.capture(track);
			width.changed();
		});
	});

	const glyphIn = (order: number): SwapParams =>
		reduced
			? { skip: true }
			: {
					y: '0.14em',
					scale: 0.8,
					blur: soft,
					duration: m.duration.standard + 40,
					easing: m.ease.enter,
					delay: HANDOFF + Math.min(order, 8) * m.stagger.char * 2
				};
	const glyphOut = (key: string): SwapParams =>
		reduced
			? { duration: 0, pop: layout.box(key) }
			: {
					y: '-0.1em',
					scale: 0.86,
					blur: soft,
					duration: m.duration.exit,
					easing: m.ease.standard,
					pop: layout.box(key)
				};
</script>

<svelte:element this={as} bind:this={ref} {id} class={className}>
	<span class="arc-text-morph__sr-only">{text}</span>
	<span class="arc-text-morph__frame" aria-hidden="true" {@attach width.body}>
		<span bind:this={track} class="arc-text-morph__track" {@attach width.content}>
			{#each glyphs as glyph (glyph.key)}
				<span
					class="arc-text-morph__glyph"
					data-pop-key={glyph.key}
					animate:flip={reduced ? { duration: 0 } : m.spring.morph}
					in:swap={glyphIn(glyph.order)}
					out:swap={glyphOut(glyph.key)}>{glyph.char === ' ' ? ' ' : glyph.char}</span
				>
			{/each}
		</span>
	</span>
</svelte:element>
