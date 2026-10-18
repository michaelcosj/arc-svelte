<script lang="ts">
	import { Switch } from '#arc/switch';
	import './actions.css';

	let checked = $state(true);
</script>

<div class="actions-preview">
	<div class="actions-surface">
		<Switch bind:checked label="Weekly digest" />
	</div>
	<div class="actions-status" role="status"></div>
</div>
