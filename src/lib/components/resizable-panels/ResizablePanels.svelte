<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { Spring, prefersReducedMotion } from 'svelte/motion';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { motionTokens as m, swap, Mounted, PhysicalSpring, type SpringSpec } from '#lib/motion';
	import type { ResizablePanelsProps, ResizablePanelProps } from './types';
	import './resizable-panels.css';
	let {
		label,
		children: configs,
		onLayoutChange,
		class: className
	}: ResizablePanelsProps = $props();
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	const mounted = new Mounted();
	type Mode = 'open' | 'before' | 'after';
	type Drag = {
		handle: number;
		pointer: number;
		startX: number;
		a0: number;
		b0: number;
		pair: number;
		lo: number;
		hi: number;
		mode: Mode;
		startMode: Mode;
		moved: boolean;
		catching: boolean;
		samples: [number, number][];
	};

	const DEFAULT_MIN = 80;
	/** How far in px a pane can be pulled past a limit before it stops giving. */
	const STRETCH = 44;
	/** Keyboard steps in px; Shift takes the larger one. */
	const STEP = 16,
		BIG_STEP = 64;
	const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
	/** Past a limit every pixel costs more, like pulling against elastic. */
	const rubber = (overshoot: number) => (overshoot * STRETCH * 0.55) / (STRETCH + 0.55 * overshoot);
	const band = (value: number, lo: number, hi: number) =>
		value < lo ? lo - rubber(lo - value) : value > hi ? hi + rubber(value - hi) : value;
	/** A collapsible pane snaps closed once the pointer is this far below its minimum. */
	const collapseAt = (min: number) => min - Math.max(min * 0.5, 40);
	/** Short momentum projection, used only to decide whether a flick collapses or restores a pane. */
	const project = (velocity: number, rate = 0.99) => ((velocity / 1000) * rate) / (1 - rate);
	const toShares = (values: number[]) => {
		const total = values.reduce((sum, value) => sum + value, 0) || 1;
		return values.map((value) => (value / total) * 100);
	};

	function velocityOf(samples: [number, number][], now: number) {
		const recent = samples.filter(([time]) => now - time <= 90);
		const first = recent[0],
			last = recent[recent.length - 1];
		if (!first || !last || recent.length < 2 || now - last[0] > 50) return 0;
		const [firstTime, firstX] = first,
			[lastTime, lastX] = last;
		return lastTime > firstTime ? (lastX - firstX) / ((lastTime - firstTime) / 1000) : 0;
	}

	class Size {
		motion: Spring<number>;
		#fixed: PhysicalSpring;
		#rest = { delta: 0.5, speed: 2 };
		#gliding = $state(false);
		#completion = $state.raw<{ target: number; done: () => void } | null>(null);
		#previous = 0;
		#sampledAt = 0;
		#velocity = 0;
		constructor(value: number) {
			this.motion = new Spring(value, { ...m.physics.smooth, precision: 0.01 });
			this.#fixed = new PhysicalSpring(value, m.specs.smooth, this.#rest);
			this.#previous = value;
			$effect(() => {
				const current = this.motion.current;
				untrack(() => {
					const now = performance.now();
					this.#velocity = this.#sampledAt
						? ((current - this.#previous) / Math.max(1, now - this.#sampledAt)) * 1000
						: 0;
					this.#previous = current;
					this.#sampledAt = now;
				});
			});
			$effect(() => {
				const completion = this.#completion;
				if (completion && !this.#fixed.running)
					untrack(() => {
						this.#completion = null;
						completion.done();
					});
			});
		}
		get current() {
			return this.#gliding ? this.#fixed.current : this.motion.current;
		}
		get() {
			return this.current;
		}
		set(value: number) {
			this.#completion = null;
			this.#gliding = false;
			this.#fixed.jump(value);
			void this.motion.set(value, { instant: true });
			this.#previous = value;
			this.#sampledAt = 0;
			this.#velocity = 0;
		}
		jump(value: number) {
			this.set(value);
		}
		chase(value: number) {
			if (!this.#gliding) this.#fixed.jump(this.current);
			this.#completion = null;
			this.#fixed.to(value, m.specs.smooth);
			this.#gliding = true;
		}
		stop() {
			const velocity = this.#gliding ? this.#fixed.velocity : this.#velocity;
			this.jump(this.#gliding ? this.#fixed.stop() : this.current);
			this.#velocity = velocity;
			this.#sampledAt = performance.now();
		}
		glide(target: number, spec: SpringSpec, done: () => void) {
			const from = this.current;
			this.#completion = null;
			this.#fixed.jump(from);
			void this.motion.set(from, { instant: true });
			this.#gliding = true;
			this.#fixed.to(target, spec);
			this.#completion = { target, done };
		}
		isAnimating() {
			return this.#gliding
				? this.#fixed.running
				: Math.abs(this.motion.current - this.motion.target) > 0.01;
		}
	}

	const startsCollapsed = (config: ResizablePanelProps) =>
		Boolean(config.collapsible && config.defaultCollapsed);
	const count = untrack(() => configs.length);
	const sizes = untrack(() =>
		configs.map((config) => new Size(startsCollapsed(config) ? 0 : config.defaultSize))
	);
	onDestroy(() => sizes.forEach((size) => size.stop()));
	let collapsed = $state(untrack(() => configs.map(startsCollapsed)));
	let free = $state(untrack(() => configs.map(() => false)));
	let resizing = $state<number | null>(null);
	let shares = $state(
		untrack(() => toShares(configs.map((c) => (startsCollapsed(c) ? 0 : c.defaultSize))))
	);
	let available = $state(0);
	let panelRefs: HTMLDivElement[] = [];
	let restoreSizes: (number | null)[] = untrack(() => configs.map(() => null));
	let running: { stop: () => void }[] = [];
	let token = 0,
		stale = true;
	let goals: number[] | null = null;
	let drag: Drag | null = null;
	const minTotal = $derived(configs.reduce((sum, c) => sum + (c.minSize ?? DEFAULT_MIN), 0));
	const minOf = (i: number) => {
		const min = configs[i]?.minSize ?? DEFAULT_MIN;
		return available > 0 && available < minTotal ? (min * available) / minTotal : min;
	};
	const maxOf = (i: number) => configs[i]?.maxSize ?? Infinity;
	function observe(node: HTMLDivElement) {
		const observer = new ResizeObserver(() => {
			stale = true;
			available = panelRefs.reduce((sum, n) => sum + n.getBoundingClientRect().width, 0);
		});
		observer.observe(node);
		return () => {
			observer.disconnect();
			token++;
			running.forEach((c) => c.stop());
		};
	}
	/** Starts an interaction: stops anything in flight and makes sure the sizes are the px widths on screen, so nothing moves. */
	function begin(involved: number[]) {
		token += 1;
		running.forEach((controls) => controls.stop());
		running = [];
		// Only a group resize (or the first interaction) can put the sizes out of step with the screen; otherwise they are the truth,
		// even before a jump has painted.
		if (stale) {
			stale = false;
			const widths = panelRefs
				.slice(0, count)
				.map((node) => node?.getBoundingClientRect().width ?? 0);
			if (widths.some((width, index) => Math.abs(width - sizes[index]!.get()) > 0.5))
				widths.forEach((width, index) => sizes[index]!.jump(width));
		}
		// Freed panes drop their CSS limits while JS owns them, so rubber-banding and collapsing can go past them.
		if (involved.some((index) => !free[index]))
			free = free.map((value, index) => value || involved.includes(index));
		return sizes.map((size) => size.get());
	}

	function commit() {
		const values = sizes.map((size) => size.get());
		free = configs.map(() => false);
		shares = toShares(values);
		onLayoutChange?.(toShares(values));
	}

	/** Springs panes to new widths from wherever they are, keeping their velocity, then hands the limits back to CSS. */
	function glide(targets: (number | null)[], transition: SpringSpec = m.specs.smooth) {
		const mine = token;
		const finals = targets.map((target, index) => target ?? sizes[index]!.get());
		goals = finals;
		// Assistive technology hears the destination right away rather than after the spring's tail settles.
		shares = toShares(finals);
		const moving = targets.flatMap((target, index) =>
			target === null || Math.abs(target - sizes[index]!.get()) < 0.01
				? []
				: [[index, target] as const]
		);
		let pending = moving.length;
		const done = () => {
			if (token === mine) commit();
		};
		if (reduced || !pending) {
			moving.forEach(([index, target]) => sizes[index]!.jump(target));
			done();
			return;
		}
		running = moving.map(([index, target]) => {
			const size = sizes[index]!;
			size.glide(target, transition, () => {
				pending -= 1;
				if (!pending) done();
			});
			return { stop: () => size.stop() };
		});
	}

	function limits(handle: number, a: number, b: number) {
		const pair = a + b;
		let lo = Math.max(minOf(handle), pair - maxOf(handle + 1)),
			hi = Math.min(maxOf(handle), pair - minOf(handle + 1));
		// A group too narrow for every minimum may already hold a pane below it; never yank it to the limit on grab.
		if (a > 0 && b > 0) {
			lo = Math.min(lo, a);
			hi = Math.max(hi, a);
		}
		if (lo > hi) lo = hi = clamp((lo + hi) / 2, 0, pair);
		return { pair, lo: clamp(lo, 0, pair), hi: clamp(hi, 0, pair) };
	}

	function resolve(
		handle: number,
		raw: number,
		pair: number,
		lo: number,
		hi: number
	): { mode: Mode; size: number } {
		if (configs[handle]!.collapsible && raw < collapseAt(minOf(handle)))
			return { mode: 'before', size: 0 };
		if (configs[handle + 1]!.collapsible && pair - raw < collapseAt(minOf(handle + 1)))
			return { mode: 'after', size: pair };
		return { mode: 'open', size: band(raw, lo, hi) };
	}

	function setCollapsedPair(handle: number, mode: Mode) {
		collapsed = collapsed.map((value, index) =>
			index === handle ? mode === 'before' : index === handle + 1 ? mode === 'after' : value
		);
	}

	function remember(handle: number, a: number, b: number, mode: Mode) {
		if (mode === 'before' && a > 0) restoreSizes[handle] = a;
		if (mode === 'after' && b > 0) restoreSizes[handle + 1] = b;
	}

	function modeOf(handle: number): Mode {
		return collapsed[handle] ? 'before' : collapsed[handle + 1] ? 'after' : 'open';
	}

	/** Sets a pane pair to a new boundary. Any change of collapse state springs; everything else moves with the pointer. */
	function moveBoundary(current: Drag, size: number) {
		const [a, b] = [sizes[current.handle]!, sizes[current.handle + 1]!];
		if (current.catching && !reduced) {
			if (Math.abs(a.get() - size) < 0.75) {
				current.catching = false;
				running.forEach((controls) => controls.stop());
				running = [];
			} else {
				a.chase(size);
				b.chase(current.pair - size);
				running = [a, b].map((value) => ({ stop: () => value.stop() }));
				return;
			}
		}
		a.set(size);
		b.set(current.pair - size);
	}

	function onPointerDown(
		handle: number,
		event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }
	) {
		if (drag || (event.pointerType === 'mouse' && event.button !== 0)) return;
		const values = begin([handle, handle + 1]);
		const { pair, lo, hi } = limits(handle, values[handle]!, values[handle + 1]!);
		event.currentTarget.setPointerCapture(event.pointerId);
		const mode = modeOf(handle);
		drag = {
			handle,
			pointer: event.pointerId,
			startX: event.clientX,
			a0: values[handle]!,
			b0: values[handle + 1]!,
			pair,
			lo,
			hi,
			mode,
			startMode: mode,
			moved: false,
			catching: false,
			samples: [[event.timeStamp, event.clientX]]
		};
	}

	function onPointerMove(event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }) {
		const current = drag;
		if (!current || current.pointer !== event.pointerId) return;
		const dx = event.clientX - current.startX;
		if (!current.moved) {
			if (Math.abs(dx) < 2) return;
			current.moved = true;
			resizing = current.handle;
		}
		const next = resolve(current.handle, current.a0 + dx, current.pair, current.lo, current.hi);
		if (next.mode !== current.mode) {
			current.mode = next.mode;
			current.catching = true;
		}
		moveBoundary(current, next.size);
		current.samples.push([event.timeStamp, event.clientX]);
		if (current.samples.length > 16) current.samples.shift();
	}

	function finish(
		event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement },
		cancelled: boolean
	) {
		const current = drag;
		if (!current || current.pointer !== event.pointerId) return;
		drag = null;
		resizing = null;
		const { handle, pair, lo, hi } = current;
		if (!current.moved) {
			// A press on a divider that hides a pane brings it back.
			if (current.startMode !== 'open' && !cancelled) restore(handle, current.startMode);
			else commit();
			return;
		}
		const raw = current.a0 + event.clientX - current.startX;
		const velocity = cancelled ? 0 : velocityOf(current.samples, event.timeStamp);
		const flung = resolve(handle, raw + project(velocity), pair, lo, hi);
		// A flick toward an edge collapses; a flick back out restores. Otherwise the divider stays where it was let go, inside its limits.
		const mode = cancelled ? current.startMode : flung.mode !== 'open' ? flung.mode : 'open';
		const size =
			mode === 'before' ? 0 : mode === 'after' ? pair : cancelled ? current.a0 : clamp(raw, lo, hi);
		remember(handle, current.a0, current.b0, mode);
		setCollapsedPair(handle, mode);
		glide(
			sizes.map((_, index) => (index === handle ? size : index === handle + 1 ? pair - size : null))
		);
	}

	function restore(handle: number, side: Mode) {
		const values = begin([handle, handle + 1]);
		const { pair, lo, hi } = limits(handle, values[handle]!, values[handle + 1]!);
		const size =
			side === 'before'
				? clamp(restoreSizes[handle] ?? minOf(handle), lo, hi)
				: clamp(pair - (restoreSizes[handle + 1] ?? minOf(handle + 1)), lo, hi);
		setCollapsedPair(handle, 'open');
		glide(
			sizes.map((_, index) => (index === handle ? size : index === handle + 1 ? pair - size : null))
		);
	}

	function collapse(handle: number, side: Mode) {
		const values = begin([handle, handle + 1]);
		const pair = values[handle]! + values[handle + 1]!;
		remember(handle, values[handle]!, values[handle + 1]!, side);
		setCollapsedPair(handle, side);
		glide(
			sizes.map((_, index) =>
				index === handle
					? side === 'before'
						? 0
						: pair
					: index === handle + 1
						? side === 'before'
							? pair
							: 0
						: null
			)
		);
	}

	/** Resets to the default shares, fitted to the current width so every pane respects its limits. */
	function reset() {
		const values = begin(configs.map((_, index) => index));
		const total = values.reduce((sum, value) => sum + value, 0);
		const wanted = configs.map((config) => (startsCollapsed(config) ? 0 : config.defaultSize));
		const targets = [...wanted];
		const frozen = wanted.map((value) => value === 0);
		for (let pass = 0; pass < count; pass++) {
			const fixed = targets.reduce((sum, value, index) => (frozen[index] ? sum + value : sum), 0);
			const share = wanted.reduce((sum, value, index) => (frozen[index] ? sum : sum + value), 0);
			let violated = false;
			targets.forEach((_, index) => {
				if (frozen[index]) return;
				const size = share ? (wanted[index]! / share) * (total - fixed) : 0;
				const bounded = clamp(size, minOf(index), maxOf(index));
				targets[index] = size;
				if (bounded !== size) {
					targets[index] = bounded;
					frozen[index] = true;
					violated = true;
				}
			});
			if (!violated) break;
		}
		collapsed = configs.map(startsCollapsed);
		glide(targets);
	}

	function onKeyDown(handle: number, event: KeyboardEvent) {
		const current = drag;
		if (event.key === 'Escape' && current) {
			// Escape during a drag puts the divider back where it started.
			event.preventDefault();
			drag = null;
			resizing = null;
			setCollapsedPair(handle, current.startMode);
			glide(
				sizes.map((_, index) =>
					index === handle ? current.a0 : index === handle + 1 ? current.b0 : null
				)
			);
			return;
		}
		if (current || !['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter'].includes(event.key)) return;
		event.preventDefault();
		const mode = modeOf(handle);
		const canCollapseBefore = Boolean(configs[handle]!.collapsible),
			canCollapseAfter = Boolean(configs[handle + 1]!.collapsible);
		if (event.key === 'Enter') {
			if (mode !== 'open') restore(handle, mode);
			else if (canCollapseBefore) collapse(handle, 'before');
			else if (canCollapseAfter) collapse(handle, 'after');
			return;
		}
		// Repeated presses build on where the divider is heading, not on where the spring happens to be this frame.
		const heading =
			goals && (sizes[handle]!.isAnimating() || sizes[handle + 1]!.isAnimating()) ? goals : null;
		const values = begin([handle, handle + 1]);
		const pair = values[handle]! + values[handle + 1]!;
		const a = heading ? clamp(heading[handle]!, 0, pair) : values[handle]!,
			step = event.shiftKey ? BIG_STEP : STEP;
		const { lo, hi } = limits(handle, a, pair - a);
		// Arrows walk out of a collapsed pane at its minimum, and past a limit into collapse when the pane allows it.
		if (event.key === 'ArrowLeft' && mode === 'after') return restoreTo(handle, hi, pair);
		if (event.key === 'ArrowRight' && mode === 'before') return restoreTo(handle, lo, pair);
		if (event.key === 'ArrowLeft' && a <= lo + 0.5 && canCollapseBefore && mode === 'open')
			return collapse(handle, 'before');
		if (event.key === 'ArrowRight' && a >= hi - 0.5 && canCollapseAfter && mode === 'open')
			return collapse(handle, 'after');
		if (mode !== 'open') {
			// An outward key still finishes an interrupted collapse. The React source
			// cancels the flight in begin() and returns here, freezing a half-closed pane.
			glide(
				sizes.map((_, index) =>
					index === handle
						? mode === 'before'
							? 0
							: pair
						: index === handle + 1
							? mode === 'before'
								? pair
								: 0
							: null
				)
			);
			return;
		}
		const size =
			event.key === 'Home'
				? lo
				: event.key === 'End'
					? hi
					: clamp(a + (event.key === 'ArrowLeft' ? -step : step), lo, hi);
		glide(
			sizes.map((_, index) =>
				index === handle ? size : index === handle + 1 ? pair - size : null
			),
			event.key.startsWith('Arrow') ? m.specs.snappy : m.specs.smooth
		);
	}

	function restoreTo(handle: number, size: number, pair: number) {
		setCollapsedPair(handle, 'open');
		glide(
			sizes.map((_, index) => (index === handle ? size : index === handle + 1 ? pair - size : null))
		);
	}
</script>

<div
	class={['arc-resizable-panels__group', className]}
	role="group"
	aria-label={label}
	data-resizing={resizing !== null || undefined}
	{@attach observe}
>
	{#each configs as config, index (config.id)}
		{#if index > 0}
			{@const h = index - 1}
			{@const mode = modeOf(h)}
			{@const now = Math.round(shares[h]!)}
			{@const bounds = available
				? limits(h, (shares[h]! / 100) * available, (shares[index]! / 100) * available)
				: null}
			{@const hidden =
				mode === 'before' ? configs[h]!.label : mode === 'after' ? config.label : null}
			<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions (focusable window splitter follows the reference separator pattern) -->
			<div
				role="separator"
				tabindex="0"
				aria-orientation="vertical"
				aria-controls={configs[h]!.id}
				aria-label={configs[h]!.label}
				aria-valuenow={now}
				aria-valuemin={Math.min(bounds ? Math.round((bounds.lo / available) * 100) : 0, now)}
				aria-valuemax={Math.max(bounds ? Math.round((bounds.hi / available) * 100) : 100, now)}
				aria-valuetext={hidden ? `${hidden} hidden, press Enter to show` : `${now}%`}
				class="arc-resizable-panels__handle"
				data-collapsed={mode === 'open' ? undefined : mode}
				data-active={resizing === h || undefined}
				onpointerdown={(e) => onPointerDown(h, e)}
				onpointermove={onPointerMove}
				onpointerup={(e) => finish(e, false)}
				onpointercancel={(e) => finish(e, true)}
				onkeydown={(e) => onKeyDown(h, e)}
				ondblclick={reset}
			>
				<span class="arc-resizable-panels__grip" aria-hidden="true"></span>
				{#if mode !== 'open'}{#key mode}<span
							class="arc-resizable-panels__restore"
							data-side={mode}
							aria-hidden="true"
							in:swap={reduced
								? { duration: m.duration.instant, skip: !mounted.current }
								: {
										scale: 0.6,
										blur: m.blur.subtle,
										...m.spring.snappy,
										fade: { duration: m.duration.fast, easing: m.ease.enter },
										skip: !mounted.current
									}}
							out:swap={reduced
								? { duration: m.duration.instant }
								: {
										scale: 0.6,
										blur: m.blur.subtle,
										duration: m.duration.fast,
										easing: m.ease.standard
									}}
							>{#if mode === 'before'}<ChevronRight
									size={14}
									strokeWidth={1.75}
								/>{:else}<ChevronLeft size={14} strokeWidth={1.75} />{/if}</span
						>{/key}{/if}
			</div>
		{/if}
		<div
			id={config.id}
			class={['arc-resizable-panels__panel', config.class]}
			style:flex-grow={Math.max(0, sizes[index]!.current)}
			style={`--panel-min:min(${config.minSize ?? DEFAULT_MIN}px, (100cqw - ${count - 1}px) * ${+((config.minSize ?? DEFAULT_MIN) / Math.max(1, minTotal)).toFixed(5)});--panel-max:${config.maxSize ? `${config.maxSize}px` : 'none'}`}
			data-collapsed={collapsed[index] || undefined}
			data-free={free[index] || undefined}
			data-anchor={index === 0 && count > 1 ? 'end' : 'start'}
			{@attach (node) => {
				panelRefs[index] = node;
			}}
		>
			<div
				class="arc-resizable-panels__content"
				style:opacity={free[index] || collapsed[index]
					? clamp(sizes[index]!.current / Math.max(1, minOf(index)), 0, 1)
					: 1}
				inert={collapsed[index]}
			>
				{@render config.children?.()}
			</div>
		</div>
	{/each}
</div>
