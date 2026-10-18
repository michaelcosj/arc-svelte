<script lang="ts">
	import { Progress } from '#arc/progress';
	import SwapText from './lib/SwapText.svelte';

	let value = $state(68);
</script>

<div class="preview">
	<div class="progress-wrap">
		<Progress {value} label="Preparing your workspace" showValue />
		<div class="row">
			<button
				type="button"
				class="quiet-action"
				onclick={() => (value = value >= 100 ? 0 : value + 16)}
			>
				<SwapText text={value >= 100 ? 'Restart' : 'Advance'} reserve={['Advance', 'Restart']} />
			</button>
			<span class="result" aria-live="polite">
				<SwapText text={value >= 100 ? 'Ready to publish' : 'Processing securely'} />
			</span>
		</div>
	</div>
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

	.progress-wrap {
		display: grid;
		width: min(100%, 380px);
		gap: 12px;
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
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

	.quiet-action:active {
		transform: scale(0.97);
		transition-duration: var(--duration-instant);
		transition-timing-function: var(--ease-standard);
	}

	.quiet-action:focus-visible {
		--focus-outline-offset: 3px;
	}

	.result {
		color: var(--text-secondary);
		font-size: 12px;
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
</style>
