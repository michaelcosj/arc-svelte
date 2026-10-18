<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Timeline, type TimelineEvent } from '#arc/timeline';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import Rocket from '@lucide/svelte/icons/rocket';
	import Plus from '@lucide/svelte/icons/plus';
	import './timeline-demo.css';
	const id = $props.id(),
		base = Date.UTC(2026, 8, 21, 14, 32);
	const at = (day: number, hour: number, minute: number) => Date.UTC(2026, 8, day, hour, minute);
	const emma = { actor: 'Emma Collins', avatar: '/media/people/emma-collins.jpg' },
		marcus = { actor: 'Marcus Johnson', avatar: '/media/people/marcus-johnson.jpg' },
		ava = { actor: 'Ava Mitchell', avatar: '/media/people/ava-mitchell.jpg' },
		jasmine = { actor: 'Jasmine Brooks', avatar: '/media/people/jasmine-brooks.jpg' },
		sofia = { actor: 'Sofia Ramirez', avatar: '/media/people/sofia-ramirez.jpg' };
	type DemoEvent = Omit<TimelineEvent, 'detail' | 'icon'> & {
		detailKey?: string;
		iconKey?: string;
	};
	let events = $state<DemoEvent[]>([
		{
			id: 'merge-482',
			at: at(21, 14, 21),
			...emma,
			title: 'merged Checkout redesign into main',
			meta: 'Pull request #482',
			detailKey: 'mergeDetail'
		},
		{
			id: 'staging-1284',
			at: at(21, 13, 5),
			title: 'Staging deploy passed',
			meta: 'Build 1,284 · 4m 12s',
			tone: 'success',
			iconKey: 'checkIcon',
			detailKey: 'stagingDetail'
		},
		{
			id: 'comment-billing',
			at: at(21, 11, 48),
			...ava,
			title: 'commented on Billing settings',
			meta: 'Design review',
			detailKey: 'billingDetail'
		},
		{
			id: 'move-apple-pay',
			at: at(21, 9, 30),
			...marcus,
			title: 'moved Apple Pay support to In review',
			meta: 'Sprint 38',
			detailKey: 'appleDetail'
		},
		{
			id: 'notes-28',
			at: at(18, 17, 40),
			...sofia,
			title: 'updated the release notes',
			meta: 'v2.8 draft',
			detailKey: 'notesDetail'
		},
		{
			id: 'schedule-28',
			at: at(18, 15, 12),
			...jasmine,
			title: 'scheduled release v2.8',
			meta: 'Thursday, 10:00 to 11:00',
			detailKey: 'scheduleDetail'
		},
		{
			id: 'tests-1279',
			at: at(18, 10, 3),
			title: 'Checkout tests failed on main',
			meta: 'Build 1,279 · 2 failing',
			tone: 'danger',
			iconKey: 'errorIcon',
			detailKey: 'testsDetail'
		},
		{
			id: 'designs',
			at: at(17, 16, 26),
			...emma,
			title: 'shared new checkout designs',
			meta: '14 frames',
			detailKey: 'designsDetail'
		},
		{
			id: 'brief',
			at: at(17, 11, 10),
			...ava,
			title: 'created the project brief',
			meta: 'Q4 roadmap',
			detailKey: 'briefDetail'
		}
	]);
	const updates: Omit<DemoEvent, 'at'>[] = [
		{
			id: 'approve-483',
			...marcus,
			title: 'approved Saved cards',
			meta: 'Pull request #483',
			detailKey: 'approveDetail'
		},
		{
			id: 'production-28',
			title: 'Production rollout started',
			meta: 'v2.8 · 10 percent of accounts',
			iconKey: 'rocketIcon',
			detailKey: 'productionDetail'
		},
		{
			id: 'comment-notes',
			...sofia,
			title: 'commented on the release notes',
			meta: 'v2.8 draft',
			detailKey: 'commentDetail'
		},
		{
			id: 'done-apple-pay',
			...jasmine,
			title: 'marked Apple Pay support done',
			meta: 'Sprint 38',
			detailKey: 'doneDetail'
		},
		{
			id: 'screens',
			...emma,
			title: 'uploaded 3 screenshots',
			meta: 'Declined payment states',
			detailKey: 'screensDetail'
		}
	];
	let now = $state(base),
		count = $state(0);
	let start: number | null = null;
	$effect(() => {
		start = Date.now();
		const timer = setInterval(() => (now = base + Date.now() - (start ?? Date.now())), 10000);
		return () => clearInterval(timer);
	});
	function add() {
		const time = base + (start === null ? 0 : Date.now() - start),
			event = updates[count % updates.length]!;
		events = [{ ...event, id: `${event.id}-${count}`, at: time }, ...events];
		count++;
		now = time;
	}
	function present(
		events: DemoEvent[],
		details: Record<string, Snippet>,
		icons: Record<string, Snippet>
	): TimelineEvent[] {
		return events.map((event) => ({
			...event,
			detail: event.detailKey ? details[event.detailKey] : undefined,
			icon: event.iconKey ? icons[event.iconKey] : undefined
		}));
	}
