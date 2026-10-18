<script lang="ts">
	import { Dialog as Primitive } from 'bits-ui';
	import X from '@lucide/svelte/icons/x';
	import { prefersReducedMotion, Tween } from 'svelte/motion';
	import type { TransitionConfig } from 'svelte/transition';
	import {
		easeOut,
		motionTokens as m,
		springCurve,
		springPosition,
		swap,
		layer,
		PointerVelocity,
		type SwapParams
	} from '#lib/motion';
	import { getDrawer } from './drawer-state.svelte';
	import DrawerText from './DrawerText.svelte';
	import type { DrawerContentProps } from './types';
	import './drawer.css';

	let {
		title,
		description,
		children,
		side = 'right',
		container,
		class: className,
		ref = $bindable(null),
		onOpenAutoFocus,
		...props
	}: DrawerContentProps = $props();
	const drawer = getDrawer();
	const reduced = $derived(prefersReducedMotion.current);
	const horizontal = $derived(side === 'left' || side === 'right');
	const sign = $derived(side === 'right' || side === 'bottom' ? 1 : -1);
	const offset = new Tween(0);
	let panel: HTMLElement | undefined;
	let drag: { id: number; start: number; offset: number; samples: PointerVelocity } | undefined;
	let flung = false;
	let velocity = 0;
	let interrupted = false;
	const point = (event: PointerEvent) => (horizontal ? event.clientX : event.clientY);
	const size = () => (horizontal ? panel?.offsetWidth : panel?.offsetHeight) ?? 480;
	function trackPanel(node: HTMLElement) {
		panel = node;
		return () => {
			if (panel === node) {
				panel = undefined;
				interrupted = false;
				drag = undefined;
				void offset.set(0, { duration: 0 });
			}
		};
	}
	const readOffset = (node: HTMLElement) => {
		const transform = getComputedStyle(node).transform;
		if (transform === 'none') return 0;
		const matrix = new DOMMatrixReadOnly(transform);
		return horizontal ? matrix.m41 : matrix.m42;
	};

	const fade: SwapParams = { duration: m.duration.instant, easing: easeOut };
	const overlayIn = $derived(
		reduced ? fade : { duration: m.duration.standard, easing: m.ease.enter }
	);
	const overlayOut = $derived(
		reduced ? fade : { duration: m.duration.fast, easing: m.ease.standard }
	);

	/** Starts at the current painted offset, including a drag or an interrupted entrance. */
	function slide(
		node: HTMLElement,
		_: undefined,
		options: { direction?: 'in' | 'out' | 'both' }
	): TransitionConfig {
		panel = node;
		const out = options.direction === 'out';
		node.dataset.state = out ? 'closed' : 'open';
		if (reduced) return swap(node, fade, options);
		const from = out || interrupted ? readOffset(node) : sign * size();
		const to = out ? sign * size() : 0;
		interrupted = out;
		void offset.set(0, { duration: 0 });
		const fling = out && flung;
		const curve = fling
			? springCurve({ visualDuration: 0.24, bounce: 0 }, Math.abs(to - from))
			: out
				? { duration: m.duration.standard, easing: m.ease.standard }
				: springCurve(m.specs.smooth, 100);
		const physics = fling
			? springPosition(
					{ visualDuration: 0.24, bounce: 0 },
					Math.abs(to - from) > 0.001 ? velocity / (to - from) : 0
				)
			: undefined;
		flung = false;
		return {
			duration: curve.duration,
			css: (t) => {
				const elapsed = out ? 1 - t : t;
				const progress = physics
					? physics((elapsed * curve.duration) / 1000)
					: curve.easing(elapsed);
				const value = from + (to - from) * progress;
				const shadowProgress = (elapsed * curve.duration) / m.duration.standard;
				const opacity = out ? Math.min(1, Math.max(0, (1 - shadowProgress) / 0.35)) : 1;
				return `transform: translate${horizontal ? 'X' : 'Y'}(${value}px); opacity: ${opacity};`;
			}
		};
	}

	function panStart(event: PointerEvent) {
		if (
			reduced ||
			event.button !== 0 ||
			(event.target instanceof Element &&
				event.target.closest("button, a, input, select, textarea, [role='button']")) ||
			!panel
		)
			return;
		const position = readOffset(panel);
		for (const animation of panel.getAnimations()) animation.cancel();
		void offset.set(position, { duration: 0 });
		drag = {
			id: event.pointerId,
			start: point(event),
			offset: position,
			samples: new PointerVelocity(point(event), event.timeStamp)
		};
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}
	function panMove(event: PointerEvent) {
		if (!drag || drag.id !== event.pointerId) return;
		const toward = (drag.offset + point(event) - drag.start) * sign;
		void offset.set(sign * (toward >= 0 ? toward : -Math.sqrt(-toward)), { duration: 0 });
		drag.samples.push(point(event), event.timeStamp);
	}
	function panEnd(event: PointerEvent) {
		if (!drag || drag.id !== event.pointerId) return;
		velocity = drag.samples.at(point(event), event.timeStamp);
		drag = undefined;
		const toward = offset.current * sign;
		if (
			event.type !== 'pointercancel' &&
			(toward > size() / 3 || (toward > 0 && velocity * sign > 500))
		) {
			flung = true;
			drawer.close();
		} else void offset.set(0, m.spring.snappy);
	}
