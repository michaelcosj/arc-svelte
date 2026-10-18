<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import { Mounted } from '#lib/motion';
	import { slot } from './slot';
	let { text, direction }: { text: string; direction: number } = $props();
	const mounted = new Mounted();
</script>

<span class="arc-number-field__affix"
	>{#each [...text] as char, index (`${index}:${char}`)}<span
			class="arc-number-field__char"
			in:slot={{ direction, reduced: prefersReducedMotion.current, skip: !mounted.current }}
			out:slot={{ direction, reduced: prefersReducedMotion.current }}>{char}</span
		>{/each}</span
>
