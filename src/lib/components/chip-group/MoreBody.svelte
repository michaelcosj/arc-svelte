<script lang="ts">
	import { untrack } from 'svelte';
	import { Mounted, motionTokens as m, swap, WidthLag } from '#lib/motion';
	let { text, reduced }: { text: string; reduced: boolean } = $props();
	const mounted = new Mounted();
	const lag = new WidthLag(() => ({ reduced }));
	$effect(() => {
		void text;
		void reduced;
		untrack(() => lag.changed());
	});
</script>

<span class="arc-chip-group__body" {@attach lag.body}>
	<span class="arc-chip-group__surface" style:right={`${-lag.current}px`} aria-hidden="true"></span>
	<span class="arc-chip-group__more-text">
		{#key text}
			<span
				class="arc-chip-group__more-line"
				style:translate={`${lag.current / 2}px 0`}
				in:swap={{
					y: reduced ? 0 : '0.3em',
					blur: reduced ? 0 : m.blur.soft,
					duration: reduced ? 150 : m.duration.standard,
					easing: reduced ? m.ease.standard : m.ease.enter,
					skip: !mounted.current
				}}
				out:swap={{
					y: reduced ? 0 : '-0.3em',
					blur: reduced ? 0 : m.blur.subtle,
					duration: reduced ? 150 : m.duration.fast,
					easing: m.ease.standard,
					pop: true
				}}>{text}</span
			>
		{/key}
	</span>
</span>
