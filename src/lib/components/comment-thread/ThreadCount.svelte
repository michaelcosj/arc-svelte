<script lang="ts">
	import { untrack } from 'svelte';
	import { Mounted, motionTokens as m, swap } from '#lib/motion';
	let { value, reduced }: { value: number; reduced: boolean } = $props();
	let last = untrack(() => value),
		direction = $state(1);
	const mounted = new Mounted();
	$effect.pre(() => {
		const next = value;
		untrack(() => {
			if (next !== last) {
				direction = next > last ? 1 : -1;
				last = next;
			}
		});
	});
</script>

<span class="arc-comment-thread__count"
	>{#key value}<span
			in:swap={{
				y: reduced ? 0 : `${direction * 70}%`,
				...m.spring.snappy,
				skip: reduced || !mounted.current
			}}
			out:swap={{
				y: reduced ? 0 : `${direction * -70}%`,
				...m.spring.snappy,
				pop: true,
				skip: reduced
			}}>{value}</span
		>{/key}</span
>
