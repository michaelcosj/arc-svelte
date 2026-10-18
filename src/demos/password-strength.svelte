<script lang="ts">
	import { PasswordStrength, estimateStrength } from '#arc/password-strength';
	import { ActionButton } from '#arc/action-button';
	import { prefersReducedMotion } from 'svelte/motion';
	import WandSparkles from '@lucide/svelte/icons/wand-sparkles';
	import './password-strength-demo.css';
	let value = $state(''),
		revealed = $state(false),
		error = $state<string>();
	let timer: ReturnType<typeof setInterval> | undefined;
	let index = 0;
	const strength = $derived(estimateStrength(value));
	const suggestions = ['Juniper-Harbor-48', 'Copper-Lantern-73', 'Meadow-Signal-26'];
	function stop() {
		clearInterval(timer);
		timer = undefined;
	}
	$effect(() => () => stop());
	function suggest() {
		stop();
		const text = suggestions[index++ % suggestions.length]!;
		error = undefined;
		revealed = true;
		if (prefersReducedMotion.current) {
			value = text;
			return;
		}
		let length = 0;
		value = '';
		timer = setInterval(() => {
			length++;
			value = text.slice(0, length);
			if (length >= text.length) stop();
		}, 42);
	}
</script>

<div class="demo-password-strength__canvas">
	<form
		class="demo-password-strength__card"
		aria-label="Set a new password"
		onsubmit={(event) => event.preventDefault()}
	>
		<PasswordStrength
			label="New password"
			{value}
			onValueChange={(next) => {
				stop();
				value = next;
				error = undefined;
			}}
			{revealed}
			onRevealedChange={(next) => (revealed = next)}
			{error}
			name="new-password"
		/>
		<div class="demo-password-strength__actions">
			<button type="button" class="demo-password-strength__suggest" onclick={suggest}
				><WandSparkles
					class="demo-password-strength__suggest-icon"
					size={16}
					strokeWidth={1.75}
					aria-hidden="true"
				/><span class="demo-password-strength__suggest-label">Suggest one</span></button
			>
			<div
				class="demo-password-strength__save"
				onclickcapture={(event) => {
					if (strength.level >= 3) return;
					event.preventDefault();
					event.stopPropagation();
					error = value
						? strength.label === 'Too short'
							? 'Too short to save. Use at least 8 characters.'
							: 'Too weak to save. Meet at least three requirements.'
						: 'Enter a password first.';
				}}
			>
				<ActionButton
					type="submit"
					label="Save"
					pendingLabel="Saving"
					successLabel="Saved"
					onAction={() => new Promise((resolve) => setTimeout(resolve, 900))}
				/>
			</div>
		</div>
	</form>
</div>
