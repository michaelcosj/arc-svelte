<script lang="ts">
	import { untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { Mounted, numberPresence } from '#lib/motion';
	import SliderWheel from './SliderWheel.svelte';
	let { value, text }: { value: number; text: string } = $props();
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	const mounted = new Mounted();
	const isDigit = (char: string) => char >= '0' && char <= '9';
	type Part = { key: string; digit: number } | { key: string; text: string };
	function partsOf(text: string): Part[] {
		const chars = [...text];
		const first = chars.findIndex(isDigit);
		const last = chars.length - 1 - [...chars].reverse().findIndex(isDigit);
		let place = chars.filter(isDigit).length;
		return chars.map((char, index): Part => {
			if (first < 0 || index < first) return { key: `p${index}${char}`, text: char };
			if (index > last) return { key: `s${chars.length - index}${char}`, text: char };
			if (isDigit(char)) return { key: `d${--place}`, digit: Number(char) };
			return { key: `g${place}${char}`, text: char };
		});
	}

	let previous = untrack(() => value),
		direction = $state(1);
	$effect.pre(() => {
		const next = value;
		untrack(() => {
			if (next !== previous) {
				direction = next > previous ? 1 : -1;
				previous = next;
			}
		});
	});
</script>

<span class="arc-slider__number">
	{#each partsOf(text) as part (part.key)}
		<span
			class={'digit' in part ? 'arc-slider__column' : 'arc-slider__symbol'}
			in:numberPresence={{ direction, reduced, skip: !mounted.current }}
			out:numberPresence={{ direction, reduced }}
		>
			{#if 'digit' in part}<SliderWheel digit={part.digit} {direction} />{:else}{part.text}{/if}
		</span>
	{/each}
</span>
