<script lang="ts">
	import { MultiSelect } from '#arc/multi-select';
	let value = $state(['motion']);
	const options = [
		{ value: 'motion', label: 'Motion' },
		{ value: 'accessibility', label: 'Accessibility' },
		{ value: 'content', label: 'Content' },
		{ value: 'research', label: 'Research' }
	];
</script>

<div class="preview">
	<div class="surface">
		<MultiSelect
			label="Focus areas"
			{options}
			bind:value
			description="Pick the areas to include in the review."
		/>
	</div>
	<div class="status" role="status"></div>
</div>

<style>
	.preview {
		width: min(100%, 620px);
		display: grid;
		gap: 16px;
	}
	.surface {
		display: grid;
		gap: 8px;
		justify-items: center;
		padding: 0;
		background: transparent;
	}
	.surface > :global(*) {
		max-width: 100%;
		width: min(100%, 540px);
	}
	.status {
		color: var(--text-muted, #64748b);
		font-size: 12px;
		min-height: 18px;
		text-align: center;
	}
</style>