</script>

<Primitive.Portal to={container ?? undefined}>
	<Primitive.Overlay forceMount>
		{#snippet child({ props: overlayProps, open })}
			{#if open}<div
					{...overlayProps}
					class="arc-drawer__overlay"
					data-contained={container ? '' : undefined}
					in:layer={overlayIn}
					out:layer={overlayOut}
				></div>{/if}
		{/snippet}
	</Primitive.Overlay>
	<Primitive.Content
		{...props}
		bind:ref
		forceMount
		onOpenAutoFocus={(event) => {
			onOpenAutoFocus?.(event);
			if (event.defaultPrevented) return;
			event.preventDefault();
			panel?.querySelector<HTMLButtonElement>('.arc-drawer__close')?.focus({ preventScroll: true });
		}}
	>
		{#snippet child({ props: contentProps, open })}
			{#if open}
				<div
					{...contentProps}
					class={['arc-drawer__content', className]}
					data-side={side}
					data-contained={container ? '' : undefined}
					style:contain="none"
					style:transform={offset.current
						? `translate${horizontal ? 'X' : 'Y'}(${offset.current}px)`
						: undefined}
					in:slide
					out:slide
					{@attach trackPanel}
				>
					<!-- The optional drag supplements the accessible Close button, like the original header. -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class={['arc-drawer__header', !reduced && 'arc-drawer__handle']}
						onpointerdown={panStart}
						onpointermove={panMove}
						onpointerup={panEnd}
						onpointercancel={panEnd}
					>
						<div>
							<Primitive.Title
								>{#snippet child({ props: titleProps })}{@const {
										role: _role,
										'aria-level': _level,
										...heading
									} = titleProps}
									<h2 {...heading} class="arc-drawer__title">
										<DrawerText text={title} />
									</h2>{/snippet}</Primitive.Title
							>
							{#if description}<Primitive.Description
									>{#snippet child({ props: descriptionProps })}<p
											{...descriptionProps}
											class="arc-drawer__description"
										>
											<DrawerText text={description} />
										</p>{/snippet}</Primitive.Description
								>{/if}
						</div>
						<Primitive.Close class="arc-drawer__close" aria-label="Close drawer"
							><X size={16} strokeWidth={1.75} aria-hidden="true" /></Primitive.Close
						>
					</div>
					<div class="arc-drawer__body">{@render children()}</div>
				</div>
			{/if}
		{/snippet}
	</Primitive.Content>
</Primitive.Portal>
