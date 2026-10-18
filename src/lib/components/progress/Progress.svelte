<script lang="ts">
	import { Progress as Primitive } from 'bits-ui';
	import Check from '@lucide/svelte/icons/check';
	import { untrack } from 'svelte';
	import { prefersReducedMotion, Spring } from 'svelte/motion';
	import { motionTokens as m, swap, type SwapParams } from '#lib/motion';
	import type { ProgressProps } from './types';
	import './progress.css';

	let {
		value = 0,
		max = 100,
		label,
		showValue = false,
		class: className,
		ref = $bindable(null),
		...props
	}: ProgressProps = $props();

	const reduced = $derived(prefersReducedMotion.current);
	const safeMax = $derived(max > 0 ? max : 100);
	const safeValue = $derived(Math.min(Math.max(value, 0), safeMax));
	const percentage = $derived(Math.round((safeValue / safeMax) * 100));
	const complete = $derived(percentage >= 100);

	// One spring drives both the fill and the counted label, so the number always matches the bar.
	// It rests within half a percent, where motion stops a value this size (`restDelta` 0.5).
	const progress = new Spring(
		untrack(() => percentage),
		{ ...m.physics.smooth, precision: 0.5 }
	);
	$effect(() => {
		void progress.set(percentage, { instant: reduced });
	});
	const clamped = $derived(Math.min(Math.max(progress.current, 0), 100));

	const fast = { duration: m.duration.fast, easing: m.ease.standard };
	const textIn = $derived<SwapParams>(
		reduced
			? { duration: m.duration.instant }
			: { y: '0.3em', blur: m.blur.soft, duration: m.duration.standard, easing: m.ease.enter }
	);
	const textOut = $derived<SwapParams>(
		reduced
			? { duration: m.duration.instant, pop: true }
			: { y: '-0.3em', blur: m.blur.subtle, ...fast, pop: true }
	);
	/** Completion lands as the fill arrives: a check settles in beside the final count. */
	const doneIn = $derived<SwapParams>(
		reduced
			? { duration: m.duration.instant }
			: { scale: 0.6, blur: m.blur.subtle, ...m.spring.snappy, delay: 240 }
	);
	const doneOut = $derived<SwapParams>(
		reduced ? { duration: m.duration.instant } : { scale: 0.6, blur: m.blur.subtle, ...fast }
	);
</script>

<Primitive.Root
	{...props}
	bind:ref
	value={safeValue}
	max={safeMax}
	class={['arc-progress', className]}
	data-complete={complete ? '' : undefined}
	aria-label={label ?? 'Progress'}
	aria-valuetext="{percentage}%"
>
	{#if label || showValue}
		<div class="arc-progress__meta">
			{#if label}
				<span class="arc-progress__label">
					{#key label}
						<span class="arc-progress__line" in:swap={textIn} out:swap={textOut}>{label}</span>
					{/key}
				</span>
			{:else}
				<span></span>
			{/if}
			{#if showValue}
				<span class="arc-progress__value">
					{#if complete}
						<span class="arc-progress__done" in:swap={doneIn} out:swap={doneOut}>
							<Check size={14} strokeWidth={1.75} aria-hidden="true" />
						</span>
					{/if}
					<span class="arc-progress__count">{Math.round(clamped)}%</span>
				</span>
			{/if}
		</div>
	{/if}
	<!-- The fill slides in from the left instead of scaling, so its rounded end keeps its shape at every value. -->
	<div class="arc-progress__track">
		<span class="arc-progress__fill" style:transform="translateX({clamped - 100}%)"></span>
	</div>
</Primitive.Root>
