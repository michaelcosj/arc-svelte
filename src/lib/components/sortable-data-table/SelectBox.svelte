<script lang="ts">
	import { untrack } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { motionTokens as m } from '#lib/motion';
	let {
		checked,
		mixed = false,
		label,
		nav,
		reduced,
		onToggle,
		ref = $bindable(null)
	}: {
		checked: boolean;
		mixed?: boolean;
		label: string;
		nav: 'head' | 'row';
		reduced: boolean;
		onToggle: (extend: boolean) => void;
		ref?: HTMLInputElement | null;
	} = $props();
	const on = $derived(checked || mixed);
	const check = [4.25, 9.25, 7.25, 12.25, 13.75, 5.75],
		dash = [4.75, 9, 9, 9, 13.25, 9];
	const points = new Tween(untrack(() => (mixed ? dash : check)));
	$effect(() => {
		void points.set(mixed ? dash : check, reduced ? { duration: 0 } : m.spring.morph);
	});
	const d = $derived(
		`M${points.current[0]} ${points.current[1]} L${points.current[2]} ${points.current[3]} L${points.current[4]} ${points.current[5]}`
	);
	let extend = false;
</script>

<label class="arc-sortable-data-table__select-hit">
	<input
		bind:this={ref}
		type="checkbox"
		class="arc-sortable-data-table__select-input"
		{checked}
		indeterminate={mixed}
		aria-label={label}
		data-nav={nav}
		onclick={(event) => {
			extend = event.shiftKey;
		}}
		onchange={(event) => {
			onToggle(extend);
			event.currentTarget.checked = checked;
			event.currentTarget.indeterminate = mixed;
		}}
	/>
	<span class="arc-sortable-data-table__select-box" data-on={on || undefined} aria-hidden="true">
		<span
			class="arc-sortable-data-table__select-fill"
			style:opacity={on ? 1 : 0}
			style:scale={on ? 1 : 0.6}
		></span>
		<svg
			class="arc-sortable-data-table__select-mark"
			viewBox="0 0 18 18"
			fill="none"
			focusable="false"
			><path
				{d}
				pathLength="1"
				stroke-dasharray="1 1"
				stroke-dashoffset={on ? 0 : 1}
				opacity={on ? 1 : 0}
				stroke="currentColor"
				stroke-width={1.75}
				stroke-linecap="round"
				stroke-linejoin="round"
			/></svg
		>
	</span>
</label>
