<script lang="ts">
	import { Calendar, useToday, addDays } from '#arc/calendar';
	const today = useToday();
	let selected = $state.raw<Date>();
	const value = $derived(
		selected ??
			(today.current &&
				(addDays(today.current, 3).getMonth() === today.current.getMonth()
					? addDays(today.current, 3)
					: today.current))
	);
	let status = $state('');
</script>

<div class="preview">
	<div class="surface">
		<div class="calendar-demo-stage">
			<div class="calendar-demo-frame">
				<div class="calendar-demo-card">
					<Calendar
						{value}
						minDate={today.current}
						showToday
						onChange={(date) => {
							selected = date;
							status = `Launch set for ${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`;
						}}
					/>
				</div>
			</div>
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
	.surface > * {
		max-width: 100%;
	}
	.status {
		min-height: 18px;
		text-align: center;
		color: var(--text-muted, #64748b);
		font-size: 12px;
	}
	.calendar-demo-stage {
		container-type: inline-size;
		width: min(100%, 374px);
	}
	.calendar-demo-frame {
		display: grid;
		align-content: start;
		min-height: calc(85.7143cqi + 82px);
	}
	@container (max-width:305px) {
		.calendar-demo-frame {
			min-height: calc(85.7143cqi + 106.4px);
		}
	}
	.calendar-demo-card {
		display: grid;
		justify-items: center;
		border: 1px solid var(--border);
		border-radius: var(--radius-panel);
		padding: 20px 22px 22px;
		background: var(--surface);
	}
	@media (prefers-reduced-motion: reduce) {
		.preview *,
		.preview ::after,
		.preview ::before {
			scroll-behavior: auto !important;
		}
	}
</style>
