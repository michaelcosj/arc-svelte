<script lang="ts">
	import { ScrollArea, type ScrollAreaEdges } from '#arc/scroll-area';
	import { prefersReducedMotion } from 'svelte/motion';
	import { swap, motionTokens as m } from '#lib/motion';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	let activity = $state<HTMLDivElement | null>(null);
	let rooms = $state<HTMLDivElement | null>(null);
	let activityEdges = $state<ScrollAreaEdges>();
	let roomEdges = $state<ScrollAreaEdges>();
	const behavior = $derived(prefersReducedMotion.current ? 'auto' : 'smooth');
	const people = [
		['Emma Collins', 'approved the onboarding redesign', '2m'],
		['Marcus Johnson', 'merged fix for the flaky checkout test', '9m'],
		['Chloe Nguyen', 'shared the September retention report', '21m'],
		['Daniel Kim', 'rotated the staging API keys', '38m'],
		['Sofia Ramirez', 'moved the vendor review to Thursday', '1h'],
		['Jasmine Brooks', 'left 4 comments on Pricing page v3', '1h'],
		['Olivia Bennett', 'scaled the worker pool to 12 nodes', '2h'],
		['Ryan Sullivan', 'closed the Northwind renewal', '3h'],
		['Hannah Walsh', 'resolved 18 support tickets', '4h'],
		['Mateo Alvarez', 'published iOS build 4.12 to TestFlight', '5h'],
		['Nathan Cole', 'scheduled the Q4 planning offsite', '6h'],
		['Ava Mitchell', 'launched the fall email campaign', 'Yesterday']
	];
	const cards = [
		[
			'living-room',
			'Living room',
			'Oak beams, linen sofas',
			'A bright living room with timber beams, arched windows, and cream sofas'
		],
		[
			'sunroom',
			'Sunroom',
			'Round table for six',
			'A sunroom with a round dining table, plants, and windows on three sides'
		],
		[
			'home-office',
			'Study',
			'Green walls, walnut desk',
			'A home office with a wooden desk and deep green walls'
		],
		[
			'bedroom',
			'Bedroom',
			'Striped linen, oak bed',
			'A made bed with striped linen pillows against an oak headboard'
		],
		[
			'reading-chair',
			'Reading nook',
			'Armchair and ottoman',
			'A grey armchair and ottoman with a knit throw in a dark green room'
		],
		[
			'pool-house',
			'Pool house',
			'Glass walls, long pool',
			'A modern glass house beside a long pool under a clear sky'
		]
	];
	function step(direction: number) {
		const card = rooms?.querySelector<HTMLElement>('[data-card]');
		if (card) rooms?.scrollBy({ left: direction * (card.offsetWidth + 12), behavior });
	}
</script>

