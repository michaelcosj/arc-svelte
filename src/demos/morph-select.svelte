<script lang="ts">
	import { MorphSelect, type MorphSelectItem, type MorphSelectOption } from '#arc/morph-select';
	import CircleDashed from '@lucide/svelte/icons/circle-dashed';
	import Circle from '@lucide/svelte/icons/circle';
	import CircleDotDashed from '@lucide/svelte/icons/circle-dot-dashed';
	import CircleDot from '@lucide/svelte/icons/circle-dot';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import Minus from '@lucide/svelte/icons/minus';
	import OctagonAlert from '@lucide/svelte/icons/octagon-alert';
	import SignalHigh from '@lucide/svelte/icons/signal-high';
	import SignalMedium from '@lucide/svelte/icons/signal-medium';
	import SignalLow from '@lucide/svelte/icons/signal-low';
	import UserRound from '@lucide/svelte/icons/user-round';
	import { swap, Mounted, motionTokens as m } from '#lib/motion';
	import { prefersReducedMotion } from 'svelte/motion';
	import { flip } from 'svelte/animate';
	let log = $state([{ id: 0, text: 'Emma Collins opened this issue' }]);
	const mounted = new Mounted(),
		reduced = $derived(Boolean(prefersReducedMotion.current));
	const status = [
		{
			label: 'Open',
			options: [
				{ value: 'backlog', label: 'Backlog' },
				{ value: 'todo', label: 'Todo' },
				{ value: 'in-progress', label: 'In progress' },
				{ value: 'in-review', label: 'In review' }
			]
		},
		{
			label: 'Closed',
			options: [
				{ value: 'done', label: 'Done' },
				{ value: 'canceled', label: 'Canceled' }
			]
		}
	];
	const priority = [
		{ value: 'none', label: 'No priority' },
		{ value: 'urgent', label: 'Urgent' },
		{ value: 'high', label: 'High' },
		{ value: 'medium', label: 'Medium' },
		{ value: 'low', label: 'Low' }
	];
	const people = [
		{ value: 'unassigned', label: 'Unassigned' },
		{ label: 'Design', options: [person('emma-collins'), person('jasmine-brooks')] },
		{
			label: 'Engineering',
			options: [
				person('marcus-johnson', '3 open'),
				person('olivia-bennett', '5 open'),
				person('daniel-kim', '1 open'),
				person('mateo-alvarez', '4 open'),
				{ ...person('nathan-cole', 'Away'), disabled: true }
			]
		},
		{ label: 'Support', options: [person('hannah-walsh'), person('jordan-reyes')] }
	];
	function person(value: string, meta?: string) {
		return {
			value,
			label: value
				.split('-')
				.map((s) => s[0].toUpperCase() + s.slice(1))
				.join(' '),
			meta
		};
	}
	function changed(field: string) {
		return (_value: string, option: MorphSelectOption) => {
			log = [
				{ id: (log[0]?.id ?? 0) + 1, text: `You set ${field} to ${option.label}` },
				...log
			].slice(0, 3);
		};
	}
</script>

