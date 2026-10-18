<script lang="ts">
	import { Input } from '#arc/input';
	import './actions.css';

	let value = $state('Arc launch');
	const empty = $derived(!value.trim());
</script>

<div class="actions-preview actions-roomy">
	<div class="actions-surface">
		<Input
			label="Project name"
			bind:value
			description={empty ? undefined : 'Use a short, descriptive name.'}
			error={empty ? 'Enter a project name.' : undefined}
		/>
	</div>
	<div class="actions-status" role="status"></div>
</div>
