<script lang="ts">
	import { untrack } from 'svelte';
	import { Spring } from 'svelte/motion';
	import { motionTokens as m, springOptions, wheelGlyphStyle } from '#lib/motion';

	/** A digit wheel. It always turns in the direction the whole number moved, wrapping 9 → 0 like an odometer. */
	let {
		digit,
		direction,
		armed,
		delay,
		reduced
	}: { digit: number; direction: number; armed: boolean; delay: number; reduced: boolean } =
		$props();
	// The column element around it belongs to AnimatedCounter, so its presence plays inside the keyed each.

	const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
	const smooth = m.physics.smooth;
	const reveal = springOptions({ ...m.specs.smooth, visualDuration: m.duration.considered / 1000 });

	const start = untrack(() => (armed ? 0 : digit));
	const position = new Spring(start, { ...smooth, precision: 0.001 });
	const wheel = { digit: start, target: start, revealed: untrack(() => !armed) };

	$effect(() => {
		const next = digit;
		const held = armed;
		const turn = direction;
		const wait = delay;
		const instant = reduced;
		let timer: ReturnType<typeof setTimeout> | undefined;
		if (held || wheel.digit === next) {
			if (!held) wheel.revealed = true;
			return;
		}
		wheel.target +=
			turn < 0 && wheel.revealed
				? -((wheel.digit - next + 10) % 10)
				: (next - wheel.digit + 10) % 10;
		wheel.digit = next;
		const target = wheel.target;
		if (instant) void position.set(target, { instant: true });
		else if (wheel.revealed) {
			position.stiffness = smooth.stiffness;
			position.damping = smooth.damping;
			void position.set(target);
		} else {
			// The first reveal rolls in on a slower spring, staggered by place.
			position.stiffness = reveal.stiffness;
			position.damping = reveal.damping;
			timer = setTimeout(() => void position.set(target), wait);
		}
		wheel.revealed = true;
		return () => clearTimeout(timer);
	});
</script>

<span class="arc-animated-counter__sizer">0</span>
{#each DIGITS as item (item)}
	<span class="arc-animated-counter__glyph" style={wheelGlyphStyle(position.current, item)}
		>{item}</span
	>
{/each}
