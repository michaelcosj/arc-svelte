<script lang="ts">
	import { prefersReducedMotion, Tween } from 'svelte/motion';
	import { Mounted, motionTokens as m, swap, springCurve } from '#lib/motion';
	let { text }: { text: string } = $props();
	const reduced = $derived(Boolean(prefersReducedMotion.current)),
		mounted = new Mounted(),
		width = new Tween(0);
	let measured = $state(false);
	function measure(node: HTMLElement) {
		let last: string | null = null;
		const observer = new ResizeObserver(([entry]) => {
			if (!entry) return;
			const changed = last !== null && last !== node.textContent;
			last = node.textContent;
			const next = Math.ceil(entry.borderBoxSize?.[0]?.inlineSize ?? node.offsetWidth);
			measured = true;
			void width.set(
				next,
				changed && !reduced
					? springCurve(m.specs.morph, Math.abs(next - width.current))
					: { duration: 0 }
			);
		});
		observer.observe(node);
		return () => observer.disconnect();
	}
</script>

<span
	class="arc-filter-toolbar__morph-text"
	style:width={measured ? `${width.current}px` : undefined}
>
	<span class="arc-filter-toolbar__measure" aria-hidden="true" {@attach measure}>{text}</span>
	{#key text}<span
			class="arc-filter-toolbar__morph-value"
			in:swap={{
				y: reduced ? 0 : '0.3em',
				blur: reduced ? 0 : m.blur.soft,
				duration: reduced ? m.duration.instant : m.duration.standard,
				easing: reduced ? m.ease.standard : m.ease.enter,
				skip: !mounted.current
			}}
			out:swap={{
				y: reduced ? 0 : '-0.3em',
				blur: reduced ? 0 : m.blur.subtle,
				duration: reduced ? 0 : m.duration.instant,
				easing: m.ease.standard,
				pop: true
			}}>{text}</span
		>{/key}
</span>
