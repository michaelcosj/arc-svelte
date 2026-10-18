<script lang="ts">
	import { untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { AnimatedCounter } from '#arc/animated-counter';
	import { Button } from '#arc/button';
	import { ChipGroup } from '#arc/chip-group';
	import { SegmentedControl } from '#arc/segmented-control';
	import {
		HeightMorph,
		Mounted,
		motionTokens as m,
		PopLayout,
		positionFlip,
		swap
	} from '#lib/motion';
	import { chipTopics, chipResources } from './lib/chip-resources';
	let value = $state(['Motion']);
	let mode = $state('any');
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	const mounted = new Mounted();
	const matches = $derived(
		chipResources.filter((resource) => resource.topics.some((topic) => value.includes(topic)))
	);
	const shown = $derived(matches.slice(0, 3));
	const rest = $derived(matches.length - shown.length);
	let content = $state<HTMLDivElement>();
	const layout = new PopLayout();
	const height = new HeightMorph(() => ({ reduced, follow: true, pinned: true }));
	$effect.pre(() => {
		void matches;
		untrack(() => layout.capture(content));
	});
	const enter = $derived({
		y: reduced ? 0 : 6,
		blur: reduced ? 0 : m.blur.subtle,
		duration: reduced ? 150 : m.duration.standard,
		easing: reduced ? m.ease.standard : m.ease.enter,
		skip: !mounted.current
	});
	const leave = $derived({
		blur: reduced ? 0 : m.blur.subtle,
		duration: reduced ? 150 : m.duration.fast,
		easing: m.ease.standard
	});
</script>

<div class="canvas">
	<div class="demo">
		<ChipGroup
			label="Topics"
			options={chipTopics}
			bind:value
			multiple={mode === 'any'}
			maxVisible={6}
		/>
		<div class="list-frame" {@attach height.body}>
			<div class="list-content" bind:this={content} {@attach height.content}>
				{#each matches.length ? ['list'] : [] as key (key)}
					<ul
						class="list"
						aria-label="Matching resources"
						in:swap={{ duration: m.duration.fast, easing: m.ease.standard, skip: !mounted.current }}
						out:swap={{ duration: m.duration.fast, easing: m.ease.standard, pop: true }}
					>
						{#each shown as resource (resource.title)}
							<li
								class="row"
								data-pop-key={resource.title}
								animate:positionFlip={reduced
									? { duration: 0, easing: m.ease.standard }
									: m.spring.smooth}
								in:swap={enter}
								out:swap={{ ...leave, pop: layout.box(resource.title) }}
							>
								<span class="row-title">{resource.title}</span><span class="row-meta"
									>{resource.author} · {resource.kind}</span
								>
							</li>
						{/each}
						{#each rest > 0 ? ['rest'] : [] as key (key)}
							<li
								class="row rest"
								data-pop-key="rest"
								animate:positionFlip={reduced
									? { duration: 0, easing: m.ease.standard }
									: m.spring.smooth}
								in:swap={{
									duration: reduced ? 150 : m.duration.standard,
									easing: m.ease.enter,
									skip: !mounted.current
								}}
								out:swap={{ ...leave, pop: layout.box('rest') }}
							>
								<span>+<span class="inline-count"><AnimatedCounter value={rest} /></span> more</span
								>
							</li>
						{/each}
					</ul>
				{/each}
				{#each matches.length ? [] : ['empty'] as key (key)}
					<div class="empty" in:swap={enter} out:swap={{ ...leave, pop: true }}>
						<p class="empty-title">No topic selected</p>
						<p class="empty-text">Pick a topic to see matching resources.</p>
					</div>
				{/each}
			</div>
		</div>
		<div class="footer">
			<SegmentedControl
				label="Match"
				options={[
					{ value: 'any', label: 'Any topic' },
					{ value: 'one', label: 'One topic' }
				]}
				value={mode}
				onValueChange={(next) => {
					mode = next;
					if (next === 'one') value = value.slice(0, 1);
				}}
			/><Button
				class="clear"
				variant="ghost"
				size="sm"
				label="Clear filters"
				onclick={() => {
					value = [];
				}}
				disabled={!value.length}
			/>
		</div>
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
		display: flex;
		width: min(100%, 36rem);
		flex-direction: column;
		gap: var(--space-5);
		color: var(--foreground);
	}
	.inline-count {
		display: inline-flex;
	}
	.inline-count > :global(span) {
		color: inherit;
		font-family: inherit;
		font-size: inherit;
		font-weight: inherit;
		letter-spacing: inherit;
		line-height: inherit;
	}
	.list-frame {
		overflow: hidden;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-control);
		background: color-mix(in oklab, var(--surface) 55%, transparent);
	}
	.list-content {
		position: relative;
	}
	.list {
		position: relative;
		display: grid;
		margin: 0;
		padding: var(--space-1) 0;
		list-style: none;
	}
	.row {
		position: relative;
		display: flex;
		min-height: 2.75rem;
		min-width: 0;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		padding: var(--space-2) var(--space-4);
		font-size: var(--text-sm);
		line-height: var(--leading-body);
	}
	.row + .row::before {
		position: absolute;
		top: 0;
		right: var(--space-4);
		left: var(--space-4);
		height: 1px;
		background: var(--border-subtle);
		content: '';
	}
	.row-title {
		min-width: 0;
		font-weight: 500;
	}
	.row-meta {
		flex: 0 0 auto;
		color: var(--text-muted);
		white-space: nowrap;
	}
	.rest {
		min-height: 2.5rem;
		justify-content: flex-start;
		gap: 0;
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
	}
	.empty {
		display: grid;
		gap: var(--space-1);
		padding: var(--space-6) var(--space-4);
		text-align: center;
	}
	.empty-title {
		font-weight: 500;
	}
	.empty-text,
	.empty-title {
		margin: 0;
		font-size: var(--text-sm);
		line-height: var(--leading-body);
	}
	.empty-text {
		color: var(--text-muted);
	}
	.footer {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}
	.footer :global(.clear) {
		margin-left: auto;
	}
	@media (max-width: 30rem) {
		.demo {
			gap: var(--space-4);
		}
		.row {
			flex-direction: column;
			align-items: flex-start;
			justify-content: center;
			gap: 0;
		}
		.rest {
			flex-direction: row;
			align-items: center;
			justify-content: flex-start;
		}
	}
</style>
