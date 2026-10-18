<script lang="ts">
	import { Toast } from '#arc/toast';
	let open = $state(false);
	let version = $state(0);
	let saveButton = $state<HTMLButtonElement>();
	let slot = $state<HTMLDivElement>();
</script>

<div class="preview">
	<div class="demo">
		<button
			type="button"
			class="action"
			bind:this={saveButton}
			onclick={() => {
				version = open ? version + 1 : 1;
				open = true;
			}}>Save a draft</button
		>
		<div
			class="slot"
			bind:this={slot}
			onclickcapture={(event) => {
				if (
					(event.target as Element).closest('button[aria-label="Dismiss notification"]') &&
					slot?.contains(document.activeElement)
				)
					saveButton?.focus({ preventScroll: true });
			}}
		>
			<Toast
				title={version > 1 ? 'Draft updated' : 'Draft saved'}
				description={version > 1
					? `Version ${version} is ready to continue later.`
					: 'Your work is ready to continue later.'}
				duration={0}
				{open}
				onOpenChange={(next) => (open = next)}
			/>
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
	.demo {
		display: grid;
		width: min(100%, 380px);
		justify-items: center;
		gap: var(--space-4);
		margin-inline: auto;
	}
	.slot {
		display: grid;
		width: 100%;
		min-height: 6rem;
		align-content: start;
		justify-items: center;
	}
	.action {
		display: inline-flex;
		min-height: 34px;
		align-items: center;
		justify-content: center;
		gap: 7px;
		border: 1px solid var(--accent);
		border-radius: var(--radius-control);
		padding: 0 12px;
		background: var(--accent);
		color: var(--accent-foreground);
		font-size: 12px;
		font-weight: 500;
		transition:
			transform var(--duration-spring) var(--ease-spring),
			background var(--duration-fast) var(--ease-standard),
			border-color var(--duration-fast) var(--ease-standard);
	}
	.action:active {
		transform: scale(0.97);
		transition-duration: var(--duration-instant);
		transition-timing-function: var(--ease-standard);
	}
	.action:focus-visible {
		--focus-outline-offset: 3px;
	}
	@media (hover: hover) and (pointer: fine) {
		.action:hover {
			border-color: var(--accent-strong);
			background: var(--accent-strong);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.action {
			transition:
				background var(--duration-fast) var(--ease-standard),
				border-color var(--duration-fast) var(--ease-standard);
		}
		.action:active {
			transform: none;
		}
	}
	@media (max-width: 520px) {
		.preview {
			min-height: 132px;
		}
	}
</style>
