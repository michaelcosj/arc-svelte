<script lang="ts" generics="T extends SliderValue = number">
	import { onDestroy, untrack } from 'svelte';
	import { Slider as Primitive } from 'bits-ui';
	import { Spring, prefersReducedMotion } from 'svelte/motion';
	import {
		motionTokens as m,
		bubblePresence,
		TargetSpring,
		PhysicalSpring,
		type SpringSpec
	} from '#lib/motion';
	import SliderNumber from './SliderNumber.svelte';
	import type { SliderProps, SliderValue, SliderMark } from './types';
	import './slider.css';
	let {
		label,
		value = $bindable(),
		defaultValue,
		onValueChange,
		onValueCommit,
		min = 0,
		max = 100,
		step: stepProp = 1,
		largeStep,
		marks,
		minStepsBetweenThumbs = 0,
		format,
		showValue = true,
		thumbLabels,
		start,
		end,
		name,
		disabled,
		class: className
	}: SliderProps<T> = $props();
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	const labelId = $props.id();
	type Drag = {
		pointer: number;
		index: number | null;
		grab: number;
		x: number;
		raw: number;
		samples: { t: number; p: number }[];
	};

	const STRETCH = 9,
		BUMP_PX = 150,
		SNAP_PX = 12;
	/** iOS style resistance: travel past a limit gives less and less, and never more than `limit` pixels. */
	const rubber = (distance: number, limit = STRETCH) =>
		Math.sign(distance) * (1 - 1 / ((Math.abs(distance) * 0.55) / limit + 1)) * limit;
	/** Where a release is heading, from a scroll-like deceleration (rate .99), in the same units as the velocity. */
	const project = (velocity: number) => velocity * 0.099;
	const decimalsOf = (value: number) => (String(value).split('.')[1] ?? '').length;
	const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
	const isDigit = (char: string) => char >= '0' && char <= '9';

	const step = $derived(stepProp > 0 ? stepProp : 1),
		span = $derived(max - min || 1),
		isRange = $derived(Array.isArray(value ?? defaultValue));
	const toArray = (input: SliderValue | undefined): number[] =>
		input === undefined
			? [min, max].slice(0, isRange ? 2 : 1)
			: Array.isArray(input)
				? [input[0], input[1]]
				: [input];
	let internal = $state(untrack(() => toArray(defaultValue)));
	const values = $derived(value === undefined ? internal : toArray(value));
	const decimals = $derived(Math.max(decimalsOf(step), decimalsOf(min)));
	const formatValue = $derived(
		format ??
			((input: number) =>
				input.toLocaleString('en-US', {
					minimumFractionDigits: decimals,
					maximumFractionDigits: decimals
				}))
	);
	const gap = $derived(isRange ? minStepsBetweenThumbs * step : 0);
	const pct = (input: number) => ((input - min) / span) * 100,
		valueAt = (percent: number) => min + (percent / 100) * span;
	const snap = (input: number) =>
		Number((min + Math.round((input - min) / step) * step).toFixed(decimals));
	const lowOf = (index: number, current: number[]) => (index === 1 ? current[0]! + gap : min);
	const highOf = (index: number, current: number[]) =>
		index === 0 && isRange ? current[1]! - gap : max;
	const settle = (index: number, input: number, current: number[]) =>
		clamp(snap(clamp(input, min, max)), lowOf(index, current), highOf(index, current));
	class Position {
		motion: Spring<number>;
		released: PhysicalSpring;
		settling = $state(false);
		target: number;
		previous = 0;
		time = 0;
		velocity = 0;
		constructor(value: number) {
			this.motion = new Spring(value, { ...m.physics.snappy, precision: 0.00002 });
			this.released = new PhysicalSpring(value, m.specs.snappy, { delta: 0.002, speed: 0.02 });
			this.target = value;
			$effect(() => {
				const current = this.get();
				untrack(() => {
					if (current !== this.previous) this.sample(current);
				});
			});
		}
		get() {
			return this.settling ? this.released.current : this.motion.current;
		}
		sample(value: number) {
			const now = performance.now();
			this.velocity = now > this.time ? ((value - this.previous) / (now - this.time)) * 1000 : 0;
			this.previous = value;
			this.time = now;
		}
		set(value: number) {
			this.sample(value);
			this.settling = false;
			this.released.destroy();
			this.target = value;
			void this.motion.set(value, { instant: true });
		}
		jump(value: number) {
			this.set(value);
			this.velocity = 0;
		}
		chase(value: number) {
			this.target = value;
			const velocity = this.settling ? this.released.frameVelocity() : 0;
			if (!this.settling) this.released.jump(this.get());
			this.released.set(value, { velocity });
			this.settling = true;
		}
		release(value: number, velocity: number, spec: SpringSpec = m.specs.snappy) {
			const from = this.get();
			this.jump(from);
			this.target = value;
			this.released.jump(from);
			this.released.set(value, { velocity, spec });
			this.settling = true;
		}
		getVelocity() {
			return performance.now() - this.time < 60 ? this.velocity : 0;
		}
	}
	const thumbs = untrack(() =>
		[0, 1].map((i) => ({
			pos: new Position(pct(values[i] ?? values[0]!)),
			lag: new Position(0),
			scale: new TargetSpring(1, m.specs.snappy)
		}))
	);
	onDestroy(() =>
		thumbs.forEach((thumb) => {
			thumb.pos.jump(thumb.pos.get());
			thumb.lag.jump(thumb.lag.get());
		})
	);
	const shown = (index: number) => thumbs[index]!.pos.get() + thumbs[index]!.lag.get();
	const clipPath = $derived(
		`inset(0 ${(100 - clamp(shown(isRange ? 1 : 0), 0, 100)).toFixed(3)}% 0 ${(isRange ? clamp(shown(0), 0, 100) : 0).toFixed(3)}% round 999px)`
	);
	let trackRef = $state<HTMLDivElement | null>(null),
		thumbsRef = $state<HTMLDivElement | null>(null);
	let latest = untrack(() => values),
		goal = untrack(() => values.map(pct)),
		drag: Drag | null = null,
		pointerFocus = false,
		lingerTimer: number | undefined;
	let dragging = $state<number | null>(null),
		keyFocus = $state<number | null>(null),
		linger = $state<number | null>(null),
		lastActive = $state(untrack(() => (isRange ? 1 : 0))),
		quiet = $state<number | null>(null);
	$effect(() => {
		const active = dragging,
			cut = reduced;
		untrack(() =>
			thumbs.forEach(
				(thumb, index) => void thumb.scale.set(active === index ? 1.16 : 1, { instant: cut })
			)
		);
	});
	const emit = (next: number[]) => (isRange ? [next[0], next[1]] : next[0]) as T;
	function commit(index: number, next: number) {
		const current = latest;
		if (current[index] === next) return;
		const updated = current.map((item, at) => (at === index ? next : item));
		latest = updated;
		if (value === undefined) internal = updated;
		else if (!onValueChange) value = emit(updated);
		onValueChange?.(emit(updated));
		queueMicrotask(() => {
			if (!drag) reconcile();
		});
	}
	function reconcile() {
		latest = values;
		values.forEach((item, index) => {
			const target = pct(item),
				thumb = thumbs[index]!;
			if (
				drag?.index === index ||
				(goal[index] === target &&
					Math.abs(thumb.pos.target - target) < 0.001 &&
					!(reduced && thumb.pos.settling))
			)
				return;
			goal[index] = target;
			const from = shown(index);
			thumb.lag.jump(0);
			thumb.pos.jump(from);
			if (reduced) thumb.pos.jump(target);
			else thumb.pos.chase(target);
		});
	}
	$effect(() => {
		void values;
		void min;
		void max;
		void reduced;
		untrack(reconcile);
	});
	$effect(() => () => {
		clearTimeout(lingerTimer);
		thumbs.forEach((t) => {
			t.pos.jump(t.pos.get());
			t.lag.jump(0);
		});
	});
	function kick(index: number, toward: number) {
		const thumb = thumbs[index]!;
		thumb.pos.release(goal[index]!, ((toward * BUMP_PX) / trackWidth()) * 100, m.specs.morph);
	}
	let bitsKey = false;
	function delegateKey(handler: unknown, event: KeyboardEvent) {
		bitsKey = true;
		try {
			if (typeof handler === 'function') handler(event);
		} finally {
			bitsKey = false;
		}
	}

	function bitsChange(next: number[]) {
		if (!bitsKey) return;
		const index = next.findIndex((v, i) => v !== values[i]);
		if (index >= 0) {
			const bounded = settle(index, next[index]!, values);
			commit(index, bounded);
			onValueCommit?.(emit(latest));
		}
	}
	const thumbNode = (index: number) =>
		thumbsRef?.querySelector<HTMLElement>(`[data-index="${index}"]`);
	/** Focus that follows a pointer keeps the thumb quiet: no ring and no bubble until a key is pressed. */
	function focusFromPointer(index: number) {
		const node = thumbNode(index);
		if (!node || document.activeElement === node) return;
		quiet = index;
		pointerFocus = true;
		node.focus({ preventScroll: true });
		pointerFocus = false;
	}
	const trackWidth = () => trackRef?.getBoundingClientRect().width || 1;
	function nearest(at: number, current: number[]) {
		if (!isRange) return 0;
		const low = Math.abs(at - pct(current[0]!)),
			high = Math.abs(at - pct(current[1]!));
		return low === high ? (at < pct(current[0]!) ? 0 : 1) : low < high ? 0 : 1;
	}
	function holdBubble(index: number) {
		window.clearTimeout(lingerTimer);
		linger = index;
		lingerTimer = window.setTimeout(() => (linger = null), 700);
	}

	/** Starts tracking one thumb. A press on the track springs the thumb over from where it was; a grabbed thumb keeps its grab offset. */
	function begin(state: Drag, index: number, at: number, press: boolean) {
		const thumb = thumbs[index]!;
		const from = thumb.pos.get() + thumb.lag.get();
		state.index = index;
		state.grab = press ? 0 : at - from;
		thumb.lag.jump(0);
		thumb.pos.jump(from);
		dragging = index;
		lastActive = index;
		window.clearTimeout(lingerTimer);
		linger = null;
		focusFromPointer(index);
		if (press) follow(state, at, 0, true);
	}
	/** Places the dragged thumb under the pointer, with resistance past its limits, and commits the stepped value beneath it. */
	function follow(state: Drag, at: number, time: number, press = false) {
		const index = state.index;
		if (index === null) return;
		const thumb = thumbs[index]!,
			current = latest,
			width = trackWidth();
		const raw = at - state.grab;
		const low = pct(lowOf(index, current)),
			high = pct(highOf(index, current));
		const edge = clamp(raw, low, high);
		const placed = reduced ? edge : edge + (rubber(((raw - edge) / 100) * width) / width) * 100;
		if (press && !reduced) {
			const from = thumb.pos.get();
			thumb.pos.jump(placed);
			thumb.lag.jump(from - placed);
			// The pointer keeps moving pos, but this catch-up offset has one fixed target.
			thumb.lag.release(0, 0);
		} else thumb.pos.set(placed);
		state.raw = raw;
		state.samples.push({ t: time, p: placed });
		if (state.samples.length > 6) state.samples.shift();
		commit(index, settle(index, valueAt(raw), current));
	}

	function onPointerDown(event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }) {
		if (disabled || event.button !== 0 || !event.isPrimary) return;
		event.stopPropagation();
		const rect = trackRef?.getBoundingClientRect();
		if (!rect) return;
		const at = ((event.clientX - rect.left) / (rect.width || 1)) * 100;
		const grabbed = (event.target as HTMLElement).closest<HTMLElement>('[data-thumb]');
		const current = latest;
		event.currentTarget.setPointerCapture(event.pointerId);
		const state: Drag = {
			pointer: event.pointerId,
			index: null,
			grab: 0,
			x: event.clientX,
			raw: at,
			samples: []
		};
		drag = state;
		// Stacked range thumbs wait for the first movement to decide which one the pointer means.
		if (grabbed && isRange && current[0] === current[1]) {
			focusFromPointer(Number(grabbed.dataset.index));
			return;
		}
		begin(state, grabbed ? Number(grabbed.dataset.index) : nearest(at, current), at, !grabbed);
		state.samples = [{ t: event.timeStamp, p: thumbs[state.index ?? 0]!.pos.get() }];
	}
	function onPointerMove(event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }) {
		const state = drag;
		if (!state || state.pointer !== event.pointerId) return;
		event.stopPropagation();
		const rect = trackRef?.getBoundingClientRect();
		if (!rect) return;
		const at = ((event.clientX - rect.left) / (rect.width || 1)) * 100;
		if (state.index === null) {
			const dx = event.clientX - state.x;
			if (Math.abs(dx) < 2) return;
			begin(state, dx < 0 ? 0 : 1, at - (dx / (rect.width || 1)) * 100, false);
		}
		follow(state, at, event.timeStamp);
	}
	function onPointerEnd(event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }) {
		const state = drag;
		if (!state || state.pointer !== event.pointerId) return;
		event.stopPropagation();
		drag = null;
		const index = state.index;
		if (index === null) return;
		const thumb = thumbs[index]!,
			current = latest,
			width = trackWidth();
		// Velocity from the last few frames, in percent per second; a pointer that paused before letting go carries none.
		const samples = state.samples,
			first = samples[0],
			last = samples[samples.length - 1];
		const elapsed = last && first ? (last.t - first.t) / 1000 : 0;
		// A release during the catch-up spring keeps that spring's speed too.
		const velocity =
			(last && first && elapsed > 0.008 && event.timeStamp - last.t < 60
				? (last.p - first.p) / elapsed
				: 0) + thumb.lag.getVelocity();
		// On a coarse grid the release momentum may carry the thumb one step further, never more.
		const stepPct = (step / span) * 100;
		const carry =
			event.type === 'pointerup' && (stepPct / 100) * width >= SNAP_PX
				? clamp(project(velocity), -stepPct, stepPct)
				: 0;
		const next = settle(index, valueAt(state.raw + carry), current);
		const from = thumb.pos.get() + thumb.lag.get(),
			target = pct(next);
		thumb.lag.jump(0);
		thumb.pos.jump(from);
		goal[index] = target;
		if (reduced) thumb.pos.jump(target);
		else thumb.pos.release(target, velocity);
		commit(index, next);
		dragging = null;
		holdBubble(index);
		onValueCommit?.(emit(latest));
		queueMicrotask(reconcile);
	}

	function onKeyDown(index: number, event: KeyboardEvent) {
		if (disabled) return;
		const current = latest,
			now = current[index]!;
		const large = largeStep ?? Math.max(step, snap(min + span / 10) - min);
		const moves: Record<string, number> = {
			ArrowRight: step,
			ArrowUp: step,
			ArrowLeft: -step,
			ArrowDown: -step,
			PageUp: large,
			PageDown: -large
		};
		let wanted: number;
		if (event.key === 'Home') wanted = lowOf(index, current);
		else if (event.key === 'End') wanted = highOf(index, current);
		else if (event.key in moves)
			wanted =
				now +
				(event.shiftKey && event.key.startsWith('Arrow')
					? Math.sign(moves[event.key]!) * large
					: moves[event.key]!);
		else return;
		event.preventDefault();
		keyFocus = index;
		quiet = null;
		lastActive = index;
		const next = settle(index, wanted, current);
		// At a limit the thumb strains toward the press and springs home, so the key still answers.
		if (next === now) {
			const toward = Math.sign(wanted - now);
			if (toward && !reduced) kick(index, toward);
			return;
		}
		commit(index, next);
		onValueCommit?.(emit(latest));
	}

	function jumpTo(target: number) {
		if (disabled) return;
		const current = latest,
			index = nearest(pct(target), current);
		const next = settle(index, target, current);
		lastActive = index;
		focusFromPointer(index);
		if (next === current[index]) return;
		commit(index, next);
		onValueCommit?.(emit(latest));
	}

	const markList = $derived(
		(marks ?? [])
			.map((mark) => (typeof mark === 'number' ? ({ value: mark } as SliderMark) : mark))
			.filter((mark) => mark.value >= min && mark.value <= max)
	);
	const ticks = $derived(markList.filter((mark) => mark.value > min && mark.value < max)),
		labelled = $derived(markList.filter((mark) => mark.label));
	const inRange = (mark: number) =>
		isRange ? mark >= values[0]! && mark <= values[1]! : mark <= values[0]!;
	const names = $derived(thumbLabels ?? [`${label}, minimum`, `${label}, maximum`]);
