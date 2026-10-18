<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import type { Snippet } from 'svelte';
	import { HeightMorph } from '#lib/motion';
	let { children }: { children: Snippet } = $props();
	const height = new HeightMorph(() => ({ reduced: prefersReducedMotion.current, follow: true }));
</script>

<div class="arc-combobox__auto-height" {@attach height.body}>
	<div {@attach height.content}>{@render children()}</div>
</div>
