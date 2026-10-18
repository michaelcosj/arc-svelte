<script lang="ts">
	import { Checkbox } from '#arc/checkbox';
	import './actions.css';

	let checked = $state(true);
</script>

<div class="actions-preview">
	<div class="actions-surface">
		<Checkbox
			bind:checked
			label="Include archived projects"
			description="Show projects that are no longer active."
		/>
	</div>
	<div class="actions-status" role="status"></div>
</div>
