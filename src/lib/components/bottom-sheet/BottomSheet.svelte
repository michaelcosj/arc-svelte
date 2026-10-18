<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { Dialog } from 'bits-ui';
	import { Spring, Tween, prefersReducedMotion } from 'svelte/motion';
	import X from '@lucide/svelte/icons/x';
	import { motionTokens as m, PhysicalSpring } from '#lib/motion';
	import type { BottomSheetProps } from './types';
	import './bottom-sheet.css';
	let {
		trigger,
		open: openProp = $bindable(),
		defaultOpen = false,
		onOpenChange,
		title,
		description,
		detents = [0.45, 0.92],
		initialDetent = 0,
		onDetentChange,
		closeLabel = 'Close',
		class: className,
		children
	}: BottomSheetProps = $props();
	let internal = $state(untrack(() => defaultOpen));
	const open = $derived(openProp ?? internal);
	function setOpen(next: boolean) {
		if (openProp === undefined) internal = next;
		else if (!onOpenChange) openProp = next;
		onOpenChange?.(next);
	}
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	const stops = $derived(detents.filter((stop) => stop > 0).sort((a, b) => a - b));
	const top = $derived(stops.length - 1);
	type Stop = number | 'closed';
	type Drag = {
		startY: number;
		origin: number;
		from: number;
		moved: boolean;
		samples: { t: number; y: number }[];
	};

	/** Extra surface below the viewport, so an upward stretch never shows a gap under the sheet. */
	const EXTENSION = 160;
	/** Enough travel below the edge to hide the floating shadow as well as the sheet. */
	const CLOSED_GAP = 40;
	/** How far a release coasts, in seconds of its velocity, before the nearest detent is chosen. */
	const PROJECTION = 0.2;
	/** A release faster than this (px/s) always moves at least one detent in its direction. */
	const FLICK = 320;
	/** The limit an upward stretch approaches past the tallest detent. */
	const STRETCH = 120;
	/** How much of the full dim remains at the smallest detent. */
	const LOW_DIM = 0.78;

	/** iOS-style resistance: follows the finger at first, then approaches STRETCH. */
	const rubber = (distance: number) => (1 - 1 / ((distance * 0.55) / STRETCH + 1)) * STRETCH;
	const unrubber = (stretch: number) =>
		((1 / (1 - Math.min(stretch, STRETCH - 1) / STRETCH) - 1) * STRETCH) / 0.55;
	const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

	function velocityOf(samples: Drag['samples'], now: number) {
		const recent = samples.filter((sample) => now - sample.t <= 80);
		const first = recent[0],
			last = recent[recent.length - 1];
		// A pause before letting go drops the momentum, so a slow, deliberate release settles where it is.
		if (!first || !last || last === first || now - last.t > 60) return 0;
		return (last.y - first.y) / ((last.t - first.t) / 1000);
	}

	let detent = $state(untrack(() => clamp(Math.round(initialDetent), 0, top)));
	let announcement = $state('');
	let sheetRef = $state<HTMLDivElement | null>(null),
		bodyRef = $state<HTMLDivElement | null>(null);
	const y = new Spring(4000, { ...m.physics.smooth, precision: 0.01 });
	const presence = new Tween(1);
	let released = $state.raw(new PhysicalSpring(4000, m.specs.smooth));
	let settling = $state(false);
	const painted = $derived(settling ? released.current : y.current);
	let arrive = $state.raw<(() => void) | undefined>();
	let releaseTarget = $state(4000);
	$effect(() => {
		if (settling && !released.running) {
			untrack(() => {
				const done = arrive;
				arrive = undefined;
				done?.();
			});
		}
	});
	onDestroy(() => released.destroy());
	function catchPainted() {
		const current = painted;
		settling = false;
		arrive = undefined;
		released.destroy();
		void y.set(current, { instant: true });
		return current;
	}
	let height = $state(0),
		visible = $state(untrack(() => open));
	let aim: Stop = untrack(() => detent),
		drag: Drag | null = null,
		suppressClick = false,
		token = 0;
	let presenceChange = { present: untrack(() => open), at: 0 };
	const expanded = $derived(detent === top);
	const backdrop = $derived.by(() => {
		if (!height) return 0;
		const low = height * (1 - stops[0]! / stops[top]!),
			closed = height + CLOSED_GAP,
			offsetY = painted;
		const dim =
			offsetY <= low
				? 1 - (1 - LOW_DIM) * (low ? offsetY / low : 0)
				: LOW_DIM * (1 - (offsetY - low) / (closed - low));
		return clamp(dim, 0, 1) * presence.current;
	});
	const offset = (stop: Stop) =>
		stop === 'closed' ? height + CLOSED_GAP : height * (1 - stops[stop]! / stops[top]!);
	function go(stop: Stop, _velocity?: number, onArrive?: () => void) {
		aim = stop;
		const from = catchPainted();
		const target = offset(stop);
		const mine = ++token;
		if (reduced) {
			void y.set(target, { instant: true });
			onArrive?.();
			return;
		}
		releaseTarget = target;
		arrive = () => {
			if (token === mine) onArrive?.();
		};
		const granular = Math.abs(target - from) < 5;
		released = new PhysicalSpring(from, m.specs.smooth, {
			delta: granular ? 0.005 : 0.5,
			speed: granular ? 0.01 : 2
		});
		released.set(target, {
			// Motion ignores velocity for the source time-defined smooth/leave springs.
			// Gesture velocity still selects the detent, but the resulting flight starts at rest.
			velocity: 0,
			spec: stop === 'closed' ? { ...m.specs.smooth, visualDuration: 0.3 } : m.specs.smooth
		});
		settling = true;
	}
	function rest(stop: number, velocity?: number) {
		if (stop !== detent) {
			detent = stop;
			onDetentChange?.(stop);
			announcement =
				stop === top
					? 'Sheet expanded'
					: stop === 0
						? 'Sheet collapsed'
						: `Sheet at ${Math.round(stops[stop]! * 100)} percent height`;
		}
		if (stop !== top && bodyRef && bodyRef.scrollTop > 0)
			bodyRef.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
		go(stop, velocity);
	}
	function observe(node: HTMLDivElement) {
		return untrack(() => {
			detent = clamp(Math.round(initialDetent), 0, top);
			sheetRef = node;
			height = node.offsetHeight - EXTENSION;
			if (reduced) void presence.set(0, { duration: 0 });
			void y.set(offset('closed'), { instant: true });
			const observer = new ResizeObserver(() => {
				const next = node.offsetHeight - EXTENSION;
				if (next === height) return;
				height = next;
				if (drag || aim === 'closed') return;
				go(aim);
			});
			observer.observe(node);
			return () => {
				observer.disconnect();
				sheetRef = null;
			};
		});
	}

	$effect(() => {
		const present = open;
		const sheet = sheetRef;
		void reduced;
		if (!present && !visible) return;
		if (present && !visible) {
			visible = true;
			return;
		}
		if (!sheet) return;
		untrack(() => {
			presenceChange = { present, at: performance.now() };
			if (present) {
				if (reduced) {
					catchPainted();
					void y.set(offset(detent), { instant: true });
					void presence.set(1, { duration: m.duration.fast, easing: m.ease.standard });
				} else {
					void presence.set(1, { duration: 0 });
					go(detent);
				}
			} else {
				drag = null;
				if (reduced) {
					catchPainted();
					const mine = ++token;
					void presence.set(0, { duration: m.duration.fast, easing: m.ease.standard }).then(() => {
						if (token === mine) visible = false;
					});
				} else if (
					settling &&
					aim === 'closed' &&
					(released.current !== releaseTarget || released.velocity !== 0)
				) {
					// A zero-distance release may have completed before presence attached its callback.
					const mine = token;
					arrive = () => {
						if (token === mine) visible = false;
					};
				} else go('closed', undefined, () => (visible = false));
			}
		});
	});
	function beginDrag(clientY: number, time: number) {
		token++;
		const current = catchPainted();
		drag = {
			startY: clientY,
			origin: current < 0 ? -unrubber(-current) : current,
			from: detent,
			moved: false,
			samples: [{ t: time, y: clientY }]
		};
	}
	function moveDrag(clientY: number, time: number) {
		const state = drag;
		if (!state) return;
		const delta = clientY - state.startY;
		if (!state.moved) {
			if (Math.abs(delta) < 3) return;
			state.moved = true;
			sheetRef?.setAttribute('data-dragging', '');
		}
		const raw = state.origin + delta;
		void y.set(raw < 0 ? -rubber(-raw) : raw, { instant: true });
		state.samples.push({ t: time, y: clientY });
		if (state.samples.length > 12) state.samples.shift();
	}
	function endDrag(time: number) {
		const state = drag;
		drag = null;
		sheetRef?.removeAttribute('data-dragging');
		if (!state) return;
		if (!state.moved) {
			if (aim !== 'closed') go(aim);
			return;
		}
		suppressClick = true;
		const current = painted,
			velocity = current < 0 ? 0 : velocityOf(state.samples, time),
			projected = current + velocity * PROJECTION;
		const candidates: Stop[] = [...stops.map((_, i) => i), 'closed'];
		let target = candidates.reduce((best, stop) =>
			Math.abs(offset(stop) - projected) < Math.abs(offset(best) - projected) ? stop : best
		);
		if (Math.abs(velocity) > FLICK && target === state.from)
			target =
				velocity < 0 ? Math.min(state.from + 1, top) : state.from === 0 ? 'closed' : state.from - 1;
		if (target === 'closed') {
			if (!reduced) go('closed', velocity);
			setOpen(false);
			queueMicrotask(() => {
				if (open) go(detent);
			});
			return;
		}
		rest(target, velocity);
	}
	function bodyEvents(body: HTMLDivElement) {
		bodyRef = body;
		let gesture: { x: number; y: number; mode: 'pending' | 'sheet' | 'native' } | null = null;
		const start = (event: TouchEvent) => {
			const touch = event.touches[0];
			gesture =
				event.touches.length === 1 && touch
					? { x: touch.clientX, y: touch.clientY, mode: 'pending' }
					: null;
		};
		const move = (event: TouchEvent) => {
			const touch = event.touches[0];
			if (!gesture || !touch || event.touches.length !== 1) return;
			const dx = touch.clientX - gesture.x,
				dy = touch.clientY - gesture.y;
			if (gesture.mode === 'pending') {
				const expanded = detent === top;
				if (expanded) {
					const scrollable = body.scrollHeight > body.clientHeight + 1;
					gesture.mode =
						Math.abs(dy) >= Math.abs(dx) && (!scrollable || (body.scrollTop <= 0 && dy > 0))
							? 'sheet'
							: 'native';
				} else {
					if (Math.hypot(dx, dy) < 4) return;
					gesture.mode = Math.abs(dy) >= Math.abs(dx) ? 'sheet' : 'native';
				}
				if (gesture.mode === 'sheet') beginDrag(touch.clientY, event.timeStamp);
			}
			if (gesture.mode !== 'sheet') return;
			if (event.cancelable) event.preventDefault();
			moveDrag(touch.clientY, event.timeStamp);
		};
		const end = (event: TouchEvent) => {
			if (gesture?.mode === 'sheet') endDrag(event.timeStamp);
			gesture = null;
		};
		body.addEventListener('touchstart', start, { passive: true });
		body.addEventListener('touchmove', move, { passive: false });
		body.addEventListener('touchend', end);
		body.addEventListener('touchcancel', end);
		return () => {
			body.removeEventListener('touchstart', start);
			body.removeEventListener('touchmove', move);
			body.removeEventListener('touchend', end);
			body.removeEventListener('touchcancel', end);
		};
	}
	function headerDown(event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }) {
		const target = event.target instanceof Element ? event.target : null;
		if (event.button !== 0 || !event.isPrimary) return;
		if (
			target?.closest("button, a, input, select, textarea, [role='button']") &&
			!target.closest('[data-grabber]')
		)
			return;
		beginDrag(event.clientY, event.timeStamp);
		// Moves arrive once per frame, so a fast flick can leave the header before its first move lands.
		// Until the header captures the pointer, the window follows it; once captured, the header's own handlers take over.
		const header = event.currentTarget,
			id = event.pointerId;
		const outside = (next: PointerEvent) =>
			next.pointerId === id && !(next.target instanceof Node && header.contains(next.target));
		const move = (next: PointerEvent) => {
			if (!outside(next) || !drag) return;
			moveDrag(next.clientY, next.timeStamp);
			if (drag?.moved && !header.hasPointerCapture(id)) {
				try {
					header.setPointerCapture(id);
				} catch {
					/* The pointer is already gone. */
				}
			}
		};
		const up = (next: PointerEvent) => {
			if (next.pointerId !== id) return;
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
			window.removeEventListener('pointercancel', up);
			if (outside(next)) endDrag(next.timeStamp);
		};
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
		window.addEventListener('pointercancel', up);
	}
	// Capture only once the pointer has really moved, so a plain click still lands on the grabber button.
	function headerMove(event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }) {
		if (!drag) return;
		if (event.pointerType === 'mouse' && event.buttons === 0) {
			endDrag(event.timeStamp);
			return;
		}
		moveDrag(event.clientY, event.timeStamp);
		if (drag.moved && !event.currentTarget.hasPointerCapture(event.pointerId))
			event.currentTarget.setPointerCapture(event.pointerId);
	}
	function headerUp(event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }) {
		if (event.currentTarget.hasPointerCapture(event.pointerId))
			event.currentTarget.releasePointerCapture(event.pointerId);
		endDrag(event.timeStamp);
	}

	function grabberClick() {
		if (suppressClick) {
			suppressClick = false;
			return;
		}
		rest(detent === top ? 0 : top);
	}
	function grabberKey(event: KeyboardEvent) {
		const current = detent;
		const next =
			event.key === 'ArrowUp'
				? Math.min(current + 1, top)
				: event.key === 'ArrowDown'
					? Math.max(current - 1, 0)
					: event.key === 'Home'
						? top
						: event.key === 'End'
							? 0
							: null;
		if (next === null) return;
		event.preventDefault();
		rest(next);
	}

	// Scrolling or tabbing into content that is still below the fold opens the sheet the rest of the way.
	function bodyWheel(event: WheelEvent) {
		if (detent !== top && event.deltaY > 4 && !drag) rest(top);
	}
	function bodyFocus(event: FocusEvent) {
		if (detent === top || !(event.target instanceof Element)) return;
		if (event.target.getBoundingClientRect().bottom > window.innerHeight - 8) rest(top);
	}

	// With focus on the sheet or its content, reading keys open the sheet first and then scroll the content.
	function sheetKey(event: KeyboardEvent & { currentTarget: EventTarget & HTMLDivElement }) {
		const body = bodyRef;
		if (!body || (event.target !== event.currentTarget && event.target !== body)) return;
		const down =
			event.key === 'ArrowDown' ||
			event.key === 'PageDown' ||
			(event.key === ' ' && !event.shiftKey);
		const up =
			event.key === 'ArrowUp' || event.key === 'PageUp' || (event.key === ' ' && event.shiftKey);
		if (!down && !up) return;
		event.preventDefault();
		if (down && detent !== top) {
			rest(top);
			return;
		}
		const step = event.key.startsWith('Arrow') ? 48 : body.clientHeight * 0.85;
		body.scrollBy({ top: down ? step : -step, behavior: reduced ? 'auto' : 'smooth' });
	}
