<script lang="ts">
	import { SlotText } from '#arc/slot-text';
	import { SegmentedControl } from '#arc/segmented-control';
	let period = $state('week');
	const periods = [
		{ id: 'day', label: 'Today', revenue: 4218, change: 3.2 },
		{ id: 'week', label: 'Week', revenue: 31904, change: 12.4 },
		{ id: 'month', label: 'Month', revenue: 128450, change: 8.7 },
		{ id: 'year', label: 'Year', revenue: 1482360, change: 41.9 }
	];
	const options = periods.map((p) => ({ value: p.id, label: p.label }));
	const current = $derived(periods.find((p) => p.id === period) ?? periods[1]!);
	const money = (value: number) => `$${value.toLocaleString('en-US')}`;
	const percent = (value: number) => `+${value.toFixed(1)}%`;
</script>

<div class="canvas">
	<div class="card">
		<div class="head">
			<span class="label"><span class="swatch" aria-hidden="true"></span>Revenue</span><SlotText
				class="change"
				value={current.change}
				format={percent}
				duration={0.7}
				spins={0}
			/>
		</div>
		<SlotText class="value" value={current.revenue} format={money} announce />
		<div class="periods"><SegmentedControl label="Period" {options} bind:value={period} /></div>
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
	.card {
		display: grid;
		width: 100%;
		max-width: 420px;
		gap: 20px;
		margin-inline: auto;
		padding: 24px;
		border: 1px solid var(--border);
		border-radius: var(--radius-surface);
		background: var(--surface);
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		font-size: var(--text-sm);
		letter-spacing: var(--tracking-body);
	}
	.label {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		color: var(--text-secondary);
	}
	.swatch {
		width: 8px;
		height: 8px;
		border-radius: var(--radius-pill);
		background: var(--accent);
	}
	.head :global(.change) {
		color: var(--success);
		font-weight: 500;
	}
	.card :global(.value) {
		justify-self: start;
		color: var(--foreground);
		font-family: var(--font-display);
		font-size: clamp(2.5rem, 13vw, var(--text-4xl));
		font-weight: 400;
		letter-spacing: var(--tracking-display);
	}
	.periods {
		display: grid;
		min-width: 0;
	}
	.periods :global(.arc-segmented-control) {
		display: flex;
	}
	.periods :global(.arc-segmented-control__track) {
		flex: 1 1 0%;
	}
	.periods :global(button) {
		flex: 1 0 auto;
	}
	@media (max-width: 380px) {
		.card {
			padding: 20px;
		}
		.periods :global(button) {
			padding-inline: 8px;
		}
	}
</style>
