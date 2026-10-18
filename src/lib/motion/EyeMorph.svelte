<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import './eye-morph.css';
	/** A shared eye whose slash cuts the outline beneath it while drawing in. */
	let {
		slashed,
		path = 'M2 2l20 20',
		reduced = Boolean(prefersReducedMotion.current)
	}: { slashed: boolean; path?: string; reduced?: boolean } = $props();
	const uid = $props.id();
	const maskId = `eye-${uid.replace(/[^a-zA-Z0-9_-]/g, '')}`;
</script>

<svg
	class="arc-eye-morph"
	data-slashed={slashed}
	data-reduced={reduced || undefined}
	width="18"
	height="18"
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.75"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	><mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"
		><rect width="24" height="24" fill="white" stroke="none" /><path
			class="arc-eye-morph__slash"
			d={path}
			stroke="black"
			stroke-width="5"
			pathLength="1"
		/></mask
	><g mask={`url(#${maskId})`}
		><path
			d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"
		/><circle cx="12" cy="12" r="3" /></g
	><path class="arc-eye-morph__slash" d={path} pathLength="1" /></svg
>
