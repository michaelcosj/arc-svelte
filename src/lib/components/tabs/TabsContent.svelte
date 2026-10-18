<script lang="ts">
	import type { TabsContentProps } from './types';
	import { Tabs as Primitive } from 'bits-ui';
	import { prefersReducedMotion } from 'svelte/motion';
	import type { TransitionConfig } from 'svelte/transition';
	import { motionTokens as m, Mounted, popOut, restorePop } from '#lib/motion';
	import { getTabsState } from './tabs-state.svelte';

	let {
		ref = $bindable(null),
		value,
		forceMount = false,
		class: className,
		children,
		...props
	}: TabsContentProps = $props();

	const tabs = getTabsState();
	const reduced = $derived(prefersReducedMotion.current);
	const selected = $derived(tabs.value === value);

	// AnimatePresence initial={false}: the first panel appears without animating.
	const mounted = new Mounted();

	/**
	 * Slides 8px in the direction of travel and fades in, while the height springs from the
	 * previous panel's so content below glides instead of jumping. Reduced motion: a short fade.
	 */
	function panelIn(node: HTMLElement): TransitionConfig {
		restorePop(node);
		node.style.translate = '';
		const from = tabs.panelHeight;
		const to = node.offsetHeight;
		if (!mounted.current) return { duration: 0 };
		if (reduced)
			return { duration: m.duration.instant, easing: m.ease.inOut, css: (t) => `opacity: ${t}` };
		const direction = tabs.direction;
		const morph = from !== null && Math.abs(from - to) > 1;
		const opacity = m.duration.standard;
		const slide = m.spring.smooth;
		const duration = Math.max(opacity, slide.duration);
		return {
			duration,
			css: (t) => {
				const elapsed = t * duration;
				const fade = m.ease.enter(Math.min(1, elapsed / opacity));
				const p = slide.easing(Math.min(1, elapsed / slide.duration));
				let css = `opacity: ${fade}; transform: translateX(${direction * 8 * (1 - p)}px);`;
				if (morph) {
					css += `height: ${from + (to - from) * p}px;`;
					if (to > from) css += 'overflow: clip;';
				}
				return css;
			}
		};
	}

	/** Pinned where it was on screen (the tab root may resize around it) while it fades out. */
	function panelOut(node: HTMLElement): TransitionConfig {
		const leaving = tabs.leaving;
		popOut(node, leaving?.box);
		// Correct once the whole update has landed: the incoming panel may not be inserted yet.
		if (leaving)
			queueMicrotask(() => {
				const now = node.getBoundingClientRect();
				node.style.translate = `${leaving.rect.left - now.left}px ${leaving.rect.top - now.top}px`;
			});
		if (reduced) return { duration: 100, easing: m.ease.inOut, css: (t) => `opacity: ${t}` };
		const direction = tabs.direction;
		return {
			duration: m.duration.instant,
			easing: m.ease.standard,
			css: (t, u) => `opacity: ${t}; transform: translateX(${direction * -6 * u}px);`
		};
	}

	// Track the visible panel's height, including mid-morph, for the next panel to start from.
	// The observer's first report lands after the intro has read the previous panel's height.
	function trackHeight(node: HTMLElement) {
		const observer = new ResizeObserver(() => {
			tabs.panelHeight = node.offsetHeight;
		});
		observer.observe(node);
		return () => observer.disconnect();
	}
</script>

{#if forceMount}
	<Primitive.Content {...props} bind:ref {value} class={['arc-tabs__content', className]}>
		{#snippet child({ props: panelProps })}
			<!-- Radix forceMount leaves inactive panels visible for consumers to manage. -->
			<div {...panelProps} hidden={undefined}>{@render children?.()}</div>
		{/snippet}
	</Primitive.Content>
{:else}
	<Primitive.Content {...props} bind:ref {value}>
		{#snippet child({ props: panelProps })}
			{#if selected}
				<div
					{...panelProps}
					class={['arc-tabs__content', className]}
					in:panelIn
					out:panelOut
					{@attach trackHeight}
				>
					{@render children?.()}
				</div>
			{/if}
		{/snippet}
	</Primitive.Content>
{/if}
