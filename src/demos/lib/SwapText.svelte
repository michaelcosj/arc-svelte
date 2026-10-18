<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import { motionTokens as m, swap, type SwapParams } from '#lib/motion';

	/** The gallery's text swap for demo buttons and status lines; `reserve` holds the widest copy's room. */
	let { text, reserve = [] }: { text: string; reserve?: string[] } = $props();

	const reduced = $derived(prefersReducedMotion.current);
	const timing = $derived({ duration: reduced ? 120 : 300, easing: m.ease.enter });
	const enter = $derived<SwapParams>(
		reduced ? timing : { ...timing, y: '0.35em', blur: m.blur.soft }
	);
	const leave = $derived<SwapParams>(
		reduced ? { ...timing, pop: true } : { ...timing, y: '-0.3em', blur: m.blur.subtle, pop: true }
	);
</script>

<span class="swap">
	{#each reserve as copy (copy)}<span class="reserve" aria-hidden="true">{copy}</span>{/each}
	{#key text}<span in:swap={enter} out:swap={leave}>{text}</span>{/key}
</span>

<style>
	.swap {
		display: inline-grid;
		justify-items: center;
	}

	.swap > :global(*) {
		grid-area: 1 / 1;
		white-space: nowrap;
	}

	.reserve {
		visibility: hidden;
	}
</style>
