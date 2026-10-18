<script lang="ts">
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import { ImageCompare } from '#arc/image-compare';
	import { SegmentedControl } from '#arc/segmented-control';
	import ArcImage from '#lib/arc/ArcImage.svelte';
	let position = $state(38);
	let orientation = $state<'horizontal' | 'vertical'>('horizontal');
</script>

{#snippet before()}
	<ArcImage
		src="/media/photos/living-room.jpg"
		alt="Raw capture of a bright living room with timber beams and arched windows, flat and muted"
		fill
		loading="eager"
		sizes="(max-width: 620px) 100vw, 560px"
		style="object-position:50% 60%;filter:saturate(.45) contrast(.78) brightness(1.1) sepia(.12);"
	/>
{/snippet}
{#snippet after()}
	<ArcImage
		src="/media/photos/living-room.jpg"
		alt="Final grade of the same room, with warmer light and richer wood tones"
		fill
		loading="eager"
		sizes="(max-width: 620px) 100vw, 560px"
		style="object-position:50% 60%;"
	/>
{/snippet}

<div class="canvas">
	<figure class="demo">
		<ImageCompare
			{before}
			{after}
			bind:position
			{orientation}
			label="Living room, raw and graded"
		/>
		<figcaption class="bar">
			<span class="caption"
				><span class="title">Living room</span><span class="meta">Raw capture and final grade</span
				></span
			>
			<span class="controls"
				><SegmentedControl
					label="Orientation"
					options={[
						{ value: 'horizontal', label: 'Side by side' },
						{ value: 'vertical', label: 'Stacked' }
					]}
					value={orientation}
					onValueChange={(next) => {
						orientation = next === 'vertical' ? 'vertical' : 'horizontal';
					}}
				/><button
					type="button"
					class="reset"
					disabled={Math.abs(position - 50) < 0.05}
					onclick={() => {
						position = 50;
					}}><RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />Center</button
				></span
			>
		</figcaption>
	</figure>
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
		width: min(100%, 540px);
		max-width: 540px;
		gap: var(--space-3);
		margin: 0;
	}
	.bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3) var(--space-4);
	}
	.caption {
		display: grid;
		min-width: 0;
		line-height: var(--leading-body);
		letter-spacing: var(--tracking-body);
	}
	.title {
		color: var(--foreground);
		font-size: var(--text-sm);
		font-weight: 500;
	}
	.meta {
		color: var(--text-muted);
		font-size: var(--text-xs);
	}
	.controls {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}
	.reset {
		display: inline-flex;
		min-height: calc(var(--control-height-sm) + 8px);
		align-items: center;
		gap: 6px;
		border: 1px solid var(--border);
		border-radius: var(--radius-control);
		padding: 0 var(--space-3);
		background: var(--surface);
		color: var(--foreground);
		font: inherit;
		font-size: var(--text-sm);
		font-weight: 500;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition:
			background-color var(--duration-fast) var(--ease-standard),
			color var(--duration-fast) var(--ease-standard),
			opacity var(--duration-fast) var(--ease-standard),
			transform var(--duration-spring) var(--ease-spring);
	}
	@media (hover: hover) and (pointer: fine) {
		.reset:hover:not(:disabled) {
			background: var(--surface-muted);
		}
	}
	.reset:active:not(:disabled) {
		transform: scale(0.97);
		transition: transform var(--duration-instant) var(--ease-standard);
	}
	.reset:disabled {
		color: var(--text-muted);
		cursor: default;
		opacity: 0.6;
	}
	@media (prefers-reduced-motion: reduce) {
		.reset,
		.reset:active:not(:disabled) {
			transition: none;
			transform: none;
		}
	}
</style>
