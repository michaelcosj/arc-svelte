<script lang="ts">
	import { Popover, RangeCalendar } from 'bits-ui';
	import { tick, untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import {
		PhysicalSpring,
		Mounted,
		motionTokens as m,
		swap,
		Highlight,
		SharedPosition,
		springCurve
	} from '#lib/motion';
	import { today as clock } from '#lib/today.svelte.ts';
	import { toValue, toNative } from '../calendar/dates';
	import {
		addDays,
		addMonths,
		shiftMonths,
		dayDiff,
		monthDiff,
		monthStart,
		keyOf,
		fromKey,
		ordered,
		sameDay,
		sameRange,
		clampDate,
		defaultDateRangePresets
	} from './dates';
	import RangeMonth from './RangeMonth.svelte';
	import RangeRoll from './RangeRoll.svelte';
	import type { DateRangePickerProps, DateRange, DateRangePreset } from './types';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import './date-range-picker.css';
	let {
		value = $bindable(undefined),
		defaultValue = null,
		onChange,
		label = 'Date range',
		placeholder = 'Select dates',
		presets = defaultDateRangePresets,
		minDate,
		maxDate,
		weekStartsOn = 0,
		locale = 'en-US',
		months = 'auto',
		boundary,
		class: className
	}: DateRangePickerProps = $props();
	const flight = new SharedPosition(() => ({
		reduced,
		spec: open ? { visualDuration: 0.48, bounce: 0.12 } : { visualDuration: 0.38, bounce: 0 }
	}));
	const uid = $props.id(),
		mounted = new Mounted(),
		reduced = $derived(mounted.current && Boolean(prefersReducedMotion.current)),
		today = $derived(clock.current);
	let inner = $state(untrack(() => defaultValue)),
		open = $state(false),
		compact = $state(false),
		panelWidth = $state(0),
		draft = $state<DateRange | null>(untrack(() => value ?? defaultValue)),
		anchor = $state<Date | null>(null),
		hover = $state<Date | null>(null),
		view = $state(untrack(() => monthStart((value ?? defaultValue)?.end ?? new Date(2000, 0, 1)))),
		direction = $state(0),
		focusKey = $state(''),
		ready = $state(false),
		root = $state<HTMLDivElement>(),
		trigger = $state<HTMLButtonElement | null>(null),
		panel = $state<HTMLDivElement | null>(null),
		rail = $state<HTMLDivElement>(),
		pendingFocus = false;
	const committed = $derived(value === undefined ? inner : value),
		count = $derived(compact ? 1 : 2),
		visible = $derived(Array.from({ length: count }, (_, i) => addMonths(view, i))),
		shown = $derived(anchor ? ordered(anchor, hover ?? anchor) : draft),
		activePreset = $derived(
			today && !anchor ? presets.findIndex((p) => sameRange(p.range(today), draft)) : -1
		),
		days = $derived(shown ? dayDiff(shown.end, shown.start) + 1 : 0),
		formatter = $derived(
			new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' })
		);
	const format = (r: DateRange | null) =>
			!r
				? placeholder
				: sameDay(r.start, r.end)
					? formatter.format(r.start)
					: formatter.formatRange(r.start, r.end),
		committedText = $derived(format(committed)),
		shownText = $derived(shown ? format(shown) : 'No dates'),
		countText = $derived(shown ? `${days} ${days === 1 ? 'day' : 'days'}` : ''),
		cellSize = $derived(
			compact && panelWidth ? Math.max(32, Math.min(42, Math.floor((panelWidth - 24) / 7))) : 36
		);
	const grow = { visualDuration: 0.48, bounce: 0.12 },
		shrink = { visualDuration: 0.38, bounce: 0 },
		width = new PhysicalSpring(0, grow),
		height = new PhysicalSpring(0, grow),
		radius = new PhysicalSpring(18, grow),
		x = new PhysicalSpring(0, grow),
		rootWidth = new PhysicalSpring(0, m.specs.morph),
		presetHighlight = new Highlight(() => ({
			reduced,
			spec: { visualDuration: 0.3, bounce: 0.1 },
			measure: 'offset'
		}));
	const tabbable = $derived.by(() => {
		const onScreen = (d: Date) => visible.some((m) => monthDiff(d, m) === 0);
		if (focusKey && onScreen(fromKey(focusKey))) return focusKey;
		if (shown && onScreen(shown.start)) return keyOf(shown.start);
		return keyOf(visible[0]!);
	});
	function bounds() {
		const el = boundary?.(),
			box = el?.getBoundingClientRect();
		return {
			left: Math.max(0, box?.left ?? 0),
			right: Math.min(document.documentElement.clientWidth, box?.right ?? Infinity)
		};
	}
	function place() {
		if (!trigger || !root) return;
		const tw = trigger.offsetWidth,
			th = trigger.offsetHeight,
			p = open && panel ? { w: panel.offsetWidth, h: panel.offsetHeight } : null;
		if (!tw) return;
		const target = p ?? { w: tw, h: th };
		let offset = 0;
		if (p) {
			const r = root.getBoundingClientRect(),
				box = bounds();
			offset = Math.min(0, box.right - 8 - r.left - p.w);
			offset = Math.max(offset, box.left + 8 - r.left);
		}
		if (!ready || reduced) {
			width.jump(target.w);
			height.jump(target.h);
			radius.jump(p ? 26 : 18);
			x.jump(offset);
			rootWidth.jump(tw);
			ready = true;
		} else {
			const spec = open ? grow : shrink;
			width.set(target.w, { spec });
			height.set(target.h, { spec });
			radius.set(p ? 26 : 18, { spec });
			x.set(offset, { spec });
			rootWidth.set(tw);
		}
	}
	function observeTrigger(node: HTMLElement) {
		untrack(place);
		const ro = new ResizeObserver(place);
		ro.observe(node);
		return () => {
			ro.disconnect();
			[width, height, radius, x, rootWidth].forEach((s) => s.destroy());
		};
	}
	function observePanel(node: HTMLElement) {
		queueMicrotask(place);
		const ro = new ResizeObserver(place);
		ro.observe(node);
		requestAnimationFrame(() => {
			const r = node.getBoundingClientRect(),
				overflow = r.bottom - (innerHeight - 8);
			if (overflow > 0)
				window.scrollBy({
					top: Math.min(overflow, Math.max(0, r.top - 8)),
					behavior: reduced ? 'instant' : 'smooth'
				});
		});
		return () => ro.disconnect();
	}
	function layout() {
		const b = bounds(),
			available = Math.max(0, b.right - b.left - 16);
		compact = months === 1 || (months === 'auto' && available < 712);
		panelWidth = Math.min(352, available);
	}
	function viewFor(r: DateRange | null, fallback: Date) {
		const end = monthStart(r?.end ?? fallback);
		return compact ? end : addMonths(end, -1);
	}
	let committedDirection = $state(1),
		shownDirection = $state(1);
	let previousCommitted = untrack(() => (committed ? +committed.start * 2 + +committed.end : null)),
		previousShown = untrack(() => (shown ? +shown.start * 2 + +shown.end : null));
	$effect.pre(() => {
		const next = committed ? +committed.start * 2 + +committed.end : null;
		untrack(() => {
			if (next !== previousCommitted) {
				committedDirection =
					next === null || previousCommitted === null || next >= previousCommitted ? 1 : -1;
				previousCommitted = next;
			}
		});
	});
	$effect.pre(() => {
		const next = shown ? +shown.start * 2 + +shown.end : null;
		untrack(() => {
			if (next !== previousShown) {
				shownDirection = next === null || previousShown === null || next >= previousShown ? 1 : -1;
				previousShown = next;
			}
		});
	});

	$effect.pre(() => {
		void open;
		untrack(() => flight.capture());
	});

	async function focusDay() {
		await tick();
		const node = panel?.querySelector<HTMLButtonElement>(
			`[data-current]:not([inert]) [data-date="${tabbable}"]`
		);
		node?.focus({ preventScroll: true });
		pendingFocus = false;
	}
	function show() {
		if (!today) return;
		layout();
		draft = committed;
		anchor = null;
		hover = null;
		view = viewFor(committed, today);
		direction = 0;
		focusKey = keyOf(committed?.start ?? today);
		pendingFocus = true;
		open = true;
		void focusDay();
	}
	function close(restore: boolean) {
		direction = 0;
		open = false;
		anchor = null;
		hover = null;
		if (restore) void tick().then(() => trigger?.focus({ preventScroll: true }));
		queueMicrotask(place);
	}
	function apply() {
		const next = anchor ? { start: anchor, end: anchor } : draft;
		if (!next) return;
		if (value === undefined) inner = next;
		else if (!onChange) value = next;
		onChange?.(next);
		close(true);
	}
	function goTo(next: Date) {
		const delta = monthDiff(next, view);
		if (!delta) return;
		direction = Math.sign(delta);
		view = next;
	}
	function choosePreset(preset: DateRangePreset) {
		if (!today) return;
		const next = preset.range(today);
		draft = next;
		anchor = null;
		hover = null;
		focusKey = keyOf(next.start);
		const first = view,
			last = addMonths(view, count - 1);
		if (monthDiff(next.start, first) < 0 || monthDiff(next.end, last) > 0)
			goTo(viewFor(next, next.end));
	}
	function changedRange(next: {
		start?: import('@internationalized/date').DateValue;
		end?: import('@internationalized/date').DateValue;
	}) {
		if (next.start && next.end) {
			draft = ordered(toNative(next.start), toNative(next.end));
			anchor = null;
			hover = null;
		} else if (next.start) {
			anchor = toNative(next.start);
			hover = anchor;
		}
	}
	function dayKey(e: KeyboardEvent, date: Date) {
		const wd = (date.getDay() - weekStartsOn + 7) % 7,
			moves: Record<string, () => Date> = {
				ArrowLeft: () => addDays(date, -1),
				ArrowRight: () => addDays(date, 1),
				ArrowUp: () => addDays(date, -7),
				ArrowDown: () => addDays(date, 7),
				Home: () => addDays(date, -wd),
				End: () => addDays(date, 6 - wd),
				PageUp: () => shiftMonths(date, e.shiftKey ? -12 : -1),
				PageDown: () => shiftMonths(date, e.shiftKey ? 12 : 1)
			};
		const move = moves[e.key];
		if (!move) return;
		e.preventDefault();
		const next = clampDate(move(), minDate, maxDate);
		focusKey = keyOf(next);
		if (anchor) hover = next;
		pendingFocus = true;
		if (monthDiff(next, view) < 0) goTo(monthStart(next));
		else if (monthDiff(next, addMonths(view, count - 1)) > 0)
			goTo(addMonths(monthStart(next), -(count - 1)));
		void focusDay();
	}
	$effect(() => {
		void open;
		void reduced;
		untrack(() => queueMicrotask(place));
	});
	$effect(() => {
		void activePreset;
		void compact;
		void open;
		untrack(() => {
			presetHighlight.move(
				activePreset < 0
					? null
					: rail?.querySelector<HTMLElement>(`[data-preset="${activePreset}"]`),
				true
			);
			if (compact) {
				const node = rail?.querySelector<HTMLElement>(`[data-preset="${activePreset}"]`);
				if (
					node &&
					rail &&
					(node.offsetLeft < rail.scrollLeft ||
						node.offsetLeft + node.offsetWidth > rail.scrollLeft + rail.clientWidth)
				)
					rail.scrollTo({ left: node.offsetLeft - 12, behavior: reduced ? 'instant' : 'smooth' });
			}
		});
	});
	function resize() {
		const onResize = () => {
			if (open) {
				layout();
				queueMicrotask(place);
			}
		};
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	}
</script>

<Popover.Root {open} onOpenChange={(next) => (next ? show() : close(false))}
	><div
		bind:this={root}
		class={['arc-date-range-picker__root', className]}
		style:width={ready ? `${rootWidth.current}px` : undefined}
		data-open={open || undefined}
		onfocusout={(e) => {
			if (open && e.relatedTarget && !root?.contains(e.relatedTarget as Node)) close(false);
		}}
		{@attach resize}
	>
		<Popover.Trigger
			bind:ref={trigger}
			class="arc-date-range-picker__trigger"
			aria-haspopup="dialog"
			aria-label={`${label}: ${committedText}`}
			disabled={!today}
			inert={open}
			{@attach observeTrigger}
			><span class="arc-date-range-picker__trigger-icon" style:opacity={open ? 0 : 1}
				><CalendarDays size={16} strokeWidth={1.75} /></span
			>{#if open}<span
					class="arc-date-range-picker__value"
					data-empty={!committed || undefined}
					style:opacity="0"
					><RangeRoll text={committedText} direction={committedDirection} {reduced} /></span
				>{:else}<span
					class="arc-date-range-picker__value"
					data-empty={!committed || undefined}
					{@attach flight.target('value')}
					><RangeRoll text={committedText} direction={committedDirection} {reduced} /></span
				>{/if}<span class="arc-date-range-picker__chevron" style:opacity={open ? 0 : 1}
				><ChevronDown size={16} strokeWidth={1.75} /></span
			></Popover.Trigger
		>
		<div
			class="arc-date-range-picker__surface"
			style:width={ready ? `${width.current}px` : '100%'}
			style:height={ready ? `${height.current}px` : '100%'}
			style:border-radius={`${radius.current}px`}
			style:transform={`translateX(${x.current}px)`}
		>
			<Popover.ContentStatic
				forceMount
				bind:ref={panel}
				id={`${uid}-panel`}
				trapFocus={false}
				preventScroll={false}
				onOpenAutoFocus={(e) => {
					e.preventDefault();
					if (pendingFocus) void focusDay();
				}}
				onCloseAutoFocus={(e) => e.preventDefault()}
				onEscapeKeydown={(e) => {
					e.preventDefault();
					close(true);
				}}
				>{#snippet child({ props })}{#if open && today}<div
							{...props}
							class="arc-date-range-picker__panel"
							role="dialog"
							aria-label={label}
							data-compact={compact || undefined}
							style={`--cell:${cellSize}px;${compact && panelWidth ? `width:${panelWidth}px;` : ''}`}
							{@attach observePanel}
							out:swap={{ duration: 140, opacity: 1 }}
						>
							<RangeCalendar.Root
								value={anchor
									? { start: toValue(anchor), end: undefined }
									: draft
										? { start: toValue(draft.start), end: toValue(draft.end) }
										: { start: undefined, end: undefined }}
								onValueChange={changedRange}
								placeholder={toValue(view)}
								onPlaceholderChange={(v) => {
									const native = toNative(v);
									if (monthDiff(native, view) !== 0 && count === 1) goTo(monthStart(native));
								}}
								minValue={minDate ? toValue(minDate) : undefined}
								maxValue={maxDate ? toValue(maxDate) : undefined}
								{weekStartsOn}
								{locale}
								fixedWeeks
								numberOfMonths={count}
								preventDeselect
								style="display:contents"
							>
								<div
									class="arc-date-range-picker__body"
									in:swap={{
										y: reduced ? 0 : -4,
										blur: reduced ? 0 : 4,
										duration: reduced ? 120 : 260,
										delay: reduced ? 0 : 70,
										easing: m.ease.enter
									}}
									out:swap={{
										y: reduced ? 0 : -2,
										blur: reduced ? 0 : 4,
										duration: reduced ? 80 : 120,
										easing: m.ease.standard
									}}
								>
									<div
										bind:this={rail}
										class="arc-date-range-picker__rail"
										role="group"
										aria-label="Presets"
									>
										<span
											class="arc-date-range-picker__rail-highlight"
											style={presetHighlight.style}
											hidden={!presetHighlight.shown}
											aria-hidden="true"
										></span>{#each presets as preset, index (preset.label)}<button
												type="button"
												class="arc-date-range-picker__preset"
												data-preset={index}
												aria-pressed={index === activePreset}
												onclick={() => choosePreset(preset)}
												onkeydown={(e) => {
													const keys = compact
														? ['ArrowLeft', 'ArrowRight']
														: ['ArrowUp', 'ArrowDown'];
													if (!keys.includes(e.key)) return;
													e.preventDefault();
													const buttons =
														rail?.querySelectorAll<HTMLButtonElement>('[data-preset]');
													buttons?.[
														(index + (e.key === keys[1] ? 1 : -1) + presets.length) % presets.length
													]?.focus();
												}}>{preset.label}</button
											>{/each}
									</div>
									<div
										class="arc-date-range-picker__calendars"
										role="group"
										aria-label="Calendars"
										onpointerleave={() => {
											if (anchor) hover = null;
										}}
									>
										<button
											type="button"
											class="arc-date-range-picker__nav-button"
											data-side="prev"
											aria-label="Previous month"
											onclick={() => goTo(addMonths(view, -1))}
											disabled={Boolean(minDate && monthDiff(view, minDate) <= 0)}
											><ChevronLeft size={16} strokeWidth={1.75} /></button
										><button
											type="button"
											class="arc-date-range-picker__nav-button"
											data-side="next"
											aria-label="Next month"
											onclick={() => goTo(addMonths(view, 1))}
											disabled={Boolean(
												maxDate && monthDiff(addMonths(view, count - 1), maxDate) >= 0
											)}><ChevronRight size={16} strokeWidth={1.75} /></button
										>
										<div class="arc-date-range-picker__viewport">
											{#key `${keyOf(view)}-${count}`}<div
													class="arc-date-range-picker__months"
													data-current=""
													in:swap={{
														x: reduced ? 0 : direction * 48,
														blur: reduced ? 0 : 4,
														...springCurve({ visualDuration: 0.4, bounce: 0.06 }),
														fade: { duration: 240, easing: m.ease.enter },
														skip: !direction
													}}
													out:swap={{
														x: reduced ? 0 : direction * -36,
														blur: reduced ? 0 : 4,
														...springCurve({ visualDuration: 0.4, bounce: 0.06 }),
														fade: { duration: 140, easing: m.ease.standard },
														pop: true
													}}
												>
													{#each visible as month (keyOf(month))}<RangeMonth
															{month}
															range={shown}
															{tabbable}
															{today}
															{minDate}
															{maxDate}
															{weekStartsOn}
															{reduced}
															{locale}
															idBase={uid}
															onHover={(d) => {
																if (anchor) hover = d;
															}}
															onKey={dayKey}
															onFocusDay={(d) => (focusKey = keyOf(d))}
														/>{/each}
												</div>{/key}
										</div>
									</div>
								</div>
							</RangeCalendar.Root>
							<div class="arc-date-range-picker__footer">
								<div class="arc-date-range-picker__summary">
									<span
										class="arc-date-range-picker__summary-value"
										{@attach flight.target('value')}
										><RangeRoll text={shownText} direction={shownDirection} {reduced} /></span
									><span class="arc-date-range-picker__summary-count"
										>{#if countText}<RangeRoll
												text={anchor && sameDay(anchor, hover) ? 'Pick an end date' : countText}
												direction={shownDirection}
												{reduced}
											/>{/if}</span
									>
								</div>
								<div class="arc-date-range-picker__actions">
									<button
										type="button"
										class="arc-date-range-picker__ghost"
										onclick={() => close(true)}>Cancel</button
									><button
										type="button"
										class="arc-date-range-picker__primary"
										onclick={apply}
										disabled={!shown}>Apply</button
									>
								</div>
							</div>
							<p class="arc-date-range-picker__sr-only" aria-live="polite">
								{anchor
									? `Start ${formatter.format(anchor)}. Choose an end date.`
									: shown
										? `${shownText}, ${countText}`
										: ''}
							</p>
						</div>{/if}{/snippet}</Popover.ContentStatic
			>
		</div>
	</div></Popover.Root
>
