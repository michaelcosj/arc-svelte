<script lang="ts">
	import { EmptyState } from '#arc/empty-state';
	import { Button } from '#arc/button';
	import Folder from '@lucide/svelte/icons/folder';
	import FolderCheck from '@lucide/svelte/icons/folder-check';
	let created = $state(false);
</script>

{#snippet before()}<Folder size={24} strokeWidth={1.75} />{/snippet}
{#snippet after()}<FolderCheck size={24} strokeWidth={1.75} />{/snippet}
<div class="canvas">
	<EmptyState
		title={created ? 'View created' : 'No saved views'}
		description={created
			? 'Launch review is saved with your current filters.'
			: 'Create a view to keep your favorite filters close at hand.'}
		icon={created ? after : before}
		label="Saved views"
		>{#snippet action()}<Button
				size="sm"
				variant={created ? 'secondary' : 'primary'}
				label={created ? 'Undo' : 'Create view'}
				onclick={() => (created = !created)}
			/>{/snippet}</EmptyState
	>
</div>

<style>
	.canvas {
		width: 100%;
		min-width: 0;
		max-width: 580px;
		min-height: 88px;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		place-items: center;
		padding: 8px;
		color: var(--foreground);
	}
</style>
