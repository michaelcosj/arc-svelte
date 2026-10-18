<script lang="ts">
	import { Mounted, motionTokens as m, swap } from '#lib/motion';
	let {
		text,
		direction = 1,
		reduced
	}: { text: string; direction?: number; reduced: boolean } = $props();
	const mounted = new Mounted();
</script>

<span class="arc-date-range-picker__rolling" aria-hidden="true"
	>{#each text.split(/\s+/).filter(Boolean) as word, index (index)}<span
			class="arc-date-range-picker__word"
			>{#key word}<span
					class="arc-date-range-picker__word-inner"
					in:swap={{
						y: reduced ? 0 : `${direction * 0.45}em`,
						blur: reduced ? 0 : 2,
						duration: reduced ? 120 : 260,
						easing: m.ease.enter,
						skip: !mounted.current
					}}
					out:swap={{
						y: reduced ? 0 : `${direction * -0.45}em`,
						blur: reduced ? 0 : 2,
						duration: reduced ? 80 : 140,
						easing: m.ease.standard,
						pop: true
					}}>{word}</span
				>{/key}</span
		>{/each}</span
>
