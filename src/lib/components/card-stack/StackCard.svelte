<script lang="ts">
	import { onDestroy, untrack, type Snippet } from 'svelte';
	import { Spring, Tween } from 'svelte/motion';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import { motionTokens as m, PhysicalSpring, FollowSpring, type SpringSpec } from '#lib/motion';
	import type { CardDecision, CardReturn, CardExit, Point } from './types';
	let {
		id,
		depth,
		decision,
		returnFrom,
		interactive,
		zIndex,
		label,
		labels,
		lift,
		reduced,
		fling,
		onRelease,
		onThrown,
		onGone,
		onLift,
		children
	}: {
		id: string;
		depth: number;
		decision: CardDecision | null;
		returnFrom?: CardReturn;
		interactive: boolean;
		zIndex: number;
		label: string;
		labels: { left: string; right: string };
		lift: number;
		reduced: boolean;
		fling: (id: string) => Point | undefined;
		onRelease: (id: string, offset: Point, velocity: Point, width: number) => boolean;
		onThrown: (id: string, exit: CardExit) => void;
		onGone: (id: string) => void;
		onLift: (value: number) => void;
		children: Snippet;
	} = $props();
	const initial = untrack(() => (returnFrom && !reduced ? returnFrom : undefined));
	const x = new Spring(initial?.x ?? 0, { ...m.physics.smooth, precision: 0.01 }),
		y = new Spring(initial?.y ?? 0, { ...m.physics.smooth, precision: 0.01 }),
		opacity = new Tween(untrack(() => (returnFrom ? 0 : 1)));
	// Native springs own pointer targets; fixed flights use the source's time-defined solver.
	let releasedX = $state.raw(new PhysicalSpring(initial?.x ?? 0, m.specs.smooth)),
		releasedY = $state.raw(new PhysicalSpring(initial?.y ?? 0, m.specs.smooth)),
		travelling = $state(false);
	const px = $derived(travelling ? releasedX.current : x.current),
		py = $derived(travelling ? releasedY.current : y.current);
	function flight(tx: number, ty: number, spec: SpringSpec) {
		const cx = px,
			cy = py;
		const rest = (from: number, to: number) =>
			Math.abs(to - from) < 5 ? { delta: 0.005, speed: 0.01 } : { delta: 0.5, speed: 2 };
		releasedX.destroy();
		releasedY.destroy();
		releasedX = new PhysicalSpring(cx, spec, rest(cx, tx));
		releasedY = new PhysicalSpring(cy, spec, rest(cy, ty));
		// Motion's duration/bounce resolver zeroes even explicit velocity. Pointer samples
		// still determine the decision and throw vector; injecting them here changes its curve.
		releasedX.set(tx, { velocity: 0 });
		releasedY.set(ty, { velocity: 0 });
		travelling = true;
	}
	let pendingHome: ReturnType<typeof setTimeout> | undefined;
	function catchTravel() {
		clearTimeout(pendingHome);
		const cx = px,
			cy = py;
		releasedX.destroy();
		releasedY.destroy();
		void x.set(cx, { instant: true });
		void y.set(cy, { instant: true });
		travelling = false;
	}
	onDestroy(() => {
		clearTimeout(pendingHome);
		releasedX.destroy();
		releasedY.destroy();
	});
	const depthSpring = new FollowSpring(
		untrack(() => depth),
		m.specs.smooth
	);
	let tilt = $state(initial?.tilt ?? 1),
		card: HTMLDivElement;
	let drag: {
		pointer: number;
		ox: number;
		oy: number;
		samples: { t: number; x: number; y: number }[];
	} | null = null;
	let settled = !untrack(() => returnFrom),
		wasDecided = false,
		homing = false;
	const clamp = (n: number) => Math.min(1, Math.max(0, n));
	const depthTarget = $derived(depth - (depth > 0 ? lift * 0.4 : 0)),
		shown = $derived(reduced ? depthTarget : depthSpring.current);
	$effect(() => {
		depthSpring.set(depthTarget, { instant: reduced });
	});

	$effect(() => {
		const chosen = decision;
		return untrack(() => {
			let cancelled = false;
			let timer: ReturnType<typeof setTimeout> | undefined;
			if (chosen) {
				drag = null;
				homing = false;
				card?.removeAttribute('data-dragging');
				wasDecided = true;
				const direction = chosen === 'right' ? 1 : -1,
					width = card?.offsetWidth ?? 320,
					cx = px,
					cy = py,
					velocity = fling(id) ?? { x: direction * 900, y: -120 },
					speed = Math.hypot(velocity.x, velocity.y);
				let ux = velocity.x,
					uy = velocity.y;
				if (speed < 200 || Math.sign(ux) !== direction) {
					ux = Math.abs(cx) > 8 ? cx : direction;
					uy = Math.abs(cx) > 8 ? cy * 0.5 : -0.12;
				}
				const length = Math.hypot(ux, uy) || 1;
				ux /= length;
				uy /= length;
				if (Math.abs(ux) < 0.45) {
					ux = direction * 0.45;
					uy = Math.sign(uy || -1) * Math.sqrt(1 - 0.45 * 0.45);
				}
				const exit = { x: cx + ux * width * 1.6, y: cy + uy * width * 1.6, tilt };
				onThrown(id, exit);
				if (!reduced) flight(exit.x, exit.y, { visualDuration: 0.5, bounce: 0 });
				void opacity
					.set(
						0,
						reduced
							? { duration: 150, easing: (t) => t }
							: { duration: 220, delay: 120, easing: m.ease.standard }
					)
					.then(() => {
						if (!cancelled) onGone(id);
					});
			} else if (wasDecided || !settled) {
				wasDecided = false;
				settled = true;
				const delay = (returnFrom?.delay ?? 0) * 1000;
				if (reduced) {
					catchTravel();
					void x.set(0, { instant: true });
					void y.set(0, { instant: true });
				} else {
					// Make room immediately, including during the stagger wait. A grab cancels
					// the pending travel, but leaves the independently delayed fade running.
					homing = true;
					const home = () => {
						if (!cancelled) flight(0, 0, m.specs.smooth);
					};
					if (delay) pendingHome = timer = setTimeout(home, delay);
					else home();
				}
				void opacity.set(1, {
					delay,
					duration: reduced ? 150 : 160,
					easing: reduced ? (t) => t : m.ease.enter
				});
			}
			return () => {
				cancelled = true;
				clearTimeout(timer);
				void opacity.set(opacity.current, { duration: 0 });
			};
		});
	});
	let liftFrame = 0,
		pendingLift = 0;
	function flushLift() {
		if (!liftFrame) return;
		cancelAnimationFrame(liftFrame);
		liftFrame = 0;
		onLift(pendingLift);
	}
	onDestroy(() => {
		if (liftFrame) cancelAnimationFrame(liftFrame);
	});

	$effect(() => {
		if (!interactive) {
			untrack(() => {
				if (liftFrame) cancelAnimationFrame(liftFrame);
				liftFrame = 0;
			});
			return;
		}
		const cx = px,
			cy = py;
		untrack(() => {
			if (homing) return;
			pendingLift = clamp(Math.hypot(cx, cy * 0.5) / 160);
			if (drag) {
				// Motion publishes a derived pointer target in pre-render, after
				// followers have sampled this frame's previous target.
				if (liftFrame) cancelAnimationFrame(liftFrame);
				liftFrame = requestAnimationFrame(() => {
					liftFrame = 0;
					onLift(pendingLift);
				});
			} else {
				if (liftFrame) cancelAnimationFrame(liftFrame);
				liftFrame = 0;
				onLift(pendingLift);
			}
		});
	});
	$effect(() => {
		if (travelling && !releasedX.running && releasedX.current === 0)
			untrack(() => {
				homing = false;
			});
	});
	function resist(raw: number) {
		const d = Math.abs(raw);
		return d <= 48 ? raw : Math.sign(raw) * (48 + (1 - 1 / (((d - 48) * 0.55) / 140 + 1)) * 140);
	}
	function unresist(raw: number) {
		const d = Math.abs(raw);
		if (d <= 48) return raw;
		const stretch = Math.min(d - 48, 139);
		return Math.sign(raw) * (48 + ((1 / (1 - stretch / 140) - 1) * 140) / 0.55);
	}
	function down(event: PointerEvent & { currentTarget: HTMLDivElement }) {
		if (!interactive || event.button !== 0 || !event.isPrimary) return;
		if (
			event.target instanceof Element &&
			event.target.closest('button,a,input,select,textarea,[role="button"]')
		)
			return;
		catchTravel();
		homing = false;
		if (Math.abs(px) < 2) {
			const rect = event.currentTarget.getBoundingClientRect();
			tilt = event.clientY < rect.top + rect.height / 2 ? 1 : -1;
		}
		drag = {
			pointer: event.pointerId,
			ox: event.clientX - px,
			oy: event.clientY - unresist(py),
			samples: [{ t: event.timeStamp, x: event.clientX, y: event.clientY }]
		};
		event.currentTarget.setPointerCapture(event.pointerId);
		event.currentTarget.setAttribute('data-dragging', '');
	}
	function move(event: PointerEvent) {
		const state = drag;
		if (!state || !interactive || state.pointer !== event.pointerId) return;
		void x.set(event.clientX - state.ox, { instant: true });
		void y.set(resist(event.clientY - state.oy), { instant: true });
		state.samples.push({ t: event.timeStamp, x: event.clientX, y: event.clientY });
		if (state.samples.length > 12) state.samples.shift();
	}
	function up(event: PointerEvent & { currentTarget: HTMLDivElement }) {
		const state = drag;
		if (state && state.pointer !== event.pointerId) return;
		drag = null;
		event.currentTarget.removeAttribute('data-dragging');
		if (event.currentTarget.hasPointerCapture(event.pointerId))
			event.currentTarget.releasePointerCapture(event.pointerId);
		if (!state || !interactive) return;
		flushLift();
		const recent = state.samples.filter((sample) => event.timeStamp - sample.t <= 80),
			first = recent[0],
			last = recent.at(-1),
			seconds = first && last ? (last.t - first.t) / 1000 : 0;
		const velocity =
			event.type === 'pointercancel' ||
			!first ||
			!last ||
			first === last ||
			event.timeStamp - last.t > 60 ||
			seconds <= 0
				? { x: 0, y: 0 }
				: { x: (last.x - first.x) / seconds, y: (last.y - first.y) / seconds };
		if (onRelease(id, { x: px, y: py }, velocity, event.currentTarget.offsetWidth)) return;
		if (reduced) {
			catchTravel();
			void x.set(0, { instant: true });
			void y.set(0, { instant: true });
		} else flight(0, 0, m.specs.morph);
	}
