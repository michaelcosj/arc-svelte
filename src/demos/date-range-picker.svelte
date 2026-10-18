<script lang="ts">
	import { DateRangePicker, useToday, type DateRange } from '#arc/date-range-picker';
	import { addDays, dayDiff } from '#lib/components/date-range-picker/dates.ts';
	const today = useToday();
	let selected = $state<DateRange | null>(null),
		stage = $state<HTMLDivElement>();
	const value = $derived(
			selected ?? (today.current ? { start: addDays(today.current, -6), end: today.current } : null)
		),
		days = $derived(value ? dayDiff(value.end, value.start) + 1 : 0);
</script>

<div class="canvas">
	<div bind:this={stage} class="stage">
		<DateRangePicker
			{value}
			onChange={(v) => (selected = v)}
			maxDate={today.current}
			boundary={() => stage ?? null}
			label="Date range"
		/>
		<p class="note" aria-live="polite">
			{value ? `${days} ${days === 1 ? 'day' : 'days'} selected` : 'No range selected'}
		</p>
	</div>
</div>

<style>
	.canvas {
		width: 100%;
		min-width: 0;
		max-width: 760px;
		margin-inline: auto;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		place-items: center;
		padding: 8px;
		color: var(--foreground);
	}
	.canvas > * {
		width: 100%;
		min-width: 0;
	}
	.stage {
		display: flex;
		width: min(100%, 760px);
		min-height: 460px;
		box-sizing: border-box;
		margin-inline: auto;
		flex-direction: column;
		align-items: center;
		gap: var(--space-3);
		padding: 56px var(--space-4) var(--space-4);
		font-family: var(--font-body);
		letter-spacing: var(--tracking-body);
		line-height: var(--leading-body);
	}
	.note {
		margin: 0;
		color: var(--text-muted);
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
	}
	@media (max-width: 760px) {
		.stage {
			min-height: 520px;
			padding-top: 32px;
		}
	}
</style>
