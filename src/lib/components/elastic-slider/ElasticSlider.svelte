<script lang="ts">
	import { Slider } from 'bits-ui';
	import { onDestroy, untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import {
		cssEasing,
		motionTokens as m,
		springPhysics,
		bubblePresence,
		PhysicalSpring,
		TargetSpring,
		FollowSpring
	} from '#lib/motion';
	import type { ElasticSliderProps } from './types';
	import './elastic-slider.css';

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
		format,
		showValue = true,
		startIcon,
		endIcon,
		name,
		disabled = false,
		class: className,
		ref = $bindable(null)
	}: ElasticSliderProps = $props();

	const labelId = $props.id();
	const reduced = $derived(prefersReducedMotion.current);
	const step = $derived(stepProp > 0 ? stepProp : 1);
	const span = $derived(max - min || 1);
	const decimals = $derived(Math.max(decimalsOf(step), decimalsOf(min)));
	const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n));
	function decimalsOf(n: number) {
		return (String(n).split('.')[1] ?? '').length;
	}
	let internal = $state(untrack(() => clamp(defaultValue ?? min, min, max)));
	const current = $derived(clamp(value === undefined ? internal : value, min, max));
	const text = $derived(
		format
			? format(current)
			: current.toLocaleString('en-US', {
					minimumFractionDigits: decimals,
					maximumFractionDigits: decimals
				})
	);
	const markList = $derived(
		(marks ?? [])
			.map((mark) => (typeof mark === 'number' ? { value: mark } : mark))
			.filter((mark) => mark.value >= min && mark.value <= max)
	);
	const labelled = $derived(markList.filter((mark) => mark.label));
	const pct = (n: number) => ((n - min) / span) * 100;
	const valueAt = (p: number) => min + (p / 100) * span;
	const snap = (n: number) =>
		clamp(Number((min + Math.round((n - min) / step) * step).toFixed(decimals)), min, max);

	let rail = $state<HTMLDivElement>();
	let thumb = $state<HTMLDivElement | null>(null);
	let width = $state(1);
	let dragging = $state(false);
	let keyed = $state(false);
	let linger = $state(false);
	const bubble = $derived(dragging || keyed || linger);
	let lingerTimer: ReturnType<typeof setTimeout>;
	let emission = $state(0);
	let latest = untrack(() => current);
	let goal = untrack(() => pct(current));
	type Drag = {
		pointer: number;
		grab: number;
		detent: number | null;
		edge: number;
		type: string;
		samples: { t: number; p: number }[];
	};
	let drag: Drag | null = null;
	const thumbSpec = springPhysics(m.specs.snappy);
	const stretchSpec = springPhysics({ visualDuration: 0.5, bounce: 0.42 });
	const pos = new TargetSpring(
		untrack(() => pct(current)),
		thumbSpec,
		{ delta: 0.002, speed: 0.02 }
	);
	const lag = new TargetSpring(0, thumbSpec, { delta: 0.002, speed: 0.02 });
	const over = new TargetSpring(0, stretchSpec, { delta: 0.05, speed: 0.5 });
	const press = new TargetSpring(0, m.specs.snappy);
	// Pointer writes jump directly; fixed flights and detent catch-up share the source physical solver.
	const released = new PhysicalSpring(
		untrack(() => pct(current)),
		m.specs.snappy,
		{ delta: 0.002, speed: 0.02 }
	);
	const releasedOver = new PhysicalSpring(
		0,
		{ visualDuration: 0.5, bounce: 0.42 },
		{ delta: 0.05, speed: 0.5 }
	);
	let settling = $state(false),
		stretching = $state(false);
	const position = $derived(settling ? released.current : pos.current);
	const stretch = $derived(stretching ? releasedOver.current : over.current);
	const shown = $derived(position + lag.current);
	let lagSample = { p: 0, t: 0, v: 0 },
		overSample = { p: 0, t: 0, v: 0 };
	$effect(() => {
		const p = lag.current;
		untrack(() => {
			const t = performance.now();
			lagSample = {
				p,
				t,
				v:
					lagSample.t && t > lagSample.t
						? ((p - lagSample.p) * 1000) / Math.min(t - lagSample.t, 30)
						: 0
			};
		});
	});
	$effect(() => {
		const p = over.current;
		untrack(() => {
			const t = performance.now();
			overSample = {
				p,
				t,
				v:
					overSample.t && t > overSample.t
						? ((p - overSample.p) * 1000) / Math.min(t - overSample.t, 30)
						: 0
			};
		});
	});
	onDestroy(() => {
		released.destroy();
		releasedOver.destroy();
	});
	const trailed = new FollowSpring(
		untrack(() => pct(current)),
		{ stiffness: 420, damping: 30, mass: 0.7 }
	);
	$effect(() => {
		const at = shown;
		untrack(() => trailed.set(at));
	});
	const bubbleAt = $derived(reduced ? shown : trailed.current);
	let rotation = $state(0);
	let lastTrail = untrack(() => ({ p: trailed.current, t: 0 }));
	$effect(() => {
		const p = trailed.current;
		untrack(() => {
			const t = performance.now();
			const velocity =
				lastTrail.t && t > lastTrail.t ? ((p - lastTrail.p) * 1000) / (t - lastTrail.t) : 0;
			rotation = reduced ? 0 : clamp((-velocity / 100) * width * 0.009, -11, 11);
			lastTrail = { p, t };
		});
	});

	function move(spring: TargetSpring, target: number, instant = reduced) {
		void spring.set(target, { instant });
	}
	function emit(next: number) {
		if (latest === next) return;
		latest = next;
		emission++;
		if (value === undefined) internal = next;
		else if (!onValueChange) value = next;
		onValueChange?.(next);
	}
	$effect.pre(() => {
		// Reconcile even when a controlled parent declines an emitted value.
		void emission;
		void dragging;
		const next = current,
			target = pct(next);
		untrack(() => {
			latest = next;
			if (drag || goal === target) return;
			goal = target;
			const from = shown;
			settling = false;
			released.destroy();
			move(lag, 0, true);
			move(pos, from, true);
			move(pos, target);
		});
	});
	$effect(() => {
		const node = rail;
		if (!node) return;
		const observer = new ResizeObserver(([entry]) => {
			width = entry?.contentRect.width || 1;
		});
		observer.observe(node);
		return () => observer.disconnect();
	});
	onDestroy(() => clearTimeout(lingerTimer));
	$effect(() => {
		if (reduced)
			untrack(() => {
				const target = settling ? goal : pos.target;
				settling = false;
				stretching = false;
				released.destroy();
				releasedOver.destroy();
				move(pos, target, true);
				move(lag, 0, true);
				move(over, 0, true);
				move(press, dragging ? 1 : 0, true);
			});
	});

	function pulse(mark: number, haptic: boolean) {
		const node = rail?.querySelector<HTMLElement>(`[data-mark="${mark}"]`);
		if (node && !reduced)
			node.animate([{ scale: '1' }, { scale: '2.1' }, { scale: '1' }], {
				duration: 340,
				easing: cssEasing(m.ease.enter)
			});
		if (haptic && typeof navigator.vibrate === 'function') navigator.vibrate(6);
	}
	function glide(placed: number) {
		const from = pos.current + lag.current;
		move(pos, placed, true);
		move(lag, reduced ? 0 : from - placed, true);
		move(lag, 0);
	}
	function detentAt(percent: number) {
		let best: number | null = null,
			gap = 8;
		for (const mark of markList) {
			const distance = Math.abs(((percent - pct(mark.value)) / 100) * width);
			if (distance <= 7 && distance < gap) {
				best = mark.value;
				gap = distance;
			}
		}
		return best;
	}
	function follow(state: Drag, at: number, time: number, first = false) {
		const raw = at - state.grab,
			edge = clamp(raw, 0, 100);
		const distance = ((raw - edge) / 100) * width;
		move(
			over,
			reduced ? 0 : Math.sign(distance) * (1 - 1 / ((Math.abs(distance) * 0.55) / 26 + 1)) * 26,
			true
		);
		const detent = detentAt(edge),
			placed = detent === null ? edge : pct(detent);
		if (first || detent !== state.detent) {
			if (detent !== null && !first) pulse(detent, state.type === 'touch');
			glide(placed);
		} else move(pos, placed, true);
		state.detent = detent;
		state.edge = edge;
		state.samples.push({ t: time, p: placed });
		if (state.samples.length > 6) state.samples.shift();
		emit(detent ?? snap(valueAt(edge)));
	}
	function pointerDown(event: PointerEvent & { currentTarget: HTMLDivElement }) {
		if (disabled || event.button !== 0 || !event.isPrimary || drag) return;
		const rect = rail?.getBoundingClientRect();
		if (!rect) return;
		width = rect.width || 1;
		const at = ((event.clientX - rect.left) / width) * 100;
		const grabbed = event.target instanceof Element && !!event.target.closest('[data-thumb]');
		event.currentTarget.setPointerCapture(event.pointerId);
		const from = shown;
		settling = false;
		stretching = false;
		released.destroy();
		releasedOver.destroy();
		move(lag, 0, true);
		move(pos, from, true);
		const state: Drag = {
			pointer: event.pointerId,
			grab: grabbed ? at - from : 0,
			detent: null,
			edge: from,
			type: event.pointerType,
			samples: []
		};
		drag = state;
		dragging = true;
		clearTimeout(lingerTimer);
		linger = false;
		thumb?.focus({ preventScroll: true });
		move(press, 1);
		follow(state, grabbed ? from + state.grab : at, event.timeStamp, true);
	}
	function pointerMove(event: PointerEvent) {
		if (!drag || drag.pointer !== event.pointerId) return;
		const rect = rail?.getBoundingClientRect();
		if (rect)
			follow(drag, ((event.clientX - rect.left) / (rect.width || 1)) * 100, event.timeStamp);
	}
	function pointerEnd(event: PointerEvent) {
		if (!drag || drag.pointer !== event.pointerId) return;
		const state = drag;
		const first = state.samples[0],
			last = state.samples.at(-1);
		const elapsed = first && last ? (last.t - first.t) / 1000 : 0;
		const velocity =
			(elapsed > 0.008 && event.timeStamp - last!.t < 60 ? (last!.p - first!.p) / elapsed : 0) +
			(performance.now() - lagSample.t <= 30 ? lagSample.v : 0);
		const next = state.detent ?? snap(valueAt(state.edge));
		drag = null;
		const from = shown,
			stretchFrom = stretch;
		move(lag, 0, true);
		move(pos, from, true);
		goal = pct(next);
		if (reduced) {
			move(pos, goal, true);
			move(over, 0, true);
			settling = false;
			stretching = false;
		} else {
			released.jump(from);
			released.set(goal, { velocity });
			settling = true;
			releasedOver.jump(stretchFrom);
			releasedOver.set(0, { velocity: performance.now() - overSample.t <= 30 ? overSample.v : 0 });
			stretching = true;
		}
		move(press, 0);
		emit(next);
		dragging = false;
		linger = true;
		lingerTimer = setTimeout(() => {
			linger = false;
		}, 700);
		onValueCommit?.(next);
	}
	function keyDown(event: KeyboardEvent) {
		if (disabled) return;
		const now = latest,
			large = largeStep ?? Math.max(step, snap(min + span / 10) - min);
		const moves: Record<string, number> = {
			ArrowRight: step,
			ArrowUp: step,
			ArrowLeft: -step,
			ArrowDown: -step,
			PageUp: large,
			PageDown: -large
		};
		let wanted: number;
		if (event.key === 'Home') wanted = min;
		else if (event.key === 'End') wanted = max;
		else if (event.key in moves)
			wanted =
				now +
				(event.shiftKey && event.key.startsWith('Arrow')
					? Math.sign(moves[event.key]) * large
					: moves[event.key]);
		else return;
		event.preventDefault();
		keyed = true;
		const next = snap(wanted);
		if (next === now) {
			if (wanted !== now && !reduced) {
				releasedOver.jump(stretch);
				releasedOver.set(0, { velocity: Math.sign(wanted - now) * 260 });
				stretching = true;
			}
			return;
		}
		emit(next);
		if (markList.some((mark) => mark.value === next)) pulse(next, false);
		onValueCommit?.(next);
	}
	function selectMark(next: number) {
		if (disabled || next === latest) return;
		emit(next);
		pulse(next, false);
		onValueCommit?.(next);
	}
