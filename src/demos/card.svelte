<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import { Card } from '#arc/card';
	import { Button } from '#arc/button';
	let saved = $state(false);
</script>

{#snippet media()}
	<img
		class="card-demo-photo"
		src="/media/photos/reading-chair.jpg"
		alt="A grey armchair and ottoman with a knit throw in a dark green room"
		width="1600"
		height="900"
	/>
{/snippet}
{#snippet avatar()}<img
		src="/media/people/sofia-ramirez.jpg"
		alt=""
		width="32"
		height="32"
	/>{/snippet}
{#snippet action()}
	<Button
		size="sm"
		variant={saved ? 'secondary' : 'primary'}
		aria-pressed={saved}
		onclick={() => (saved = !saved)}
		contentKey={saved}
	>
		{#if saved}<Check size={16} strokeWidth={1.75} aria-hidden="true" />Saved{:else}Save{/if}
	</Button>
{/snippet}
{#snippet details()}
	<dl class="card-demo-facts">
		<div>
			<dt>Space</dt>
			<dd>Lobby, level 2</dd>
		</div>
		<div>
			<dt>Shoot</dt>
			<dd>Oct 14, 5:40 PM</dd>
		</div>
		<div>
			<dt>Materials</dt>
			<dd>Wool, velvet, smoked oak</dd>
		</div>
	</dl>
{/snippet}

<Card
	class="card-demo"
	title="Lobby lounge"
	description="A deep armchair and ottoman against dark green walls, lit by one window."
	{media}
	{avatar}
	meta="Sofia Ramirez"
	status={saved ? 'Saved to your board' : 'Updated 2 hours ago'}
	{action}
	{details}
/>

<style>
	:global(.card-demo) {
		width: min(100%, 340px);
	}
	.card-demo-photo {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 3 / 2;
		object-fit: cover;
		object-position: 50% 70%;
	}
	.card-demo-facts {
		display: grid;
		gap: var(--space-2);
		margin: 0;
	}
	.card-demo-facts div {
		display: grid;
		grid-template-columns: 5.5rem minmax(0, 1fr);
		gap: var(--space-3);
	}
	.card-demo-facts dt {
		color: var(--text-muted);
	}
	.card-demo-facts dd {
		margin: 0;
		color: var(--foreground);
		font-variant-numeric: tabular-nums;
	}
</style>
