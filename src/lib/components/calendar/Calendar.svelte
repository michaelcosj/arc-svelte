<script lang="ts">
	import { Calendar as Primitive } from 'bits-ui';
	import { untrack, tick } from 'svelte';
	import { Spring, prefersReducedMotion } from 'svelte/motion';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { motionTokens as m, springOptions, swap, Mounted } from '#lib/motion';
	import type { CalendarProps } from './types';
	import {
		addDays,
		addMonths,
		dateKey,
		fromIndex,
		makeWeeks,
		monthIndex,
		monthStart,
		sameDay,
		sameMonth,
		shiftMonths,
		startOfDay,
		toNative,
		toValue
	} from './dates';
	import { useToday } from './today.svelte';
	import SelectionDisc from './SelectionDisc.svelte';
	import './calendar.css';

	const titleId = $props.id();
	let {
		value,
		onChange,
		month: controlledMonth,
		onMonthChange,
		minDate,
		maxDate,
		disabledDates,
		locale = 'en-US',
		class: className,
		showToday = false,
		ref = $bindable(null)
	}: CalendarProps = $props();
	const clock = useToday();
	const today = $derived(clock.current);
	const mounted = new Mounted();
	const reduced = $derived(prefersReducedMotion.current);
	let internalMonth = $state.raw<Date | undefined>(untrack(() => value && monthStart(value)));
	let focusedDate = $state.raw<Date | undefined>(untrack(() => value));
	const month = $derived(
		controlledMonth
			? monthStart(controlledMonth)
			: (internalMonth ?? ((value ?? today) && monthStart((value ?? today)!)))
	);
	$effect(() => {
		const readyMonth = month;
		untrack(() => {
			if (!controlledMonth && !internalMonth && readyMonth) internalMonth = readyMonth;
		});
	});
	const target = $derived(month ? monthIndex(month) : 0);
	const position = new Spring(
		untrack(() => target),
		springOptions({ visualDuration: 0.36, bounce: 0 }, 0.002)
	);
	let placed = untrack(() => Boolean(month));
	let previousTarget = untrack(() => target);
	let direction = $state(0);
	$effect(() => {
		const next = target;
		const ready = Boolean(month);
		const instant = reduced;
		untrack(() => {
			if (!ready) return;
			direction = placed && previousTarget !== next ? Math.sign(next - previousTarget) : direction;
			previousTarget = next;
			if (!placed || instant) {
				placed = true;
				void position.set(next, { instant: true });
				return;
			}
			if (Math.abs(next - position.current) > 2)
				void position.set(next - Math.sign(next - position.current), { instant: true });
			void position.set(next);
		});
	});
	const paneIndexes = $derived(
		[
			...new Set([Math.floor(position.current + 1e-3), Math.ceil(position.current - 1e-3), target])
		].sort((a, b) => a - b)
	);
	const formatter = $derived(new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }));
	const weekdays = $derived(
		Array.from({ length: 7 }, (_, index) =>
			new Intl.DateTimeFormat(locale, { weekday: 'short' })
				.format(new Date(2024, 0, 7 + index))
				.slice(0, 2)
		)
	);
	const monthLabel = $derived(month ? formatter.format(month) : '');
	const valueKey = $derived(value ? dateKey(value) : '');
	let last = untrack(() => ({ key: valueKey, date: value }));
	const handoff = $derived.by(() => {
		if (last.key === valueKey) return { from: '', to: '', distance: 0 };
		const days =
			last.date && value
				? Math.round((startOfDay(value).getTime() - startOfDay(last.date).getTime()) / 864e5)
				: 0;
		const columns = last.date && value ? value.getDay() - last.date.getDay() : 0;
		const result = {
			from: last.key,
			to: valueKey,
			distance: Math.hypot(columns, (days - columns) / 7)
		};
		last = { key: valueKey, date: value };
		return result;
	});
	function numberDelay(key: string) {
		if (!handoff.distance || reduced || (key !== handoff.to && key !== handoff.from))
			return undefined;
		return `--number-delay: ${Math.round(key === handoff.to ? Math.min(260, 95 + 85 * Math.log(handoff.distance)) : Math.max(20, 130 / handoff.distance))}ms`;
	}
	const isDisabled = (date: Date) =>
		Boolean(
			(minDate && startOfDay(date) < startOfDay(minDate)) ||
			(maxDate && startOfDay(date) > startOfDay(maxDate)) ||
			disabledDates?.(date)
		);
	const previousDisabled = $derived(
		Boolean(month && minDate && addMonths(month, -1) < monthStart(minDate))
	);
	const nextDisabled = $derived(
		Boolean(month && maxDate && addMonths(month, 1) > monthStart(maxDate))
	);
	const todaySelectable = $derived(Boolean(today && !isDisabled(today) && onChange));
	const todayIdle = $derived(
		Boolean(today && sameMonth(month, today) && (!todaySelectable || sameDay(value, today)))
	);
	const tabbableKey = $derived.by(() => {
		const open = (date?: Date) =>
			date && sameMonth(date, month) && !isDisabled(date) ? dateKey(date) : '';
		return (
			open(focusedDate) ||
			open(value) ||
			open(today) ||
			(month
				? dateKey(
						makeWeeks(month)
							.flat()
							.find((date) => sameMonth(date, month) && !isDisabled(date)) ?? new Date(0)
					)
				: '')
		);
	});
	function changeMonth(next: Date) {
		const normalized = monthStart(next);
		if (!controlledMonth) internalMonth = normalized;
		onMonthChange?.(normalized);
	}
	function goToToday() {
		if (!today || !month || todayIdle) return;
		focusedDate = today;
		if (!sameMonth(today, month)) changeMonth(today);
		if (todaySelectable && !sameDay(value, today)) onChange?.(today);
	}
	async function moveFocus(from: Date, targetDate: Date, step: number) {
		let next =
			minDate && startOfDay(targetDate) < startOfDay(minDate)
				? startOfDay(minDate)
				: maxDate && startOfDay(targetDate) > startOfDay(maxDate)
					? startOfDay(maxDate)
					: targetDate;
		for (let tries = 0; tries < 42 && isDisabled(next); tries++) next = addDays(next, step);
		if (isDisabled(next) || sameDay(from, next)) return;
		focusedDate = next;
		if (!sameMonth(next, month)) changeMonth(next);
		await tick();
		ref
			?.querySelector<HTMLButtonElement>(`[data-present] [data-date="${dateKey(next)}"]`)
			?.focus({ preventScroll: true });
	}
	function onDayKeyDown(event: KeyboardEvent, date: Date) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			event.stopPropagation();
			if (!isDisabled(date)) onChange?.(date);
			return;
		}
		const moves: Record<string, [Date, number]> = {
			ArrowLeft: [addDays(date, -1), -1],
			ArrowRight: [addDays(date, 1), 1],
			ArrowUp: [addDays(date, -7), -1],
			ArrowDown: [addDays(date, 7), 1],
			Home: [addDays(date, -date.getDay()), 1],
			End: [addDays(date, 6 - date.getDay()), -1],
			PageUp: [shiftMonths(date, event.shiftKey ? -12 : -1), -1],
			PageDown: [shiftMonths(date, event.shiftKey ? 12 : 1), 1]
		};
		const move = moves[event.key];
		if (!move) return;
		event.preventDefault();
		event.stopPropagation();
		void moveFocus(date, move[0], move[1]);
	}
	function cellOf(paneMonth: Date) {
		if (!value) return -1;
		const first = addDays(paneMonth, -paneMonth.getDay());
		const index = Math.round((startOfDay(value).getTime() - first.getTime()) / 864e5);
		return index >= 0 && index < 42 ? index : -1;
	}
