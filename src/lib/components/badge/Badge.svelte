<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import { motionTokens as m, Mounted, swap, WidthMorph, type SwapParams } from '#lib/motion';
	import type { BadgeProps } from './types';
	import './badge.css';

	let {
		tone = 'neutral',
		size = 'md',
		icon,
		label,
		children,
		class: className,
		ref = $bindable(null),
		...props
	}: BadgeProps = $props();

	const text = $derived(label === undefined ? null : String(label));
	const reduced = $derived(prefersReducedMotion.current);

	// AnimatePresence initial={false}: the first label and icon appear without animating.
	const mounted = new Mounted();

	// Width stays auto at rest. Only a new label or icon springs it from the old size to the new one.
	const morph = new WidthMorph(() => ({ reduced }));
	$effect.pre(() => {
		void text;
		void icon;
		morph.changed();
	});

	const exitFast = { duration: m.duration.fast, easing: m.ease.standard };
	const fadeOnly: SwapParams = { duration: m.duration.instant };
	const textIn = $derived<SwapParams>(
		reduced
			? { ...fadeOnly, skip: !mounted.current }
			: {
					y: '0.3em',
					blur: m.blur.soft,
					duration: m.duration.standard,
					easing: m.ease.enter,
					skip: !mounted.current
				}
	);
	const textOut = $derived<SwapParams>(
		reduced
			? { ...fadeOnly, pop: true }
			: { y: '-0.3em', blur: m.blur.subtle, ...exitFast, pop: true }
	);
	const iconIn = $derived<SwapParams>(
		reduced
			? { ...fadeOnly, skip: !mounted.current }
			: { scale: 0.6, blur: m.blur.subtle, ...m.spring.snappy, skip: !mounted.current }
	);
	const iconOut = $derived<SwapParams>(
		reduced
			? { ...fadeOnly, pop: true }
			: { scale: 0.6, blur: m.blur.subtle, ...exitFast, pop: true }
	);
</script>

<!-- The pill follows its content: text and icon swap in place while the width springs to the new size. -->
<span
	bind:this={ref}
	{...props}
	class={['arc-badge', `arc-badge--${tone}`, `arc-badge--${size}`, className]}
>
	<span class="arc-badge__body" {@attach morph.body}>
		<span class="arc-badge__content" {@attach morph.content}>
			{#if icon}
				<span class="arc-badge__icon" aria-hidden="true">
					{#key icon}
						<span class="arc-badge__glyph" in:swap={iconIn} out:swap={iconOut}
							>{@render icon()}</span
						>
					{/key}
				</span>
			{/if}
			{#if text === null}
				{@render children?.()}
			{:else}
				<span class="arc-badge__label">
					{#key text}
						<span class="arc-badge__text" in:swap={textIn} out:swap={textOut}>{text}</span>
					{/key}
				</span>
			{/if}
		</span>
	</span>
</span>
