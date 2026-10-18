<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { untrack } from 'svelte';
	import { motionTokens as m, springCurve } from '#lib/motion';
	let {
		complete,
		vertical,
		delay,
		reduced
	}: { complete: boolean; vertical: boolean; delay: number; reduced: boolean } = $props();
	const fill = new Tween(untrack(() => (complete ? 1 : 0)));
	$effect(() => {
		void fill.set(complete ? 1 : 0, {
			...springCurve(m.specs.smooth, 1),
			delay,
			duration: reduced ? 0 : springCurve(m.specs.smooth, 1).duration
		});
	});
</script>

<span
	class="arc-stepper__fill"
	style:transform={vertical ? `scaleY(${fill.current})` : `scaleX(${fill.current})`}
></span>
