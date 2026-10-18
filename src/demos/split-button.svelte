<script lang="ts">
	import type { Snippet } from 'svelte';
	import Check from '@lucide/svelte/icons/check';
	import FileText from '@lucide/svelte/icons/file-text';
	import Send from '@lucide/svelte/icons/send';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { SplitButton } from '#arc/split-button';
	let flash = $state<{ at: number; label: string; icon: Snippet } | null>(null);
	let status = $state('');
	function run(label: string, icon: Snippet, message: string) {
		const at = performance.now();
		flash = { at, label, icon };
		status = message;
		setTimeout(() => {
			if (flash?.at === at) flash = null;
		}, 2200);
	}
</script>

{#snippet send()}<Send size={15} />{/snippet}
{#snippet check()}<Check size={15} />{/snippet}
{#snippet file()}<FileText size={15} />{/snippet}
{#snippet trash()}<Trash2 size={15} />{/snippet}

<div class="preview">
	<div class="surface">
		<div class="solo">
			<SplitButton
				label={flash?.label ?? 'Publish'}
				icon={flash?.icon ?? send}
				onclick={() => run('Published', check, 'Published')}
				actions={[
					{
						label: 'Publish and notify',
						icon: send,
						onSelect: () => run('Published', check, 'Published and notified the team')
					},
					{
						label: 'Save as draft',
						icon: file,
						onSelect: () => run('Draft saved', file, 'Draft saved')
					},
					{
						label: 'Delete draft',
						icon: trash,
						destructive: true,
						onSelect: () => run('Draft deleted', trash, 'Draft deleted')
					}
				]}
			/>
		</div>
	</div>
	<div class="status" role="status">{status}</div>
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
	}
	.solo {
		display: flex;
		justify-content: center;
	}
	.status {
		min-height: 18px;
		color: var(--text-muted, #64748b);
		font-size: 12px;
		text-align: center;
	}
</style>
