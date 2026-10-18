<script lang="ts">
	import { Skeleton } from '#arc/skeleton';
	import { Avatar } from '#arc/avatar';
	import SwapText from './lib/SwapText.svelte';
	let loading = $state(true);
	let timer: ReturnType<typeof setTimeout>;
	function reload() {
		clearTimeout(timer);
		loading = true;
		timer = setTimeout(() => (loading = false), 1600);
	}
	$effect(() => {
		timer = setTimeout(() => (loading = false), 1600);
		return () => clearTimeout(timer);
	});
</script>

<div class="preview">
	<div class="skeleton-wrap">
		<Skeleton label="Loading project summary" lines={3} avatar {loading}>
			<div class="loaded">
				<Avatar name="Emma Collins" src="/media/people/emma-collins.jpg" size="lg" />
				<div>
					<strong>Quarterly launch</strong>
					<p>Emma shared the final interaction pass. Three files are ready for review.</p>
				</div>
			</div>
		</Skeleton>
		<div class="footer">
			<span class="muted" aria-live="polite"
				><SwapText text={loading ? 'Loading project summary' : 'Updated just now'} /></span
			><button type="button" class="quiet-action" onclick={reload}>Reload</button>
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
	.skeleton-wrap {
		display: grid;
		width: min(100%, 380px);
		gap: 16px;
		margin-inline: auto;
		border: 1px solid var(--border);
		border-radius: 16px;
		padding: 20px;
		background: var(--surface);
	}
	.footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		border-top: 1px solid var(--border-subtle);
		padding-top: 12px;
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
	.quiet-action:active {
		transform: scale(0.97);
		transition-duration: var(--duration-instant);
		transition-timing-function: var(--ease-standard);
	}
	.quiet-action:focus-visible {
		--focus-outline-offset: 3px;
	}
	.loaded {
		display: flex;
		align-items: flex-start;
		gap: var(--space-4);
	}
	.loaded :global([role='img']) {
		width: var(--control-height-md);
		height: var(--control-height-md);
	}
	.loaded > div {
		display: grid;
		min-width: 0;
		gap: 4px;
		padding-top: 2px;
	}
	.loaded strong {
		font-size: var(--text-sm);
		font-weight: 500;
		line-height: var(--leading-body);
	}
	.loaded p {
		margin: 0;
		color: var(--text-secondary);
		font-size: var(--text-sm);
		line-height: var(--leading-body);
	}
	@media (hover: hover) and (pointer: fine) {
		.quiet-action:hover {
			border-color: var(--border-strong);
			background: var(--surface-muted);
		}
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
	@media (max-width: 520px) {
		.preview {
			min-height: 132px;
		}
	}
</style>
