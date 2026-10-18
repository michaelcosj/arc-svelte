<script lang="ts">
	import type { SwipeActionsProps } from './types';
	import { SwipeGroup, setSwipeGroup } from './swipe-actions-state.svelte';
	import './swipe-actions.css';
	let { label, children, class: className }: SwipeActionsProps = $props();
	const group = setSwipeGroup(new SwipeGroup());
	$effect(() => {
		const id = group.openId;
		if (!id) return;
		const down = (event: PointerEvent) => {
			if (event.target instanceof Node && group.rows.get(id)?.contains(event.target)) return;
			group.openId = null;
		};
		const key = (event: KeyboardEvent) => {
			if (event.key === 'Escape') group.openId = null;
		};
		document.addEventListener('pointerdown', down, true);
		document.addEventListener('keydown', key);
		return () => {
			document.removeEventListener('pointerdown', down, true);
			document.removeEventListener('keydown', key);
		};
	});
</script>

<div class={['arc-swipe-actions__surface', className]}>
	<!-- svelte-ignore a11y_no_noninteractive_tabindex (Programmatic fallback focus after the last row is removed.) -->
	<ul role="list" aria-label={label} tabindex={-1} class="arc-swipe-actions__list">
		{@render children()}
	</ul>
</div>
