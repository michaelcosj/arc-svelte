<script lang="ts">
	import Archive from '@lucide/svelte/icons/archive';
	import Download from '@lucide/svelte/icons/download';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import Pencil from '@lucide/svelte/icons/pencil';
	import { DropdownMenu } from '#arc/dropdown-menu';
	import './actions.css';

	let status = $state('');
</script>

{#snippet more()}<Ellipsis size={15} />{/snippet}
{#snippet edit()}<Pencil size={15} />{/snippet}
{#snippet download()}<Download size={15} />{/snippet}
{#snippet archive()}<Archive size={15} />{/snippet}

<div class="actions-preview">
	<div class="actions-surface">
		<DropdownMenu
			label="Project actions"
			icon={more}
			items={[
				{ label: 'Edit project', icon: edit, onSelect: () => (status = 'Edit opened') },
				{ label: 'Download brief', icon: download, onSelect: () => (status = 'Brief queued') },
				{
					label: 'Archive',
					icon: archive,
					onSelect: () => (status = 'Project archived'),
					separatorBefore: true
				}
			]}
		/>
	</div>
	<div class="actions-status" role="status">{status}</div>
</div>
