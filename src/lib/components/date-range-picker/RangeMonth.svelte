<script lang="ts">
	import { RangeCalendar } from 'bits-ui';
	import { toValue } from '../calendar/dates';
	import { addDays, dayDiff, monthDiff, sameDay, keyOf, fromKey } from './dates';
	import RangeBar from './RangeBar.svelte';
	import RangeThumb from './RangeThumb.svelte';
	import type { DateRange } from './types';
	let {
		month,
		range,
		tabbable,
		today,
		minDate,
		maxDate,
		weekStartsOn,
		reduced,
		locale,
		idBase,
		onHover,
		onKey,
		onFocusDay
	}: {
		month: Date;
		range: DateRange | null;
		tabbable: string;
		today?: Date;
		minDate?: Date;
		maxDate?: Date;
		weekStartsOn: 0 | 1;
		reduced: boolean;
		locale: string;
		idBase: string;
		onHover: (date: Date) => void;
		onKey: (event: KeyboardEvent, date: Date) => void;
		onFocusDay: (date: Date) => void;
	} = $props();
	const first = $derived(addDays(month, -((month.getDay() - weekStartsOn + 7) % 7))),
		rows = $derived(
			Array.from({ length: 6 }, (_, row) =>
				Array.from({ length: 7 }, (_, col) => addDays(first, row * 7 + col))
			)
		),
		titleId = $derived(`${idBase}-${keyOf(month)}`),
		loKey = $derived(range ? keyOf(range.start) : ''),
		hiKey = $derived(range ? keyOf(range.end) : '');
	const segments = $derived.by(() => {
		if (!loKey || !hiKey) return rows.map(() => null);
		const start = fromKey(loKey),
			end = fromKey(hiKey),
			unit = 100 / 7,
			colOf = (d: Date) => dayDiff(d, first) % 7;
		return rows.map((row) => {
			const days = row.filter((d) => monthDiff(d, month) === 0);
			if (!days.length) return null;
			const rowFirst = days[0]!,
				rowLast = days.at(-1)!,
				from = dayDiff(start, rowFirst) > 0 ? start : rowFirst,
				to = dayDiff(end, rowLast) < 0 ? end : rowLast;
			if (dayDiff(from, to) <= 0)
				return { left: colOf(from) * unit, width: (colOf(to) - colOf(from) + 1) * unit };
			if (dayDiff(rowLast, start) < 0) return { left: (colOf(rowLast) + 1) * unit, width: 0 };
			return { left: colOf(rowFirst) * unit, width: 0 };
		});
	});
	function cellOf(key: string) {
		if (!key || monthDiff(fromKey(key), month) !== 0) return null;
		const at = dayDiff(fromKey(key), first);
		return { row: Math.floor(at / 7), col: at % 7 };
	}
	const startCell = $derived(cellOf(loKey)),
		endCell = $derived(hiKey !== loKey ? cellOf(hiKey) : null),
		title = $derived(
			new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(month)
		);
</script>

<div class="arc-date-range-picker__month">
	<p id={titleId} class="arc-date-range-picker__month-title">{title}</p>
	<div role="grid" aria-labelledby={titleId} class="arc-date-range-picker__grid">
		<div role="row" class="arc-date-range-picker__weekdays">
			{#each rows[0]! as date (date.getDay())}<span
					role="columnheader"
					aria-label={new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date)}
					>{new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date).slice(0, 2)}</span
				>{/each}
		</div>
		<div class="arc-date-range-picker__weeks">
			<span class="arc-date-range-picker__layer" aria-hidden="true"
				>{#each segments as segment, row (row)}<RangeBar
						{row}
						{segment}
						{reduced}
					/>{/each}<RangeThumb cell={startCell} {reduced} /><RangeThumb
					cell={endCell}
					{reduced}
				/></span
			>{#each rows as row, index (index)}<div role="row" class="arc-date-range-picker__week">
					{#each row as date (keyOf(date))}{#if monthDiff(date, month) !== 0}<span
								role="gridcell"
								class="arc-date-range-picker__blank"
							></span>{:else}{@const inRange = Boolean(
								range && dayDiff(date, range.start) >= 0 && dayDiff(date, range.end) <= 0
							)}{@const edge = Boolean(
								range && (sameDay(date, range.start) || sameDay(date, range.end))
							)}{@const isToday = sameDay(date, today)}{@const key = keyOf(date)}<RangeCalendar.Cell
								date={toValue(date)}
								month={toValue(month)}
								>{#snippet child({ props: cellProps })}<span
										{...cellProps}
										role="gridcell"
										aria-selected={inRange}
										class="arc-date-range-picker__cell"
										><RangeCalendar.Day
											>{#snippet child({ props })}<button
													{...props}
													type="button"
													role={undefined}
													class="arc-date-range-picker__day"
													data-date={key}
													data-edge={edge || undefined}
													data-range={inRange || undefined}
													data-today={isToday || undefined}
													tabindex={key === tabbable ? 0 : -1}
													disabled={Boolean(
														(minDate && dayDiff(date, minDate) < 0) ||
														(maxDate && dayDiff(date, maxDate) > 0)
													)}
													aria-current={isToday ? 'date' : undefined}
													aria-label={new Intl.DateTimeFormat(locale, {
														weekday: 'long',
														month: 'long',
														day: 'numeric',
														year: 'numeric'
													}).format(date)}
													onpointerenter={() => onHover(date)}
													onfocus={() => onFocusDay(date)}
													onkeydown={(e) => onKey(e, date)}><span>{date.getDate()}</span></button
												>{/snippet}</RangeCalendar.Day
										></span
									>{/snippet}</RangeCalendar.Cell
							>{/if}{/each}
				</div>{/each}
		</div>
	</div>
</div>
