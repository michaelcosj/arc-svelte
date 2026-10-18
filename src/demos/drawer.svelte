<script lang="ts">
	import { Drawer, DrawerClose, DrawerContent, DrawerTrigger } from '#arc/drawer';
	let container = $state<HTMLDivElement | null>(null);
</script>

<div class="preview">
	<div class="drawer-stage" bind:this={container}>
		<Drawer>
			<DrawerTrigger
				>{#snippet child({ props })}<button {...props} type="button" class="quiet-action"
						>Open details</button
					>{/snippet}</DrawerTrigger
			>
			<DrawerContent {container} title="Launch details" description="Northwind onboarding refresh">
				<dl class="drawer-facts">
					<div>
						<dt>Owner</dt>
						<dd>Emma Collins</dd>
					</div>
					<div>
						<dt>Due</dt>
						<dd>Oct 16</dd>
					</div>
					<div>
						<dt>Status</dt>
						<dd>In review</dd>
					</div>
				</dl>
				<DrawerClose
					>{#snippet child({ props })}<button {...props} type="button" class="action drawer-done"
							>Done</button
						>{/snippet}</DrawerClose
				>
			</DrawerContent>
		</Drawer>
	</div>
</div>

<style>
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
	.quiet-action[aria-haspopup]:active {
		background: var(--surface-muted);
	}
	.action:focus-visible,
	.quiet-action:focus-visible {
		--focus-outline-offset: 3px;
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
	.drawer-stage {
		position: relative;
		display: grid;
		width: 100%;
		height: 360px;
		place-items: center;
		overflow: hidden;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-panel);
		background: var(--surface);
		isolation: isolate;
	}
	.drawer-facts {
		display: grid;
		gap: 12px;
		margin: 0;
	}
	.drawer-facts div {
		display: flex;
		justify-content: space-between;
		gap: 16px;
	}
	.drawer-facts dt {
		color: var(--text-secondary);
	}
	.drawer-facts dd {
		margin: 0;
		color: var(--foreground);
		font-weight: 500;
	}
	.drawer-done {
		margin-top: 24px;
		width: 100%;
	}
	@media (max-width: 520px) {
		.preview {
			min-height: 132px;
		}
	}
</style>
