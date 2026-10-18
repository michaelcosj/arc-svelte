<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Spring } from 'svelte/motion';
	import { motionTokens as m, wheelGlyphStyle } from '#lib/motion';
	let {
		digit,
		base,
		delay,
		reduced
	}: { digit: number; base: number; delay: number; reduced: boolean } = $props();
	const position = new Spring(0, { ...m.physics.smooth, precision: 0.001 });
	const wheel = { digit: 0, target: 0, revealed: false };
	let timer: ReturnType<typeof setTimeout> | undefined;
	onDestroy(() => clearTimeout(timer));
	$effect(() => {
		const next = digit,
			radix = base,
			wait = delay,
			instant = reduced;
		if (wheel.digit === next) {
			wheel.revealed = true;
			return;
		}
		const up = (next - wheel.digit + radix) % radix,
			down = radix - up;
		wheel.target += down <= up ? -down : up;
		wheel.digit = next;
		const first = !wheel.revealed;
		wheel.revealed = true;
		clearTimeout(timer);
		if (instant) void position.set(wheel.target, { instant: true });
		else {
			const spring = first ? m.physics.smooth : m.physics.snappy;
			position.stiffness = spring.stiffness;
			position.damping = spring.damping;
			const target = wheel.target;
			if (first) timer = setTimeout(() => void position.set(target), wait);
			else void position.set(target);
		}
	});
</script>

<span class="arc-countdown__sizer">0</span>
{#each Array.from({ length: base }, (_, i) => i) as value (value)}<span
		class="arc-countdown__glyph"
		style={wheelGlyphStyle(position.current, value, base)}>{value}</span
	>{/each}