{#snippet statusIcon(v: string)}{@const Icon = (
		{
			backlog: CircleDashed,
			todo: Circle,
			'in-progress': CircleDotDashed,
			'in-review': CircleDot,
			done: CircleCheck,
			canceled: CircleX
		} as Record<string, typeof Circle>
	)[v]}<Icon size={16} strokeWidth={1.75} />{/snippet}
{#snippet priorityIcon(v: string)}{@const Icon = (
		{
			none: Minus,
			urgent: OctagonAlert,
			high: SignalHigh,
			medium: SignalMedium,
			low: SignalLow
		} as Record<string, typeof Minus>
	)[v]}<Icon size={16} strokeWidth={1.75} />{/snippet}
{#snippet personIcon(v: string)}{#if v === 'unassigned'}<UserRound
			size={16}
			strokeWidth={1.75}
		/>{:else}<img src={`/media/people/${v}.jpg`} alt="" width="40" height="40" />{/if}{/snippet}

{#snippet icon0()}{@render statusIcon('backlog')}{/snippet}
{#snippet icon1()}{@render statusIcon('todo')}{/snippet}
{#snippet icon2()}{@render statusIcon('in-progress')}{/snippet}
{#snippet icon3()}{@render statusIcon('in-review')}{/snippet}
{#snippet icon4()}{@render statusIcon('done')}{/snippet}
{#snippet icon5()}{@render statusIcon('canceled')}{/snippet}
{#snippet icon6()}{@render priorityIcon('none')}{/snippet}
{#snippet icon7()}{@render priorityIcon('urgent')}{/snippet}
{#snippet icon8()}{@render priorityIcon('high')}{/snippet}
{#snippet icon9()}{@render priorityIcon('medium')}{/snippet}
{#snippet icon10()}{@render priorityIcon('low')}{/snippet}
{#snippet icon11()}{@render personIcon('unassigned')}{/snippet}
{#snippet icon12()}{@render personIcon('emma-collins')}{/snippet}
{#snippet icon13()}{@render personIcon('jasmine-brooks')}{/snippet}
{#snippet icon14()}{@render personIcon('marcus-johnson')}{/snippet}
{#snippet icon15()}{@render personIcon('olivia-bennett')}{/snippet}
{#snippet icon16()}{@render personIcon('daniel-kim')}{/snippet}
{#snippet icon17()}{@render personIcon('mateo-alvarez')}{/snippet}
{#snippet icon18()}{@render personIcon('nathan-cole')}{/snippet}
{#snippet icon19()}{@render personIcon('hannah-walsh')}{/snippet}
{#snippet icon20()}{@render personIcon('jordan-reyes')}{/snippet}
{#if true}
	{@const icons = {
		backlog: icon0,
		todo: icon1,
		'in-progress': icon2,
		'in-review': icon3,
		done: icon4,
		canceled: icon5,
		none: icon6,
		urgent: icon7,
		high: icon8,
		medium: icon9,
		low: icon10,
		unassigned: icon11,
		'emma-collins': icon12,
		'jasmine-brooks': icon13,
		'marcus-johnson': icon14,
		'olivia-bennett': icon15,
		'daniel-kim': icon16,
		'mateo-alvarez': icon17,
		'nathan-cole': icon18,
		'hannah-walsh': icon19,
		'jordan-reyes': icon20
	} as Record<string, import('svelte').Snippet>}
	<div class="canvas">
		<div class="stage">
			<article class="card">
				<header class="header">
					<h3 class="title">Checkout button stalls on Safari 17</h3>
					<p class="body">
						Tapping Pay leaves the spinner running after the card is approved. Reproduced on iOS and
						macOS.
					</p>
				</header>
				<dl class="properties">
					<div class="row">
						<dt aria-hidden="true">Status</dt>
						<dd>
							<MorphSelect
								label="Status"
								hideLabel
								items={status.map((g) => ({
									...g,
									options: g.options.map((o) => ({ ...o, icon: icons[o.value!] }))
								}))}
								defaultValue="in-progress"
								align="end"
								panelWidth={232}
								onValueChange={changed('status')}
							/>
						</dd>
					</div>
					<div class="row">
						<dt aria-hidden="true">Assignee</dt>
						<dd>
							<MorphSelect
								label="Assignee"
								hideLabel
								items={people.map((g) =>
									'options' in g
										? {
												...g,
												options: g.options!.map((o) => ({ ...o, icon: icons[o.value!] }))
											}
										: { ...g, icon: icons[g.value!] }
								) as MorphSelectItem[]}
								defaultValue="marcus-johnson"
								align="end"
								panelWidth={264}
								searchPlaceholder="Find a teammate"
								onValueChange={changed('assignee')}
							/>
						</dd>
					</div>
					<div class="row">
						<dt aria-hidden="true">Priority</dt>
						<dd>
							<MorphSelect
								label="Priority"
								hideLabel
								items={priority.map((o) => ({ ...o, icon: icons[o.value!] }))}
								defaultValue="high"
								align="end"
								panelWidth={208}
								onValueChange={changed('priority')}
							/>
						</dd>
					</div>
				</dl>
				<ol class="log" aria-label="Activity" aria-live="polite">
					{#each log as entry (entry.id)}<li
							class="entry"
							animate:flip={{ ...(reduced ? { duration: 0 } : m.spring.smooth) }}
							in:swap={{
								y: reduced ? 0 : -8,
								blur: reduced ? 0 : 4,
								...(reduced ? { duration: 150 } : m.spring.smooth),
								skip: !mounted.current
							}}
							out:swap={{ duration: 120, pop: true }}
						>
							{entry.text}
						</li>{/each}
				</ol>
			</article>
		</div>
	</div>
{/if}

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
		justify-items: center;
		align-content: start;
		gap: var(--space-4);
		width: min(100%, 560px);
		min-height: 500px;
		margin-inline: auto;
		font-family: var(--font-body);
		letter-spacing: var(--tracking-body);
	}
	.card {
		display: grid;
		width: 100%;
		box-sizing: border-box;
		gap: var(--space-5);
		padding: var(--space-6);
		border: 1px solid var(--border);
		border-radius: var(--radius-surface);
		background: var(--surface);
	}
	.header {
		display: grid;
		gap: var(--space-2);
	}
	.title {
		margin: 0;
		color: var(--foreground);
		font-size: var(--text-lg);
		font-weight: 500;
		line-height: var(--leading-body);
		text-wrap: balance;
	}
	.body {
		margin: 0;
		color: var(--text-secondary);
		font-size: var(--text-sm);
		line-height: var(--leading-body);
	}
	.properties {
		display: grid;
		margin: 0;
		border-top: 1px solid var(--border-subtle);
	}
	.row {
		display: flex;
		min-height: 60px;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		border-bottom: 1px solid var(--border-subtle);
	}
	.row dt {
		color: var(--text-secondary);
		font-size: var(--text-sm);
	}
	.row dd {
		display: flex;
		min-width: 0;
		justify-content: flex-end;
		margin: 0;
	}
	.log {
		position: relative;
		display: grid;
		min-height: calc(3lh + 2 * var(--space-2));
		align-content: start;
		gap: var(--space-2);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.entry,
	.log {
		font-size: var(--text-xs);
		line-height: var(--leading-body);
	}
	.entry {
		color: var(--text-muted);
	}
	.entry:first-child {
		color: var(--text-secondary);
	}
	@media (max-width: 520px) {
		.card {
			padding: var(--space-4);
			border-radius: var(--radius-panel);
		}
	}
</style>
