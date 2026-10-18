<script lang="ts">
	import { untrack } from 'svelte';
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import { motionTokens as m, springCurve } from '#lib/motion';

	let { cell }: { cell: number } = $props();
	const initial = untrack(() => cell);
	const col = new Tween(initial >= 0 ? initial % 7 : 0);
	const row = new Tween(initial >= 0 ? Math.floor(initial / 7) : 0);
	const opacity = new Tween(initial >= 0 ? 1 : 0);
	const scale = new Tween(initial >= 0 ? 1 : 0.6);
	let hidden = initial < 0;
	$effect(() => {
		const next = cell;
		const reduced = prefersReducedMotion.current;
		untrack(() => {
			if (next < 0) {
				hidden = true;
				const fade = { duration: reduced ? 0 : 140, easing: m.ease.standard };
				void opacity.set(0, fade);
				void scale.set(0.6, fade);
				return;
			}
			const nextCol = next % 7,
				nextRow = Math.floor(next / 7);
			void col.set(
				nextCol,
				hidden || reduced
					? { duration: 0 }
					: springCurve(m.specs.morph, Math.abs(nextCol - col.current))
			);
			void row.set(
				nextRow,
				hidden || reduced
					? { duration: 0 }
					: springCurve(m.specs.morph, Math.abs(nextRow - row.current))
			);
			hidden = false;
			void opacity.set(1, { duration: reduced ? 0 : m.duration.fast, easing: m.ease.enter });
			void scale.set(1, reduced ? { duration: 0 } : m.spring.snappy);
		});
	});
</script>

<span
	class="arc-calendar__highlight"
	aria-hidden="true"
	style:opacity={opacity.current}
	style:transform="translate(calc({col.current} * (100% + 4px)), calc({row.current} * (100% + 4px))) scale({scale.current})"
	><span class="arc-calendar__highlight-fill"></span></span
>
