<script lang="ts">
	import { Combobox } from '#arc/combobox';
	let value = $state('emma');
	const options = [
		{ value: 'emma', label: 'Emma Collins', keywords: ['design', 'owner'] },
		{ value: 'marcus', label: 'Marcus Johnson', keywords: ['engineering'] },
		{ value: 'ava', label: 'Ava Mitchell', keywords: ['research'] }
	];
</script>

<div class="preview roomy">
	<div class="surface">
		<Combobox label="Owner" bind:value {options} placeholder="Search people" />
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
