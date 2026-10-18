<script lang="ts">
	import { untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import {
		Mounted,
		WidthMorph,
		contentSwap,
		easeInOut,
		swap,
		motionTokens as m
	} from '#lib/motion';
	let {
		text,
		morph = false,
		block = false
	}: { text: string; morph?: boolean; block?: boolean } = $props();
	const reduced = $derived(!!prefersReducedMotion.current);
	const mounted = new Mounted();
	const width = new WidthMorph(() => ({
		reduced,
		pinned: true,
		contentKey: text,
		spec: m.specs.morph
	}));
	const amountIn = (copy: string) =>
		Number(copy.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/)?.[0] ?? NaN);
	let previous = untrack(() => text);
	let direction = $state(1);
	$effect.pre(() => {
		const next = text;
		untrack(() => {
			if (previous !== next) {
				direction = amountIn(next) < amountIn(previous) ? -1 : 1;
				previous = next;
			}
		});
	});
	const motion = $derived.by(() => {
		const copy = contentSwap(reduced, mounted.current);
		copy.textIn.y = reduced ? 0 : `${0.3 * direction}em`;
		copy.textOut.y = reduced ? 0 : `${-0.3 * direction}em`;
		if (reduced) {
			copy.textIn.easing = easeInOut;
			copy.textOut.easing = easeInOut;
		}
		return copy;
	});
</script>

<span
	class={block ? 'arc-metric-card__swapBlock' : 'arc-metric-card__swap'}
	{@attach morph ? width.body : undefined}
>
	{#if morph}<span class="arc-metric-card__sizer" aria-hidden="true" {@attach width.content}
			>{text}</span
		>{/if}
	{#each [text] as copy (copy)}<span
			class="arc-metric-card__text"
			in:swap={motion.textIn}
			out:swap={motion.textOut}>{copy}</span
		>{/each}
</span>
