<script lang="ts">
	import { Carousel } from '#arc/carousel';
	const products = [
		{
			name: 'Oak lounge chair',
			detail: 'Woven seat on a solid oak frame',
			price: '$1,450',
			image: 'lounge-chair',
			alt: 'A woven oak lounge chair with a sheepskin and linen cushion on a concrete floor',
			position: '50% 62%'
		},
		{
			name: 'Opal table lamp',
			detail: 'Hand-blown glass shade, dimmable',
			price: '$640',
			image: 'table-lamp',
			alt: 'A white mushroom table lamp glowing beside books and a small vase',
			position: '50% 50%'
		},
		{
			name: 'Stonewashed linen throw',
			detail: 'Oat, 130 × 180 cm',
			price: '$180',
			image: 'linen-throw',
			alt: 'Folded natural linen throws with fringed edges in soft window light',
			position: '50% 55%'
		},
		{
			name: 'Ribbed glass carafe',
			detail: 'Mouth-blown, holds 1 liter',
			price: '$95',
			image: 'glass-carafe',
			alt: 'A hand pouring water from a ribbed glass carafe into tumblers',
			position: '50% 55%'
		},
		{
			name: 'Sea at dusk',
			detail: 'Giclée print on cotton rag, 50 × 50 cm',
			price: '$220',
			image: 'sea-at-dusk',
			alt: 'A calm sea at dusk with a low island on the horizon',
			position: '50% 50%'
		}
	];
</script>

{#snippet card(i: number)}
	{@const p = products[i]!}
	<article class="card">
		<div class="photo">
			<img
				src={`/media/photos/${p.image}.jpg`}
				alt={p.alt}
				draggable="false"
				decoding="async"
				loading={i < 2 ? 'eager' : 'lazy'}
				style:object-position={p.position}
			/>
		</div>
		<div class="caption">
			<div class="text">
				<h4 class="name">{p.name}</h4>
				<p class="detail">{p.detail}</p>
			</div>
			<span class="price">{p.price}</span>
		</div>
	</article>
{/snippet}
{#snippet chair()}{@render card(0)}{/snippet}
{#snippet lamp()}{@render card(1)}{/snippet}
{#snippet linen()}{@render card(2)}{/snippet}
{#snippet carafe()}{@render card(3)}{/snippet}
{#snippet print()}{@render card(4)}{/snippet}
<div class="canvas">
	<div class="demo">
		<Carousel
			label="Furniture and objects"
			defaultIndex={1}
			slideSize="min(74cqw, 256px)"
			interval={5000}
			slideLabel={(i, count) => `${products[i]!.name}, ${i + 1} of ${count}`}
			children={[chair, lamp, linen, carafe, print]}
		/>
	</div>
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
		width: min(100%, 720px);
		gap: var(--space-4);
	}
	.card {
		display: grid;
		gap: var(--space-3);
		margin: 0;
	}
	.photo {
		position: relative;
		aspect-ratio: 1 / 1;
		overflow: hidden;
		border-radius: var(--radius-panel);
		background: var(--surface-muted);
	}
	.photo img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.photo::after {
		position: absolute;
		inset: 0;
		border: 1px solid var(--border-subtle);
		border-radius: inherit;
		content: '';
		pointer-events: none;
	}
	.caption {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		column-gap: var(--space-3);
		row-gap: 1px;
		align-items: baseline;
		padding-inline: var(--space-1);
	}
	.text {
		display: contents;
	}
	.detail {
		grid-area: 2 / 1 / auto / -1;
		color: var(--text-muted);
		font-size: var(--text-xs);
	}
	.name {
		color: var(--foreground);
		font-size: var(--text-sm);
		font-weight: 500;
	}
	.detail,
	.name {
		margin: 0;
		overflow: hidden;
		letter-spacing: var(--tracking-body);
		line-height: var(--leading-body);
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.price {
		grid-area: 1 / 2;
		color: var(--foreground);
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
		letter-spacing: var(--tracking-body);
		line-height: var(--leading-body);
	}
</style>
