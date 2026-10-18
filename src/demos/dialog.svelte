<script lang="ts">
	import { Dialog, DialogClose, DialogContent, DialogTrigger } from '#arc/dialog';

	let open = $state(false);
</script>

<div class="preview">
	<Dialog bind:open>
		<DialogTrigger>
			{#snippet child({ props })}
				<button {...props} type="button" class="action">Review changes</button>
			{/snippet}
		</DialogTrigger>
		<DialogContent
			title="Publish workspace"
			description="Your team will see these changes immediately."
		>
			<div class="stack">
				<p class="caption">Three files are ready to publish. You can still revise them later.</p>
				<div class="dialog-actions">
					<DialogClose>
						{#snippet child({ props })}
							<button {...props} type="button" class="quiet-action">Keep editing</button>
						{/snippet}
					</DialogClose>
					<DialogClose>
						{#snippet child({ props })}
							<button {...props} type="button" class="action" onclick={() => (open = false)}
								>Publish now</button
							>
						{/snippet}
					</DialogClose>
				</div>
			</div>
		</DialogContent>
	</Dialog>
	<span class="muted">Opens a focused decision surface</span>
</div>

<style>
	/* previews-disclosure-feedback from the uiarc.dev gallery. */
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

	.preview > :global(*) {
		max-width: 100%;
	}

	.muted {
		color: var(--text-muted);
		font-size: 12px;
	}

	.stack {
		display: grid;
		gap: 10px;
	}

	.caption {
		margin: 0;
		color: var(--text-secondary);
		font-size: 12px;
		line-height: 1.45;
	}

	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
	}

	.action,
	.quiet-action {
		display: inline-flex;
		min-height: 34px;
		align-items: center;
		justify-content: center;
		gap: 7px;
		border: 1px solid var(--border);
		border-radius: var(--radius-control);
		padding: 0 12px;
		background: var(--surface);
		color: var(--foreground);
		font-size: 12px;
		font-weight: 500;
		transition:
			transform var(--duration-spring) var(--ease-spring),
			background var(--duration-fast) var(--ease-standard),
			border-color var(--duration-fast) var(--ease-standard);
	}

	.action {
		border-color: var(--accent);
		background: var(--accent);
		color: var(--accent-foreground);
	}

	@media (hover: hover) and (pointer: fine) {
		.quiet-action:hover {
			border-color: var(--border-strong);
			background: var(--surface-muted);
		}

		.action:hover {
			border-color: var(--accent-strong);
			background: var(--accent-strong);
		}
	}

	.action:not([aria-haspopup]):active,
	.quiet-action:not([aria-haspopup]):active {
		transform: scale(0.97);
		transition-duration: var(--duration-instant);
		transition-timing-function: var(--ease-standard);
	}

	.action[aria-haspopup]:active {
		background: var(--accent-strong);
	}

	.quiet-action[aria-haspopup]:active {
		background: var(--surface-muted);
	}

	@media (prefers-reduced-motion: reduce) {
		.action,
		.quiet-action {
			transition:
				background var(--duration-fast) var(--ease-standard),
				border-color var(--duration-fast) var(--ease-standard);
		}

		.action:active,
		.quiet-action:active {
			transform: none;
		}
	}

	.action:focus-visible,
	.quiet-action:focus-visible {
		--focus-outline-offset: 3px;
	}
</style>
