<script lang="ts">
	import { untrack } from 'svelte';
	import { Mounted, motionTokens as m, swap } from '#lib/motion';
	let {
		value,
		display = String(value),
		reduced
	}: { value: number; display?: string; reduced: boolean } = $props();
	let previous = untrack(() => value),
		direction = $state(0);
	const mounted = new Mounted();
	$effect.pre(() => {
		const next = value;
		untrack(() => {
			if (next !== previous) {
				direction = next > previous ? 1 : -1;
				previous = next;
			}
		});
	});
</script>

<span class="arc-notification-center__roll"
	>{#key display}<span
			class="arc-notification-center__roll-value"
			in:swap={{
				y: reduced ? 0 : `${direction >= 0 ? 0.7 : -0.7}em`,
				blur: reduced ? 0 : 2,
				...m.spring.snappy,
				fade: { duration: 160, easing: m.ease.standard },
				skip: reduced || !mounted.current
			}}
			out:swap={{
				y: reduced ? 0 : `${direction >= 0 ? -0.7 : 0.7}em`,
				blur: reduced ? 0 : 2,
				duration: reduced ? 120 : 160,
				easing: m.ease.standard,
				pop: true
			}}>{display}</span
		>{/key}</span
>
