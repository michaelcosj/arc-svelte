<script lang="ts">
	import { untrack } from 'svelte';
	import { Spring } from 'svelte/motion';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import Info from '@lucide/svelte/icons/info';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import X from '@lucide/svelte/icons/x';
	import {
		motionTokens as m,
		Mounted,
		contentSwap,
		swap,
		widthPresence,
		springCurve,
		PhysicalSpring,
		TimedTween
	} from '#lib/motion';
	import type { ToastRecord, ToastTarget } from './types';
	import type { ToastQueue } from './toast-stack-state.svelte';
	let {
		toast,
		target,
		present,
		onGone,
		expanded,
		front,
		hidden,
		paused,
		reduced,
		queue,
		measure,
		onDragChange,
		onTap,
		handoff
	}: {
		toast: ToastRecord;
		present: boolean;
		onGone: () => void;
		target: ToastTarget;
		expanded: boolean;
		front: boolean;
		hidden: boolean;
		paused: boolean;
		reduced: boolean;
		queue: ToastQueue;
		measure: (id: string, height: number) => void;
		onDragChange: (dragging: boolean) => void;
		onTap: () => void;
		handoff: (leaving: HTMLElement, keyboard: boolean) => void;
	} = $props();
	const id = untrack(() => toast.id),
		mounted = new Mounted();
	let item = $state<HTMLLIElement>(),
		close = $state<HTMLButtonElement>();
	const stackY = new PhysicalSpring(0, m.specs.smooth),
		stackScale = new PhysicalSpring(1, m.specs.smooth),
		opacity = new TimedTween<number>(0),
		contentOpacity = new TimedTween<number>(1),
		x = new Spring(0, { ...m.physics.snappy, precision: 0.01 }),
		height = new PhysicalSpring(0, m.specs.smooth, { delta: 0.5, speed: 2 }),
		release = new PhysicalSpring(0, m.specs.snappy, { delta: 0.5, speed: 2 });
	let releasing = $state(false);
	const offset = $derived(releasing ? release.current : x.current);
	$effect(() => () => {
		stackY.destroy();
		stackScale.destroy();
		height.destroy();
		release.destroy();
	});
	let applied: boolean | null = null,
		swiped = false,
		suppressClick = false,
		pointerType = 'mouse',
		leaving = false;
	const motion = $derived(contentSwap(reduced, mounted.current));
	const Icon = $derived(
		toast.type === 'loading'
			? null
			: { success: CircleCheck, info: Info, warning: TriangleAlert, error: CircleX }[toast.type]
	);
	const typeLabels = {
		success: 'Success',
		info: 'Info',
		warning: 'Warning',
		error: 'Error',
		loading: 'In progress'
	};
	$effect(() => {
		const next = target,
			live = present,
			expand = expanded,
			reduce = reduced;
		if (!live || next.height <= 0) return;
		untrack(() => {
			leaving = false;
			const entering = applied === null,
				morph = !entering && applied !== expand;
			applied = expand;
			const spec = morph ? m.specs.morph : m.specs.smooth;
			if (entering && !reduce) {
				stackY.jump(next.y + next.height);
				stackScale.jump(next.scale);
				height.jump(next.height);
				void contentOpacity.set(next.content, { duration: 0 });
			}
			if (reduce) {
				stackY.jump(next.y);
				stackScale.jump(next.scale);
			} else {
				stackY.to(next.y, spec);
				stackScale.to(next.scale, spec);
			}
			if (entering || reduce) height.jump(next.height);
			else height.to(next.height, spec);
			void opacity.set(next.opacity, {
				duration: reduce ? 160 : entering ? 240 : 160,
				easing: entering && !reduce ? m.ease.enter : m.ease.standard
			});
			void contentOpacity.set(next.content, { duration: 160, easing: m.ease.standard });
		});
	});
	function measureContent(node: HTMLElement) {
		const report = () => measure(id, node.offsetHeight + 2);
		report();
		const observer = new ResizeObserver(report);
		observer.observe(node);
		return () => observer.disconnect();
	}
	let remaining = 0,
		lastVersion = -1;
	$effect(() => {
		const version = toast.version,
			duration = toast.duration,
			held = paused || !present;
		if (version !== lastVersion) {
			lastVersion = version;
			remaining = duration;
		}
		if (held || !Number.isFinite(remaining) || duration <= 0) return;
		const started = performance.now(),
			timer = setTimeout(() => queue.dismiss(id), Math.max(remaining, 0));
		return () => {
			clearTimeout(timer);
			remaining -= performance.now() - started;
		};
	});
	type Gesture = {
		id: number;
		startX: number;
		startY: number;
		origin: number;
		active: boolean;
		samples: { t: number; x: number }[];
	};
	let gesture: Gesture | undefined;
	function down(event: PointerEvent) {
		pointerType = event.pointerType;
		suppressClick = false;
		if (event.button !== 0 || leaving || (event.target as Element).closest('button,a')) return;
		const caught = offset;
		release.jump(caught);
		releasing = false;
		void x.set(caught, { instant: true });
		gesture = {
			id: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			origin: caught,
			active: false,
			samples: []
		};
	}
	function move(event: PointerEvent & { currentTarget: HTMLDivElement }) {
		const g = gesture;
		if (!g || g.id !== event.pointerId) return;
		if (!g.active) {
			const dx = event.clientX - g.startX,
				dy = event.clientY - g.startY;
			if (Math.hypot(dx, dy) < 6) return;
			if (Math.abs(dy) > Math.abs(dx)) {
				gesture = undefined;
				return;
			}
			g.active = true;
			g.startX = event.clientX;
			suppressClick = true;
			event.currentTarget.setPointerCapture(event.pointerId);
			event.currentTarget.dataset.dragging = '';
			window.getSelection()?.removeAllRanges();
			onDragChange(true);
		}
		const raw = g.origin + event.clientX - g.startX,
			w = event.currentTarget.offsetWidth;
		void x.set(raw >= 0 ? raw : -(1 - 1 / ((-raw * 0.55) / w + 1)) * w, { instant: true });
		g.samples.push({ t: event.timeStamp, x: raw });
		while (g.samples.length > 2 && event.timeStamp - g.samples[0].t > 100) g.samples.shift();
	}
	function end(event: PointerEvent & { currentTarget: HTMLDivElement }, cancelled: boolean) {
		const g = gesture;
		if (!g || g.id !== event.pointerId) return;
		gesture = undefined;
		if (!g.active) return;
		delete event.currentTarget.dataset.dragging;
		onDragChange(false);
		const first = g.samples[0],
			last = g.samples.at(-1),
			velocity =
				cancelled || !first || !last || last.t === first.t || event.timeStamp - last.t > 60
					? 0
					: ((last.x - first.x) / (last.t - first.t)) * 1000,
			w = event.currentTarget.offsetWidth,
			offset = x.current;
		if (
			!cancelled &&
			offset > 0 &&
			velocity > -200 &&
			offset + ((velocity / 1000) * 0.99) / (1 - 0.99) > w * 0.4
		) {
			swiped = true;
			if (!reduced) {
				release.jump(offset);
				releasing = true;
				release.to(w + 40, { visualDuration: 0.32, bounce: 0 });
			}
			queue.dismiss(id);
			return;
		}
		if (reduced) void x.set(0, { instant: true });
		else {
			release.jump(offset);
			releasing = true;
			// Motion's time-defined snappy spring resets velocity, including an explicit release sample.
			release.to(0, m.specs.snappy);
		}
	}
	function click(event: MouseEvent) {
		if (suppressClick) {
			suppressClick = false;
			return;
		}
		if (pointerType !== 'mouse' && !(event.target as Element).closest('button,a')) onTap();
	}
	function action(event: MouseEvent & { currentTarget: HTMLButtonElement }) {
		const keyboard = event.currentTarget.matches(':focus-visible');
		queue.runAction(id);
		if (keyboard && !queue.toasts.find((t) => t.id === id)?.action) close?.focus();
	}
	function actionPresence(
		node: HTMLElement,
		_: undefined,
		options: { direction?: 'in' | 'out' | 'both' }
	) {
		if (!mounted.current && options.direction !== 'out') return { duration: 0 };
		// A full-row flex basis overrides width: React finishes this slot with its fade alone.
		if (reduced || getComputedStyle(node).flexBasis === '100%')
			return swap(node, { duration: 160, easing: m.ease.standard }, options);
		node.dataset.moving = 'true';
		return widthPresence(
			node,
			{
				spring: springCurve(m.specs.smooth, node.offsetWidth),
				fade: { duration: 160, easing: m.ease.standard }
			},
			options
		);
	}

	$effect(() => {
		const node = item;
		if (present || !node) return;
		return untrack(() => {
			let cancelled = false;
			leaving = true;
			if (gesture?.active) onDragChange(false);
			gesture = undefined;
			const active = document.activeElement;
			if (active instanceof HTMLElement && node.contains(active))
				handoff(node, active.matches(':focus-visible'));
			if (!reduced && !swiped) {
				void stackY.to(stackY.current + 10, m.specs.smooth);
				void stackScale.to(stackScale.current * 0.96, m.specs.smooth);
			}
			void opacity
				.set(0, { duration: reduced ? 160 : swiped ? 220 : 180, easing: m.ease.standard })
				.then(() => {
					if (!cancelled) onGone();
				});
			return () => {
				cancelled = true;
			};
		});
	});
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions (Escape dismisses a notification containing native action buttons) -->
<li
	bind:this={item}
	class="arc-toast-stack__item"
	style:transform={`translateY(${stackY.current}px) scale(${stackScale.current})`}
	style:height={`${height.current}px`}
	style:opacity={opacity.current}
	style:z-index={toast.seq}
	data-front={front}
	data-expanded={expanded}
	inert={hidden || !present}
	aria-hidden={!present ? true : undefined}
	onkeydown={(e) => {
		if (e.key === 'Escape') {
			e.stopPropagation();
			queue.dismiss(id);
		}
	}}
