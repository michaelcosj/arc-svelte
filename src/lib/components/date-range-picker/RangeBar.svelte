<script lang="ts">
	import { PhysicalSpring } from '#lib/motion';
	import { Tween } from 'svelte/motion';
	import { untrack } from 'svelte';
	let {
		row,
		segment,
		reduced
	}: { row: number; segment: { left: number; width: number } | null; reduced: boolean } = $props();
	const left = new PhysicalSpring(
			untrack(() => segment?.left ?? 0),
			{ visualDuration: 0.3, bounce: 0.04 }
		),
		width = new PhysicalSpring(
			untrack(() => segment?.width ?? 0),
			{ visualDuration: 0.3, bounce: 0.04 }
		),
		opacity = new Tween(untrack(() => (segment ? 1 : 0)));
	let empty = untrack(() => !segment);
	$effect(() => {
		const next = segment;
		untrack(() => {
			if (!next) {
				empty = true;
				void opacity.set(0, { duration: reduced ? 0 : 140 });
				return;
			}
			if (empty || reduced) {
				left.jump(next.left);
				width.jump(next.width);
			} else {
				left.set(next.left);
				width.set(next.width);
			}
			empty = false;
			void opacity.set(1, { duration: reduced ? 0 : 160 });
		});
	});
	function cleanup() {
		return () => {
			left.destroy();
			width.destroy();
		};
	}
</script>

<span
	class="arc-date-range-picker__bar"
	style:left={`${left.current}%`}
	style:width={`${width.current}%`}
	style:opacity={opacity.current}
	style:top={`calc(${row} * var(--cell) + 3px)`}
	{@attach cleanup}
></span>
