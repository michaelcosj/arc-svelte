<script lang="ts">
	import { prefersReducedMotion, Tween } from 'svelte/motion';
	import { motionTokens as m, Mounted, springCurve, swap, type SwapParams } from '#lib/motion';

	/** A new trigger label rises in while the old one leaves, and the trigger width springs to the measured text instead of snapping. */
	let { text }: { text: string } = $props();

	const reduced = $derived(prefersReducedMotion.current);
	const mounted = new Mounted();
	const width = new Tween(0);
	// Like motion's `animate={{ width }}` starting from "auto": nothing is pinned until the first measure.
	let sized = $state(false);

	function measure(node: HTMLElement) {
		let measured: string | null = null;
		const observer = new ResizeObserver(([entry]) => {
			if (!entry) return;
			const current = node.textContent;
			// Only a text change morphs; the first measure and font swaps settle instantly.
			const animate = measured !== null && measured !== current && !reduced;
			measured = current;
			sized = true;
			const next = Math.ceil(entry.borderBoxSize?.[0]?.inlineSize ?? node.offsetWidth);
			const distance = Math.round(Math.abs(next - width.current));
			void width.set(
				next,
				animate && distance ? springCurve(m.specs.morph, distance) : { duration: 0 }
			);
		});
		observer.observe(node);
		return () => observer.disconnect();
	}

	const textIn = $derived<SwapParams>(
		reduced
			? { skip: true }
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
			? { duration: 0, pop: true }
			: {
					y: '-0.3em',
					blur: m.blur.subtle,
					duration: m.duration.fast,
					easing: m.ease.standard,
					pop: true
				}
	);
</script>

<span class="arc-dropdown-menu__label" style:width={sized ? `${width.current}px` : undefined}>
	<span class="arc-dropdown-menu__label-measure" aria-hidden="true" {@attach measure}>{text}</span>
	{#key text}
		<span class="arc-dropdown-menu__label-text" in:swap={textIn} out:swap={textOut}>{text}</span>
	{/key}
</span>