>
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (touch tap fans the stack; keyboard focus provides the same expansion) -->
	<div
		class="arc-toast-stack__card"
		style:transform={`translateX(${offset}px)`}
		style:opacity={offset > 0 ? 1 - Math.min(offset / 280, 1) * 0.75 : 1}
		onpointerdown={down}
		onpointermove={move}
		onpointerup={(e) => end(e, false)}
		onpointercancel={(e) => end(e, true)}
		onclick={click}
	>
		<div
			class="arc-toast-stack__content"
			style:opacity={contentOpacity.current}
			{@attach measureContent}
		>
			<span class="arc-toast-stack__icon" data-type={toast.type} aria-hidden="true"
				>{#key toast.type}<span
						class="arc-toast-stack__glyph"
						in:swap={motion.iconIn}
						out:swap={motion.iconOut}
						>{#if Icon}<Icon width={18} height={18} strokeWidth={1.75} />{:else}<span
								class="arc-toast-stack__spinner"
							></span>{/if}</span
					>{/key}</span
			>
			<div class="arc-toast-stack__copy">
				<span class="arc-toast-stack__srOnly">{typeLabels[toast.type]}: </span><span
					class="arc-toast-stack__title"
					>{#key toast.title}<span
							class="arc-toast-stack__line"
							in:swap={motion.textIn}
							out:swap={motion.textOut}>{toast.title}</span
						>{/key}</span
				>{#each toast.description ? [toast.description] : [] as description (description)}<span
						class="arc-toast-stack__description"
						in:swap={motion.textIn}
						out:swap={motion.textOut}>{description}</span
					>{/each}
			</div>
			{#if toast.action}<div
					class="arc-toast-stack__actionSlot"
					in:actionPresence
					out:actionPresence
					onintroend={(e) => (e.currentTarget.dataset.moving = 'false')}
				>
					<button type="button" class="arc-toast-stack__action" onclick={action}
						>{toast.action.label}</button
					>
				</div>{/if}
			<button
				bind:this={close}
				type="button"
				class="arc-toast-stack__close"
				aria-label="Dismiss notification"
				onclick={() => queue.dismiss(id)}
				><X width={16} height={16} strokeWidth={1.75} aria-hidden="true" /></button
			>
		</div>
	</div>
</li>
