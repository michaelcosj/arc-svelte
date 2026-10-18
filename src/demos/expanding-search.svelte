<script lang="ts">
	import FolderKanban from '@lucide/svelte/icons/folder-kanban';
	import type { Snippet } from 'svelte';
	import FileText from '@lucide/svelte/icons/file-text';
	import { ExpandingSearch } from '#arc/expanding-search';
	import { motionTokens as m, swap } from '#lib/motion';
	import { prefersReducedMotion } from 'svelte/motion';
	let searching = $state(false),
		selected = $state('');
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	const items = [
		{
			id: 'billing-migration',
			title: 'Billing migration',
			meta: 'Payments · Due Oct 14',
			group: 'Projects',
			keywords: ['invoices', 'payments']
		},
		{
			id: 'mobile-onboarding',
			title: 'Mobile onboarding',
			meta: 'Growth · Due Nov 3',
			group: 'Projects',
			keywords: ['signup', 'ios', 'android']
		},
		{
			id: 'q4-planning',
			title: 'Q4 planning',
			meta: 'Leadership · 8 docs',
			group: 'Projects',
			keywords: ['roadmap', 'goals']
		},
		{
			id: 'customer-portal',
			title: 'Customer portal',
			meta: 'Support · 5 open tasks',
			group: 'Projects',
			keywords: ['help', 'tickets']
		},
		{
			id: 'release-checklist',
			title: 'Release checklist',
			meta: 'Engineering · Edited Sep 18',
			group: 'Docs',
			keywords: ['deploy', 'ship', 'launch']
		},
		{
			id: 'incident-runbook',
			title: 'Incident response runbook',
			meta: 'Platform · Edited Sep 12',
			group: 'Docs',
			keywords: ['on call', 'outage']
		},
		{
			id: 'pricing-copy',
			title: 'Pricing page copy',
			meta: 'Marketing · Edited Sep 20',
			group: 'Docs',
			keywords: ['plans', 'website']
		},
		{
			id: 'rate-limits',
			title: 'API rate limits',
			meta: 'Platform · Edited Sep 3',
			group: 'Docs',
			keywords: ['api', 'throttle']
		},
		{
			id: 'billing-faq',
			title: 'Billing FAQ for support',
			meta: 'Support · Edited Sep 19',
			group: 'Docs',
			keywords: ['invoices', 'refunds']
		}
	];
	const suggestions = ['release-checklist', 'billing-migration', 'pricing-copy'].map((id) =>
		items.find((item) => item.id === id)!
	);
	function present(list: typeof items, project: Snippet, doc: Snippet) {
		return list.map((item) => ({ ...item, icon: item.group === 'Projects' ? project : doc }));
	}
</script>

{#snippet projectIcon()}<FolderKanban width={16} height={16} strokeWidth={1.75} />{/snippet}
{#snippet docIcon()}<FileText width={16} height={16} strokeWidth={1.75} />{/snippet}

<div class="canvas">
	<div class="stage">
		<div class="lane" data-searching={searching || undefined}>
			<ExpandingSearch
				label="Search projects and docs"
				placeholder="Search projects and docs"
				items={present(items, projectIcon, docIcon)}
				suggestions={present(suggestions, projectIcon, docIcon)}
				maxResults={5}
				emptyHint="Try a project or doc title, like billing or checklist."
				onExpandedChange={(next) => {
					searching = next;
				}}
				onSelect={(item) => {
					selected = item.title;
				}}
			/>
		</div>
		<p class="status" role="status">
			{#each selected ? [selected] : [] as title (title)}<span
					class="status-line"
					in:swap={{
						y: reduced ? 0 : '0.3em',
						blur: reduced ? 0 : m.blur.soft,
						duration: reduced ? m.duration.fast : m.duration.standard,
						easing: m.ease.enter
					}}
					out:swap={{
						y: reduced ? 0 : '-0.3em',
						blur: reduced ? 0 : m.blur.subtle,
						duration: reduced ? m.duration.instant : m.duration.fast,
						easing: m.ease.standard,
						pop: true
					}}>Opened {title}</span
				>{/each}
		</p>
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
	.stage {
		display: grid;
		width: 100%;
		min-height: 440px;
		box-sizing: border-box;
		align-content: start;
		justify-items: center;
		gap: var(--space-4);
		padding: 72px var(--space-4) var(--space-6);
		font-family: var(--font-body);
		letter-spacing: var(--tracking-body);
	}
	.lane {
		width: min(100%, 360px);
		transform: translateX(calc((var(--control-height-md) - 100%) / 2));
		transition: transform var(--duration-spring) var(--ease-spring);
	}
	.lane[data-searching] {
		transform: none;
	}
	.status {
		position: relative;
		display: grid;
		min-height: 1.4em;
		margin: 0;
		color: var(--text-muted);
		font-size: var(--text-sm);
		line-height: var(--leading-body);
		text-align: center;
	}
	.status-line {
		display: block;
		grid-area: 1 / 1;
	}
	@media (prefers-reduced-motion: reduce) {
		.lane {
			transition: none;
		}
	}
</style>
