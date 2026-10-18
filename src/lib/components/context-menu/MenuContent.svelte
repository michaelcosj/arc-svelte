<script lang="ts">
	import { ContextMenu as Primitive } from 'bits-ui';
	import { onDestroy, untrack } from 'svelte';
	import { prefersReducedMotion, Tween } from 'svelte/motion';
	import Check from '@lucide/svelte/icons/check';
	import MoreHorizontal from '@lucide/svelte/icons/ellipsis';
	import { cssEasing, easeInOut, easeOut, motionTokens as m, springCurve, swap } from '#lib/motion';
	import type { TransitionConfig } from 'svelte/transition';
	import type { ContextMenuItem, MenuPoint } from './types';

	let {
		items,
		label,
		point,
		live,
		focusTarget,
		close,
		props
	}: {
		items: ContextMenuItem[];
		label: string;
		point: MenuPoint;
		live: () => boolean;
		focusTarget: () => void;
		close: () => void;
		props: Record<string, unknown>;
	} = $props();
	const reduced = $derived(prefersReducedMotion.current);
	let menu: HTMLDivElement | null = null;
	type Highlight = { index: number; top: number; height: number; danger: boolean };
	let highlight = $state<Highlight | null>(null);
	let placed = $state(false);
	const box = new Tween({ y: 0, height: 0 });
	const alpha = new Tween(0);
	let pointer = false;
	let clearTimer: ReturnType<typeof setTimeout> | undefined;
	let placedKey = 0;
	const scaleIn = springCurve(m.specs.snappy, 0.04);
	onDestroy(() => clearTimeout(clearTimer));

	// Keep Bits' content node stable. A re-open leaves an inert visual copy at the old pointer.
	$effect(() => {
		const next = point;
		untrack(() => {
			if (!menu || placedKey === next.key) return;
			const current = getComputedStyle(menu);
			const from = { opacity: current.opacity, transform: current.transform };
			const ghost = menu.cloneNode(true) as HTMLElement;
			ghost.inert = true;
			ghost.setAttribute('aria-hidden', 'true');
			ghost.removeAttribute('id');
			ghost.style.pointerEvents = 'none';
			ghost.dataset.state = 'closed';
			for (const child of ghost.querySelectorAll<HTMLElement>('*')) {
				child.removeAttribute('id');
			}
			document.body.append(ghost);
			const rows = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')];
			for (const [index, row] of [
				...ghost.querySelectorAll<HTMLElement>('[role="menuitem"]')
			].entries()) {
				const animation = row.getAnimations()[0];
				const original = rows[index]?.getAnimations()[0];
				if (animation && original) animation.currentTime = original.currentTime;
			}
			const exit = ghost.animate(
				[from, { opacity: 0, transform: reduced ? 'none' : 'scale(.98)' }],
				{ duration: 120, easing: cssEasing(reduced ? easeOut : m.ease.standard) }
			);
			exit.onfinish = () => ghost.remove();
			clearTimeout(clearTimer);
			highlight = null;
			placed = false;
			pointer = false;
			void alpha.set(0, { duration: 0 });
			position(menu);
			for (const item of menu.querySelectorAll<HTMLElement>('[role="menuitem"]'))
				item.style.animationName = 'none';
			void menu.offsetHeight;
			for (const item of menu.querySelectorAll<HTMLElement>('[role="menuitem"]'))
				item.style.animationName = '';
			if (!reduced)
				menu.animate([{ transform: 'scale(.96)' }, { transform: 'scale(1)' }], {
					duration: scaleIn.duration,
					easing: cssEasing(scaleIn.easing)
				});
			menu.animate([{ opacity: 0 }, { opacity: 1 }], {
				duration: reduced ? 120 : 160,
				easing: cssEasing(reduced ? easeOut : m.ease.enter)
			});
		});
	});

	function place(item: HTMLElement, glide: boolean) {
		clearTimeout(clearTimer);
		const next = {
			index: Number(item.dataset.index),
			top: item.offsetTop,
			height: item.offsetHeight,
			danger: item.dataset.tone === 'danger'
		};
		const distance = Math.round(Math.abs(next.top - box.current.y));
		void box.set(
			{ y: next.top, height: next.height },
			glide && highlight && !reduced && distance
				? springCurve(m.specs.snappy, distance)
				: { duration: 0 }
		);
		highlight = next;
		placed = true;
		void alpha.set(1, { duration: reduced ? 0 : 120, easing: easeInOut });
	}

	function onfocusin(event: FocusEvent) {
		if (!live()) return;
		const item =
			event.target instanceof HTMLElement
				? event.target.closest<HTMLElement>('[role="menuitem"]')
				: null;
		if (item) {
			if (!pointer && item.matches(':focus-visible')) place(item, false);
			return;
		}
		clearTimeout(clearTimer);
		clearTimer = setTimeout(
			() => {
				highlight = null;
				placed = false;
				void alpha.set(0, { duration: reduced ? 0 : 120, easing: easeInOut });
			},
			pointer ? 70 : 0
		);
	}

	/** Clamp the measured menu before its first painted frame; its scale origin stays at the pointer. */
	function position(node: HTMLElement) {
		placedKey = point.key;
		const width = node.offsetWidth;
		const height = node.offsetHeight;
		const x = Math.max(8, Math.min(point.x, window.innerWidth - width - 8));
		const y = Math.max(8, Math.min(point.y, window.innerHeight - height - 8));
		node.style.left = `${x}px`;
		node.style.top = `${y}px`;
		node.style.transformOrigin = `${Math.max(0, Math.min(width, point.x - x))}px ${Math.max(0, Math.min(height, point.y - y))}px`;
		queueMicrotask(() =>
			node
				.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')
				?.focus({ preventScroll: true })
		);
	}

	function enter(node: HTMLElement): TransitionConfig {
		position(node);
		return swap(
			node,
			reduced
				? { duration: 120, easing: easeOut }
				: {
						scale: 0.96,
						...scaleIn,
						fade: { duration: 160, easing: m.ease.enter }
					},
			{ direction: 'in' }
		);
	}

	function leave(node: HTMLElement): TransitionConfig {
		node.dataset.state = 'closed';
		return swap(
			node,
			reduced
				? { duration: 120, easing: easeOut }
				: { scale: 0.98, duration: 120, easing: m.ease.standard },
			{ direction: 'out' }
		);
	}
