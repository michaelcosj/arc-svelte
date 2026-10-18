<script lang="ts">
	import { TagInput } from '#arc/tag-input';
	import './actions.css';
	let tags = $state(['release', 'web']);
</script>

<div class="actions-preview">
	<div class="actions-surface">
		<div class="tag-demo">
			<TagInput
				label="Project tags"
				bind:value={tags}
				description="Press Enter to add a tag. Press Backspace twice to remove the last one."
			/>
		</div>
	</div>
	<div class="actions-status" role="status"></div>
</div>

<style>
	.tag-demo {
		display: grid;
		align-content: start;
		width: min(100%, 420px);
		min-height: 12rem;
	}
</style>
