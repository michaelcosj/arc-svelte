<script lang="ts">
	import { untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import type { Easing } from './easing';
	import { motionTokens as m } from './tokens';
	import { swap, type SwapParams } from './swap';
	import { PopLayout } from './pop-layout';
	import { Mounted } from './mounted.svelte';
	import RollingNumber from './RollingNumber.svelte';

	/**
	 * Copy that changes word by word: changed words rise in and unblur while unchanged words hold
	 * still, and (with `numbers`) counts roll digit by digit. Assistive tech reads the plain copy.
	 */
	let {
		text,
		numbers = false,
		exit = { duration: m.duration.exit, easing: m.ease.standard }
	}: {
		text: string;
		/** Roll numbers ("12", "3/4", "80%") instead of swapping them as words. */
		numbers?: boolean;
		/** Timing of a leaving word. */
		exit?: { duration: number; easing?: Easing };
	} = $props();

	const reduced = $derived(prefersReducedMotion.current);
	const mounted = new Mounted();
	const isNumber = (word: string) => numbers && /^\d[\d.,/:]*%?$/.test(word);
	const words = $derived(
		text.split(' ').map((word, index, all) => ({
			word,
			key: `${index}:${isNumber(word) ? '#' : word}`,
			number: isNumber(word),
			last: index === all.length - 1
		}))
	);

	let root = $state<HTMLElement>();
	const layout = new PopLayout();
	$effect.pre(() => {
		void text;
		untrack(() => layout.capture(root));
	});

	const wordIn = $derived<SwapParams>(
		reduced
			? { duration: m.duration.instant, skip: !mounted.current }
			: {
					y: '0.35em',
					blur: m.blur.soft,
					duration: m.duration.standard,
					easing: m.ease.enter,
					skip: !mounted.current
				}
	);
	const wordOut = (key: string): SwapParams =>
		reduced ? { skip: true } : { y: '-0.35em', blur: m.blur.subtle, ...exit, pop: layout.box(key) };
</script>

<span class="arc-sr-only">{text}</span><span
	bind:this={root}
	class="arc-motion-text__words"
	aria-hidden="true"
	>{#each words as { word, key, number, last } (key)}<span
			class="arc-motion-text__word"
			data-pop-key={key}
			in:swap={wordIn}
			out:swap={wordOut(key)}
			>{#if number}<RollingNumber {word} />{:else}{word}{/if}{last ? '' : ' '}</span
		>{/each}</span
>
