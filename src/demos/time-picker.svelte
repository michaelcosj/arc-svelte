<script lang="ts">
	import { TimePicker } from '#arc/time-picker';
	let value = $state('09:30');
</script>

<div class="preview">
	<div class="surface">
		<TimePicker
			label="Review time"
			bind:value
			minuteStep={15}
			description="Local time for the review."
		/>
	</div>
	<div class="status" role="status"></div>
</div>

<style>
	.preview {
		width: min(100%, 620px);
		display: grid;
		gap: 16px;
		align-self: start;
		margin-top: var(--space-12);
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
	@media (prefers-reduced-motion: reduce) {
		.preview :global(*) {
			scroll-behavior: auto !important;
		}
	}
</style>