</script>

{#snippet checkIcon()}<Check aria-hidden="true" />{/snippet}
{#snippet errorIcon()}<X aria-hidden="true" />{/snippet}
{#snippet rocketIcon()}<Rocket aria-hidden="true" />{/snippet}
{#snippet mergeDetail()}<p class="demo-timeline__copy">
		Reviewed by Marcus Johnson and Ava Mitchell. Ships behind the new checkout flag.
	</p>
	<dl class="demo-timeline__stats">
		{#each [['Files', '12'], ['Added', '+418'], ['Removed', '−96']] as [label, value] (label)}<div>
				<dt>{label}</dt>
				<dd>{value}</dd>
			</div>{/each}
	</dl>{/snippet}
{#snippet stagingDetail()}<p class="demo-timeline__copy">
		All 342 tests passed. The preview is live on staging for design review.
	</p>{/snippet}
{#snippet billingDetail()}<blockquote class="demo-timeline__quote">
		Can we keep the old plan names for one release? Support needs a week to update the help
		articles.
	</blockquote>{/snippet}
{#snippet appleDetail()}<p class="demo-timeline__copy">
		Assigned to Jasmine Brooks for review. Due Thursday, September 24.
	</p>{/snippet}
{#snippet notesDetail()}<p class="demo-timeline__copy">
		Added the new payment methods and a note that saved cards now live in the wallet.
	</p>{/snippet}
{#snippet scheduleDetail()}<p class="demo-timeline__copy">
		Rollout starts at 10 percent and widens to half of all accounts after an hour of clean error
		rates.
	</p>{/snippet}
{#snippet testsDetail()}<p class="demo-timeline__copy">
		Card expiry validation and the Apple Pay sheet timed out. Marcus Johnson fixed both in #480.
	</p>{/snippet}
{#snippet designsDetail()}<p class="demo-timeline__copy">
		Covers saved cards, address autocomplete, and the error states for declined payments.
	</p>{/snippet}
{#snippet briefDetail()}<p class="demo-timeline__copy">
		Goal: cut checkout drop-off from 23 percent to under 15 percent by the end of October.
	</p>{/snippet}
{#snippet approveDetail()}<p class="demo-timeline__copy">
		Left two comments on the empty state copy. Ready to merge once Sofia signs off.
	</p>{/snippet}
{#snippet productionDetail()}<p class="demo-timeline__copy">
		Error rates are watched for an hour before the next step.
	</p>{/snippet}
{#snippet commentDetail()}<blockquote class="demo-timeline__quote">
		Saved cards is the headline. Moving Apple Pay to the second paragraph.
	</blockquote>{/snippet}
{#snippet doneDetail()}<p class="demo-timeline__copy">
		Closed after QA on iOS 19 and Safari. Two follow ups moved to Sprint 39.
	</p>{/snippet}
{#snippet screensDetail()}<p class="demo-timeline__copy">
		Error copy for expired cards, insufficient funds, and a blocked issuer.
	</p>{/snippet}
<div class="demo-timeline__canvas">
	<section class="demo-timeline__card" aria-labelledby={id}>
		<div class="demo-timeline__header">
			<div class="demo-timeline__heading">
				<h3 {id} class="demo-timeline__title">Checkout redesign</h3>
				<p class="demo-timeline__subtitle">Project activity</p>
			</div>
			<button type="button" class="demo-timeline__add" aria-label="Add update" onclick={add}
				><Plus size={16} strokeWidth={1.75} aria-hidden="true" /><span
					>Add<span class="demo-timeline__add-noun">{' update'}</span></span
				></button
			>
		</div>
		<Timeline
			events={present(
				events,
				{
					mergeDetail,
					stagingDetail,
					billingDetail,
					appleDetail,
					notesDetail,
					scheduleDetail,
					testsDetail,
					designsDetail,
					briefDetail,
					approveDetail,
					productionDetail,
					commentDetail,
					doneDetail,
					screensDetail
				},
				{ checkIcon, errorIcon, rocketIcon }
			)}
			{now}
			label="Checkout redesign activity"
			maxHeight={276}
		/>
	</section>
</div>
