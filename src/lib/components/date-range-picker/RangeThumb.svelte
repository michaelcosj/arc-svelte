<script lang="ts">
	import { PhysicalSpring } from '#lib/motion';
	import { Tween } from 'svelte/motion';
	import { untrack } from 'svelte';
	let { cell, reduced }: { cell: { row: number; col: number } | null; reduced: boolean } = $props();
	const spec = { visualDuration: 0.3, bounce: 0.1 },
		x = new PhysicalSpring(
			untrack(() => cell?.col ?? 0),
			spec
		),
		y = new PhysicalSpring(
			untrack(() => cell?.row ?? 0),
			spec
		),
		scale = new PhysicalSpring(
			untrack(() => (cell ? 1 : 0.8)),
			spec
		),
		opacity = new Tween(untrack(() => (cell ? 1 : 0)));
	let hidden = untrack(() => !cell);
	$effect(() => {
		const next = cell;
		untrack(() => {
			if (!next) {
				hidden = true;
				void opacity.set(0, { duration: reduced ? 0 : 120 });
				if (reduced) scale.jump(0.8);
				else scale.set(0.8);
				return;
			}
			if (hidden || reduced) {
				x.jump(next.col);
				y.jump(next.row);
			} else {
				x.set(next.col);
				y.set(next.row);
			}
			hidden = false;
			void opacity.set(1, { duration: reduced ? 0 : 160 });
			if (reduced) scale.jump(1);
			else scale.set(1);
		});
	});
	function cleanup() {
		return () => {
			x.destroy();
			y.destroy();
			scale.destroy();
		};
	}
</script>

<span
	class="arc-date-range-picker__thumb"
	style:transform={`translate(${x.current * 100}%,${y.current * 100}%) scale(${scale.current})`}
	style:opacity={opacity.current}
	{@attach cleanup}
></span>
