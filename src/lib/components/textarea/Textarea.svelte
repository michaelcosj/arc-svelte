<script lang="ts">
	import { FieldMessage, motionTokens as m } from '#lib/motion';
	import type { TextareaProps } from './types';
	import './textarea.css';

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
	}: TextareaProps = $props();

	const hintId = $derived(description ? `${id}-description` : undefined);
	const errorId = $derived(error ? `${id}-error` : undefined);
	const exit = { duration: m.duration.fast, easing: m.ease.standard };
</script>

<div class="arc-textarea">
	<label for={id}>{label}</label>
	<textarea
		{...props}
		{id}
		bind:this={ref}
		bind:value
		class={['arc-textarea__control', className]}
		aria-invalid={error ? true : props['aria-invalid']}
		aria-describedby={[props['aria-describedby'], hintId, errorId].filter(Boolean).join(' ') ||
			undefined}></textarea>
	<FieldMessage id={hintId} text={description} class="arc-textarea__hint" numbers {exit} />
	<FieldMessage id={errorId} text={error} class="arc-textarea__error" alert numbers {exit} />
</div>
