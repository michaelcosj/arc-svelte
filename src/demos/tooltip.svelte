<script lang="ts">
	import CircleHelp from '@lucide/svelte/icons/circle-help';
	import { Tooltip } from '#arc/tooltip';
</script>

<div class="preview">
	<Tooltip content="Only workspace members can see this project">
		{#snippet child({ props })}
			<!-- The gallery's trigger is a focusable span, kept as-is so the demo matches. -->
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<span {...props} class="tip-button" tabindex="0" aria-label="Project visibility information">
				<CircleHelp size={16} aria-hidden="true" />
			</span>
		{/snippet}
	</Tooltip>
	<span class="muted">Hover or focus the icon</span>
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

	.tip-button {
		display: inline-grid;
		width: 32px;
		height: 32px;
		place-items: center;
		border: 1px solid var(--border);
		border-radius: 50%;
		background: var(--surface);
		color: var(--foreground);
		transition:
			background-color var(--duration-fast) var(--ease-standard),
			border-color var(--duration-fast) var(--ease-standard);
	}

	@media (hover: hover) and (pointer: fine) {
		.tip-button:hover {
			border-color: var(--border-strong);
			background: var(--surface-muted);
		}
	}

	.tip-button[data-state$='-open'] {
		border-color: var(--border-strong);
		background: var(--surface-muted);
	}
</style>
