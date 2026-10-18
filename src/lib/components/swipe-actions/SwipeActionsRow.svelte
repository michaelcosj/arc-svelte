<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { DropdownMenu as Menu } from 'bits-ui';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import { motionTokens as m, heightPresence, PhysicalSpring } from '#lib/motion';
	import type { SwipeActionsRowProps, Side } from './types';
	import { getSwipeGroup } from './swipe-actions-state.svelte';
	import ActionLayer from './ActionLayer.svelte';
	import './swipe-actions.css';
	let {
		label,
		leading = [],
		trailing = [],
		fullSwipe = true,
		children,
		class: className
	}: SwipeActionsRowProps = $props();
	const group = getSwipeGroup(),
		id = $props.id();
	const reduced = $derived(prefersReducedMotion.current);
	const x = new PhysicalSpring(0, m.specs.smooth);
	const cover = new PhysicalSpring(0, m.specs.morph);
	onDestroy(() => {
		x.destroy();
		cover.destroy();
	});
	let homeTarget = $state<number | null>(null);
	$effect(() => {
		if (homeTarget === 0 && !x.running && x.current === 0)
			untrack(() => {
				cover.jump(0);
				homeTarget = null;
			});
	});
	let row: HTMLLIElement;
	let width = 0,
		armed = false,
		leaving = false,
		swallow = false,
		focusNeighbour = false;
	let timer: ReturnType<typeof setTimeout>;
	let focusTarget: HTMLElement | null = null;
	let covering = $state<{ side: Side; index: number } | null>(null);
	let menuOpen = $state(false);
	type Drag = {
		pointer: number;
		type: string;
		startX: number;
		startY: number;
		origin: number;
		locked: 'x' | 'y' | null;
		samples: [number, number][];
	};
	let drag: Drag | null = null;
	const actionsOf = (side: Side) => (side === 'leading' ? leading : trailing);
	const openWidth = (side: Side) => actionsOf(side).length * 76;
	const outermost = (side: Side) => (side === 'leading' ? 0 : trailing.length - 1);
	const canCommit = (side: Side) => fullSwipe && actionsOf(side).length > 0;
	const threshold = (side: Side) => Math.max(openWidth(side) + 48, width * 0.56);
	const sideOf = (v: number): Side | null => (v > 0 ? 'leading' : v < 0 ? 'trailing' : null);
	function stretchTo(value: number) {
		cover.to(value, m.specs.morph, Boolean(reduced));
	}
	function settle(target: number) {
		if (armed || (target !== 0 && cover.current !== 0)) stretchTo(0);
		armed = false;
		homeTarget = target;
		x.to(target, target === 0 ? m.specs.smooth : m.specs.snappy, Boolean(reduced));
		if (target !== 0) group.openId = id;
		else if (group.openId === id) group.openId = null;
	}
	function commit(side: Side, index: number) {
		const action = actionsOf(side)[index];
		if (!action || leaving) return;
		armed = false;
		covering = { side, index };
		stretchTo(1);
		if (action.keepRow) {
			action.onSelect();
			settle(0);
			return;
		}
		leaving = true;
		row.dataset.removing = '';
		homeTarget = null;
		x.to((side === 'leading' ? 1 : -1) * (width + 2), m.specs.smooth, Boolean(reduced));
		if (group.openId === id) group.openId = null;
		// Capture before Svelte moves an outgoing keyed row to its outro position.
		if (focusNeighbour) focusTarget = neighbourTarget();
		action.onSelect();
		clearTimeout(timer);
		timer = setTimeout(returnHome, 1400);
	}
	function returnHome() {
		if (!leaving) return;
		leaving = false;
		clearTimeout(timer);
		delete row.dataset.removing;
		settle(0);
	}
	function arm(value: number, pointerType: string) {
		const side = sideOf(value),
			limit = side ? threshold(side) : Infinity;
		const next = !!side && canCommit(side) && Math.abs(value) > (armed ? limit - 20 : limit);
		if (next === armed || !side) {
			if (!side && armed) {
				armed = false;
				stretchTo(0);
			}
			return;
		}
		armed = next;
		if (next) {
			covering = { side, index: outermost(side) };
			if (pointerType === 'touch') navigator.vibrate?.(8);
		}
		stretchTo(next ? 1 : 0);
	}
	function constrain(raw: number) {
		const side = sideOf(raw);
		if (!side) return 0;
		const dimension = width || 320,
			limit = !actionsOf(side).length ? 0 : canCommit(side) ? dimension : openWidth(side),
			distance = Math.abs(raw);
		return (
			Math.sign(raw) *
			(distance <= limit
				? distance
				: limit + (1 - 1 / (((distance - limit) * 0.55) / dimension + 1)) * dimension)
		);
	}
	function release(velocity: number) {
		const value = x.current,
			side = sideOf(value);
		if (!side || !actionsOf(side).length) {
			settle(0);
			return;
		}
		const direction = side === 'leading' ? 1 : -1,
			distance = Math.abs(value),
			outward = velocity * direction,
			open = openWidth(side),
			projected = distance + outward * 0.1;
		const flung = distance > open && outward > 900 && projected > threshold(side);
		if (canCommit(side) && ((armed && outward > -900) || flung)) {
			commit(side, outermost(side));
			return;
		}
		settle(projected > open / 2 ? direction * open : 0);
	}
	function down(event: PointerEvent) {
		swallow = false;
		if (leaving || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0))
			return;
		homeTarget = null;
		x.jump(x.current);
		drag = {
			pointer: event.pointerId,
			type: event.pointerType,
			startX: event.clientX,
			startY: event.clientY,
			origin: x.current,
			locked: null,
			samples: [[event.timeStamp, event.clientX]]
		};
	}
	function move(event: PointerEvent & { currentTarget: HTMLDivElement }) {
		const current = drag;
		if (!current || current.pointer !== event.pointerId || current.locked === 'y') return;
		if (!current.locked) {
			const dx = event.clientX - current.startX,
				dy = event.clientY - current.startY;
			if (Math.hypot(dx, dy) < 8) return;
			if (Math.abs(dy) > Math.abs(dx)) {
				current.locked = 'y';
				return;
			}
			current.locked = 'x';
			current.startX = event.clientX;
			event.currentTarget.setPointerCapture(event.pointerId);
			row.dataset.dragging = '';
			group.openId = id;
		}
		const value = constrain(current.origin + event.clientX - current.startX);
		x.jump(value);
		current.samples.push([event.timeStamp, event.clientX]);
		if (current.samples.length > 12) current.samples.shift();
		arm(value, current.type);
	}
	function end(event: PointerEvent) {
		const current = drag;
		if (!current || current.pointer !== event.pointerId) return;
		drag = null;
		if (current.locked === 'x') {
			swallow = true;
			delete row.dataset.dragging;
			current.samples.push([event.timeStamp, event.clientX]);
			const last = current.samples.at(-1)!,
				first = current.samples.find((s) => last[0] - s[0] <= 80) ?? last,
				elapsed = (last[0] - first[0]) / 1000;
			release(
				event.type === 'pointercancel' ? 0 : elapsed > 0 ? (last[1] - first[1]) / elapsed : 0
			);
			return;
		}
		if (current.locked === null && Math.abs(x.current) > 0.5) {
			swallow = true;
			settle(0);
		}
	}
	function neighbourTarget() {
		const staying = (step: 'nextElementSibling' | 'previousElementSibling') => {
			let node = row[step];
			while (node instanceof HTMLElement && 'removing' in node.dataset) node = node[step];
			return node;
		};
		const neighbour = staying('nextElementSibling') ?? staying('previousElementSibling');
		return neighbour?.querySelector<HTMLElement>('[data-swipe-more]') ?? row.parentElement;
	}
	function register(node: HTMLLIElement) {
		group.rows.set(id, node);
		width = node.offsetWidth;
		const observer = new ResizeObserver(([entry]) => {
			if (entry) width = entry.contentRect.width;
		});
		observer.observe(node);
		return () => {
			observer.disconnect();
			group.rows.delete(id);
			clearTimeout(timer);
			if (group.openId === id) group.openId = null;
		};
	}
	$effect(() => {
		const open = group.openId;
		untrack(() => {
			if (open !== id && !leaving && drag?.locked !== 'x' && x.current !== 0) settle(0);
		});
	});
	const menuItems = $derived([
		...leading.map((action, index) => ({ action, side: 'leading' as const, index })),
		...trailing.map((action, index) => ({ action, side: 'trailing' as const, index }))
	]);
