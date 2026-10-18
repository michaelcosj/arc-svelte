<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import type { Attachment } from 'svelte/attachments';
	import { motionTokens as m, Mounted, swap, WidthMorph, type SwapParams } from '#lib/motion';
	import type { ButtonProps } from './types';
	import './button.css';

	let {
		variant = 'primary',
		size = 'md',
		loading = false,
		label,
		children,
		contentKey,
		disabled,
		onclick,
		tabindex = 0,
		class: className,
		ref = $bindable(null),
		...props
	}: ButtonProps = $props();

	const reduced = $derived(prefersReducedMotion.current);
	const mounted = new Mounted();

	/** A new label or content crossfades; prop-only updates stay in place. */
	const key = $derived(label !== undefined ? `text:${label}` : (contentKey ?? children));

	// The slot springs to the incoming label's natural width; other resizes jump straight there.
	const morph = new WidthMorph(() => ({ reduced, window: 700, pinned: true }));
	$effect.pre(() => {
		void key;
		morph.changed();
	});

	/** Icon buttons press a little deeper, wide buttons a little less, so every size reads as the same push. */
	const press: Attachment<HTMLButtonElement> = (node) => {
		const observer = new ResizeObserver(() => {
			const width = node.offsetWidth;
			node.style.setProperty(
				'--arc-button-press',
				String(width > 220 ? 0.985 : width && width <= 48 ? 0.96 : 0.97)
			);
		});
		observer.observe(node);
		return () => observer.disconnect();
	};

	const fast = { duration: m.duration.fast, easing: m.ease.enter };
	const exitFast = { duration: m.duration.fast, easing: m.ease.standard };
	const instant: SwapParams = { duration: m.duration.instant };
	/** Scale rides the spring; opacity and blur tween so blur never overshoots below zero. */
	const iconEnter = { ...m.spring.snappy, fade: fast };

	// Text rises out of a soft blur; the outgoing label lifts away a little faster. Icon-only content scales instead.
	const isIcon = (node: HTMLElement) => !/\S/.test(node.textContent ?? '');
	function phaseIn(node: HTMLElement) {
		const skip = !mounted.current;
		if (reduced) return swap(node, { ...instant, skip });
		if (isIcon(node)) return swap(node, { scale: 0.6, blur: m.blur.subtle, ...iconEnter, skip });
		return swap(node, {
			y: 4,
			blur: m.blur.soft,
			duration: m.duration.standard,
			easing: m.ease.enter,
			skip
		});
	}
	function phaseOut(node: HTMLElement) {
		if (reduced) return swap(node, { ...instant, pop: true });
		if (isIcon(node))
			return swap(node, { scale: 0.6, blur: m.blur.subtle, ...exitFast, pop: true });
		return swap(node, { y: -3, blur: m.blur.soft, ...exitFast, pop: true });
	}

	const loaderIn = $derived<SwapParams>(
		reduced
			? { ...instant, skip: !mounted.current }
			: { scale: 0.6, ...iconEnter, skip: !mounted.current }
	);
	const loaderOut = $derived<SwapParams>(
		reduced ? instant : { scale: 0.8, blur: m.blur.subtle, ...exitFast }
	);
</script>

<!-- Loading keeps the button focusable (a disabled button would drop keyboard focus mid-action) and swallows presses instead. -->
<button
	bind:this={ref}
	{tabindex}
	{disabled}
	aria-busy={loading || undefined}
	{...props}
	class={['arc-button', `arc-button--${variant}`, `arc-button--${size}`, className]}
	aria-disabled={loading || props['aria-disabled'] || undefined}
	onclick={loading ? (event) => event.preventDefault() : onclick}
	{@attach press}
>
	{#if loading}
		<span class="arc-button__loader" aria-hidden="true" in:swap={loaderIn} out:swap={loaderOut}>
			<span class="arc-button__spinner"></span>
		</span>
	{/if}
	<span
		class={['arc-button__label-slot', loading && 'arc-button__loading-label']}
		{@attach morph.body}
	>
		<span class="arc-button__label-content" {@attach morph.content}>
			{#key key}
				<span class="arc-button__label-phase" in:phaseIn out:phaseOut>
					{#if label !== undefined}{label}{:else}{@render children?.()}{/if}
				</span>
			{/key}
		</span>
	</span>
</button>