</script>

<Primitive.Root
	type="multiple"
	value={values}
	onValueChange={bitsChange}
	{min}
	{max}
	{step}
	{disabled}
	autoSort={false}
	thumbPositioning="exact"
>
	{#snippet child({ props: rootProps })}
		<div
			{...rootProps}
			class={['arc-slider__root', className]}
			onpointerdown={(e) => e.stopPropagation()}
			data-disabled={disabled || undefined}
			data-dragging={dragging !== null || undefined}
			data-marks={labelled.length > 0 || undefined}
		>
			<div class="arc-slider__header">
				<span id={labelId} class="arc-slider__label">{label}</span>{#if showValue}<span
						class="arc-slider__readout"
						aria-hidden="true"
						><SliderNumber value={values[0]!} text={formatValue(values[0]!)} />{#if isRange}<span
								class="arc-slider__dash">–</span
							><SliderNumber value={values[1]!} text={formatValue(values[1]!)} />{/if}</span
					>{/if}
			</div>
			<div class="arc-slider__body">
				{#if start}<div class="arc-slider__start">{@render start()}</div>{/if}
				<!-- svelte-ignore a11y_no_static_element_interactions (pointer track complements the keyboard-accessible Bits thumbs) -->
				<div
					class="arc-slider__control"
					onpointerdown={onPointerDown}
					onpointermove={onPointerMove}
					onpointerup={onPointerEnd}
					onpointercancel={onPointerEnd}
					onlostpointercapture={onPointerEnd}
					onmousedown={(e) => e.preventDefault()}
				>
					<div bind:this={trackRef} class="arc-slider__track">
						{#each ticks as mark}<span class="arc-slider__tick" style:left={`${pct(mark.value)}%`}
							></span>{/each}
						<div class="arc-slider__fill" style:clip-path={clipPath}>
							{#each ticks as mark}<span class="arc-slider__tick" style:left={`${pct(mark.value)}%`}
								></span>{/each}
						</div>
					</div>
					<div bind:this={thumbsRef} class="arc-slider__thumbs">
						{#each values as item, index}
							<div
								class="arc-slider__thumbLayer"
								style:transform={`translateX(${shown(index) - 100}%)`}
								style:z-index={lastActive === index ? 2 : 1}
							>
								<Primitive.Thumb {index}>
									{#snippet child({ props: thumbProps })}
										<!-- The layer owns position; replace Bits UI's inline thumb geometry. -->
										<div
											{...thumbProps}
											data-thumb=""
											data-index={index}
											data-active={dragging === index || undefined}
											data-quiet={quiet === index || undefined}
											class="arc-slider__thumb"
											style={`transform:scale(${thumbs[index]!.scale.current})`}
											aria-label={isRange ? names[index] : undefined}
											aria-labelledby={isRange ? undefined : labelId}
											aria-valuemin={lowOf(index, values)}
											aria-valuemax={highOf(index, values)}
											aria-valuenow={item}
											aria-valuetext={formatValue(item)}
											aria-disabled={disabled || undefined}
											onkeydown={(e) => {
												if (disabled) return;
												keyFocus = index;
												quiet = null;
												lastActive = index;
												if (
													[
														'ArrowLeft',
														'ArrowRight',
														'ArrowUp',
														'ArrowDown',
														'Home',
														'End'
													].includes(e.key) &&
													!e.shiftKey
												) {
													const wanted =
														e.key === 'Home'
															? min
															: e.key === 'End'
																? max
																: item +
																	(['ArrowLeft', 'ArrowDown'].includes(e.key) ? -step : step);
													if (settle(index, wanted, values) !== item)
														delegateKey(thumbProps.onkeydown, e);
													else onKeyDown(index, e);
												} else onKeyDown(index, e);
											}}
											onfocus={(e) => {
												if (!pointerFocus && e.currentTarget.matches(':focus-visible'))
													keyFocus = index;
											}}
											onblur={() => {
												if (keyFocus === index) keyFocus = null;
												if (quiet === index) quiet = null;
											}}
										></div>
									{/snippet}</Primitive.Thumb
								>
								<span class="arc-slider__bubbleAnchor" style={`--at:${shown(index)}`}>
									{#if dragging === index || keyFocus === index || linger === index}<span
											class="arc-slider__bubble"
											aria-hidden="true"
											in:bubblePresence={{ reduced }}
											out:bubblePresence={{ reduced }}
											><SliderNumber value={item} text={formatValue(item)} /></span
										>{/if}</span
								>
							</div>
						{/each}
					</div>
				</div>
				{#if end}<div class="arc-slider__end">{@render end()}</div>{/if}
				{#if labelled.length > 0}<div class="arc-slider__marks" aria-hidden="true">
						{#each labelled as mark}<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (decorative marks supplement keyboard-operable thumbs) --><span
								class="arc-slider__markLabel"
								data-on={inRange(mark.value) || undefined}
								data-edge={mark.value === min ? 'start' : mark.value === max ? 'end' : undefined}
								style:left={`${pct(mark.value)}%`}
								onclick={() => jumpTo(mark.value)}>{mark.label}</span
							>{/each}
					</div>{/if}
			</div>
			{#if name}{#each values as item}<input
						type="hidden"
						{name}
						value={item}
						{disabled}
					/>{/each}{/if}
		</div>{/snippet}
</Primitive.Root>
