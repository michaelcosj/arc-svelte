<script lang="ts">
	import { ContextMenu, contextMenuExampleItems } from '#arc/context-menu';
	import Pencil from '@lucide/svelte/icons/pencil';
	import MoreHorizontal from '@lucide/svelte/icons/ellipsis';
	let status = $state('');
	async function copyLink() {
		try {
			await navigator.clipboard.writeText(window.location.href);
			status = 'Link copied';
		} catch {
			status = 'Could not copy link';
		}
	}
</script>

{#snippet editIcon()}<Pencil size={15} />{/snippet}
{#snippet copyIcon()}{@render contextMenuExampleItems[0].icon?.()}{/snippet}
{#snippet deleteIcon()}{@render contextMenuExampleItems[1].icon?.()}{/snippet}

<div class="preview">
	<div class="surface">
		<ContextMenu
			label="Project actions"
			items={[
				{
					id: 'edit',
					label: 'Edit project',
					icon: editIcon,
					onSelect: () => (status = 'Edit opened')
				},
				{ id: 'copy', label: 'Copy link', icon: copyIcon, onSelect: () => void copyLink() },
				{
					id: 'delete',
					label: 'Delete project',
					icon: deleteIcon,
					destructive: true,
					onSelect: () => (status = 'Project deleted')
				}
			]}
		>
			<div class="contextTarget">
				<span class="contextCopy"
					><strong>Quarterly launch</strong><span>Product · Updated today</span></span
				>
				<span class="contextAction"
					><MoreHorizontal size={15} aria-hidden="true" /> Open actions</span
				>
			</div>
		</ContextMenu>
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
	.status {
		color: var(--text-muted, #64748b);
		font-size: 12px;
		min-height: 18px;
		text-align: center;
	}
	.contextTarget {
		display: grid;
		gap: 12px;
		min-width: 190px;
		padding: 12px 16px;
		border: 1px solid var(--border);
		border-radius: var(--radius-control);
		background: var(--surface-muted);
		color: inherit;
		text-align: left;
		cursor: pointer;
		transition:
			border-color var(--duration-fast) var(--ease-standard),
			background-color var(--duration-fast) var(--ease-standard);
	}
	.contextTarget:hover {
		border-color: var(--border-strong);
		background: var(--surface);
	}
	.contextCopy {
		display: grid;
		gap: 4px;
	}
	.contextAction {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--accent-strong);
		font-size: var(--text-xs);
		font-weight: 500;
		line-height: var(--leading-body);
	}
	.contextTarget strong {
		font-size: var(--text-sm);
		font-weight: 500;
		line-height: var(--leading-body);
	}
	.contextCopy > span {
		color: var(--text-muted);
		font-size: var(--text-xs);
		line-height: var(--leading-body);
	}
</style>
