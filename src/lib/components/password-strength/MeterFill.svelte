<script lang="ts">
	import { untrack } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { motionTokens as m, springCurve } from '#lib/motion';
	let { on, delay, reduced }: { on: boolean; delay: number; reduced: boolean } = $props();
	const position = new Tween(untrack(() => (on ? 0 : -101)));
	$effect(() => {
		void position.set(on ? 0 : -101, {
			...springCurve(m.specs.smooth, 101),
			duration: reduced ? 0 : springCurve(m.specs.smooth, 101).duration,
			delay: reduced ? 0 : delay
		});
	});
</script>

<span class="arc-password-strength__fill" style:transform={`translateX(${position.current}%)`}
></span>