</script>

<Primitive.Root
	type="single"
	value={value ? toValue(value) : undefined}
	placeholder={toValue(month ?? new Date(2000, 0, 1))}
	onValueChange={(next) => {
		if (next) onChange?.(toNative(next));
	}}
	preventDeselect
	fixedWeeks
	weekStartsOn={0}
	disableDaysOutsideMonth={false}
	{locale}
	isDateDisabled={(date) => isDisabled(toNative(date))}
>
	{#snippet child({ props })}
		<section
			{...props}
			bind:this={ref}
			role={undefined}
			aria-label={undefined}
			aria-labelledby={titleId}
			class={['arc-calendar', className]}
		>
			<div class="arc-calendar__header">
				<h2 id={titleId} class="arc-calendar__heading">
					<span class="arc-calendar__sr-only">{monthLabel}</span><span
						class="arc-calendar__title"
						aria-hidden="true"
					>
						{#key monthLabel}<span
								class="arc-calendar__title-row"
								in:swap={{
									x: direction * 12,
									duration: m.duration.standard,
									easing: m.ease.enter,
									skip: !mounted.current || reduced || !direction
								}}
								out:swap={{
									x: direction * -12,
									duration: reduced ? 0 : 140,
									easing: m.ease.standard
								}}>{monthLabel}</span
							>{/key}
					</span>
				</h2>
				<span class="arc-calendar__sr-only" aria-live="polite">{direction ? monthLabel : ''}</span>
				<div class="arc-calendar__navigation">
					{#if showToday}<button
							type="button"
							class="arc-calendar__today-button"
							aria-disabled={todayIdle || undefined}
							aria-label={today
								? `Today, ${today.toLocaleDateString(locale, { dateStyle: 'full' })}`
								: 'Today'}
							onclick={goToToday}>Today</button
						>{/if}
					<button
						type="button"
						class="arc-calendar__nav-button"
						aria-label="Previous month"
						aria-disabled={previousDisabled || undefined}
						onclick={() => {
							if (month && !previousDisabled) changeMonth(addMonths(month, -1));
						}}><ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" /></button
					>
					<button
						type="button"
						class="arc-calendar__nav-button"
						aria-label="Next month"
						aria-disabled={nextDisabled || undefined}
						onclick={() => {
							if (month && !nextDisabled) changeMonth(addMonths(month, 1));
						}}><ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" /></button
					>
				</div>
			</div>
			<div class="arc-calendar__weekdays" aria-hidden="true">
				{#each weekdays as day, index (index)}<span>{day}</span>{/each}
			</div>
			<div class="arc-calendar__month-viewport">
				{#if month}
					{#each paneIndexes as index (index)}
						{@const paneMonth = fromIndex(index)}
						{@const present = index === target}
						<div
							class="arc-calendar__month-body"
							data-present={present || undefined}
							aria-hidden={!present || undefined}
							inert={!present}
							style:transform="translateX(calc({(index - position.current) * 100}% + {(index -
								position.current) *
								16}px))"
							style:opacity={1 - Math.min(1, Math.abs(index - position.current)) * 0.6}
						>
							<SelectionDisc cell={cellOf(paneMonth)} />
							<div class="arc-calendar__grid" role="grid" aria-label={formatter.format(paneMonth)}>
								{#each makeWeeks(paneMonth) as week (dateKey(week[0]!))}<div
										class="arc-calendar__week"
										role="row"
									>
										{#each week as date (dateKey(date))}
											{@const key = dateKey(date)}
											<Primitive.Cell date={toValue(date)} month={toValue(paneMonth)}>
												{#snippet child()}
													<Primitive.Day>
														{#snippet child({ props: dayProps })}
															<button
																{...dayProps}
																type="button"
																role="gridcell"
																data-date={key}
																aria-label={date.toLocaleDateString(locale, { dateStyle: 'full' })}
																aria-selected={sameDay(date, value)}
																aria-current={sameDay(date, today) ? 'date' : undefined}
																aria-disabled={undefined}
																tabindex={present && key === tabbableKey ? 0 : -1}
																disabled={isDisabled(date)}
																style={present ? numberDelay(key) : undefined}
																class={[
																	'arc-calendar__day',
																	!sameMonth(date, paneMonth) && 'arc-calendar--outside',
																	sameDay(date, value) && 'arc-calendar--selected',
																	sameDay(date, today) && 'arc-calendar--today'
																]}
																onfocus={() => {
																	focusedDate = date;
																}}
																onkeydown={(event) => onDayKeyDown(event, date)}
																><span class="arc-calendar__day-number">{date.getDate()}</span
																></button
															>
														{/snippet}
													</Primitive.Day>
												{/snippet}
											</Primitive.Cell>
										{/each}
									</div>{/each}
							</div>
						</div>
					{/each}
				{:else}
					<div class="arc-calendar__month-body" aria-hidden="true">
						<div class="arc-calendar__grid">
							{#each Array.from({ length: 6 }) as _, week (week)}<div class="arc-calendar__week">
									{#each Array.from({ length: 7 }) as _, day (day)}<span
											class="arc-calendar__placeholder-day"
										></span>{/each}
								</div>{/each}
						</div>
					</div>
				{/if}
			</div>
		</section>
	{/snippet}
</Primitive.Root>
