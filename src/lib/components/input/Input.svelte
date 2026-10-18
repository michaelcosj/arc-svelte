<script lang="ts">
	import { FieldMessage, motionTokens as m } from '#lib/motion';
	import type { InputProps } from './types';
	import './input.css';

	const uid = $props.id();
	let {
		label,
		description,
		error,
		id = uid,
		value = $bindable(),
		class: className,
		ref = $bindable(null),
		...props
	}: InputProps = $props();

	const hintId = $derived(description ? `${id}-description` : undefined);
	const errorId = $derived(error ? `${id}-error` : undefined);
	const describedBy = $derived(
		[props['aria-describedby'], hintId, errorId].filter(Boolean).join(' ') || undefined
	);
	const exit = { duration: m.duration.exit, easing: m.ease.standard };
</script>

<div class="arc-input">
	<label class="arc-input__label" for={id}>{label}</label>
	<input
		{...props}
		{id}
		bind:this={ref}
		bind:value
		class={['arc-input__input', className]}
		aria-invalid={error ? true : props['aria-invalid']}
		aria-describedby={describedBy}
	/>
	<FieldMessage id={hintId} text={description} class="arc-input__description" numbers {exit} />
	<FieldMessage id={errorId} text={error} class="arc-input__error" alert numbers {exit} />
</div>