</script>

<div
	class="arc-card-stack__slot"
	style:z-index={zIndex}
	style:transform="translateY({shown * 12}px) scale({1 - shown * 0.05})"
	style:opacity={clamp(3 - shown)}
	aria-hidden={interactive ? undefined : true}
	inert={!interactive}
>
	<div
		bind:this={card}
		class="arc-card-stack__card"
		style:transform="translate({px}px,{py}px) rotate({px * 0.065 * tilt}deg)"
		style:opacity={opacity.current}
		data-top={interactive ? '' : undefined}
		data-flying={decision ? '' : undefined}
		role={interactive ? 'group' : undefined}
		aria-label={interactive ? label : undefined}
		onpointerdown={down}
		onpointermove={move}
		onpointerup={up}
		onpointercancel={up}
	>
		<div class="arc-card-stack__face">
			{@render children()}<span
				class="arc-card-stack__shade"
				style:opacity={clamp(shown / 2)}
				aria-hidden="true"
			></span>
		</div>
		<span
			class="arc-card-stack__stamp"
			data-side="right"
			style:opacity={clamp((px - 16) / 80)}
			aria-hidden="true"><Check size={16} strokeWidth={2} />{labels.right}</span
		><span
			class="arc-card-stack__stamp"
			data-side="left"
			style:opacity={clamp((-px - 16) / 80)}
			aria-hidden="true"><X size={16} strokeWidth={2} />{labels.left}</span
		>
	</div>
</div>