</script>

<Dialog.Root bind:open={() => open, setOpen}>
	{#if trigger}<Dialog.Trigger
			>{#snippet child({ props })}{@render trigger({ props })}{/snippet}</Dialog.Trigger
		>{/if}
	<Dialog.Portal>
		<Dialog.Overlay forceMount
			>{#snippet child({ props })}{#if visible}<div
						{...props}
						class="arc-bottom-sheet__overlay"
						style:opacity={backdrop}
					></div>{/if}{/snippet}</Dialog.Overlay
		>
		<Dialog.Content
			forceMount
			{...description ? {} : { 'aria-describedby': undefined }}
			onOpenAutoFocus={(e) => {
				e.preventDefault();
				sheetRef?.focus({ preventScroll: true });
			}}
			onInteractOutside={(e) => {
				if (!presenceChange.present || e.timeStamp < presenceChange.at) e.preventDefault();
			}}
		>
			{#snippet child({ props })}{#if visible}
					<div
						{...props}
						class={['arc-bottom-sheet__sheet', className]}
						style={`pointer-events:auto;transform:translateY(${painted}px);opacity:${presence.current};--sheet-max:${stops[top]};--sheet-extension:${EXTENSION}px`}
						data-expanded={expanded ? '' : undefined}
						onkeydown={sheetKey}
						{@attach observe}
					>
						<!-- svelte-ignore a11y_no_static_element_interactions (header drag complements the accessible grabber) -->
						<div
							class="arc-bottom-sheet__header"
							onpointerdown={headerDown}
							onpointermove={headerMove}
							onpointerup={headerUp}
							onpointercancel={headerUp}
						>
							<button
								type="button"
								class="arc-bottom-sheet__grabber"
								data-grabber=""
								aria-label={expanded ? 'Collapse sheet' : 'Expand sheet'}
								aria-expanded={expanded}
								onclick={grabberClick}
								onkeydown={grabberKey}
								><span class="arc-bottom-sheet__grabberBar" aria-hidden="true"></span></button
							>
							<div class="arc-bottom-sheet__headRow">
								<div class="arc-bottom-sheet__headText">
									<Dialog.Title level={2}
										>{#snippet child({ props })}{@const {
												role: _role,
												'aria-level': _level,
												...heading
											} = props}
											<h2 {...heading} class="arc-bottom-sheet__title">
												{title}
											</h2>{/snippet}</Dialog.Title
									>{#if description}<Dialog.Description
											>{#snippet child({ props })}<p
													{...props}
													class="arc-bottom-sheet__description"
												>
													{description}
												</p>{/snippet}</Dialog.Description
										>{/if}
								</div>
								<Dialog.Close class="arc-bottom-sheet__close" aria-label={closeLabel}
									><X size={16} strokeWidth={1.75} aria-hidden="true" /></Dialog.Close
								>
							</div>
						</div>
						<div
							class="arc-bottom-sheet__body"
							onwheel={bodyWheel}
							onfocusin={bodyFocus}
							onscroll={(e) =>
								sheetRef?.toggleAttribute('data-scrolled', e.currentTarget.scrollTop > 1)}
							{@attach bodyEvents}
						>
							{@render children()}
						</div>
						<span class="arc-bottom-sheet__srOnly" role="status" aria-live="polite"
							>{announcement}</span
						>
					</div>{/if}{/snippet}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