</script>

<div
	bind:this={ref}
	class={['arc-elastic-slider__root', className]}
	data-disabled={disabled || undefined}
	data-dragging={dragging || undefined}
	data-tag={bubble || undefined}
	data-marks={labelled.length > 0 || undefined}
>
	<div class="arc-elastic-slider__header">
		<span id={labelId} class="arc-elastic-slider__label">{label}</span>
		{#if showValue}<span class="arc-elastic-slider__readout" aria-hidden="true">{text}</span>{/if}
	</div>
	<div class="arc-elastic-slider__body">
		{#if startIcon}<span
				class="arc-elastic-slider__start"
				style:transform={`translateX(${Math.min(0, stretch)}px)`}
				aria-hidden="true">{@render startIcon()}</span
			>{/if}
		<Slider.Root type="single" value={current} {min} {max} step={[min, current, max]} {disabled}>
			{#snippet child({ props })}
				<!-- Bits owns slider semantics; source-specific gestures replace its stock pointer geometry. -->
				<div
					{...props}
					class="arc-elastic-slider__control"
					onpointerdowncapture={(event) => {
						event.stopPropagation();
						pointerDown(event);
					}}
					onpointermove={pointerMove}
					onpointerup={pointerEnd}
					onpointercancel={pointerEnd}
					onlostpointercapture={pointerEnd}
					onmousedown={(event) => event.preventDefault()}
				>
					<div bind:this={rail} class="arc-elastic-slider__rail">
						<div
							class="arc-elastic-slider__track"
							style:transform={`scaleX(${1 + Math.abs(stretch) / width}) scaleY(${(1 + press.current * 0.45) * (1 - (Math.abs(stretch) / 26) * 0.32)})`}
							style:transform-origin={stretch < 0 ? '100% 50%' : '0% 50%'}
						>
							<div
								class="arc-elastic-slider__fill"
								style:clip-path={`inset(0 ${(100 - clamp(shown, 0, 100)).toFixed(3)}% 0 0 round 999px)`}
							></div>
						</div>
						{#each markList.filter((mark) => mark.value > min && mark.value < max) as mark (mark.value)}
							<span
								class="arc-elastic-slider__tick"
								data-mark={mark.value}
								data-on={mark.value <= current || undefined}
								style:left={`${pct(mark.value)}%`}
							></span>
						{/each}
					</div>
					<div class="arc-elastic-slider__thumbs">
						<div
							class="arc-elastic-slider__layer"
							style:transform={`translateX(${bubbleAt - 100}%)`}
						>
							<span
								class="arc-elastic-slider__bubbleAnchor"
								style:transform={`translateX(${stretch}px)`}
								style={`--at:${bubbleAt}`}
							>
								{#if bubble}<span
										class="arc-elastic-slider__bubble"
										aria-hidden="true"
										style:rotate={`${rotation}deg`}
										in:bubblePresence={{ reduced, elastic: true }}
										out:bubblePresence={{ reduced, elastic: true }}>{text}</span
									>{/if}
							</span>
						</div>
						<div class="arc-elastic-slider__layer" style:transform={`translateX(${shown - 100}%)`}>
							<div class="arc-elastic-slider__shift" style:transform={`translateX(${stretch}px)`}>
								<Slider.Thumb
									index={0}
									bind:ref={thumb}
									aria-labelledby={labelId}
									aria-valuetext={text}
								>
									{#snippet child({ props: thumbProps })}
										<div
											{...thumbProps}
											class="arc-elastic-slider__thumb"
											style={`transform:scale(${1 + press.current * 0.28});`}
											data-thumb=""
											aria-disabled={disabled || undefined}
											onkeydown={keyDown}
											onblur={() => {
												keyed = false;
											}}
										></div>
									{/snippet}
								</Slider.Thumb>
							</div>
						</div>
					</div>
				</div>
			{/snippet}
		</Slider.Root>
		{#if endIcon}<span
				class="arc-elastic-slider__end"
				style:transform={`translateX(${Math.max(0, stretch)}px)`}
				aria-hidden="true">{@render endIcon()}</span
			>{/if}
		{#if labelled.length > 0}<div class="arc-elastic-slider__marks" aria-hidden="true">
				{#each labelled as mark (mark.value)}
					<span
						aria-hidden="true"
						class="arc-elastic-slider__markLabel"
						data-on={mark.value === current || undefined}
						data-edge={mark.value === min ? 'start' : mark.value === max ? 'end' : undefined}
						style:left={`${pct(mark.value)}%`}
						onclick={() => selectMark(mark.value)}>{mark.label}</span
					>
				{/each}
			</div>{/if}
	</div>
	{#if name}<input type="hidden" {name} value={current} {disabled} />{/if}
</div>
