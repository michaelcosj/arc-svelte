<script lang="ts">
	import { untrack } from 'svelte';
	import { SvelteSet, SvelteMap } from 'svelte/reactivity';
	import { prefersReducedMotion } from 'svelte/motion';
	import { Mounted, heightPresence, motionTokens as m } from '#lib/motion';
	import type { Attachment } from 'svelte/attachments';
	import type { TimelineProps, TimelineEvent, Group, Row } from './types';
	import { dayKey, relative } from './time';
	import RollingCount from './RollingCount.svelte';
	import TimelineRow from './TimelineRow.svelte';
	import './timeline.css';
	let {
		events,
		now,
		label,
		timeZone = 'UTC',
		locale = 'en-US',
		maxHeight,
		scrollToNew = true,
		defaultExpanded = [],
		headingLevel = 3,
		class: className
	}: TimelineProps = $props();
	const mounted = new Mounted();
	const reduced = $derived(mounted.current && Boolean(prefersReducedMotion.current));
	const id = $props.id();
	const expanded = new SvelteSet(untrack(() => defaultExpanded));
	let scroller = $state<HTMLDivElement>();
	const scrolls = $derived(maxHeight !== undefined);
	const ids = $derived(events.map((e) => e.id).join('|'));
	let known = $state.raw(
		untrack(() => ({
			ids,
			set: new Set(events.map((e) => e.id)),
			fresh: new Set<string>(),
			announcement: ''
		}))
	);
	$effect.pre(() => {
		const next = ids;
		untrack(() => {
			if (known.ids === next) return;
			const added = events.filter((e) => !known.set.has(e.id));
			known = {
				ids: next,
				set: new Set(events.map((e) => e.id)),
				fresh: new Set([...known.fresh, ...added.map((e) => e.id)]),
				announcement: added.length
					? `New update: ${added.map((e) => [e.actor, e.title].filter(Boolean).join(' ')).join('. ')}`
					: known.announcement
			};
		});
	});
	const initialDays = untrack(
		() => new Set(events.map((e) => dayKey(new Date(e.at).getTime(), timeZone)))
	);
	const groups = $derived.by(() => {
		const today = dayKey(now, timeZone),
			yesterday = dayKey(now - 86400000, timeZone);
		const heading = new Intl.DateTimeFormat(locale, {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			timeZone
		});
		const byDay = new SvelteMap<string, Row[]>();
		[...events]
			.map((event) => ({ ...event, time: new Date(event.at).getTime() }))
			.sort((a, b) => b.time - a.time)
			.forEach((event) => {
				const day = dayKey(event.time, timeZone);
				byDay.set(day, [...(byDay.get(day) ?? []), { ...event, day }]);
			});
		return [...byDay].map(([day, rows]): Group => ({
			day,
			rows,
			label:
				day === today
					? 'Today'
					: day === yesterday
						? 'Yesterday'
						: heading.format(new Date(rows[0]!.time))
		}));
	});
	const formats = $derived({
		clock: new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone }),
		full: new Intl.DateTimeFormat(locale, {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			timeZone
		})
	});
	const newestId = $derived(
		events.reduce<TimelineEvent | null>(
			(latest, event) =>
				!latest || new Date(event.at).getTime() > new Date(latest.at).getTime() ? event : latest,
			null
		)?.id
	);
	$effect(() => {
		void newestId;
		const node = scroller;
		if (!scrollToNew || !node || node.scrollTop < 1) return;
		node.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
	});
	const track: Attachment<HTMLDivElement> = (node) => {
		const parent = scroller;
		if (!scrolls || !parent || typeof ResizeObserver === 'undefined') return;
		const update = () => {
			if (parent.scrollHeight - parent.clientHeight - parent.scrollTop > 2)
				parent.dataset.more = '';
			else delete parent.dataset.more;
		};
		update();
		parent.addEventListener('scroll', update, { passive: true });
		const observer = new ResizeObserver(update);
		observer.observe(parent);
		observer.observe(node);
		return () => {
			parent.removeEventListener('scroll', update);
			observer.disconnect();
		};
	};
	let nextReveal = 0;
	function schedule() {
		if (reduced) return 0;
		const current = performance.now(),
			start = Math.min(Math.max(current, nextReveal), current + 450);
		nextReveal = start + 90;
		return start - current;
	}
	function toggle(key: string) {
		if (expanded.has(key)) expanded.delete(key);
		else expanded.add(key);
	}
	function keydown(event: KeyboardEvent) {
		if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
		const triggers = [
			...(scroller?.querySelectorAll<HTMLElement>('[data-timeline-trigger]') ?? [])
		];
		const index = triggers.indexOf(document.activeElement as HTMLElement);
		if (index < 0) return;
		event.preventDefault();
		const next =
			event.key === 'Home'
				? 0
				: event.key === 'End'
					? triggers.length - 1
					: Math.min(
							Math.max(index + (event.key === 'ArrowDown' ? 1 : -1), 0),
							triggers.length - 1
						);
		triggers[next]?.focus();
	}
</script>

<div class={['arc-timeline', className]} role="region" aria-label={label}>
	<!-- svelte-ignore a11y_no_static_element_interactions -- Shortcuts delegate from the native disclosure buttons. -->
	<div
		bind:this={scroller}
		class="arc-timeline__scroller"
		data-scrolls={scrolls || undefined}
		style:--timeline-height={scrolls
			? typeof maxHeight === 'number'
				? `${maxHeight}px`
				: maxHeight
			: undefined}
		onkeydown={keydown}
	>
		<div {@attach track}>
			{#each groups as group (group.day)}
				<section
					class="arc-timeline__group"
					aria-labelledby={`${id}-${group.day}`}
					data-entering={!initialDays.has(group.day) || undefined}
					onintroend={(event) => delete event.currentTarget.dataset.entering}
					in:heightPresence={{
						reduced,
						reducedDuration: 150,
						reducedHeight: true,
						skip: initialDays.has(group.day)
					}}
					out:heightPresence={{
						reduced,
						reducedDuration: m.duration.instant,
						spring: { duration: m.duration.exit, easing: m.ease.standard },
						fade: { duration: m.duration.exit, easing: m.ease.standard }
					}}
				>
					<div
						class="arc-timeline__day"
						role="heading"
						aria-level={headingLevel}
						id={`${id}-${group.day}`}
					>
						<span>{group.label}</span><span class="arc-timeline__count" aria-hidden="true"
							><RollingCount value={group.rows.length} {reduced} />
							{group.rows.length === 1 ? 'update' : 'updates'}</span
						><span class="arc-timeline__sr-only"
							>{`, ${group.rows.length} ${group.rows.length === 1 ? 'update' : 'updates'}`}</span
						>
					</div>
					<ol class="arc-timeline__list">
						{#each group.rows as row, index (row.id)}
							{@const today = group.label === 'Today' && now - row.time < 43200000}
							{@const time = today
								? relative(row.time, now)
								: { short: formats.clock.format(new Date(row.time)), long: '' }}
							<TimelineRow
								{row}
								last={index === group.rows.length - 1}
								expanded={expanded.has(row.id)}
								onToggle={() => toggle(row.id)}
								timeLabel={time.short}
								timeFull={today
									? `${time.long}, ${formats.full.format(new Date(row.time))}`
									: formats.full.format(new Date(row.time))}
								fresh={known.fresh.has(row.id)}
								{reduced}
								{schedule}
							/>
						{/each}
					</ol>
				</section>
			{/each}
		</div>
	</div>
	<span class="arc-timeline__sr-only" role="status">{known.announcement}</span>
</div>
