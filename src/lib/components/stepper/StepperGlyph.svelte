<script lang="ts">
	import { motionTokens as m, swap, easeInOut } from '#lib/motion';
	import type { GlyphKind } from './types';
	let {
		kind,
		number,
		delay,
		reduced,
		skip
	}: { kind: GlyphKind; number: number; delay: number; reduced: boolean; skip: boolean } = $props();
	const entrance = $derived({
		scale: 0.5,
		blur: m.blur.subtle,
		...m.spring.snappy,
		duration: reduced ? 0 : m.spring.snappy.duration,
		delay,
		fade: { duration: reduced ? 0 : m.duration.fast, delay: 0, easing: easeInOut },
		skip
	});
	const exit = $derived({
		scale: 0.5,
		blur: m.blur.subtle,
		duration: reduced ? 0 : m.duration.fast,
		easing: m.ease.standard
	});
</script>

{#if kind === 'number'}<span
		class="arc-stepper__glyph"
		in:swap|global={entrance}
		out:swap|global={exit}>{number}</span
	>{:else}<svg
		class="arc-stepper__glyph arc-stepper__icon"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width={2.5}
		stroke-linecap="round"
		stroke-linejoin="round"
		in:swap|global={entrance}
		out:swap|global={exit}
		style:--draw-delay={`${delay + 40}ms`}
		style:--dot-delay={`${delay + 160}ms`}
		data-still={skip || reduced}
		>{#if kind === 'check'}<path
				class="arc-stepper__draw"
				pathLength={1}
				d="M5.5 12.5l4.25 4.25L18.5 8"
			/>{:else}<path class="arc-stepper__draw" pathLength={1} d="M12 6.75v6.5" /><circle
				class="arc-stepper__dot"
				cx={12}
				cy={17.4}
				r={1.4}
				fill="currentColor"
				stroke="none"
			/>{/if}</svg
	>{/if}
