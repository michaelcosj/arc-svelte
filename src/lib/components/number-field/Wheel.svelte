<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { motionTokens as m, TargetSpring } from '#lib/motion';
	let { digit, direction, instant }: { digit: number; direction: number; instant: boolean } =
		$props();
	const position = new TargetSpring(
		untrack(() => digit),
		m.specs.snappy
	);
	let previous = untrack(() => digit),
		target = previous;
	$effect(() => {
		const next = digit,
			turn = direction,
			cut = instant || prefersReducedMotion.current;
		if (previous === next) return;
		let delta = turn > 0 ? (next - previous + 10) % 10 : -((previous - next + 10) % 10);
		if (Math.abs(delta) > 5) delta -= Math.sign(delta) * 10;
		target += delta;
		previous = next;
		void position.set(target, { instant: cut });
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

<span class="arc-number-field__sizer">0</span
>{#each [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as item (item)}<span
		bind:this={glyphs[item]}
		class="arc-number-field__glyph"
		style={glyphStyle(item, position.current)}>{item}</span
	>{/each}