<div class="preview">
	<div class="demo">
		<section class="panel" aria-labelledby="scroll-area-activity">
			<header class="header">
				<h3 id="scroll-area-activity">Activity</h3>
				{#each activityEdges?.top ? ['top'] : [] as key (key)}
					<button
						class="pill"
						type="button"
						onclick={() => activity?.scrollTo({ top: 0, behavior })}
						in:swap={{ scale: 0.9, ...m.spring.snappy, skip: prefersReducedMotion.current }}
						out:swap={{ scale: 0.9, ...m.spring.snappy, skip: prefersReducedMotion.current }}
						><ArrowUp size={16} strokeWidth={1.75} aria-hidden="true" />Back to top</button
					>
				{/each}
			</header>
			<ScrollArea
				class="activity-list"
				bind:viewportRef={activity}
				label="Team activity"
				onEdgeChange={(edges) => (activityEdges = edges)}
			>
				<ul class="items">
					{#each people as [name, text, when] (name)}
						<li class="item">
							<img
								class="avatar"
								src="/media/people/{name.toLowerCase().replaceAll(' ', '-')}.jpg"
								alt=""
								width="32"
								height="32"
								loading="lazy"
							/>
							<p class="text"><span class="name">{name}</span> {text}</p>
							<span class="when">{when}</span>
						</li>
					{/each}
				</ul>
			</ScrollArea>
		</section>
		<section class="panel" aria-labelledby="scroll-area-rooms">
			<header class="header">
				<h3 id="scroll-area-rooms">Rooms</h3>
				<div class="arrows">
					<button
						type="button"
						class="arrow"
						aria-label="Previous rooms"
						disabled={!roomEdges?.left}
						onclick={() => step(-1)}
						><ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" /></button
					><button
						type="button"
						class="arrow"
						aria-label="Next rooms"
						disabled={!roomEdges?.right}
						onclick={() => step(1)}
						><ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" /></button
					>
				</div>
			</header>
			<ScrollArea
				orientation="horizontal"
				snap="x mandatory"
				bind:viewportRef={rooms}
				label="Rooms"
				onEdgeChange={(edges) => (roomEdges = edges)}
				fade={36}
			>
				<ul class="rail">
					{#each cards as [id, name, note, alt] (id)}<li data-card="true" class="card">
							<span class="photo"><img src="/media/photos/{id}.jpg" {alt} loading="lazy" /></span
							><span class="card-name">{name}</span><span class="card-note">{note}</span>
						</li>{/each}
				</ul>
			</ScrollArea>
		</section>
	</div>
</div>

<style>
	.preview {
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
	.demo {
		display: grid;
		width: min(100%, 720px);
		gap: 16px;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
		color: var(--foreground);
		font-family: var(--font-body);
		font-size: var(--text-sm);
		letter-spacing: var(--tracking-body);
		line-height: var(--leading-body);
	}
	.panel {
		display: flex;
		min-width: 0;
		flex-direction: column;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: var(--radius-panel);
		background: var(--surface);
	}
	.header {
		display: flex;
		min-height: 52px;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 8px 10px 8px 18px;
	}
	h3 {
		margin: 0;
		font-size: var(--text-sm);
		font-weight: 500;
	}
	:global(.activity-list) {
		height: 300px;
	}
	.items {
		display: grid;
		margin: 0;
		padding: 0 8px 8px;
		list-style: none;
	}
	.item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 10px;
		border-radius: 18px;
	}
	.avatar {
		width: 32px;
		height: 32px;
		flex: 0 0 auto;
		border-radius: 50%;
		object-fit: cover;
	}
	.text {
		min-width: 0;
		flex: 1 1 0%;
		margin: 0;
		color: var(--text-secondary);
		text-wrap: pretty;
	}
	.name {
		color: var(--foreground);
		font-weight: 500;
	}
	.when {
		flex: 0 0 auto;
		color: var(--text-muted);
		font-size: var(--text-xs);
		font-variant-numeric: tabular-nums;
	}
	.arrows {
		display: flex;
		gap: 4px;
	}
	.arrow {
		display: grid;
		width: 32px;
		height: 32px;
		place-items: center;
		padding: 0;
		border: 1px solid var(--border);
		border-radius: 50%;
		background: var(--surface);
		color: var(--foreground);
		cursor: pointer;
		transition:
			opacity var(--duration-fast) var(--ease-standard),
			background-color var(--duration-fast) var(--ease-standard),
			transform var(--duration-instant) var(--ease-standard);
	}
	.arrow:active:not(:disabled) {
		transform: scale(0.94);
	}
	.arrow:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.pill {
		display: inline-flex;
		height: 32px;
		align-items: center;
		gap: 6px;
		padding: 0 12px 0 10px;
		border: 0;
		border-radius: var(--radius-pill);
		background: var(--surface-muted);
		color: var(--foreground);
		cursor: pointer;
		font: inherit;
		font-size: var(--text-xs);
		font-weight: 500;
	}
	.rail {
		display: flex;
		width: max-content;
		gap: 12px;
		margin: 0;
		padding: 0 18px 20px;
		list-style: none;
	}
	.card {
		display: grid;
		width: 188px;
		gap: 2px;
		scroll-snap-align: start;
		scroll-margin-inline: 18px;
	}
	.photo {
		position: relative;
		display: block;
		margin-bottom: 8px;
		aspect-ratio: 4 / 5;
		overflow: hidden;
		border-radius: 16px;
		background: var(--surface-muted);
	}
	.photo img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.card-name {
		font-weight: 500;
	}
	.card-note {
		color: var(--text-secondary);
		font-size: var(--text-xs);
	}
	@media (hover: hover) and (pointer: fine) {
		.item:hover,
		.arrow:hover:not(:disabled) {
			background: var(--surface-muted);
		}
		.pill:hover {
			background: color-mix(in oklab, var(--surface-muted), var(--foreground) 5%);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.arrow,
		.pill {
			transition: none;
		}
	}
</style>
