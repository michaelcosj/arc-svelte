<script lang="ts">
	import Reply from '@lucide/svelte/icons/reply';
	import Forward from '@lucide/svelte/icons/forward';
	import Archive from '@lucide/svelte/icons/archive';
	import Clock from '@lucide/svelte/icons/clock-3';
	import Trash from '@lucide/svelte/icons/trash-2';
	import Download from '@lucide/svelte/icons/download';
	import Link from '@lucide/svelte/icons/link-2';
	import Pencil from '@lucide/svelte/icons/pencil-line';
	import Globe from '@lucide/svelte/icons/globe';
	import Copy from '@lucide/svelte/icons/copy';
	import Pin from '@lucide/svelte/icons/pin';
	import { ExpandingButtonGroup } from '#arc/expanding-button-group';
	import './expanding-button-group-demo.css';
</script>

{#snippet reply()}<Reply />{/snippet}{#snippet forward()}<Forward
	/>{/snippet}{#snippet archive()}<Archive />{/snippet}{#snippet clock()}<Clock
	/>{/snippet}{#snippet trash()}<Trash />{/snippet}{#snippet download()}<Download
	/>{/snippet}{#snippet link()}<Link />{/snippet}{#snippet pencil()}<Pencil
	/>{/snippet}{#snippet globe()}<Globe />{/snippet}{#snippet copy()}<Copy
	/>{/snippet}{#snippet pin()}<Pin />{/snippet}
<div class="arc-expanding-button-group-demo__demo">
	<div class="arc-expanding-button-group-demo__row">
		<ExpandingButtonGroup
			label="Message actions"
			items={[
				{ id: 'reply', label: 'Reply', doneLabel: 'Replied', icon: reply },
				{ id: 'forward', label: 'Forward', doneLabel: 'Forwarded', icon: forward },
				{ id: 'archive', label: 'Archive', doneLabel: 'Archived', icon: archive },
				{ id: 'snooze', label: 'Snooze', doneLabel: 'Snoozed', icon: clock },
				{ id: 'delete', label: 'Delete', doneLabel: 'Deleted', tone: 'danger', icon: trash }
			]}
		/>
	</div>
	<div class="arc-expanding-button-group-demo__row arc-expanding-button-group-demo__rowSm">
		<ExpandingButtonGroup
			label="File actions"
			size="sm"
			items={[
				{
					id: 'download',
					label: 'Download',
					doneLabel: 'Downloaded',
					icon: download,
					onSelect: () => new Promise<void>((resolve) => setTimeout(resolve, 700))
				},
				{ id: 'link', label: 'Copy link', doneLabel: 'Copied', icon: link },
				{ id: 'rename', label: 'Rename', doneLabel: 'Renamed', icon: pencil }
			]}
		/>
	</div>
	<div class="arc-expanding-button-group-demo__row">
		<ExpandingButtonGroup
			label="Page actions"
			defaultExpanded="publish"
			items={[
				{ id: 'publish', label: 'Publish', doneLabel: 'Published', icon: globe },
				{ id: 'duplicate', label: 'Duplicate', doneLabel: 'Duplicated', icon: copy },
				{ id: 'pin', label: 'Pin', doneLabel: 'Pinned', icon: pin },
				{ id: 'delete', label: 'Delete', doneLabel: 'Deleted', tone: 'danger', icon: trash }
			]}
		/>
	</div>
</div>
