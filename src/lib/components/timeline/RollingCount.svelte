<script lang="ts">
	import { untrack } from 'svelte';
	import RiseText from './RiseText.svelte';
	let { value, reduced }: { value: number; reduced: boolean } = $props();
	let state = $state(untrack(() => ({ value, direction: 1 })));
	$effect.pre(() => {
		const next = value;
		untrack(() => {
			if (state.value !== next) state = { value: next, direction: next > state.value ? 1 : -1 };
		});
	});
	const chars = $derived([...String(value)]);
</script>

<span class="arc-timeline__rolling" aria-hidden="true"
	>{#each chars as char, index (chars.length - index)}<span class="arc-timeline__place"
			><RiseText text={char} {reduced} direction={state.direction} /></span
		>{/each}</span
>
