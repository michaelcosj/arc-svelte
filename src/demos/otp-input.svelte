<script lang="ts">
	import { OtpInput } from '#arc/otp-input';
	import './actions.css';

	let value = $state('482');
</script>

<div class="actions-preview">
	<div class="actions-surface">
		<OtpInput
			bind:value
			label="Verification code"
			description="Use the six digit code from your email."
		/>
	</div>
	<div class="actions-status" role="status"></div>
</div>
