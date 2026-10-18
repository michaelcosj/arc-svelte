<script lang="ts">
	import { untrack } from 'svelte';
	import { Mounted, motionTokens as m, swap } from '#lib/motion';
	let { value, reduced }: { value: number; reduced: boolean } = $props();
	let previous = untrack(() => value),
		direction = $state(1);
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

<span class="arc-chat-thread__count-roll"
	>{#key value}<span
			in:swap={{
				y: reduced ? 0 : direction * 8,
				...(reduced ? { duration: 160 } : m.spring.snappy),
				skip: !mounted.current
			}}
			out:swap={{
				y: reduced ? 0 : direction * -8,
				...(reduced ? { duration: 160 } : m.spring.snappy),
				pop: true
			}}>{value}</span
		>{/key}</span
>
