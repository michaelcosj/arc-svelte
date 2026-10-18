<script lang="ts">
	import { LinkPreview } from 'bits-ui';
	import { prefersReducedMotion } from 'svelte/motion';
	import { motionTokens as m, springCurve } from '#lib/motion';
	import type { TransitionConfig } from 'svelte/transition';
	import type { HoverCardProps } from './types';
	import { cards } from './hover-card-state';
	import './hover-card.css';
	let {
		child: triggerChild,
		content,
		side = 'bottom',
		align = 'start',
		openDelay = 500,
		closeDelay = 140,
		class: className
	}: HoverCardProps = $props();
	const id = $props.id();
	let open = $state(false);
	let instant = false;
	let trigger = $state<HTMLElement | null>(null);
	let pendingOpen = 0;
	let pendingClose = 0;
	const inside = { trigger: false, card: false, focus: false };
	let dismissed = false;
	let pointerType = '';
	function clear() {
		clearTimeout(pendingOpen);
		clearTimeout(pendingClose);
	}
	function show() {
		clear();
		dismissed = false;
		cards.open(id);
	}
	function hide() {
		clear();
		cards.close(id);
	}
	function scheduleOpen() {
		clearTimeout(pendingClose);
		if (dismissed || cards.active === id) return;
		clearTimeout(pendingOpen);
		pendingOpen = window.setTimeout(() => cards.open(id), cards.warm() ? 80 : openDelay);
	}
	function scheduleClose() {
		clearTimeout(pendingOpen);
		if (inside.trigger || inside.card || inside.focus) return;
		clearTimeout(pendingClose);
		pendingClose = window.setTimeout(() => cards.close(id), closeDelay);
	}
	$effect(() => {
		const unsubscribe = cards.subscribe(() => {
			instant = cards.instant;
			open = cards.active === id;
		});
		return () => {
			unsubscribe();
			clear();
			cards.close(id);
		};
	});
	function triggerProps(props: HTMLAttributes<HTMLElement>) {
		return {
			...props,
			role: undefined,
			'aria-haspopup': undefined,
			'aria-expanded': undefined,
			'aria-controls': undefined,
			'data-state': undefined,
			'aria-describedby': open ? `${id}-card` : undefined,
			'data-hover-card': open ? 'open' : 'closed',
			onpointerenter: (e: PointerEvent) => {
				if (e.pointerType === 'touch') return;
				inside.trigger = true;
				scheduleOpen();
			},
			onpointerleave: (e: PointerEvent) => {
				if (e.pointerType === 'touch') return;
				inside.trigger = false;
				dismissed = false;
				scheduleClose();
			},
			onpointerdown: (e: PointerEvent) => {
				pointerType = e.pointerType;
			},
			onclick: () => {
				if (pointerType === 'touch' && open) hide();
				else if (!open) show();
				pointerType = '';
			},
			onfocus: (e: FocusEvent) => {
				if ((e.currentTarget as HTMLElement).matches(':focus-visible')) {
					inside.focus = true;
					show();
				}
			},
			onblur: () => {
				inside.focus = false;
				dismissed = false;
				scheduleClose();
			}
		};
	}
	/** The surface grows from its placed edge, with a separate leading fade. */
	function surface(
		node: HTMLElement,
		_: undefined,
		options: { direction: 'in' | 'out' | 'both' }
	): TransitionConfig {
		const reduced = prefersReducedMotion.current;
		const entering = options.direction !== 'out';
		const previous = node.dataset.hoverCardStill;
		const still = previous === undefined ? instant || reduced : previous === 'true';
		const computed = getComputedStyle(node);
		const fromOpacity = previous === undefined && entering ? 0 : Number(computed.opacity);
		const matrix = new DOMMatrix(computed.transform);
		const fromProgress =
			previous === undefined && entering ? 0 : still ? fromOpacity : (matrix.a - 0.96) / 0.04;
		node.dataset.hoverCardStill = String(still);
		const grow =
			entering && !still
				? springCurve(m.specs.smooth, 1)
				: { duration: entering ? 140 : 120, easing: entering ? m.ease.enter : m.ease.standard };
		const fade = entering ? (reduced ? 150 : still ? 90 : 160) : reduced ? 100 : 120;
		const duration = entering ? Math.max(grow.duration, fade) : fade;
		return {
			duration,
			css: (t) => {
				const elapsed = entering ? t * duration : (1 - t) * duration;
				const curve = entering
					? grow.easing(Math.min(1, elapsed / grow.duration))
					: 1 - m.ease.standard(Math.min(1, elapsed / 120));
				const fadeProgress = entering
					? m.ease.enter(Math.min(1, elapsed / fade))
					: 1 - m.ease.standard(Math.min(1, elapsed / fade));
				const p = entering ? fromProgress + (1 - fromProgress) * curve : fromProgress * curve;
				const opacity = entering
					? fromOpacity + (1 - fromOpacity) * fadeProgress
					: fromOpacity * fadeProgress;
				const travel = still ? 0 : 4 * (1 - p);
				const placed = node.dataset.side;
				return `opacity:${opacity};transform:translate(${placed === 'left' ? travel : placed === 'right' ? -travel : 0}px,${placed === 'top' ? travel : placed === 'bottom' ? -travel : 0}px) scale(${still ? 1 : 0.96 + 0.04 * p});`;
			}
		};
	}
	import type { HTMLAttributes } from 'svelte/elements';
</script>

<LinkPreview.Root
	bind:open={
		() => open,
		(next) => {
			if (!next) scheduleClose();
		}
	}
>
	<LinkPreview.Trigger bind:ref={trigger}>
		{#snippet child({ props })}{@render triggerChild({ props: triggerProps(props) })}{/snippet}
	</LinkPreview.Trigger>
	<LinkPreview.Portal>
		<LinkPreview.Content
			forceMount
			{side}
			{align}
			sideOffset={8}
			collisionPadding={12}
			onEscapeKeydown={(event) => {
				event.preventDefault();
				dismissed = true;
				hide();
			}}
			onInteractOutside={(event) => {
				event.preventDefault();
				if (!trigger?.contains(event.target as Node)) hide();
			}}
		>
			{#snippet child({ props, wrapperProps })}
				<div {...wrapperProps}>
					{#if open}
						<div
							{...props}
							id="{id}-card"
							role="tooltip"
							class={['arc-hover-card__card', className]}
							in:surface
							out:surface
							onpointerenter={(event) => {
								if (event.pointerType !== 'touch') {
									inside.card = true;
									clearTimeout(pendingClose);
								}
							}}
							onpointerleave={(event) => {
								if (event.pointerType !== 'touch') {
									inside.card = false;
									scheduleClose();
								}
							}}
						>
							{@render content()}
						</div>
					{/if}
				</div>
			{/snippet}
		</LinkPreview.Content>
	</LinkPreview.Portal>
</LinkPreview.Root>
