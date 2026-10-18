<script lang="ts">
	import { FilterToolbar, type FilterChip, type FilterField } from '#arc/filter-toolbar';
	import CircleDashed from '@lucide/svelte/icons/circle-dashed';
	import UserRound from '@lucide/svelte/icons/user-round';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import SignalHigh from '@lucide/svelte/icons/signal-high';
	let filters = $state<FilterChip[]>([
		{ id: 'status', label: 'Status', value: 'In review' },
		{ id: 'owner', label: 'Owner', value: 'Emma Collins' }
	]);
	const fields: FilterField[] = [
		{
			id: 'status',
			label: 'Status',
			options: [
				{ value: 'Backlog', hint: 8 },
				{ value: 'Todo', hint: 14 },
				{ value: 'In progress', hint: 6 },
				{ value: 'In review', hint: 3 },
				{ value: 'Done', hint: 21 }
			]
		},
		{
			id: 'owner',
			label: 'Owner',
			options: ['Emma Collins', 'Marcus Johnson', 'Ava Mitchell', 'Sofia Ramirez']
		},
		{
			id: 'due',
			label: 'Due date',
			options: ['Overdue', 'Today', 'This week', 'Next week', 'No due date']
		},
		{
			id: 'priority',
			label: 'Priority',
			options: ['Urgent', 'High', 'Medium', 'Low']
		}
	];
	function add(filter: FilterChip) {
		filters = [...filters.filter((f) => f.id !== filter.id), filter].sort(
			(a, b) => fields.findIndex((f) => f.id === a.id) - fields.findIndex((f) => f.id === b.id)
		);
	}
</script>

{#snippet statusIcon()}<CircleDashed size={16} strokeWidth={1.75} />{/snippet}
{#snippet ownerIcon()}<UserRound size={16} strokeWidth={1.75} />{/snippet}
{#snippet dueIcon()}<CalendarDays size={16} strokeWidth={1.75} />{/snippet}
{#snippet priorityIcon()}<SignalHigh size={16} strokeWidth={1.75} />{/snippet}
<div class="canvas">
	<div class="demo">
		<FilterToolbar
			{filters}
			label="Project filters"
			onRemove={(id) => (filters = filters.filter((f) => f.id !== id))}
			onClearAll={() => (filters = [])}
			addFilter={{
				fields: fields.map((f, i) => ({
					...f,
					icon: [statusIcon, ownerIcon, dueIcon, priorityIcon][i]
				})),
				onAdd: add
			}}
		/>
	</div>
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
	.demo {
		width: 100%;
	}
	@media (max-width: 760px) {
		.canvas {
			align-self: start;
			margin-top: var(--space-4);
		}
	}
</style>
