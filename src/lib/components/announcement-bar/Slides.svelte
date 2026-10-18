<script lang="ts">
	import { Mounted } from '#lib/motion';
	import type { Announcement } from './types';
	import Face from './Face.svelte';
	let {
		announcement,
		exitingBar,
		direction,
		reduced,
		position,
		total,
		onSize,
		onAction,
		onCountdownEnd
	}: {
		announcement: Announcement;
		exitingBar: () => boolean;
		direction: number;
		reduced: boolean;
		position: number;
		total: number;
		onSize: (height: number) => void;
		onAction?: (announcement: Announcement) => void;
		onCountdownEnd?: (announcement: Announcement) => void;
	} = $props();
	const mounted = new Mounted();
</script>

{#key announcement.id}<Face
		{exitingBar}
		skip={!mounted.current}
		{announcement}
		{direction}
		{reduced}
		{position}
		{total}
		{onSize}
		{onAction}
		{onCountdownEnd}
	/>{/key}
