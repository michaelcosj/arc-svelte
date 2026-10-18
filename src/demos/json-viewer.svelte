<script lang="ts">
	import { JsonViewer } from '#arc/json-viewer';
	import { order } from './json-viewer-data';
	let feedback = $state('');
</script>

<div class="canvas">
	<div class="demo">
		<div class="request">
			<span class="method">GET</span><code class="url">/v1/orders/ord_8Kd2Q7</code><span
				class="status"><span class="dot" aria-hidden="true"></span>200</span
			><span class="time">84 ms</span>
		</div>
		<JsonViewer
			data={order}
			rootName="order"
			maxHeight={380}
			label="Order response"
			onCopy={(d) => (feedback = `Copied ${d.kind}: ${d.path}`)}
		/>
		<div class="note" aria-hidden="true">
			<span class="noteText"
				>{#if feedback}{feedback}{:else}Try searching for <code class="code">refund</code>, then use
					the arrow keys{/if}</span
			>
		</div>
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
	.demo {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		width: min(100%, 680px);
		gap: var(--space-3);
		margin-inline: auto;
		font-family: var(--font-body);
		letter-spacing: var(--tracking-body);
	}
	.request {
		display: flex;
		min-width: 0;
		align-items: center;
		gap: 10px;
		padding-inline: 6px;
		font-size: var(--text-sm);
	}
	.method {
		flex: none;
		color: var(--foreground);
		font-weight: 500;
	}
	.url {
		min-width: 0;
		flex: 1;
		overflow: hidden;
		color: var(--text-secondary);
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 13px;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.status {
		display: inline-flex;
		flex: none;
		align-items: center;
		gap: 6px;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
	}
	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--success);
	}
	.time {
		flex: none;
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
	}
	@media (max-width: 420px) {
		.time {
			display: none;
		}
	}

	.note {
		position: relative;
		display: flex;
		min-height: 24px;
		align-items: center;
		padding-inline: 6px;
		color: var(--text-secondary);
		font-size: var(--text-sm);
	}
	.noteText {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.code {
		color: var(--foreground);
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-size: var(--text-xs);
	}
</style>
