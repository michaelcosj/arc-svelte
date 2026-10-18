<script lang="ts">
	import { EyeMorph, FieldMessage, motionTokens as m } from '#lib/motion';
	import { defaultPasswordFieldMessages, type PasswordFieldProps } from './types';
	import './password-field.css';

	const uid = $props.id();
	let {
		label,
		description,
		messages: messagesProp,
		id = uid,
		value = $bindable(),
		class: className,
		ref = $bindable(null),
		...props
	}: PasswordFieldProps = $props();

	const messages = $derived({ ...defaultPasswordFieldMessages, ...messagesProp });
	const hintId = $derived(description ? `${id}-description` : undefined);
	let visible = $state(false);
	let toggled = $state(false);
	const exit = { duration: m.duration.exit, easing: m.ease.exit };
</script>

<div class="arc-password-field">
	<label for={id}>{label}</label>
	<div class="arc-password-field__shell">
		<!-- data-reveal only appears after the first toggle, so the value resolves on each change but never on mount. -->
		<input
			{...props}
			bind:this={ref}
			bind:value
			{id}
			type={visible ? 'text' : 'password'}
			data-reveal={toggled ? (visible ? 'shown' : 'hidden') : undefined}
			aria-describedby={[props['aria-describedby'], hintId].filter(Boolean).join(' ') || undefined}
			class={['arc-password-field__input', className]}
		/>
		<button
			type="button"
			onclick={() => {
				visible = !visible;
				toggled = true;
			}}
			aria-label={visible ? messages.hidePassword : messages.showPassword}
			aria-pressed={visible}
		>
			<EyeMorph slashed={visible} />
		</button>
	</div>
	<FieldMessage id={hintId} text={description} class="arc-password-field__hint" {exit} />
</div>
