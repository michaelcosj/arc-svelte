<script lang="ts">
	import { untrack } from 'svelte';
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import X from '@lucide/svelte/icons/x';
	import {
		HeightMorph,
		Mounted,
		contentSwap,
		motionTokens as m,
		springPosition,
		springCurve,
		easeInOut,
		swap,
		PointerVelocity
	} from '#lib/motion';
	import type { TransitionConfig } from 'svelte/transition';
	import type { ToastProps } from './types';
	import './toast.css';
	let { title, description, open = true, onOpenChange, duration = 4500 }: ToastProps = $props();
	const id = $props.id();
	const enterOnMount =
		typeof document !== 'undefined' && !document.querySelector(`[data-toast-ssr="${id}"]`);
	const mounted = new Mounted();
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	let dismissed = $state(false);
	let lastOpen = untrack(() => open);
	let throwX = 0;
	let velocity = 0;
	let surface = $state<HTMLDivElement>();
	const x = new Tween(0);
	const height = new HeightMorph(() => ({ reduced }));
	const motion = $derived(contentSwap(reduced, mounted.current));
	const visible = $derived(open && !dismissed);
	$effect.pre(() => {
		const next = open;
		untrack(() => {
			if (next !== lastOpen) {
				lastOpen = next;
				if (next) {
					dismissed = false;
					throwX = 0;
				}
			}
		});
	});
	$effect.pre(() => {
		void title;
		void description;
		height.changed();
	});
	function dismiss(to = 0) {
		throwX = to;
		dismissed = true;
		onOpenChange?.(false);
	}
	$effect(() => {
		if (!visible || !onOpenChange || duration <= 0) return;
		const timer = setTimeout(() => dismiss(), duration);
		return () => clearTimeout(timer);
	});
	let drag:
		| { id: number; start: number; last: number; offset: number; samples: PointerVelocity }
		| undefined;
	function down(event: PointerEvent & { currentTarget: HTMLDivElement }) {
		if (reduced || event.button !== 0 || (event.target as Element).closest('button')) return;
		drag = {
			id: event.pointerId,
			start: event.clientX,
			last: event.clientX,
			offset: x.current,
			samples: new PointerVelocity(event.clientX, event.timeStamp)
		};
		void x.set(x.current, { duration: 0 });
		event.currentTarget.setPointerCapture(event.pointerId);
	}
	function move(event: PointerEvent) {
		if (!drag || drag.id !== event.pointerId) return;
		void x.set(drag.offset + event.clientX - drag.start, { duration: 0 });
		drag.last = event.clientX;
		drag.samples.push(event.clientX, event.timeStamp);
	}
	function end(event: PointerEvent) {
		if (!drag || drag.id !== event.pointerId) return;
		// Cancellation carries the last valid touch position, as Motion's pan session does.
		const released = event.type === 'pointercancel' ? drag.last : event.clientX;
		velocity = drag.samples.at(released, event.timeStamp);
		const offset = released - drag.start;
		drag = undefined;
		if (Math.abs(offset) < 80 && Math.abs(velocity) < 480) {
			const from = x.current;
			const curve = springPosition(m.specs.snappy, Math.abs(from) > 0.001 ? velocity / -from : 0);
			void x.set(0, {
				duration: m.spring.snappy.duration,
				easing: (t) => curve((t * m.spring.snappy.duration) / 1000)
			});
			return;
		}
		dismiss(Math.sign(offset || velocity) * ((surface?.offsetWidth ?? 320) + 48));
	}
	function presence(
		node: HTMLElement,
		_: undefined,
		{ direction }: { direction: 'in' | 'out' | 'both' }
	): TransitionConfig {
		const entering = direction !== 'out';
		const returning = entering && node.dataset.leaving === 'true';
		const computed = getComputedStyle(node);
		const matrix = new DOMMatrixReadOnly(
			computed.transform === 'none' ? undefined : computed.transform
		);
		const startOpacity = entering && !returning ? 0 : Number(computed.opacity);
		const startY = entering && !returning ? 16 : matrix.f;
		const startScale = entering && !returning ? 0.96 : matrix.a;
		const startX = returning ? matrix.e + (parseFloat(computed.translate) || 0) : matrix.e;
		node.dataset.leaving = entering ? 'false' : 'true';
		const skip = entering && !mounted.current && !enterOnMount;
		const thrown = !entering && throwX !== 0 && !reduced;
		const from = x.current;
		const to = throwX - from;
		const throwCurve = springPosition(
			{ visualDuration: 0.3, bounce: 0 },
			Math.abs(to) > 0.001 ? velocity / to : 0
		);
		const rise = springCurve(m.specs.morph, Math.abs(startY));
		const scale = springCurve(m.specs.morph, Math.abs(1 - startScale));
		const slide = springCurve(m.specs.morph, Math.abs(startX));
		const duration = skip
			? 0
			: reduced
				? m.duration.instant
				: entering
					? Math.max(rise.duration, scale.duration, returning ? slide.duration : 0)
					: thrown
						? 450
						: m.duration.exit;
		if (entering) void x.set(0, { duration: 0 });
		return {
			duration,
			css: (t) => {
				if (skip) return '';
				const elapsed = (entering ? t : 1 - t) * duration;
				const p = entering
					? rise.easing(Math.min(1, elapsed / rise.duration))
					: m.ease.standard(Math.min(1, elapsed / duration));
				const fade = entering
					? m.ease.enter(Math.min(1, elapsed / m.duration.standard))
					: thrown
						? easeInOut(Math.min(1, elapsed / m.duration.exit))
						: p;
				const opacity = entering
					? startOpacity + (1 - startOpacity) * (reduced ? t : fade)
					: startOpacity * (reduced ? t : 1 - fade);
				if (reduced) return `opacity:${opacity}`;
				if (thrown)
					return `opacity:${opacity};transform:translate(${startX + to * throwCurve(elapsed / 1000)}px, ${startY}px) scale(${startScale});`;
				return `opacity:${opacity};transform:translate(${entering ? startX * (1 - slide.easing(Math.min(1, elapsed / slide.duration))) : startX}px, ${startY + ((entering ? 0 : 8) - startY) * p}px) scale(${startScale + ((entering ? 1 : 0.97) - startScale) * (entering ? scale.easing(Math.min(1, elapsed / scale.duration)) : p)});`;
			}
		};
	}
