<script lang="ts">
	import { prefersReducedMotion, Tween } from 'svelte/motion';
	import { motionTokens as m, swap, type SwapParams } from '#lib/motion';

	/** String content crossfades when it changes while open, and the bubble springs to the new text size. */
	let { text }: { text: string } = $props();

	const reduced = $derived(prefersReducedMotion.current);
	const size = new Tween({ width: 0, height: 0 });
	// Like motion's `animate` on width/height, nothing is pinned until the text changes while open.
	let sized = $state(false);

	function measure(node: HTMLElement) {
		let last: string | null = null;
		const observer = new ResizeObserver(([entry]) => {
			if (!entry) return;
			const box = entry.borderBoxSize?.[0];
			const current = node.textContent;
			const animate = last !== null && last !== current && !reduced;
			last = current;
			if (animate) sized = true;
			void size.set(
				{
					width: Math.ceil(box?.inlineSize ?? node.offsetWidth),
					height: Math.ceil(box?.blockSize ?? node.offsetHeight)
				},
				animate ? m.spring.morph : { duration: 0 }
			);
		});
		observer.observe(node);
		return () => observer.disconnect();
	}

	const lineIn = $derived<SwapParams>(
		reduced
			? { skip: true }
			: { y: '0.3em', blur: m.blur.soft, duration: m.duration.standard, easing: m.ease.enter }
	);
	const lineOut = $derived<SwapParams>(
		reduced
			? { duration: 0, pop: true }
			: {
					y: '-0.3em',
					blur: m.blur.subtle,
					duration: m.duration.instant,
					easing: m.ease.standard,
					pop: true
				}
	);
</script>

<span
	class="arc-tooltip__text"
	style:width={sized ? `${size.current.width}px` : undefined}
	style:height={sized ? `${size.current.height}px` : undefined}
>
	<span class="arc-tooltip__measure" aria-hidden="true" {@attach measure}>{text}</span>
	{#key text}
		<span class="arc-tooltip__line" in:swap={lineIn} out:swap={lineOut}>{text}</span>
	{/key}
</span>
