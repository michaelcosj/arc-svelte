<script lang="ts">
	import { fade } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import FileText from '@lucide/svelte/icons/file-text';
	import Folder from '@lucide/svelte/icons/folder';
	import { Breadcrumb } from '#arc/breadcrumb';
	import { HeightMorph, Mounted, motionTokens as m } from '#lib/motion';
	const tree: Record<string, string[]> = {
		Projects: ['Arc launch', 'Billing'],
		'Arc launch': ['Design review', 'Release notes'],
		Billing: ['Invoices', 'Plans'],
		'Design review': ['Motion pass', 'Final copy']
	};
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	const mounted = new Mounted();
	// The gallery's frame follows every resize of the path on the smooth spring.
	const frame = new HeightMorph(() => ({ reduced, follow: true, measure: 'offset', pinned: true }));
	let path = $state(['Projects', 'Arc launch', 'Design review']);
	const current = $derived(path[path.length - 1]!);
	const pages = $derived(tree[current] ?? []);
	// mode="wait": the new page list fades in once the old one has faded out.
	const exit = $derived(reduced ? 0 : m.duration.instant);
</script>

<div class="demo">
	<div class="frame" {@attach frame.body}>
		<div class="frame-inner" {@attach frame.content}>
			<Breadcrumb
				items={path.map((label, index) => ({
					label,
					onclick: () => (path = path.slice(0, index + 1))
				}))}
			/>
		</div>
	</div>
	<div class="pages">
		{#key current}
			<div
				in:fade={{
					duration: mounted.current ? (reduced ? m.duration.instant : m.duration.fast) : 0,
					easing: m.ease.enter,
					delay: mounted.current ? exit : 0
				}}
				out:fade={{ duration: exit, easing: m.ease.standard }}
			>
				{#if pages.length}
					<ul class="list" aria-label={`Pages in ${current}`}>
						{#each pages as page (page)}
							<li>
								<button type="button" class="row" onclick={() => (path = [...path, page])}>
									{#if tree[page]}<Folder
											size={16}
											strokeWidth={1.75}
											aria-hidden="true"
										/>{:else}<FileText size={16} strokeWidth={1.75} aria-hidden="true" />{/if}
									<span>{page}</span>
									<ChevronRight class="chevron" size={16} strokeWidth={1.75} aria-hidden="true" />
								</button>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="empty">No pages inside {current}</p>
				{/if}
			</div>
		{/key}
	</div>
</div>

<style>
	.demo {
		display: grid;
		width: min(100%, 460px);
		gap: var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius-panel);
		padding: var(--space-4) var(--space-4) var(--space-3);
		background: var(--surface);
	}
	.frame {
		overflow: hidden;
		margin: -4px;
	}
	.frame-inner {
		padding: 4px 4px 4px 10px;
	}
	.pages {
		display: grid;
		min-height: calc(var(--control-height-sm) * 2 + var(--space-2) + 1px);
		border-top: 1px solid var(--border-subtle);
		padding-top: var(--space-2);
	}
	.pages > div {
		grid-area: 1 / 1;
	}
	.list {
		display: grid;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.row {
		display: flex;
		width: 100%;
		min-height: var(--control-height-sm);
		align-items: center;
		gap: var(--space-3);
		border: 0;
		border-radius: calc(var(--radius-panel) - var(--space-4));
		padding: 0 var(--space-2);
		background: transparent;
		color: var(--foreground);
		font: inherit;
		font-size: var(--text-sm);
		text-align: start;
		cursor: pointer;
		transition: background-color var(--duration-fast) var(--ease-standard);
	}
	.row > :global(svg:first-child) {
		flex: 0 0 auto;
		color: var(--text-muted);
	}
	.row > span {
		flex: 1 1 0%;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.row :global(.chevron) {
		flex: 0 0 auto;
		color: var(--text-muted);
	}
	.empty {
		display: flex;
		min-height: var(--control-height-sm);
		align-items: center;
		margin: 0;
		padding: 0 var(--space-2);
		color: var(--text-muted);
		font-size: var(--text-sm);
	}
	@media (hover: hover) and (pointer: fine) {
		.row:hover {
			background: var(--surface-muted);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.row {
			transition: none;
		}
	}
</style>
