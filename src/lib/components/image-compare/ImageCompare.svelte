<script lang="ts">
	import { untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { motionTokens as m, PhysicalSpring, PointerVelocity } from '#lib/motion';
	import { clamp, comparisonGeometry, rubber } from './geometry';
	import type { CompareDrag, CompareMetrics, ImageCompareProps } from './types';
	import './image-compare.css';

	let {
		before,
		after,
		position = $bindable(),
		defaultPosition = 50,
		onPositionChange,
		orientation = 'horizontal',
		labels = ['Before', 'After'],
		label = 'Before and after',
		aspectRatio = '3 / 2',
		class: className
	}: ImageCompareProps = $props();
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	const vertical = $derived(orientation === 'vertical');
	let internal = $state(untrack(() => defaultPosition));
	const current = $derived(clamp(position ?? internal, 0, 100));
	let root = $state<HTMLDivElement>(),
		handle = $state<HTMLDivElement>();
	let beforeChip = $state<HTMLSpanElement>(),
		afterChip = $state<HTMLSpanElement>();
	let metrics = $state<CompareMetrics>({ w: 0, h: 0, bw: 0, bh: 0, aw: 0, ah: 0 });
	let dragging = $state(false),
		quiet = $state(false);
	let latest = untrack(() => current),
		goal = latest;
	let drag: CompareDrag | null = null;
	let pressedHandle = false;
	let velocity = new PointerVelocity(latest, 0);
	const pos = new PhysicalSpring(latest, m.specs.snappy),
		lag = new PhysicalSpring(0, m.specs.snappy);
	const theta = new PhysicalSpring(
		untrack(() => (vertical ? 90 : 0)),
		m.specs.morph
	);
	const geometry = $derived(comparisonGeometry(pos.current + lag.current, theta.current, metrics));

	$effect(() => {
		const nodes = [root, beforeChip, afterChip];
		const measure = () => {
			if (root)
				metrics = {
					w: root.clientWidth,
					h: root.clientHeight,
					bw: beforeChip?.offsetWidth ?? 0,
					bh: beforeChip?.offsetHeight ?? 0,
					aw: afterChip?.offsetWidth ?? 0,
					ah: afterChip?.offsetHeight ?? 0
				};
		};
		const observer = new ResizeObserver(measure);
		nodes.forEach((node) => {
			if (node) observer.observe(node);
		});
		measure();
		return () => observer.disconnect();
	});
	$effect(() => {
		const target = vertical ? 90 : 0;
		const snap = reduced;
		untrack(() => {
			if (snap) theta.jump(target);
			else theta.set(target);
		});
	});
	$effect(() => {
		const value = current;
		void dragging;
		untrack(() => {
			latest = value;
			if (drag?.started || goal === value) return;
			goal = value;
			const from = pos.current + lag.current;
			lag.jump(0);
			pos.jump(from);
			if (reduced) pos.jump(value);
			else pos.set(value);
		});
	});
	function cleanup() {
		return () => {
			pos.destroy();
			lag.destroy();
			theta.destroy();
		};
	}
	function commit(next: number, live = false) {
		if (live && Math.round(next) === Math.round(latest)) return;
		const value = Number(next.toFixed(2));
		if (value === latest) return;
		latest = value;
		if (position === undefined) internal = value;
		else if (!onPositionChange) position = value;
		onPositionChange?.(value);
	}
	function percentAt(event: PointerEvent) {
		const rect = root!.getBoundingClientRect();
		return vertical
			? ((event.clientY - rect.top) / (rect.height || 1)) * 100
			: ((event.clientX - rect.left) / (rect.width || 1)) * 100;
	}
	function axisSize() {
		const rect = root?.getBoundingClientRect();
		return (vertical ? rect?.height : rect?.width) || 1;
	}
	function focusQuietly() {
		if (handle && document.activeElement !== handle) {
			quiet = true;
			handle.focus({ preventScroll: true });
		}
	}
	function follow(state: CompareDrag, at: number, first = false) {
		const raw = at - state.grab,
			size = axisSize(),
			edge = clamp(raw, 0, 100);
		const placed = reduced ? edge : edge + (rubber(((raw - edge) / 100) * size) / size) * 100;
		state.raw = raw;
		if (first && state.press && !reduced) {
			const from = pos.current;
			pos.jump(placed);
			lag.jump(from - placed);
			lag.set(0);
		} else pos.jump(placed);
		velocity.push(placed, performance.now());
		commit(edge, true);
	}
	function start(state: CompareDrag, at: number) {
		const from = pos.current + lag.current;
		state.started = true;
		state.grab = state.press ? 0 : at - from;
		lag.jump(0);
		pos.jump(from);
		velocity = new PointerVelocity(from, performance.now());
		dragging = true;
		focusQuietly();
		follow(state, at, true);
	}
	function onPointerDown(event: PointerEvent & { currentTarget: HTMLDivElement }) {
		if (event.button !== 0 || !event.isPrimary || !root) return;
		const onHandle = Boolean((event.target as HTMLElement).closest('[data-handle]'));
		pressedHandle = onHandle;
		event.currentTarget.setPointerCapture(event.pointerId);
		const state: CompareDrag = {
			pointer: event.pointerId,
			grab: 0,
			press: !onHandle,
			started: false,
			x: event.clientX,
			y: event.clientY,
			raw: 0
		};
		drag = state;
		if (event.pointerType !== 'touch' || onHandle) start(state, percentAt(event));
	}
	function onPointerMove(event: PointerEvent) {
		const state = drag;
		if (!state || state.pointer !== event.pointerId) return;
		if (!state.started) {
			const along = Math.abs(vertical ? event.clientY - state.y : event.clientX - state.x),
				across = Math.abs(vertical ? event.clientX - state.x : event.clientY - state.y);
			if (along < 6 && across < 6) return;
			if (across > along) {
				drag = null;
				return;
			}
			start(state, percentAt(event));
			return;
		}
		follow(state, percentAt(event));
	}
	function onPointerEnd(event: PointerEvent) {
		const state = drag;
		if (!state || state.pointer !== event.pointerId) return;
		drag = null;
		if (!state.started) {
			if (event.type === 'pointerup') {
				focusQuietly();
				commit(clamp(percentAt(event), 0, 100));
			}
			return;
		}
		const from = pos.current + lag.current;
		velocity.push(pos.current, performance.now());
		const speed =
			lag.velocity + (from > 100 || from < 0 ? velocity.at(pos.current, performance.now()) : 0);
		const target = clamp(lag.current !== 0 ? state.raw : from, 0, 100);
		lag.jump(0);
		pos.jump(from);
		goal = Number(target.toFixed(2));
		if (from !== target) {
			if (reduced) pos.jump(target);
			else pos.set(target, { velocity: speed });
		}
		commit(target);
		dragging = false;
	}
	function onKeyDown(event: KeyboardEvent) {
		const large = event.shiftKey ? 10 : 1;
		const toward: Record<string, number> = vertical
			? {
					ArrowUp: -large,
					ArrowDown: large,
					ArrowRight: -large,
					ArrowLeft: large,
					PageUp: -10,
					PageDown: 10
				}
			: {
					ArrowLeft: -large,
					ArrowRight: large,
					ArrowUp: -large,
					ArrowDown: large,
					PageUp: -10,
					PageDown: 10
				};
		const next =
			event.key === 'Home'
				? 100
				: event.key === 'End'
					? 0
					: event.key in toward
						? Math.round(latest) + toward[event.key]!
						: undefined;
		if (next === undefined) return;
		event.preventDefault();
		quiet = false;
		const clamped = clamp(next, 0, 100);
		if (clamped === latest) {
			if (!reduced && next !== clamped)
				pos.set(goal, {
					spec: m.specs.morph,
					velocity: ((Math.sign(next - clamped) * 150) / axisSize()) * 100
				});
			return;
		}
		commit(clamped);
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={root}
	class={['arc-image-compare__root', className]}
	data-orientation={orientation}
	data-dragging={dragging || undefined}
	data-frame-keep=""
	style:aspect-ratio={aspectRatio}
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerEnd}
	onpointercancel={onPointerEnd}
	onlostpointercapture={onPointerEnd}
	onmousedown={(event) => event.preventDefault()}
	ondragstart={(event) => event.preventDefault()}
	ondblclick={() => {
		if (pressedHandle && latest !== 50) commit(50);
	}}
	{@attach cleanup}
>
	<div class="arc-image-compare__layer">{@render after()}</div>
	<div class="arc-image-compare__layer" style:clip-path={geometry.clip}>{@render before()}</div>
	{#if labels}
		<span
			bind:this={beforeChip}
			class="arc-image-compare__chip"
			style:opacity={geometry.beforeOpacity}
			aria-hidden="true">{labels[0]}</span
		>
		<span
			bind:this={afterChip}
			class="arc-image-compare__chip"
			data-place="end"
			style:opacity={geometry.afterAcross}
			aria-hidden="true">{labels[1]}</span
		>
		<span
			class="arc-image-compare__chip"
			data-place="bottom"
			style:opacity={geometry.afterDown}
			aria-hidden="true">{labels[1]}</span
		>
	{/if}
	<div
		class="arc-image-compare__pivot"
		style:transform={`translate(${geometry.pivotX}, ${geometry.pivotY})`}
	>
		<span class="arc-image-compare__rotor" style:rotate={`${theta.current}deg`}
			><span class="arc-image-compare__line"></span></span
		>
		<span
			class="arc-image-compare__handle-slot"
			style:transform={`translate(${geometry.handleX}px, ${geometry.handleY}px)`}
		>
			<div
				bind:this={handle}
				data-handle=""
				data-quiet={quiet || undefined}
				class="arc-image-compare__handle"
				data-dragging={dragging || undefined}
				data-orientation={orientation}
				role="slider"
				tabindex="0"
				aria-label={label}
				aria-orientation={orientation}
				aria-valuemin="0"
				aria-valuemax="100"
				aria-valuenow={Math.round(100 - current)}
				aria-valuetext={`${Math.round(100 - current)}% after`}
				onkeydown={onKeyDown}
				onblur={() => {
					quiet = false;
				}}
			>
				<span
					class="arc-image-compare__chevrons"
					style:rotate={`${theta.current}deg`}
					aria-hidden="true"
					><span class="arc-image-compare__chevron"
						><ChevronLeft size={16} strokeWidth={1.75} /></span
					><span class="arc-image-compare__chevron"
						><ChevronRight size={16} strokeWidth={1.75} /></span
					></span
				>
			</div>
		</span>
	</div>
</div>
