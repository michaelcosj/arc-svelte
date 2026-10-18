<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import {
		easeOut,
		motionTokens as m,
		Mounted,
		springCurve,
		swap,
		WidthMorph,
		widthPresence,
		type SpringSpec
	} from '#lib/motion';
	import { AnimatedCounter } from '#arc/animated-counter';
	import { textIn, textOut } from './swap-text';
	import type { BillingPriceProps } from './types';
	import './billing-toggle.css';

	const clip: SpringSpec = { visualDuration: 0.36, bounce: 0 };

	let {
		amount,
		currency = '$',
		period,
		was,
		decimals = 0,
		class: className
	}: BillingPriceProps = $props();

	const reduced = $derived(prefersReducedMotion.current);
	const mounted = new Mounted();
	const showWas = $derived(was !== undefined && was > amount);

	// The old price opens and closes its width on the clip spring while it fades.
	// With reduced motion it only fades in, and leaves at once.
	function wasIn(node: HTMLElement) {
		if (!mounted.current) return { duration: 0 };
		if (reduced) return swap(node, { duration: m.duration.fast });
		return widthPresence(node, {
			spring: springCurve(clip),
			fade: { duration: m.duration.standard, easing: m.ease.enter }
		});
	}
	function wasOut(node: HTMLElement, _: unknown, options: { direction?: 'in' | 'out' | 'both' }) {
		return widthPresence(
			node,
			reduced
				? { skip: true }
				: { spring: springCurve(clip), fade: { duration: m.duration.fast, easing: easeOut } },
			options
		);
	}

	// The period box follows its new text's width on the same spring, so nothing beside it jumps.
	const periodMorph = new WidthMorph(() => ({
		reduced,
		measure: 'offset',
		contentKey: period,
		spec: clip
	}));
	$effect.pre(() => {
		void period;
		periodMorph.changed();
	});
</script>

<span class={['arc-billing-toggle__price', className]}>
	<span class="arc-billing-toggle__amount">
		<span class="arc-billing-toggle__currency">{currency}</span>
		<span class="arc-billing-toggle__counter"><AnimatedCounter value={amount} {decimals} /></span>
	</span>
	<span class="arc-billing-toggle__aside">
		{#if showWas}
			<span class="arc-billing-toggle__was-slot" in:wasIn out:wasOut>
				<del class="arc-billing-toggle__was">{currency}{was!.toFixed(decimals)}</del>
			</span>
		{/if}
		{#if period}
			<span class="arc-billing-toggle__period" {@attach periodMorph.body}>
				<span
					class="arc-billing-toggle__period-sizer"
					aria-hidden="true"
					{@attach periodMorph.content}>{period}</span
				>
				{#key period}<span
						class="arc-billing-toggle__period-text"
						in:swap={textIn(reduced, !mounted.current)}
						out:swap={textOut(reduced)}>{period}</span
					>{/key}
			</span>
		{/if}
	</span>
</span>
