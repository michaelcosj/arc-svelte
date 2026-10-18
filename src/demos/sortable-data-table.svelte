<script lang="ts">
	import { SortableDataTable } from '#arc/sortable-data-table';
	import { Badge } from '#arc/badge';
	import type { BadgeTone } from '#arc/badge';
	const rows = [
		{
			name: 'Aurora redesign',
			owner: 'Emma Collins',
			status: 'In review',
			due: '2026-10-02',
			score: 92
		},
		{
			name: 'Billing migration',
			owner: 'Noah Williams',
			status: 'On track',
			due: '2026-10-14',
			score: 86
		},
		{
			name: 'Cinder analytics',
			owner: 'Inez Park',
			status: 'At risk',
			due: '2026-09-28',
			score: 64
		},
		{ name: 'Docs refresh', owner: 'Marcus Johnson', status: 'Done', due: '2026-09-18', score: 97 },
		{
			name: 'Mobile onboarding',
			owner: 'Ari Singh',
			status: 'On track',
			due: '2026-11-06',
			score: 78
		}
	];
	const tones: Record<string, BadgeTone> = {
		'On track': 'success',
		'In review': 'info',
		'At risk': 'warning',
		Done: 'neutral'
	};
	const dates = new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		timeZone: 'UTC'
	});
</script>

{#snippet status(value: unknown)}<Badge
		tone={tones[String(value)] ?? 'neutral'}
		size="sm"
		label={String(value)}
	/>{/snippet}
{#snippet date(value: unknown)}{dates.format(new Date(`${value}T00:00:00Z`))}{/snippet}

<div class="canvas">
	<SortableDataTable
		{rows}
		columns={[
			{ key: 'name', label: 'Project' },
			{ key: 'owner', label: 'Owner' },
			{ key: 'status', label: 'Status', render: status },
			{ key: 'due', label: 'Due', render: date },
			{ key: 'score', label: 'Score', numeric: true }
		]}
		rowKey="name"
		caption="Project health"
		defaultSort={{ key: 'score', direction: 'desc' }}
		selectable
		itemName={{ one: 'project', other: 'projects' }}
	/>
</div>

<style>
	.canvas {
		width: 100%;
		min-width: 0;
		max-width: 760px;
		min-height: 88px;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		place-items: center;
		padding: 8px;
		color: var(--foreground);
	}
	.canvas > :global(*) {
		width: 100%;
		min-width: 0;
	}
</style>