</script>

<li
	bind:this={row}
	{@attach register}
	class={['arc-swipe-actions__row', className]}
	style="--swipe-action-width: 76px"
	onintrostart={returnHome}
	in:heightPresence={{ reduced, reducedDuration: 150, skip: !group.mounted.current }}
	out:heightPresence={{
		reduced,
		reducedDuration: 150,
		heightDelay: 120,
		fade: { duration: m.duration.instant, delay: 340, easing: m.ease.standard }
	}}
>
	{#each ['leading', 'trailing'] as side}
		{#each actionsOf(side as Side) as action, index}
			{@const count = actionsOf(side as Side).length}
			<ActionLayer
				{action}
				side={side as Side}
				rank={side === 'leading' ? count - 1 - index : index}
				{count}
				coverRank={covering?.side === side
					? side === 'leading'
						? count - 1 - covering.index
						: covering.index
					: null}
				x={x.current}
				cover={cover.current}
				onPress={() => commit(side as Side, index)}
			/>
		{/each}
	{/each}
	<!-- svelte-ignore a11y_no_static_element_interactions (Gesture surface; the Bits menu supplies the keyboard equivalent.) -->
	<div
		class="arc-swipe-actions__content"
		style:transform="translateX({x.current}px)"
		onpointerdown={down}
		onpointermove={move}
		onpointerup={end}
		onpointercancel={end}
		onclickcapture={(event) => {
			if (swallow) {
				swallow = false;
				event.preventDefault();
				event.stopPropagation();
			}
		}}
	>
		<div class="arc-swipe-actions__body">{@render children()}</div>
		{#if menuItems.length}
			<Menu.Root bind:open={menuOpen}>
				<Menu.Trigger
					id={`${id}-more`}
					class="arc-swipe-actions__more"
					data-swipe-more=""
					aria-label={`More actions for ${label}`}
					onpointerdown={(event) => event.preventDefault()}
					onclick={(event) => {
						if (event.detail > 0) {
							event.preventDefault();
							menuOpen = !menuOpen;
						}
					}}><Ellipsis size={18} strokeWidth={1.75} aria-hidden="true" /></Menu.Trigger
				>
				<Menu.Portal
					><Menu.Content
						class="arc-swipe-actions__menu"
						aria-labelledby={`${id}-more`}
						align="end"
						sideOffset={6}
						collisionPadding={12}
						loop
						onCloseAutoFocus={(event) => {
							if (focusNeighbour) {
								focusNeighbour = false;
								event.preventDefault();
								(focusTarget ?? neighbourTarget())?.focus({ preventScroll: true });
								focusTarget = null;
							}
						}}
					>
						{#each menuItems as { action, side, index }, order}<Menu.Item
								class="arc-swipe-actions__item"
								data-tone={action.tone}
								style="--i: {order}"
								onSelect={() => {
									focusNeighbour = !action.keepRow;
									commit(side, index);
								}}
								><span class="arc-swipe-actions__itemIcon" aria-hidden="true"
									>{@render action.icon()}</span
								>{action.label}</Menu.Item
							>{/each}
					</Menu.Content></Menu.Portal
				>
			</Menu.Root>
		{/if}
	</div>
</li>
