<script lang="ts">
	import { RadioGroup } from '#arc/radio-group';
	import './actions.css';

	let value = $state('focused');
</script>

<div class="actions-preview actions-roomy actions-radio radio-preview">
	<div class="actions-surface">
		<RadioGroup
			label="Review mode"
			bind:value
			options={[
				{ value: 'focused', label: 'Focused review', description: 'One reviewer at a time.' },
				{ value: 'open', label: 'Open review', description: 'Everyone can comment together.' },
				{
					value: 'async',
					label: 'Async review',
					description: 'Reviewers leave notes when they can.'
				}
			]}
		/>
	</div>
	<div class="actions-status" role="status"></div>
</div>

<style>
	.radio-preview {
		width: min(100%, 380px);
		margin-inline: auto;
	}
</style>