</script>

{#if visible}
	<div
		bind:this={surface}
		class="arc-toast"
		role="status"
		aria-live="polite"
		aria-atomic="true"
		data-toast-ssr={!mounted.current ? id : undefined}
		style:translate={`${x.current}px 0`}
		style:touch-action={reduced ? 'auto' : 'pan-y'}
		in:presence
		out:presence
		onpointerdown={down}
		onpointermove={move}
		onpointerup={end}
		onpointercancel={end}
	>
		<span class="arc-toast__icon" aria-hidden="true"
			><svg
				width={16}
				height={16}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width={2.25}
				stroke-linecap="round"
				stroke-linejoin="round"
				><path class="arc-toast__check" pathLength={1} d="M4 12.5l5 5L20 6.5" /></svg
			></span
		>
		<div class="arc-toast__frame" {@attach height.body}>
			<div class="arc-toast__copy" {@attach height.content}>
				<strong class="arc-toast__title"
					>{#key title}<span
							class="arc-toast__line"
							in:swap={motion.textIn}
							out:swap={motion.textOut}>{title}</span
						>{/key}</strong
				>{#each description ? [description] : [] as text (text)}<span
						class="arc-toast__description"
						in:swap={motion.textIn}
						out:swap={motion.textOut}>{text}</span
					>{/each}
			</div>
		</div>
		<button
			class="arc-toast__close"
			type="button"
			aria-label="Dismiss notification"
			onclick={() => dismiss()}
			><X width={16} height={16} strokeWidth={2} aria-hidden="true" /></button
		>
	</div>
{/if}
