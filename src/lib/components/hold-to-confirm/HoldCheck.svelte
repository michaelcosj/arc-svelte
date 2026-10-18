<script lang="ts">
	import { untrack } from 'svelte';
	let { reduced, animate }: { reduced: boolean; animate: boolean } = $props();
	// AnimatePresence initial={false} suppresses the nested check on an initially confirmed face.
	let draw = $state(untrack(() => animate && !reduced));
	$effect(() => {
		if (reduced) draw = false;
	});
</script>

<svg
	width="18"
	height="18"
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<path
		class="arc-hold-to-confirm__check"
		data-reduced={!draw}
		pathLength="1"
		d="M4 12.5l5 5L20 6.5"
	/>
</svg>
