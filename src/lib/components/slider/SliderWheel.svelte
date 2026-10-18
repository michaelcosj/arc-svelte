<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { motionTokens as m, TargetSpring, springPhysics } from '#lib/motion';
	let { digit, direction }: { digit: number; direction: number } = $props();
	const position = new TargetSpring(
		untrack(() => digit),
		springPhysics(m.specs.snappy),
		{ delta: 0.002, speed: 0.02 }
	);
	let previous = untrack(() => digit),
		target = previous;
	$effect(() => {
		const next = digit;
		const reduced = prefersReducedMotion.current;
		untrack(() => {
			if (next === previous) return;
			target += direction > 0 ? (next - previous + 10) % 10 : -((previous - next + 10) % 10);
			previous = next;
			void position.set(target, { instant: reduced });
		});
	});
	let glyphs = $state<(HTMLSpanElement | undefined)[]>([]);
	function glyphStyle(item: number, current: number) {
		const offset = ((((item - current) % 10) + 15) % 10) - 5,
			distance = Math.abs(offset);
		return `transform:translateY(${offset * 1.05}em);opacity:${Math.max(0, 1 - distance ** 1.5 * 1.1)};visibility:${distance >= 1 ? 'hidden' : 'visible'};filter:${distance < 0.02 || distance >= 1 ? 'none' : `blur(${(distance * m.blur.soft * 0.75).toFixed(2)}px)`};`;
	}
	const unsubscribe = position.subscribe((value) => {
		glyphs.forEach((node, item) => {
			if (node) node.style.cssText = glyphStyle(item, value);
		});
	});
	onDestroy(unsubscribe);
</script>

<span class="arc-slider__sizer">0</span>{#each [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as item (item)}<span
		bind:this={glyphs[item]}
		class="arc-slider__glyph"
		style={glyphStyle(item, position.current)}>{item}</span
	>{/each}
