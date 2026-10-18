<script lang="ts">
	import { untrack } from 'svelte';
	import { Tween } from 'svelte/motion';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import { motionTokens as m } from '#lib/motion';
	let { active, descending, reduced }: { active: boolean; descending: boolean; reduced: boolean } =
		$props();
	const rotate = new Tween(untrack(() => (descending ? 180 : 0)));
	let wasActive = untrack(() => active),
		hiddenAt = -Infinity;
	$effect(() => {
		const shown = active,
			down = descending,
			snap = reduced;
		untrack(() => {
			if (shown) {
				const visible = wasActive || performance.now() - hiddenAt < 160;
				void rotate.set(down ? 180 : 0, visible && !snap ? m.spring.snappy : { duration: 0 });
			} else if (wasActive) hiddenAt = performance.now();
			wasActive = shown;
		});
	});
</script>

<span class="arc-sortable-data-table__sort-icon" aria-hidden="true"
	><ArrowUp class="arc-sortable-data-table__sort-hint" size={16} strokeWidth={1.75} /><span
		class="arc-sortable-data-table__sort-arrow"
		data-active={active || undefined}
		style:rotate={`${rotate.current}deg`}><ArrowUp size={16} strokeWidth={1.75} /></span
	></span
>
