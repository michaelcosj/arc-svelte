<script lang="ts">
	import { HoldToConfirm } from '#arc/hold-to-confirm';
	import { prefersReducedMotion } from 'svelte/motion';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import { Mounted, motionTokens as m, swap } from '#lib/motion';
	let confirmed = $state(false),
		holding = $state(false),
		host = $state<HTMLDivElement>();
	const reduced = $derived(prefersReducedMotion.current);
	const mounted = new Mounted();
	const hint = $derived(
		confirmed
			? 'restore'
			: holding
				? 'Keep holding to delete'
				: 'Hold for 1.2 seconds, or hold Space'
	);
	const intro = $derived({
		...(reduced
			? { duration: m.duration.fast }
			: { y: '0.3em', blur: m.blur.soft, duration: m.duration.standard }),
		easing: m.ease.enter,
		skip: !mounted.current
	});
	const outro = $derived(
		reduced
			? { duration: m.duration.instant, pop: true }
			: {
					y: '-0.3em',
					blur: m.blur.subtle,
					duration: m.duration.fast,
					easing: m.ease.standard,
					pop: true
				}
	);
</script>

<div class="stage">
	<div class="hold" bind:this={host}>
		<HoldToConfirm
			label="Hold to delete"
			confirmedLabel="Deleted"
			{confirmed}
			onConfirm={() => (confirmed = true)}
			onHoldChange={(value) => (holding = value)}
		/>
	</div>
	<div class="below" aria-live="polite">
		{#key hint}
			{#if hint === 'restore'}
				<button
					type="button"
					class="restore"
					onclick={() => {
						confirmed = false;
						host?.querySelector('button')?.focus();
					}}
					in:swap={{ ...intro, delay: reduced ? 0 : 200 }}
					out:swap={outro}
					><RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />Restore</button
				>
			{:else}<p class="hint" in:swap={intro} out:swap={outro}>{hint}</p>{/if}
		{/key}
	</div>
</div>

<style>
	.stage {
		display: grid;
		width: 100%;
		min-height: 240px;
		align-content: center;
		justify-items: center;
		gap: var(--space-3);
		padding: var(--space-6) var(--space-4);
		box-sizing: border-box;
		font-family: var(--font-body);
		letter-spacing: var(--tracking-body);
	}
	.hold {
		display: flex;
		max-width: 100%;
	}
	.below {
		position: relative;
		display: grid;
		min-height: var(--control-height-sm, 36px);
		place-items: center;
	}
	.below > * {
		grid-area: 1 / 1;
	}
	.hint {
		margin: 0;
		color: var(--text-muted);
		font-size: var(--text-sm);
		line-height: var(--leading-body);
		text-align: center;
		white-space: nowrap;
	}
	.restore {
		display: inline-flex;
		min-height: var(--control-height-sm, 36px);
		align-items: center;
		gap: var(--space-2);
		padding: 0 var(--space-3);
		border: 0;
		border-radius: var(--radius-control);
		background: transparent;
		color: var(--text-secondary);
		font: inherit;
		font-size: var(--text-sm);
		font-weight: 500;
		line-height: var(--leading-body);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition:
			background-color var(--duration-fast) var(--ease-standard),
			color var(--duration-fast) var(--ease-standard);
	}
	.restore:hover,
	.restore:active {
		background: var(--surface-muted);
		color: var(--foreground);
	}
	@media (prefers-reduced-motion: reduce) {
		.restore {
			transition: none;
		}
	}
</style>
