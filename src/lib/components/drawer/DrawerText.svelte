<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import { motionTokens as m, Mounted, swap, type SwapParams } from '#lib/motion';

	/** When the title or description changes while open, the new copy rises in and the old copy leaves upward. */
	let { text }: { text: string } = $props();

	const reduced = $derived(prefersReducedMotion.current);
	// AnimatePresence initial={false}: the copy that opens with the dialog doesn't animate on its own.
	const mounted = new Mounted();

	const enter = $derived<SwapParams>(
		reduced
			? { skip: true }
			: {
					y: '0.3em',
					blur: m.blur.soft,
					duration: m.duration.standard,
					easing: m.ease.enter,
					skip: !mounted.current
				}
	);
	const leave = $derived<SwapParams>(
		reduced
			? { duration: 0, pop: true }
			: {
					y: '-0.3em',
					blur: m.blur.subtle,
					duration: m.duration.fast,
					easing: m.ease.standard,
					pop: true
				}
	);
</script>

{#key text}
	<span class="arc-drawer__swap" style:filter="blur(0px)" in:swap={enter} out:swap={leave}
		>{text}</span
	>
{/key}
