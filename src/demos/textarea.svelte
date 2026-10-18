<script lang="ts">
	import { Textarea } from '#arc/textarea';
	import './actions.css';

	let value = $state('Keep the final pass calm and focused.');
</script>

<div class="actions-preview actions-roomy textarea-preview">
	<div class="actions-surface">
		<Textarea label="Project note" bind:value description="Visible to everyone on the project." />
	</div>
	<div class="actions-status" role="status"></div>
</div>

<style>
	.textarea-preview {
		align-self: stretch;
		grid-template-rows: minmax(0, calc(50% - 114px)) auto auto;
		align-content: start;
	}

	.textarea-preview::before {
		content: '';
	}

	.textarea-preview :global(textarea) {
		max-height: 220px;
	}
</style>
