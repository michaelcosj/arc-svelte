<script lang="ts">
	import { PasswordField } from '#arc/password-field';
	import './actions.css';

	let value = $state('arc-library-secret');
</script>

<div class="actions-preview">
	<div class="actions-surface">
		<PasswordField label="Access key" bind:value description="Use at least 8 characters." />
	</div>
	<div class="actions-status" role="status"></div>
</div>
