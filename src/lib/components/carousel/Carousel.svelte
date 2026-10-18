<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Pause from '@lucide/svelte/icons/pause';
	import Play from '@lucide/svelte/icons/play';
	import { Mounted, PhysicalSpring, motionTokens as m, swap } from '#lib/motion';
	import { clamp, project, rubber, unrubber, velocityOf } from './gesture';
	import type { CarouselProps } from './types';
	import './carousel.css';
	let {
		label,
		children,
		index: controlledIndex = $bindable(),
		defaultIndex = 0,
		onIndexChange,
		slideSize = 'min(80cqw, 340px)',
		slideLabel = (i, count) => `${i + 1} of ${count}`,
		interval,
		autoplay = false,
		class: className
	}: CarouselProps = $props();
	const count = $derived(children.length),
		last = $derived(Math.max(0, count - 1));
	const id = $props.id();
	const mounted = new Mounted();
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	let ownIndex = $state(untrack(() => clamp(defaultIndex, 0, last)));
	const index = $derived(clamp(controlledIndex ?? ownIndex, 0, last));
	const startIndex = untrack(() => index);
	let playing = $state(untrack(() => autoplay)),
		hovered = $state(false),
		focusPaused = $state(false),
		dragging = $state(false),
		inView = $state(true),
		pageVisible = $state(true),
		announcement = $state('');
	const x = new PhysicalSpring(0, m.specs.smooth);
	onDestroy(() => x.destroy());
	let step = $state(0),
		viewportWidth = 0;
	const progress = $derived(step ? -x.current / step : startIndex);
	const drains = $derived.by(() =>
		Array.from({ length: count }, () => ({
			value: new Tween(0),
			token: undefined as object | undefined
		}))
	);
	let root = $state<HTMLElement>(),
		viewport = $state<HTMLDivElement>(),
		track = $state<HTMLDivElement>(),
		play = $state<HTMLButtonElement>();
	const tabRefs = $state<(HTMLButtonElement | undefined)[]>([]);
	let target = untrack(() => index);
	type Drag = {
		pointer: number;
		startX: number;
		startY: number;
		origin: number;
		from: number;
		locked: 'x' | 'y' | null;
		caught: boolean;
		samples: [number, number][];
	};
	let drag: Drag | null = null;
	const wheel = {
		active: false,
		raw: 0,
		timer: undefined as ReturnType<typeof setTimeout> | undefined
	};
	let swallowClick = false;
	const canRotate = $derived(Boolean(interval) && count > 1 && !(mounted.current && reduced));
	const running = $derived(
		canRotate && playing && !hovered && !focusPaused && !dragging && inView && pageVisible
	);
	const bounds = () => ({ min: -last * step, max: 0 });
	function band(raw: number) {
		const { min, max } = bounds(),
			size = viewportWidth || 1;
		return raw > max
			? max + rubber(raw - max, size)
			: raw < min
				? min - rubber(min - raw, size)
				: raw;
	}
	function unband(shown: number) {
		const { min, max } = bounds(),
			size = viewportWidth || 1;
		return shown > max
			? max + unrubber(shown - max, size)
			: shown < min
				? min - unrubber(min - shown, size)
				: shown;
	}
	function stop() {
		x.stop();
	}
	// The source time-defined spring resets velocity; projection still chooses the landing slide.
	function glide(to: number) {
		if (step) x.to(-to * step, m.specs.smooth, reduced);
	}
	function select(to: number, announce = true) {
		const next = clamp(to, 0, last);
		target = next;
		glide(next);
		if (next === index) return;
		if (controlledIndex === undefined) ownIndex = next;
		else if (!onIndexChange) controlledIndex = next;
		onIndexChange?.(next);
		if (announce) announcement = slideLabel(next, count);
	}
	function measure() {
		if (!track || !viewport) return;
		const [first, second] = Array.from(track.children) as HTMLElement[];
		if (!first) return;
		const center = (node: HTMLElement) => {
			const r = node.getBoundingClientRect();
			return r.left + r.width / 2;
		};
		const next = second ? center(second) - center(first) : first.offsetWidth;
		const changed = next !== step;
		step = next;
		viewportWidth = viewport.clientWidth;
		track.dataset.measured = '';
		if (changed && !drag) x.jump(-target * step);
	}
	$effect(() => {
		const node = viewport;
		if (!node) return;
		untrack(measure);
		const observer = new ResizeObserver(() => untrack(measure));
		observer.observe(node);
		return () => observer.disconnect();
	});
	$effect(() => {
		const next = index;
		untrack(() => {
			if (target !== next) {
				target = next;
				glide(next);
			}
		});
	});
	// A drain survives its slide's departure until its shrinking pill has moved a full step away.
	$effect(() => {
		const position = progress,
			list = drains;
		untrack(() =>
			list.forEach((drain, i) => {
				if (i !== target && Math.abs(position - i) >= 1 && drain.value.current !== 0) {
					drain.token = undefined;
					void drain.value.set(0, { duration: 0 });
				}
			})
		);
	});
	$effect(() => {
		const active = running,
			duration = interval,
			i = index,
			list = drains;
		if (!active || !duration || !list[i]) return;
		const drain = list[i];
		const token = {};
		drain.token = token;
		untrack(() => {
			void drain.value
				.set(1, { duration: (1 - drain.value.current) * duration, easing: (t) => t })
				.then(() => {
					if (drain.token === token) select(index >= last ? 0 : index + 1, false);
				});
		});
		return () => {
			if (drain.token === token) {
				drain.token = undefined;
				void drain.value.set(drain.value.current, { duration: 0 });
			}
		};
	});
	$effect(() => {
		const node = root;
		if (!interval || !node) return;
		const observer =
			typeof IntersectionObserver === 'undefined'
				? undefined
				: new IntersectionObserver(([entry]) => {
						if (entry) inView = entry.isIntersecting;
					});
		observer?.observe(node);
		const visibility = () => {
			pageVisible = document.visibilityState !== 'hidden';
		};
		document.addEventListener('visibilitychange', visibility);
		return () => {
			observer?.disconnect();
			document.removeEventListener('visibilitychange', visibility);
		};
	});
	function onwheel(event: WheelEvent) {
		if (count < 2 || drag || !step) return;
		if (!wheel.active && Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
		event.preventDefault();
		if (!wheel.active) {
			wheel.active = true;
			stop();
			wheel.raw = unband(x.current);
		}
		wheel.raw -= event.deltaX * (event.deltaMode === 1 ? 16 : 1);
		x.jump(band(wheel.raw));
		clearTimeout(wheel.timer);
		wheel.timer = setTimeout(() => {
			wheel.active = false;
			select(Math.round(-x.current / step));
		}, 120);
	}
	$effect(() => {
		const node = viewport;
		if (!node) return;
		node.addEventListener('wheel', onwheel, { passive: false });
		return () => {
			node.removeEventListener('wheel', onwheel);
			clearTimeout(wheel.timer);
		};
	});
	function slideAt(clientX: number) {
		return Array.from(track?.children ?? []).findIndex((node) => {
			const r = node.getBoundingClientRect();
			return clientX >= r.left && clientX <= r.right;
		});
	}
	function onpointerdown(event: PointerEvent) {
		if (count < 2 || drag || !step || (event.pointerType === 'mouse' && event.button !== 0)) return;
		swallowClick = false;
		const caught = Math.abs(x.current + target * step) > 12;
		if (caught) stop();
		drag = {
			pointer: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			origin: 0,
			from: target,
			locked: null,
			caught,
			samples: []
		};
	}
	function onpointermove(event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }) {
		const current = drag;
		if (!current || current.pointer !== event.pointerId) return;
		if (!current.locked) {
			const dx = event.clientX - current.startX,
				dy = event.clientY - current.startY;
			if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
			if (Math.abs(dy) > Math.abs(dx)) {
				current.locked = 'y';
				return;
			}
			// Consume the slop so acquiring horizontal capture never jumps the track.
			current.locked = 'x';
			stop();
			current.startX = event.clientX;
			current.origin = unband(x.current);
			event.currentTarget.setPointerCapture(event.pointerId);
			dragging = true;
		}
		if (current.locked !== 'x') return;
		x.jump(band(current.origin + event.clientX - current.startX));
		current.samples.push([event.timeStamp, event.clientX]);
		if (current.samples.length > 16) current.samples.shift();
	}
	function finish(event: PointerEvent, cancelled: boolean) {
		const current = drag;
		if (!current || current.pointer !== event.pointerId) return;
		drag = null;
		if (current.locked === 'x') {
			swallowClick = true;
			dragging = false;
			const velocity = cancelled ? 0 : velocityOf(current.samples, event.timeStamp);
			let to = Math.round(-(x.current + project(velocity)) / step);
			if (Math.abs(velocity) > 360) {
				const direction = velocity < 0 ? 1 : -1;
				if ((to - current.from) * direction < 1) to = current.from + direction;
			}
			select(to);
		} else if (current.caught) {
			swallowClick = true;
			select(Math.round(-x.current / step));
		} else if (!cancelled && current.locked === null) {
			const hit = slideAt(event.clientX);
			if (hit >= 0 && hit !== target) {
				swallowClick = true;
				select(hit);
			}
		} else if (cancelled) select(target);
	}
	function onkeydown(event: KeyboardEvent) {
		if (event.altKey || event.ctrlKey || event.metaKey || count < 2) return;
		const node = event.target as HTMLElement;
		if (node.closest('input, textarea, select, [contenteditable]')) return;
		const to =
			event.key === 'ArrowLeft'
				? target - 1
				: event.key === 'ArrowRight'
					? target + 1
					: event.key === 'Home'
						? 0
						: event.key === 'End'
							? last
							: null;
		if (to === null) return;
		event.preventDefault();
		const next = clamp(to, 0, last);
		select(next);
		if (node.getAttribute('role') === 'tab') tabRefs[next]?.focus({ preventScroll: true });
		else if (track?.contains(node)) viewport?.focus({ preventScroll: true });
	}
	function toggleRotation() {
		if (!playing) {
			playing = true;
			return;
		}
		playing = false;
		const drain = drains[index];
		if (drain) {
			drain.token = {};
			void drain.value.set(0, {
				duration: reduced ? 0 : m.duration.standard,
				easing: m.ease.standard
			});
		}
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<section
	bind:this={root}
	class={['arc-carousel__root', className]}
	style="--carousel-slide: {slideSize}; --carousel-start: {startIndex}"
	aria-roledescription="carousel"
	aria-label={label}
	{onkeydown}
	onfocusin={(event) => {
		focusPaused = event.target !== play && (event.target as HTMLElement).matches(':focus-visible');
	}}
	onfocusout={(event) => {
		if (!event.currentTarget.contains(event.relatedTarget as Node | null)) focusPaused = false;
	}}
>
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_no_noninteractive_tabindex -->
	<div
		bind:this={viewport}
		class="arc-carousel__viewport"
		role="group"
		aria-label="Slides"
		tabindex="0"
		data-dragging={dragging || undefined}
		{onpointerdown}
		{onpointermove}
		onpointerup={(event) => finish(event, false)}
		onpointercancel={(event) => finish(event, true)}
		onpointerenter={(event) => {
			if (event.pointerType === 'mouse') hovered = true;
		}}
		onpointerleave={() => {
			hovered = false;
		}}
		onclickcapture={(event) => {
			if (swallowClick) {
				event.preventDefault();
				event.stopPropagation();
				swallowClick = false;
			}
		}}
		ondragstart={(event) => event.preventDefault()}
	>
		<div bind:this={track} class="arc-carousel__track" style:transform="translateX({x.current}px)">
			{#each children as slide, i (i)}
				{@const distance = Math.min(1, Math.abs(progress - i))}
				<div
					id={`${id}-slide-${i}`}
					class="arc-carousel__slide"
					role="tabpanel"
					aria-roledescription="slide"
					aria-label={slideLabel(i, count)}
					inert={i !== index}
					style="transform:scale({1 - 0.1 * distance});opacity:{1 - 0.5 * distance}"
				>
					{@render slide()}
				</div>
			{/each}
		</div>
	</div>
	{#if count > 1}
		<div class="arc-carousel__controls">
			{#if canRotate}
				<button
					bind:this={play}
					type="button"
					class="arc-carousel__control"
					aria-label={playing ? 'Pause slide rotation' : 'Start slide rotation'}
					onclick={toggleRotation}
				>
					<span class="arc-carousel__iconSlot"
						>{#key playing}<span
								class="arc-carousel__icon"
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
							>
								{#if playing}<Pause
										size={15}
										strokeWidth={1.75}
										fill="currentColor"
										aria-hidden="true"
									/>{:else}<Play
										size={15}
										strokeWidth={1.75}
										fill="currentColor"
										aria-hidden="true"
									/>{/if}
							</span>{/key}</span
					>
				</button>
			{/if}
			<div class="arc-carousel__tabs" role="tablist" aria-label="Choose a slide">
				{#each children as slide, i (i)}
					{@const emphasis = Math.max(0, 1 - Math.abs(clamp(progress, 0, last) - i))}
					<button
						bind:this={tabRefs[i]}
						type="button"
						role="tab"
						class="arc-carousel__tab"
						aria-selected={i === index}
						aria-controls={`${id}-slide-${i}`}
						aria-label={slideLabel(i, count)}
						tabindex={i === index ? 0 : -1}
						onclick={() => select(i)}
					>
						<span class="arc-carousel__dot" style:width="{6 + 16 * emphasis}px" aria-hidden="true"
							><span class="arc-carousel__dotFill" style:opacity={emphasis}></span><span
								class="arc-carousel__dotDrain"
								style:transform="scaleX({drains[i]?.value.current ?? 0})"
							></span></span
						>
					</button>
				{/each}
			</div>
			<div class="arc-carousel__arrows">
				<button
					type="button"
					class="arc-carousel__control"
					aria-label="Previous slide"
					aria-disabled={index === 0}
					onclick={() => {
						if (target > 0) select(target - 1);
					}}><ChevronLeft size={18} strokeWidth={1.75} aria-hidden="true" /></button
				>
				<button
					type="button"
					class="arc-carousel__control"
					aria-label="Next slide"
					aria-disabled={index === last}
					onclick={() => {
						if (target < last) select(target + 1);
					}}><ChevronRight size={18} strokeWidth={1.75} aria-hidden="true" /></button
				>
			</div>
		</div>
	{/if}
	<span class="arc-carousel__visuallyHidden" aria-live="polite" aria-atomic="true"
		>{announcement}</span
	>
</section>
