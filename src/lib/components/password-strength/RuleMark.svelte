<script lang="ts">
	import { untrack } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { motionTokens as m, easeInOut, springCurve } from '#lib/motion';
	let { met, delay, reduced }: { met: boolean; delay: number; reduced: boolean } = $props();
	const scale = new Tween(untrack(() => (met ? 1 : 0.5))),
		opacity = new Tween(untrack(() => (met ? 1 : 0))),
		draw = new Tween(untrack(() => (met ? 1 : 0))),
		ink = new Tween(untrack(() => (met ? 1 : 0)));
	$effect(() => {
		void scale.set(met ? 1 : 0.5, {
			...springCurve(m.specs.snappy, 0.5),
			duration: reduced ? 0 : springCurve(m.specs.snappy, 0.5).duration,
			delay: reduced ? 0 : delay
		});
		void opacity.set(met ? 1 : 0, {
			duration: reduced ? 0 : met ? m.duration.fast : m.duration.instant,
			easing: easeInOut,
			delay: reduced ? 0 : delay
		});
		void draw.set(met ? 1 : 0, {
			duration: reduced ? 0 : met ? m.duration.standard : m.duration.fast,
			easing: met ? m.ease.enter : m.ease.standard,
			delay: reduced ? 0 : met ? delay + 60 : 0
		});
		void ink.set(met ? 1 : 0, {
			duration: reduced ? 0 : met ? 50 : m.duration.fast,
			easing: easeInOut,
			delay: reduced ? 0 : met ? delay + 60 : 60
		});
	});
</script>

<span class="arc-password-strength__mark" aria-hidden="true"
	><span
		class="arc-password-strength__mark-fill"
		style:transform={`scale(${scale.current})`}
		style:opacity={opacity.current}
	></span><svg
		class="arc-password-strength__tick"
		viewBox="0 0 16 16"
		fill="none"
		stroke="currentColor"
		stroke-width="1.75"
		stroke-linecap="round"
		stroke-linejoin="round"
		><path
			d="M4.75 8.25 7 10.5l4.25-4.75"
			pathLength="1"
			stroke-dasharray="1 1"
			style:stroke-dashoffset={1 - draw.current}
			style:opacity={ink.current}
		/></svg
	></span
>
