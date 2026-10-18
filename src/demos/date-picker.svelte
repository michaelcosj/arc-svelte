<script lang="ts">
	import { DatePicker } from '#arc/date-picker';
	import { useToday, addDays } from '#arc/calendar';
	const today = useToday();
	let selected = $state<Date | null | undefined>(undefined),
		status = $state('');
	const value = $derived(
		selected === undefined
			? today.current &&
					(addDays(today.current, 3).getMonth() === today.current.getMonth()
						? addDays(today.current, 3)
						: today.current)
			: (selected ?? undefined)
	);
</script>

<div class="preview">
	<div class="surface">
		<DatePicker
			label="Launch date"
			{value}
			onChange={(date) => {
				selected = date ?? null;
				status = date
					? `Launch set for ${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`
					: 'Launch date cleared';
			}}
			minDate={today.current}
			showToday
			placeholder={today.current ? undefined : ''}
			description="Pick the date for the review handoff."
		/>
	</div>
	<div class="status" role="status">{status}</div>
</div>

<style>
	.preview {
		width: min(100%, 620px);
		display: grid;
		gap: 16px;
		align-self: start;
		align-content: start;
		min-height: 504px;
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
		width: min(100%, 340px);
	}
	.status {
		color: var(--text-muted, #64748b);
		font-size: 12px;
		min-height: 18px;
		text-align: center;
	}
	@media (min-width: 761px) {
		.preview {
			margin-top: calc(var(--space-3) * -1);
		}
	}
</style>
