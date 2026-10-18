<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import { Pagination } from '#arc/pagination';
	import { Mounted, motionTokens as m, swap } from '#lib/motion';
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	const mounted = new Mounted();
	let page = $state(2);
	let direction = $state(1);
	const range = $derived(`${(page - 1) * 10 + 1}–${10 * page}`);
</script>

<div class="canvas">
	<div class="stack">
		<p class="muted">
			Showing projects <span class="range"
				><span class="sizer" aria-hidden="true">00–00</span>{#key range}<span
						in:swap={reduced
							? { duration: m.duration.instant, skip: !mounted.current }
							: {
									y: `${0.35 * direction}em`,
									blur: m.blur.soft,
									duration: m.duration.standard,
									easing: m.ease.enter,
									skip: !mounted.current
								}}
						out:swap={reduced
							? { duration: m.duration.instant, pop: true }
							: {
									y: `${-0.3 * direction}em`,
									blur: m.blur.subtle,
									duration: m.duration.fast,
									easing: m.ease.standard,
									pop: true
								}}>{range}</span
					>{/key}</span
			>
		</p>
		<Pagination
			{page}
			pageCount={6}
			onPageChange={(next) => {
				direction = next >= page ? 1 : -1;
				page = next;
			}}
			label="Projects pages"
		/>
	</div>
</div>

<style>
	.canvas {
		width: 100%;
		min-width: 0;
		max-width: 580px;
		min-height: 88px;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		place-items: center;
		padding: 8px;
		color: var(--foreground);
	}
	.stack {
		display: grid;
		gap: 14px;
		width: 100%;
		justify-items: center;
		text-align: center;
		font-variant-numeric: tabular-nums;
	}
	.muted {
		color: var(--text-secondary, #6f6f6f);
		font-size: 12px;
		line-height: 1.45;
	}
	.range {
		position: relative;
		display: inline-grid;
		justify-items: start;
		vertical-align: bottom;
	}
	.range > :global(*) {
		grid-area: 1 / 1;
		white-space: nowrap;
	}
	.sizer {
		visibility: hidden;
	}
</style>
