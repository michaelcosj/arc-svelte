<script lang="ts">
	import { Select } from '#arc/select';
	let value = $state('design');
	const options = [
		{ value: 'design', label: 'Design' },
		{ value: 'engineering', label: 'Engineering' },
		{ value: 'research', label: 'Research' }
	];
</script>

<div class="preview">
	<div class="surface">
		<Select label="Team" bind:value {options} description="Choose the team that owns this work." />
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
