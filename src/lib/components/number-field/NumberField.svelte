<script lang="ts">
	import { untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';
	import { motionTokens as m, swap, cssEasing, PhysicalSpring, TargetSpring } from '#lib/motion';
	import Digits from './Digits.svelte';
	import Message from '#lib/motion/MessageRow.svelte';
	import Words from './Words.svelte';
	import Affix from './Affix.svelte';
	import type { NumberFieldProps, NumberFieldAffix } from './types';
	import './number-field.css';
	let {
		label,
		defaultValue = 0,
		value = $bindable(undefined),
		onValueChange,
		min = 0,
		max = Number.MAX_SAFE_INTEGER,
		step: stepProp = 1,
		largeStep,
		description,
		disabled,
		id,
		prefix,
		suffix,
		scrub = false,
		locale = 'en-US',
		formatOptions,
		size = 'md',
		limitHint = true,
		class: className,
		ref = $bindable(null)
	}: NumberFieldProps = $props();
	const generatedId = $props.id();
	const inputId = $derived(id ?? generatedId);
	const hintId = $derived(description ? `${inputId}-description` : undefined);
	const limitId = $derived(`${inputId}-limit`);
	const reduced = $derived(prefersReducedMotion.current);
	type Source = 'button' | 'key' | 'scrub' | 'type';
	const SCRUB_PX = 6,
		HOLD_DELAY = 400,
		HOLD_FASTEST = 40,
		LIMIT_PUSH = 240,
		LIMIT_HINT_MS = 1500,
		UNDER_WARN_MS = 700,
		PUSH_WINDOW = 700,
		PUSH_GAIN = 0.22,
		PUSH_CAP = 4;
	let draft = $state(''),
		editing = $state(false),
		pressed = $state(0),
		scrubbing = $state(false),
		announcement = $state(''),
		pushed = $state<1 | -1 | 0>(0),
		underWarn = $state(false);
	let controlRef = $state<HTMLDivElement>(),
		minusIcon = $state<HTMLSpanElement>(),
		plusIcon = $state<HTMLSpanElement>(),
		groupRef = $state<HTMLSpanElement>();
	const inputRef = $derived(ref);
	let internal = $state(untrack(() => defaultValue));
	const current = $derived(value ?? internal);
	let latest = $derived(current);
	let editStart = untrack(() => current);
	let pushedTimer: number | undefined,
		underTimer: number | undefined,
		strainTimer: number | undefined,
		hold: number | undefined;
	const effort = { edge: 0, count: 0, at: 0 };
	let drag: { pointer: number; x: number; from: number; active: boolean } | null = null;
	let suppressClick = false,
		shiftFrom: number | null = null,
		selectNext = false;
	const scrubX = new TargetSpring(0, m.specs.snappy);
	const shiftX = new TargetSpring(0, m.specs.morph);
	const bumpY = new PhysicalSpring(0, m.specs.morph);
	const decimalsOf = (value: number) => (String(value).split('.')[1] ?? '').length;
	const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
	const affixText = (affix: NumberFieldAffix | undefined, value: number) =>
		typeof affix === 'function' ? affix(value) : (affix ?? '');
	/** iOS style resistance: travel past a limit gives less and less, and never more than `limit` pixels. */
	const rubber = (distance: number, limit = 10) =>
		Math.sign(distance) * (1 - 1 / ((Math.abs(distance) * 0.55) / limit + 1)) * limit;

	const step = $derived(stepProp > 0 ? stepProp : 1);
	const base = $derived(Number.isFinite(min) ? min : 0);
	const decimals = $derived(Math.max(decimalsOf(step), decimalsOf(base)));
	const minFraction = $derived(formatOptions?.minimumFractionDigits ?? decimals);
	const maxFraction = $derived(
		Math.max(minFraction, formatOptions?.maximumFractionDigits ?? decimals)
	);
	const grouping = $derived(formatOptions?.useGrouping ?? true);
	const format = $derived(
		new Intl.NumberFormat(locale, {
			minimumFractionDigits: minFraction,
			maximumFractionDigits: maxFraction,
			useGrouping: grouping,
			numberingSystem: 'latn'
		})
	);
	const symbols = $derived.by(() => {
		const parts = new Intl.NumberFormat(locale).formatToParts(-1234.5);
		return {
			group: parts.find((part) => part.type === 'group')?.value ?? ',',
			decimal: parts.find((part) => part.type === 'decimal')?.value ?? '.'
		};
	});
	const round = (next: number) => Number(next.toFixed(decimals)) || 0;
	const clamp = (next: number) => Math.min(max, Math.max(min, next));
	const snap = (next: number) => round(base + Math.round((next - base) / step) * step);
	/** Off-grid values move to the next grid line in the direction of travel, then whole steps from there. */
	const stepFrom = (from: number, steps: number) => {
		const index = (from - base) / step;
		return round(
			base + ((steps > 0 ? Math.floor(index + 1e-7) : Math.ceil(index - 1e-7)) + steps) * step
		);
	};
	const spoken = (next: number) =>
		`${affixText(prefix, next)}${format.format(next)}${affixText(suffix, next)}`.trim();
	function parse(text: string) {
		const normalized = text
			.split(symbols.group)
			.join('')
			.replace(symbols.decimal, '.')
			.replace(/[^\d.-]/g, '');
		if (!/\d/.test(normalized)) return null;
		const parsed = Number(normalized);
		return Number.isFinite(parsed) ? parsed : null;
	}
	const typed = $derived(editing ? parse(draft) : null);
	const shown = $derived(typed ?? current);
	let previous = untrack(() => shown);
	let direction = $state(1);
	$effect.pre(() => {
		const next = shown;
		untrack(() => {
			if (next !== previous) {
				direction = next > previous ? 1 : -1;
				previous = next;
			}
		});
	});
	function cleanup() {
		return () => {
			clearTimeout(hold);
			clearTimeout(pushedTimer);
			clearTimeout(underTimer);
			clearTimeout(strainTimer);
			bumpY.destroy();
		};
	}
	/** A press past a limit. The value strains toward it and springs home, a little further with each push in a row (capped, like
	 * overscroll); the refused button shakes once; the note names the limit. Reduced motion keeps only a brief color change. */
	function strain(edge: 1 | -1, source: Source) {
		const now = performance.now(),
			push = effort;
		push.count = push.edge === edge && now - push.at < PUSH_WINDOW ? push.count + 1 : 1;
		push.edge = edge;
		push.at = now;
		const control = controlRef;
		if (control) {
			control.dataset.strain = edge > 0 ? 'max' : 'min';
			window.clearTimeout(strainTimer);
			strainTimer = window.setTimeout(() => {
				delete control.dataset.strain;
			}, 420);
		}
		if (!reduced) {
			bumpY.set(0, {
				velocity: -edge * 130 * (1 + Math.min(push.count - 1, PUSH_CAP) * PUSH_GAIN)
			});
			const icon = edge > 0 ? plusIcon : minusIcon;
			if (icon && (source === 'button' || source === 'key'))
				icon.animate(
					[0, -2.5, 2.5, -1.5, 1, 0].map((x) => ({ transform: `translateX(${x}px)` })),
					{ duration: 320, easing: 'ease-out' }
				);
		}
		if (limitHint) {
			pushed = edge;
			window.clearTimeout(pushedTimer);
			pushedTimer = window.setTimeout(() => {
				pushed = 0;
			}, LIMIT_HINT_MS);
		}
	}
	/** Every change lands here. A value past a limit clamps, strains toward it, and says which limit it met. */
	function commitValue(next: number, source: Source) {
		if (!Number.isFinite(next)) return false;
		const clamped = clamp(next);
		const limit = Math.sign(next - clamped);
		if (limit && source !== 'scrub') {
			strain(limit > 0 ? 1 : -1, source);
			announcement = `${spoken(clamped)}, ${limit > 0 ? 'maximum' : 'minimum'}`;
		} else if (source === 'button' && clamped !== latest) announcement = spoken(clamped);
		if (clamped === latest) return false;
		latest = clamped;
		if (value === undefined) internal = clamped;
		else if (!onValueChange) value = clamped;
		onValueChange?.(clamped);
		latest = current;
		return true;
	}
	const nudge = (toward: 1 | -1, steps: number, source: Source) =>
		commitValue(stepFrom(latest, toward * steps), source);
	/** The group glides back to center when typing changes its width, instead of hopping half a character per key. */
	function captureShift() {
		const group = groupRef;
		if (group && shiftFrom === null)
			shiftFrom = group.getBoundingClientRect().left - scrubX.current - shiftX.current;
	}
	$effect(() => {
		void editing;
		void draft;
		void current;
		untrack(() => {
			const from = shiftFrom;
			shiftFrom = null;
			if (selectNext) {
				selectNext = false;
				if (inputRef && document.activeElement === inputRef) {
					const end = inputRef.value.length;
					inputRef.setSelectionRange(end, end);
				}
			}
			if (from === null || !groupRef) return;
			const delta =
				from - (groupRef.getBoundingClientRect().left - scrubX.current - shiftX.current);
			if (Math.abs(delta) >= 0.5) {
				void shiftX.set(shiftX.current + delta, { instant: true });
				void shiftX.set(0, { instant: reduced });
			}
		});
	});

	function clearUnder() {
		window.clearTimeout(underTimer);
		underWarn = false;
	}
	function commitDraft() {
		if (!editing) return;
		captureShift();
		editing = false;
		clearUnder();
		const parsed = parse(draft);
		if (parsed !== null) commitValue(snap(parsed), 'type');
	}
	function stopHold() {
		window.clearTimeout(hold);
		hold = undefined;
		pressed = 0;
	}
	/** One step now; after a pause, repeats that speed up gently until release. Held into a limit, it keeps leaning on it at a
	 * steady cadence, each push straining a little further, until the press lets go. */
	function startHold(toward: 1 | -1, amount: number, source: Source) {
		stopHold();
		commitDraft();
		const steps = Math.max(1, Math.round(amount / step));
		if (source === 'button') pressed = toward;
		let count = 0;
		const tick = () => {
			const moved = nudge(toward, steps, source);
			hold = window.setTimeout(
				tick,
				moved ? Math.max(HOLD_FASTEST, 150 * 0.86 ** ++count) : LIMIT_PUSH
			);
		};
		hold = window.setTimeout(tick, nudge(toward, steps, source) ? HOLD_DELAY : LIMIT_PUSH + 120);
	}

	function onKeyDown(event: KeyboardEvent & { currentTarget: HTMLInputElement }) {
		const large = largeStep ?? step * 10;
		const move = (
			{
				ArrowUp: [1, event.shiftKey ? large : step],
				ArrowDown: [-1, event.shiftKey ? large : step],
				PageUp: [1, large],
				PageDown: [-1, large]
			} as Record<string, [1 | -1, number]>
		)[event.key];
		if (move) {
			event.preventDefault();
			if (!event.repeat) startHold(move[0], move[1], 'key');
			return;
		}
		// Home and End reach the limits; while a draft is open they move the caret as in any text field.
		if (
			!editing &&
			((event.key === 'Home' && Number.isFinite(min)) ||
				(event.key === 'End' && max < Number.MAX_SAFE_INTEGER))
		) {
			event.preventDefault();
			commitValue(event.key === 'Home' ? min : max, 'key');
			return;
		}
		if (event.key === 'Enter') {
			event.preventDefault();
			if (editing) {
				selectNext = true;
				commitDraft();
			} else event.currentTarget.select();
		}
		if (event.key === 'Escape' && editing) {
			event.preventDefault();
			captureShift();
			editing = false;
			clearUnder();
			selectNext = true;
			commitValue(editStart, 'type');
		}
	}
	function onChange(text: string) {
		const allowed = new RegExp(
			`[^0-9${escape(symbols.group)}${decimals || maxFraction ? escape(symbols.decimal) : ''}${min < 0 ? '\\-' : ''}]`,
			'g'
		);
		const next = text.replace(allowed, '');
		if (!editing) editStart = current;
		captureShift();
		draft = next;
		editing = true;
		// Valid drafts apply as they are typed, so anything that depends on the value follows along.
		const parsed = parse(next);
		if (parsed !== null && parsed >= min && parsed <= max && snap(parsed) === parsed)
			commitValue(parsed, 'type');
		// Past the maximum warns at once; under the minimum waits, since "1" is often the start of "12".
		clearUnder();
		if (parsed !== null && parsed < min)
			underTimer = window.setTimeout(() => {
				underWarn = true;
			}, UNDER_WARN_MS);
	}

	function onScrubStart(event: PointerEvent & { currentTarget: HTMLLabelElement }) {
		suppressClick = false;
		if (!scrub || disabled || event.button !== 0) return;
		commitDraft();
		drag = { pointer: event.pointerId, x: event.clientX, from: latest, active: false };
		event.currentTarget.setPointerCapture(event.pointerId);
	}
	function onScrubMove(event: PointerEvent & { currentTarget: HTMLLabelElement }) {
		const state = drag;
		if (!state || state.pointer !== event.pointerId) return;
		const dx = event.clientX - state.x;
		if (!state.active) {
			if (Math.abs(dx) < 3) return;
			state.active = true;
			scrubbing = true;
		}
		const travel = dx / SCRUB_PX,
			steps = Math.trunc(travel);
		commitValue(steps ? stepFrom(state.from, steps) : state.from, 'scrub');
		// Past a limit the value follows the pointer with resistance, then springs back on release.
		const raw = state.from + travel * step;
		const over =
			raw > max ? ((raw - max) / step) * SCRUB_PX : raw < min ? ((raw - min) / step) * SCRUB_PX : 0;
		void scrubX.set(reduced ? 0 : rubber(over), { instant: true });
	}
	function onScrubEnd(event: PointerEvent & { currentTarget: HTMLLabelElement }) {
		const state = drag;
		if (!state || state.pointer !== event.pointerId) return;
		drag = null;
		if (!state.active) return;
		suppressClick = true;
		scrubbing = false;
		void scrubX.set(0, { instant: reduced });
		announcement = spoken(latest);
	}

	const outside = $derived<1 | -1 | 0>(
		typed === null ? 0 : typed > max ? 1 : typed < min && underWarn ? -1 : 0
	);
	const noteEdge = $derived(limitHint ? outside || pushed : 0);
	const noteLimit = $derived(noteEdge > 0 ? max : min);
	const noteText = $derived(
		!noteEdge
			? ''
			: typeof limitHint === 'function'
				? limitHint(noteEdge > 0 ? 'max' : 'min', noteLimit)
				: `${noteEdge > 0 ? 'Max' : 'Min'} ${spoken(noteLimit)}`
	);
	const describedBy = $derived(
		[hintId, outside && limitHint ? limitId : undefined].filter(Boolean).join(' ') || undefined
	);
</script>

<div class={['arc-number-field__field', className]} data-size={size} {@attach cleanup}>
	<div class="arc-number-field__head">
		<!-- The label has a native input association; dragging is an optional pointer shortcut. -->
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
		<label
			for={inputId}
			class="arc-number-field__label"
			data-scrub={(scrub && !disabled) || undefined}
			onpointerdown={onScrubStart}
			onpointermove={onScrubMove}
			onpointerup={onScrubEnd}
			onpointercancel={onScrubEnd}
			onclick={(event) => {
				if (suppressClick) {
					event.preventDefault();
					suppressClick = false;
				}
			}}>{label}</label
		>
		{#each noteEdge ? [noteEdge] : [] as edge (edge)}<span
				id={limitId}
				class="arc-number-field__limit"
				in:swap={reduced
					? { duration: m.duration.instant }
					: {
							y: `${edge * 0.45}em`,
							blur: m.blur.subtle,
							...m.spring.snappy,
							fade: { duration: m.duration.fast }
						}}
				out:swap={{ duration: reduced ? m.duration.instant : m.duration.standard }}>{noteText}</span
			>{/each}
	</div>
	<div
		bind:this={controlRef}
		class="arc-number-field__control"
		data-scrubbing={scrubbing || undefined}
		data-disabled={disabled || undefined}
		data-warn={outside ? (outside > 0 ? 'max' : 'min') : undefined}
	>
		{#each [-1, 0, 1] as toward (toward)}
			{#if toward === 0}
				<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
				<div
					class="arc-number-field__valueWrap"
					onmousedown={(event) => {
						if (event.target !== inputRef) event.preventDefault();
					}}
					onclick={(event) => {
						if (!disabled && event.target !== inputRef) {
							inputRef?.focus();
							inputRef?.select();
						}
					}}
				>
					<span
						bind:this={groupRef}
						class="arc-number-field__value"
						style:transform={`translate(${scrubX.current + shiftX.current}px, ${bumpY.current}px)`}
					>
						<Affix text={affixText(prefix, shown)} {direction} />
						<span class="arc-number-field__number">
							<span
								class="arc-number-field__display"
								data-hidden={editing || undefined}
								aria-hidden="true"
								><Digits value={shown} {format} {direction} instant={editing} /></span
							>
							{#if editing}<span class="arc-number-field__mirror" aria-hidden="true">{draft}</span
								>{/if}
							<input
								bind:this={ref}
								id={inputId}
								class="arc-number-field__input"
								type="text"
								role="spinbutton"
								inputmode={min < 0 ? 'text' : decimals || maxFraction ? 'decimal' : 'numeric'}
								autocomplete="off"
								spellcheck={false}
								value={editing ? draft : format.format(current)}
								{disabled}
								aria-describedby={describedBy}
								aria-invalid={outside ? true : undefined}
								aria-valuenow={current}
								aria-valuetext={spoken(current)}
								aria-valuemin={Number.isFinite(min) ? min : undefined}
								aria-valuemax={max < Number.MAX_SAFE_INTEGER ? max : undefined}
								oninput={(event) => {
									onChange(event.currentTarget.value);
									event.currentTarget.value = draft;
								}}
								onkeydown={onKeyDown}
								onkeyup={(event) => {
									if (/^(Arrow(Up|Down)|Page(Up|Down))$/.test(event.key)) stopHold();
								}}
								onblur={() => {
									stopHold();
									commitDraft();
								}}
							/>
						</span><Affix text={affixText(suffix, shown)} {direction} />
					</span>
				</div>
			{:else}
				<button
					type="button"
					class="arc-number-field__step"
					{disabled}
					aria-controls={inputId}
					aria-label={`${toward > 0 ? 'Increase' : 'Decrease'} ${label}`}
					aria-disabled={(toward > 0 ? shown >= max : shown <= min) || undefined}
					data-pressed={pressed === toward || undefined}
					onpointerdown={(event) => {
						if (event.button === 0) startHold(toward as 1 | -1, step, 'button');
					}}
					onpointerup={stopHold}
					onpointerleave={stopHold}
					onpointercancel={stopHold}
					onmousedown={(event) => event.preventDefault()}
					onclick={(event) => {
						if (event.detail === 0) {
							commitDraft();
							nudge(toward as 1 | -1, 1, 'button');
						}
					}}
					oncontextmenu={(event) => event.preventDefault()}
				>
					{#if toward < 0}<span bind:this={minusIcon} class="arc-number-field__icon"
							><Minus size={16} strokeWidth={1.75} aria-hidden="true" /></span
						>{:else}<span bind:this={plusIcon} class="arc-number-field__icon"
							><Plus size={16} strokeWidth={1.75} aria-hidden="true" /></span
						>{/if}</button
				>
			{/if}{/each}
	</div>
	<Message id={hintId ?? `${inputId}-description`} text={description} class="arc-number-field__hint"
		>{#snippet children()}<Words text={description ?? ''} />{/snippet}</Message
	>
	<span class="arc-number-field__srOnly" aria-live="polite" aria-atomic="true">{announcement}</span>
</div>
