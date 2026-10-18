<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import { Mounted } from '#lib/motion';
	import Wheel from './Wheel.svelte';
	import { slot } from './slot';
	let {
		value,
		format,
		direction,
		instant = false
	}: { value: number; format: Intl.NumberFormat; direction: number; instant?: boolean } = $props();
	type Part = { key: string; digit: number } | { key: string; text: string };
	const mounted = new Mounted();
	function partsOf(value: number, format: Intl.NumberFormat): Part[] {
		const parts = format.formatToParts(value);
		let place = parts.reduce(
			(count, part) => count + (part.type === 'integer' ? part.value.length : 0),
			0
		);
		let fraction = 0;
		return parts.flatMap((part, index): Part[] => {
			if (part.type === 'integer')
				return [...part.value].map((char) => ({ key: `i${--place}`, digit: Number(char) }));
			if (part.type === 'fraction')
				return [...part.value].map((char) => ({ key: `f${fraction++}`, digit: Number(char) }));
			return [
				{
					key:
						part.type === 'group'
							? `g${place}`
							: part.type === 'decimal'
								? 'd'
								: part.type === 'minusSign'
									? 'm'
									: `${part.type}${index}`,
					text: part.value
				}
			];
		});
	}

	const parts = $derived(partsOf(value, format));
</script>

{#each parts as part (part.key)}
	<span
		class={'digit' in part ? 'arc-number-field__column' : 'arc-number-field__symbol'}
		in:slot={{ direction, instant, reduced: prefersReducedMotion.current, skip: !mounted.current }}
		out:slot={{ direction, instant, reduced: prefersReducedMotion.current }}
		>{#if 'digit' in part}<Wheel
				digit={part.digit}
				{direction}
				{instant}
			/>{:else}{part.text}{/if}</span
	>
{/each}
