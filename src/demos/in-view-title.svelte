<script lang="ts">
	import { InViewTitle, type InViewTitleVariant } from '#arc/in-view-title';
	import { SegmentedControl } from '#arc/segmented-control';
	import { Button } from '#arc/button';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	let variant = $state<InViewTitleVariant>('blur');
	let replay = $state(0);
	const options = [
		{ value: 'blur', label: 'Blur' },
		{ value: 'word', label: 'Words' },
		{ value: 'line', label: 'Lines' },
		{ value: 'tracking', label: 'Tracking' },
		{ value: 'wipe', label: 'Wipe' }
	];
	const notes = {
		blur: 'Words sharpen into place one after another.',
		word: 'Each word rises out of its own line.',
		line: 'Whole lines lift into view from top to bottom.',
		tracking: 'Letters open from tight spacing to their resting rhythm.',
		wipe: 'The title is uncovered from left to right.'
	};
</script>

<div class="canvas">
	<div class="demo">
		<div class="stage">
			{#key `${variant}-${replay}`}<InViewTitle
					text="Make progress visible"
					as="h3"
					{variant}
					lines={['Make progress', 'visible']}
					class="demo-title"
				/>{/key}
		</div>
		<p class="note">
			{#each Object.values(notes) as note (note)}<span class="reserve" aria-hidden="true"
					>{note}</span
				>{/each}<span>{notes[variant]}</span>
		</p>
		<div class="controls">
			<div class="choices">
				<SegmentedControl
					label="Title animation"
					{options}
					value={variant}
					onValueChange={(next) => (variant = next as InViewTitleVariant)}
				/>
			</div>
			<Button variant="secondary" size="sm" onclick={() => replay++}
				><RotateCcw size={15} strokeWidth={1.75} aria-hidden="true" />Replay</Button
			>
		</div>
	</div>
</div>

<style>
	.canvas {
		width: 100%;
		min-width: 0;
		max-width: 760px;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		place-items: center;
		padding: 8px;
		color: var(--foreground);
	}
	.demo {
		container-type: inline-size;
		display: grid;
		gap: 14px;
		width: min(100%, 620px);
		font-family: var(--font-body);
		letter-spacing: var(--tracking-body);
	}
	.stage {
		display: flex;
		align-items: center;
		min-height: calc(
			2 * var(--leading-display) * clamp(var(--text-3xl), 8.4cqi, var(--text-4xl)) + 8px
		);
	}
	.stage :global(.demo-title h3) {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(var(--text-3xl), 8.4cqi, var(--text-4xl));
		font-weight: 400;
		line-height: var(--leading-display);
		letter-spacing: var(--tracking-display);
	}
	.note {
		position: relative;
		display: grid;
		margin: 0 0 10px;
		color: var(--text-secondary);
		font-size: var(--text-sm);
		line-height: var(--leading-body);
	}
	.note > * {
		grid-area: 1/1;
	}
	.reserve {
		visibility: hidden;
	}
	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}
	.choices {
		min-width: 0;
		max-width: 100%;
	}
	@media (max-width: 340px) {
		.choices,
		.choices :global(.arc-segmented-control),
		.choices :global(.arc-segmented-control__track) {
			width: 100%;
		}
		.choices :global(.arc-segmented-control__track) {
			display: grid;
			grid-template-columns: repeat(6, minmax(0, 1fr));
		}
		.choices :global(button) {
			grid-column: span 2;
			padding-inline: 6px;
		}
		.choices :global(button:nth-of-type(n + 4)) {
			grid-column: span 3;
		}
	}
</style>
