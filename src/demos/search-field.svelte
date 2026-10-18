<script lang="ts">
	import { SearchField } from '#arc/search-field';
	import './actions.css';

	let value = $state('');
</script>

<div class="actions-preview">
	<div class="actions-surface">
		<SearchField label="Search projects" placeholder="Search by name" bind:value />
	</div>
	<div class="actions-status" role="status"></div>
</div>
