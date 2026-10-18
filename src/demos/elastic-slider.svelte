<script lang="ts">
	import Volume from '@lucide/svelte/icons/volume';
	import Volume2 from '@lucide/svelte/icons/volume-2';
	import Snail from '@lucide/svelte/icons/snail';
	import Rabbit from '@lucide/svelte/icons/rabbit';
	import { ElasticSlider } from '#arc/elastic-slider';
	let volume = $state(64);
	let speed = $state(1);
	const marks = [0.5, 1, 1.5, 2].map((value) => ({ value, label: `${value}×` }));
	const formatSpeed = (value: number) => `${value.toFixed(2).replace(/\.?0+$/, '')}×`;
</script>

{#snippet quiet()}<Volume size={20} strokeWidth={1.75} aria-hidden="true" />{/snippet}
{#snippet loud()}<Volume2 size={20} strokeWidth={1.75} aria-hidden="true" />{/snippet}
{#snippet slow()}<Snail size={20} strokeWidth={1.75} aria-hidden="true" />{/snippet}
{#snippet fast()}<Rabbit size={20} strokeWidth={1.75} aria-hidden="true" />{/snippet}

<div class="demo">
	<ElasticSlider
		label="Volume"
		bind:value={volume}
		format={(value) => `${value}%`}
		startIcon={quiet}
		endIcon={loud}
	/>
	<div class="section">
		<ElasticSlider
			label="Playback speed"
			bind:value={speed}
			min={0.25}
			max={2.5}
			step={0.05}
			largeStep={0.25}
			{marks}
			format={formatSpeed}
			startIcon={slow}
			endIcon={fast}
		/>
		<p class="result">
			Episode 118 plays in <span class="value">{Math.round(42 / speed)} min</span> at this speed
		</p>
	</div>
</div>

<style>
	.demo {
		display: grid;
		width: min(100%, 420px);
		gap: var(--space-10);
		padding-top: var(--space-6);
	}
	.section {
		display: grid;
		gap: var(--space-1);
	}
	.result {
		margin: 0;
		color: var(--text-muted);
		font-size: var(--text-xs);
		line-height: var(--leading-body);
	}
	.value {
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
	}
</style>
