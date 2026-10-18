<script lang="ts">
	import { AnimatedCounter } from '#arc/animated-counter';
	import { prefersReducedMotion } from 'svelte/motion';
	import { Mounted, swap, motionTokens as m } from '#lib/motion';
	import type { MetricCardProps } from './types';
	import Swap from './Swap.svelte';
	import './metric-card.css';
	let { label, value, suffix, context, change }: MetricCardProps = $props();
	const reduced = $derived(prefersReducedMotion.current);
	const mounted = new Mounted();
</script>

<article class="arc-metric-card__card">
	<div class="arc-metric-card__top">
		<span><Swap text={label} block /></span>
		{#if change}<small
				data-trend={/^[+]/.test(change) ? 'up' : /^[-−]/.test(change) ? 'down' : undefined}
				in:swap={{
					scale: reduced ? 1 : 0.96,
					...m.spring.snappy,
					duration: reduced ? 0 : m.spring.snappy.duration,
					skip: !mounted.current
				}}
				out:swap={{ scale: reduced ? 1 : 0.96, duration: m.duration.fast, easing: m.ease.standard }}
				><Swap text={change} morph /></small
			>{/if}
	</div>
	<AnimatedCounter {value} {suffix} animateOnView />
	<p><Swap text={context} block /></p>
</article>
