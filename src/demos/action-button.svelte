<script lang="ts">
	import { ActionButton } from '#arc/action-button';
	import './action-button-demo.css';
</script>

<div class="demo-action-button">
	<div class="demo-action-button__surface">
		<div class="demo-action-button__solo">
			<ActionButton
				label="Save changes"
				successLabel="Saved"
				onAction={() => new Promise((resolve) => setTimeout(resolve, 420))}
			/>
		</div>
	</div>
	<div class="demo-action-button__status" role="status"></div>
</div>
