<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import { motionTokens as m, WidthMorph, Mounted, swap } from '#lib/motion';
	let { word, direction }: { word: string; direction: number } = $props();
	const reduced = $derived(prefersReducedMotion.current),
		mounted = new Mounted();
	const width = new WidthMorph(() => ({
		reduced,
		follow: true,
		measure: 'offset',
		pinned: true,
		spec: m.specs.morph
	}));
</script>

<span class="arc-number-field__wordSlot" {@attach width.body}
	><span class="arc-number-field__wordSizer" {@attach width.content}>{word}</span>{#key word}<span
			class="arc-number-field__word"
			in:swap={reduced
				? { duration: m.duration.instant, skip: !mounted.current }
				: {
						y: `${direction * 0.3}em`,
						blur: m.blur.soft,
						duration: 220,
						easing: m.ease.enter,
						fade: { ...m.spring.morph },
						skip: !mounted.current
					}}
			out:swap={reduced
				? { skip: true }
				: {
						y: `${direction * -0.3}em`,
						blur: m.blur.subtle,
						duration: 140,
						easing: m.ease.standard,
						pop: true
					}}>{word}</span
		>{/key}</span
>
