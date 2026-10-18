<script lang="ts">
	import { untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { inView, motionTokens as m, swap, widthPresence, type SwapParams } from '#lib/motion';
	import CounterWheel from './CounterWheel.svelte';
	import type { AnimatedCounterProps } from './types';
	import './animated-counter.css';

	let {
		value,
		label,
		prefix = '',
		suffix = '',
		decimals = 0,
		animateOnView = false,
		locale = 'en-US',
		class: className,
		ref = $bindable(null)
	}: AnimatedCounterProps = $props();

	type Part = { key: string; digit: number; order: number } | { key: string; text: string };

	/** Split a formatted number into columns keyed by place value, so 999 → 1,000 keeps the ones column the ones column. */
	function partsFor(value: number, decimals: number, locale: string): Part[] {
		const parts = new Intl.NumberFormat(locale, {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals,
			numberingSystem: 'latn'
		}).formatToParts(value);
		let place = parts.reduce(
			(count, part) => count + (part.type === 'integer' ? part.value.length : 0),
			0
		);
		let fraction = 0;
		let order = 0;
		return parts.flatMap((part, index): Part[] => {
			if (part.type === 'integer')
				return [...part.value].map((char) => ({
					key: `i${--place}`,
					digit: Number(char),
					order: order++
				}));
			if (part.type === 'fraction')
				return [...part.value].map((char) => ({
					key: `f${fraction++}`,
					digit: Number(char),
					order: order++
				}));
			return [
				{
					key:
						part.type === 'group'
							? `g${place}`
							: part.type === 'decimal'
								? 'd'
								: `${part.type}${index}`,
					text: part.value
				}
			];
		});
	}

	const reduced = $derived(prefersReducedMotion.current);
	let seen = $state(false);
	const armed = $derived(animateOnView && !seen);

	// The direction the whole number moved, set before the columns react to their new digits.
	let previous = untrack(() => value);
	let direction = $state(1);
	$effect.pre(() => {
		const next = value;
		untrack(() => {
			if (next === previous) return;
			direction = next > previous ? 1 : -1;
			previous = next;
		});
	});

	const parts = $derived(partsFor(value, decimals, locale));
	const text = $derived(
		`${prefix}${parts.map((part) => ('text' in part ? part.text : part.digit)).join('')}${suffix}`
	);

	const labelIn = $derived<SwapParams>(
		reduced
			? { duration: m.duration.instant }
			: { y: '0.3em', blur: m.blur.soft, duration: m.duration.standard, easing: m.ease.enter }
	);
	const labelOut = $derived<SwapParams>(
		reduced
			? { duration: m.duration.instant, pop: true }
			: {
					y: '-0.3em',
					blur: m.blur.subtle,
					duration: m.duration.fast,
					easing: m.ease.standard,
					pop: true
				}
	);
</script>

<span
	bind:this={ref}
	class={['arc-animated-counter', className]}
	{@attach inView({ once: true, amount: 0.6, onChange: (visible) => visible && (seen = true) })}
>
	{#if label}
		<span class="arc-animated-counter__label">
			<span class="arc-animated-counter__label-swap">
				{#key label}
					<span class="arc-animated-counter__label-text" in:swap={labelIn} out:swap={labelOut}
						>{label}</span
					>
				{/key}
			</span>
		</span>
	{/if}
	<span class="arc-animated-counter__sr-only">{text}</span>
	<span class="arc-animated-counter__value" aria-hidden="true">
		{#if prefix}<span class="arc-animated-counter__symbol">{prefix}</span>{/if}
		{#each parts as part (part.key)}
			<span
				class={'digit' in part ? 'arc-animated-counter__column' : 'arc-animated-counter__symbol'}
				in:widthPresence={{ skip: reduced }}
				out:widthPresence={{ skip: reduced }}
			>
				{#if 'digit' in part}
					<CounterWheel
						digit={part.digit}
						{direction}
						{armed}
						delay={Math.min(part.order * m.stagger.item, 250)}
						{reduced}
					/>
				{:else}{part.text}{/if}
			</span>
		{/each}
		{#if suffix}<span class="arc-animated-counter__symbol">{suffix}</span>{/if}
	</span>
</span>
