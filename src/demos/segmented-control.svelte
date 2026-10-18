<script lang="ts">
	import { SegmentedControl } from '#arc/segmented-control';
	import './actions.css';

	let value = $state('Review');
	const options = ['Review', 'Activity', 'Files'].map((option) => ({
		value: option,
		label: option
	}));
</script>

<div class="actions-preview">
	<div class="actions-surface">
		<SegmentedControl bind:value {options} label="Project view" />
	</div>
	<div class="actions-status" role="status"></div>
</div>
