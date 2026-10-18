<script lang="ts">
	import {
		motionTokens as m,
		Mounted,
		moneyGlyphPresence,
		widthPresence,
		easeOut
	} from '#lib/motion';
	import type { Part } from './format';
	let {
		parts,
		direction,
		instant,
		reduced
	}: { parts: Part[]; direction: number; instant: boolean; reduced: boolean } = $props();
	const mounted = new Mounted();
</script>

{#each parts as part (part.key)}<span
		class="arc-money-input__column"
		data-ghost={part.ghost || undefined}
		in:widthPresence={{
			skip: instant || reduced || !mounted.current,
			spec: m.specs.morph,
			fade: { duration: m.duration.fast, easing: easeOut }
		}}
		out:widthPresence={{
			skip: instant || reduced,
			spec: m.specs.smooth,
			spring: m.spring.smooth,
			fade: { duration: m.duration.instant, easing: easeOut }
		}}
	>
		<span class="arc-money-input__sizer">{part.char}</span>{#key part.char}<span
				class="arc-money-input__glyph"
				in:moneyGlyphPresence={{ direction, instant, reduced, skip: !mounted.current }}
				out:moneyGlyphPresence={{ direction, instant, reduced }}>{part.char}</span
			>{/key}</span
	>{/each}
