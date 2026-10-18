<script lang="ts">
	import { Checkbox as Primitive } from 'bits-ui';
	import { prefersReducedMotion, Tween } from 'svelte/motion';
	import { motionTokens as m } from '#lib/motion';
	import type { CheckboxProps } from './types';
	import './checkbox.css';

	const uid = $props.id();
	let {
		label,
		description,
		id = uid,
		checked = $bindable(false),
		indeterminate = $bindable(false),
		class: className,
		ref = $bindable(null),
		...props
	}: CheckboxProps = $props();

	const reduced = $derived(prefersReducedMotion.current);

	/** Both marks share three points, so the check morphs into the dash and back instead of swapping. */
	const check = [4.25, 9.25, 7.25, 12.25, 13.75, 5.75];
	const dash = [4.75, 9, 9, 9, 13.25, 9];
	const points = new Tween(indeterminate ? dash : check);
	$effect(() => {
		void points.set(indeterminate ? dash : check, reduced ? { duration: 0 } : m.spring.morph);
	});
	const d = $derived.by(() => {
		const [x1, y1, x2, y2, x3, y3] = points.current;
		return `M${x1} ${y1} L${x2} ${y2} L${x3} ${y3}`;
	});
</script>

<div class="arc-checkbox">
	<Primitive.Root
		{...props}
		{id}
		bind:ref
		bind:checked
		bind:indeterminate
		class={['arc-checkbox__box', className]}
		aria-describedby={description ? `${id}-description` : undefined}
		aria-label={props['aria-label'] ?? (label ? undefined : 'Checkbox')}
	>
		<span class="arc-checkbox__visual" aria-hidden="true">
			<span class="arc-checkbox__fill"></span>
			<svg class="arc-checkbox__mark" viewBox="0 0 18 18" fill="none" focusable="false">
				<path
					{d}
					pathLength="1"
					stroke="currentColor"
					stroke-width="1.75"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</span>
	</Primitive.Root>
	{#if label || description}
		<div class="arc-checkbox__copy">
			{#if label}<label for={id}>{label}</label>{/if}
			{#if description}<span id="{id}-description">{description}</span>{/if}
		</div>
	{/if}
</div>
