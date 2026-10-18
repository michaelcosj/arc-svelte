<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import Plus from '@lucide/svelte/icons/plus';
	import { prefersReducedMotion } from 'svelte/motion';
	import { Button } from '#arc/button';
	import { TextMorph } from '#arc/text-morph';
	import { motionTokens as m, swap, type SwapParams } from '#lib/motion';

	const statuses = ['Publish', 'Publishing', 'Published'];
	let status = $state(0);
	let following = $state(false);

	const reduced = $derived(prefersReducedMotion.current);
	const iconIn = $derived<SwapParams>(
		reduced
			? { duration: m.duration.instant }
			: {
					scale: 0.6,
					blur: m.blur.subtle,
					...m.spring.snappy,
					fade: { duration: m.duration.fast }
				}
	);
	const iconOut = $derived<SwapParams>(
		reduced
			? { duration: 0, pop: true }
			: { scale: 0.6, blur: m.blur.subtle, duration: m.duration.instant, pop: true }
	);
</script>

<div class="text-canvas">
	<div class="demo">
		<TextMorph as="p" class="display" text={statuses[status] ?? ''} />
		<div class="controls">
			<Button
				variant="secondary"
				size="sm"
				onclick={() => (status = (status + 1) % statuses.length)}>Next status</Button
			>
			<button
				type="button"
				class="chip"
				data-following={following}
				onclick={() => (following = !following)}
			>
				<span class="icon" aria-hidden="true">
					{#key following}
						<span in:swap={iconIn} out:swap={iconOut}>
							{#if following}<Check size={15} strokeWidth={1.75} />{:else}<Plus
									size={15}
									strokeWidth={1.75}
								/>{/if}
						</span>
					{/key}
				</span>
				<TextMorph text={following ? 'Following' : 'Follow'} />
			</button>
		</div>
	</div>
</div>

<style>
	/* previews-text canvas and the text-morph demo styles from the uiarc.dev gallery. */
	.text-canvas {
		width: 100%;
		min-width: 0;
		max-width: 760px;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		place-items: center;
		padding: 8px;
		color: var(--foreground);
	}

	.text-canvas > * {
		width: 100%;
		min-width: 0;
	}

	.demo {
		display: grid;
		justify-items: center;
		gap: 28px;
		width: min(100%, 560px);
		font-family: var(--font-body);
		letter-spacing: var(--tracking-body);
		text-align: center;
	}

	.demo :global(.display) {
		margin: 0;
		color: var(--foreground);
		font-family: var(--font-display);
		font-size: clamp(var(--text-3xl), 11vw, var(--text-5xl));
		font-weight: 400;
		line-height: var(--leading-display);
		letter-spacing: var(--tracking-display);
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 10px;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: var(--control-height-sm);
		padding: 0 14px 0 11px;
		border: 1px solid var(--border);
		border-radius: var(--radius-pill);
		color: var(--foreground);
		background: var(--surface);
		font: inherit;
		font-size: var(--text-sm);
		font-weight: 500;
		white-space: nowrap;
		cursor: pointer;
		transition:
			color var(--duration-fast) var(--ease-standard),
			background-color var(--duration-fast) var(--ease-standard),
			border-color var(--duration-fast) var(--ease-standard),
			transform var(--duration-spring) var(--ease-spring);
	}

	.chip[data-following='true'] {
		color: var(--background);
		background: var(--foreground);
		border-color: var(--foreground);
	}

	.chip:active {
		transform: scale(0.97);
		transition-duration:
			var(--duration-fast), var(--duration-fast), var(--duration-fast), var(--duration-instant);
		transition-timing-function:
			var(--ease-standard), var(--ease-standard), var(--ease-standard), var(--ease-enter);
	}

	@media (hover: hover) and (pointer: fine) {
		.chip[data-following='false']:hover {
			background: var(--surface-muted);
		}
	}

	.icon {
		position: relative;
		display: inline-grid;
		width: 15px;
		height: 15px;
		place-items: center;
	}

	.icon > span {
		display: grid;
		place-items: center;
	}

	@media (prefers-reduced-motion: reduce) {
		.chip,
		.chip:active {
			transform: none;
			transition: none;
		}
	}
</style>
