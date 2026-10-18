<script lang="ts">
	import CircleHelp from '@lucide/svelte/icons/circle-help';
	import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '#arc/popover';

	let open = $state(false);
</script>

<div class="preview">
	<Popover bind:open>
		<PopoverTrigger>
			{#snippet child({ props })}
				<button {...props} class={['quiet-action', props.class]}>
					<CircleHelp size={15} aria-hidden="true" /> Why this status?
				</button>
			{/snippet}
		</PopoverTrigger>
		<PopoverContent>
			<div class="popover-body">
				<strong>Ready for review</strong>
				<p>All required checks passed. Invite a teammate when you want a second pair of eyes.</p>
				<PopoverClose>
					{#snippet child({ props })}
						<button {...props} class={['quiet-action', props.class]}>Got it</button>
					{/snippet}
				</PopoverClose>
			</div>
		</PopoverContent>
	</Popover>
	<span class="muted">Anchored context stays close to its trigger</span>
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

	@media (hover: hover) and (pointer: fine) {
		.quiet-action:hover {
			border-color: var(--border-strong);
			background: var(--surface-muted);
		}
	}

	.quiet-action:not([aria-haspopup]):active {
		transform: scale(0.97);
		transition-duration: var(--duration-instant);
		transition-timing-function: var(--ease-standard);
	}

	.quiet-action[aria-haspopup]:active {
		background: var(--surface-muted);
	}

	.quiet-action:focus-visible {
		--focus-outline-offset: 3px;
	}

	@media (prefers-reduced-motion: reduce) {
		.quiet-action {
			transition:
				background var(--duration-fast) var(--ease-standard),
				border-color var(--duration-fast) var(--ease-standard);
		}

		.quiet-action:active {
			transform: none;
		}
	}

	.popover-body {
		display: grid;
		width: 220px;
		gap: 8px;
		padding: 2px;
	}

	.popover-body strong {
		font-size: var(--text-sm);
		font-weight: 500;
	}

	.popover-body p {
		margin: 0;
		color: var(--text-secondary);
		font-size: var(--text-xs);
		line-height: var(--leading-body);
	}
</style>