</script>

<div
	{...props}
	bind:this={menu}
	class="arc-context-menu__menu"
	aria-label={label}
	in:enter|global
	out:leave|global
	{onfocusin}
	onpointermovecapture={() => (pointer = true)}
	onkeydowncapture={(event) => {
		pointer = false;
		// The original has no typeahead, and Tab moves focus without closing the menu.
		if (event.key === 'Tab' || (event.key.length === 1 && event.key !== ' '))
			event.stopImmediatePropagation();
	}}
	onpointerleave={() => {
		if (live()) menu?.focus({ preventScroll: true });
	}}
>
	<span
		class="arc-context-menu__highlight"
		data-tone={highlight?.danger ? 'danger' : undefined}
		aria-hidden="true"
		style:transform={placed ? `translateY(${box.current.y}px)` : undefined}
		style:height={placed ? `${box.current.height}px` : undefined}
		style:opacity={alpha.current}
	></span>
	{#each items as item, index (item.id)}
		<Primitive.Item
			disabled={item.disabled}
			closeOnSelect={false}
			onSelect={() => {
				if (!live()) return;
				item.onSelect?.();
				close();
				focusTarget();
			}}
		>
			{#snippet child({ props: itemProps })}
				<button
					{...itemProps}
					type="button"
					tabindex={-1}
					disabled={item.disabled}
					data-index={index}
					data-tone={item.destructive ? 'danger' : undefined}
					class={['arc-context-menu__item', item.destructive && 'arc-context-menu--destructive']}
					style="--i: {index}"
					onpointermove={(event) => {
						if (typeof itemProps.onpointermove === 'function') itemProps.onpointermove(event);
						if (!live() || item.disabled) return;
						clearTimeout(clearTimer);
						if (document.activeElement !== event.currentTarget)
							event.currentTarget.focus({ preventScroll: true });
						if (highlight?.index !== index) place(event.currentTarget, true);
					}}
				>
					<span class="arc-context-menu__icon" aria-hidden="true"
						>{#if item.icon}{@render item.icon()}{:else if item.checked}<Check
								size={15}
							/>{:else}<MoreHorizontal size={15} />{/if}</span
					><span>{item.label}</span>
				</button>
			{/snippet}
		</Primitive.Item>
	{/each}
</div>
