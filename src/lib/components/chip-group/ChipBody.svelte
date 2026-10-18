<script lang="ts">
	import { untrack } from 'svelte';
	import { motionTokens as m, swap, WidthLag } from '#lib/motion';
	import type { ChipOption } from './types';
	let {
		option,
		selected,
		reduced,
		delay,
		skipIntro
	}: {
		option: ChipOption;
		selected: boolean;
		reduced: boolean;
		delay: number;
		skipIntro: boolean;
	} = $props();
	const lag = new WidthLag(() => ({ reduced }));
	$effect(() => {
		void selected;
		void reduced;
		untrack(() => lag.changed());
	});
	const grown = $derived(Math.max(0, ((selected ? 18 : 0) + lag.current) / 18));
	const draw = $derived(Math.min(1, Math.max(0.001, grown)));
</script>

<span
	class="arc-chip-group__body"
	data-selected={selected}
	{@attach lag.body}
	in:swap|global={{
		opacity: 1,
		scale: reduced ? 1 : 0.9,
		...m.spring.snappy,
		delay: reduced ? 0 : delay,
		skip: skipIntro || reduced
	}}
>
	<span class="arc-chip-group__surface" style:right={`${-lag.current}px`} aria-hidden="true"></span>
	<span
		class="arc-chip-group__check"
		style:scale={Math.min(grown, 1.1)}
		style:opacity={Math.min(1, grown * 1.4)}
		style:filter={grown >= 1 ? 'none' : `blur(${((1 - grown) * 2).toFixed(2)}px)`}
		aria-hidden="true"
		><svg
			width={14}
			height={14}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width={2.5}
			stroke-linecap="round"
			stroke-linejoin="round"
			><path
				d="M4 12.5 9.5 18 20 6.5"
				pathLength="1"
				stroke-dasharray="1 1"
				stroke-dashoffset={1 - draw}
			/></svg
		></span
	>
	<span class="arc-chip-group__slot" aria-hidden="true"></span>
	<span class="arc-chip-group__label" style:transform={`translateX(${lag.current}px)`}
		>{option.label}</span
	>
</span>
