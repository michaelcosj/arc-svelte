<script lang="ts">
	import { untrack } from 'svelte';
	let { animate }: { animate: boolean } = $props();
	const draw = untrack(() => animate);
</script>

<svg
	class="arc-file-dropzone__stateIcon"
	class:arc-file-dropzone__draw={draw}
	width={14}
	height={14}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={2.25}
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<path pathLength="1" d="M12 2.5a9.5 9.5 0 1 1 0 19a9.5 9.5 0 1 1 0-19" />
	<path pathLength="1" d="m8.2 12.4 2.6 2.6 5-5.2" />
</svg>
