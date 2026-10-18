<script lang="ts">
	import { Mounted, motionTokens as m, swap, easeInOut } from '#lib/motion';
	import type { GlyphKind } from './types';
	import Glyph from './StepperGlyph.svelte';
	let {
		number,
		kind,
		current,
		glyphDelay,
		ringDelay,
		reduced
	}: {
		number: number;
		kind: GlyphKind;
		current: boolean;
		glyphDelay: number;
		ringDelay: number;
		reduced: boolean;
	} = $props();
	const mounted = new Mounted();
</script>

<span class="arc-stepper__marker" aria-hidden="true">
	{#if current}<span
			class="arc-stepper__ring"
			in:swap={{
				scale: 0.6,
				...m.spring.snappy,
				duration: reduced ? 0 : m.spring.snappy.duration,
				delay: ringDelay,
				fade: { duration: reduced ? 0 : m.duration.fast, delay: 0, easing: easeInOut },
				skip: !mounted.current
			}}
			out:swap={{ scale: 0.6, duration: reduced ? 0 : m.duration.fast, easing: m.ease.standard }}
		></span>{/if}
	<span class="arc-stepper__disc"
		>{#key kind}<Glyph
				{kind}
				{number}
				delay={glyphDelay}
				{reduced}
				skip={!mounted.current}
			/>{/key}</span
	>
</span>
