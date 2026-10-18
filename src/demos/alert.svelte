<script lang="ts">
	import { Alert } from '#arc/alert';
	import { Button } from '#arc/button';
	let synced = $state(false);
</script>

<div class="preview">
	<div class="wrap">
		<div class="demo">
			<Alert
				tone={synced ? 'success' : 'warning'}
				title={synced ? 'All changes synced' : 'Sync paused'}
				data-frame-keep=""
				children={synced
					? '3 changes uploaded to the shared workspace just now.'
					: '3 changes are saved on this device. Reconnect to upload them.'}
			/>
			<div class="row">
				<Button
					size="sm"
					variant="secondary"
					label={synced ? 'Pause sync' : 'Reconnect'}
					onclick={() => (synced = !synced)}
				/>
			</div>
		</div>
	</div>
</div>

<style>
	.preview {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		width: 100%;
		min-width: 0;
		min-height: 118px;
		align-content: center;
		justify-items: center;
		gap: 14px;
		color: var(--foreground);
	}
	.preview > * {
		max-width: 100%;
	}
	.wrap {
		width: min(100%, 520px);
	}
	.demo {
		display: grid;
		width: min(100%, 520px);
		gap: var(--space-4);
		margin-inline: auto;
	}
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}
	@media (max-width: 520px) {
		.preview {
			min-height: 132px;
		}
	}
</style>
