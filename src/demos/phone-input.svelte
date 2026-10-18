<script lang="ts">
	import { PhoneInput, formatPhoneNumber } from '#arc/phone-input';
	import { Button } from '#arc/button';
	import { heightPresence } from '#lib/motion';
	import { prefersReducedMotion } from 'svelte/motion';
	import './phone-input-demo.css';
	let value = $state(''),
		valid = $state(false),
		status = $state('idle'),
		sent = $state('');
	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!valid || status === 'sending') return;
		status = 'sending';
		setTimeout(() => {
			sent = `Code sent to ${formatPhoneNumber(value)}`;
			status = 'sent';
		}, 900);
	}
</script>

<div class="arc-phone-input-demo__canvas">
	<div class="arc-phone-input-demo__demo">
		<form class="arc-phone-input-demo__form" onsubmit={submit} novalidate>
			<PhoneInput
				label="Mobile number"
				{value}
				onValueChange={(next, details) => {
					value = next;
					valid = details.valid;
					if (status === 'sent') status = 'idle';
				}}
				description="Type + to search by calling code"
				name="phone"
			/>
			<div class="arc-phone-input-demo__foot">
				<Button
					type="submit"
					class="arc-phone-input-demo__submit"
					disabled={!valid || status === 'sending'}
					loading={status === 'sending'}
					label="Send code"
				/>
			</div>
			{#if status === 'sent'}<p
					class="arc-phone-input-demo__sent"
					role="status"
					in:heightPresence={{ skip: prefersReducedMotion.current }}
					out:heightPresence={{ skip: prefersReducedMotion.current }}
				>
					<span class="arc-phone-input-demo__sentInner">{sent}.</span>
				</p>{/if}
		</form>
	</div>
</div>
