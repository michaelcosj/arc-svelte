<script lang="ts">
	import { motionTokens as m, Mounted, swap, type SwapParams } from '#lib/motion';

	let { value, reduced }: { value: string; reduced: boolean } = $props();

	const mounted = new Mounted();
	/** The new words rise in with a soft blur while the old ones leave upward, faster. */
	const enter = $derived<SwapParams>(
		reduced || !mounted.current
			? { skip: true }
			: { y: '0.3em', blur: m.blur.soft, duration: m.duration.standard, easing: m.ease.enter }
	);
	const exit = $derived<SwapParams>(
		reduced
			? { duration: 0 }
			: { y: '-0.3em', blur: m.blur.subtle, duration: m.duration.instant, easing: m.ease.standard }
	);
</script>

{#key value}
	<span class="arc-code-block__swap-text" in:swap={enter} out:swap={exit}>{value}</span>
{/key}
