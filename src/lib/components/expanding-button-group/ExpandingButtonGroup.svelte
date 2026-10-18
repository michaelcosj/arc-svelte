<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import { metrics, type ExpandingButtonGroupProps, type ExpandingButtonGroupItem } from './types';
	import ExpandingItem from './ExpandingItem.svelte';
	import './expanding-button-group.css';
	let {
		items,
		label,
		size = 'md',
		defaultExpanded = null,
		onAction,
		confirmDuration = 1400,
		class: className,
		style
	}: ExpandingButtonGroupProps = $props();
	const reduced = $derived(prefersReducedMotion.current);
	let root: HTMLDivElement;
	let intent = $state<string | null>(null),
		done = $state<string | null>(null),
		busy = $state<string | null>(null),
		announcement = $state(''),
		focused = $state<string | null>(null);
	let pointerOver: string | null = null,
		pointerAt: { x: number; y: number } | null = null,
		keyFocus: string | null = null,
		touchOpen: string | null = null,
		press: { id: string; kind: string; wasExpanded: boolean } | null = null;
	let timer: ReturnType<typeof setTimeout>,
		mounted = true,
		seq = 0;
	const has = (id: string | null) => !!id && items.some((item) => item.id === id);
	const restId = $derived(
		has(defaultExpanded)
			? defaultExpanded
			: (items.find((item) => !item.disabled)?.id ?? items[0]?.id ?? null)
	);
	const expandedId = $derived(has(intent) ? intent : restId),
		tabStop = $derived(has(focused) ? focused : restId),
		metric = $derived(metrics[size]);
	$effect(() => () => {
		mounted = false;
		clearTimeout(timer);
	});
	$effect(() => {
		if (!intent || touchOpen !== intent) return;
		const down = (event: PointerEvent) => {
			if (root.contains(event.target as Node)) return;
			touchOpen = null;
			intent = done ?? keyFocus;
		};
		document.addEventListener('pointerdown', down, true);
		return () => document.removeEventListener('pointerdown', down, true);
	});
	function confirm(item: ExpandingButtonGroupItem) {
		clearTimeout(timer);
		seq++;
		done = item.id;
		announcement = `${item.doneLabel}${seq % 2 ? '' : '\u200b'}`;
		timer = setTimeout(() => {
			done = null;
			if (pointerOver !== item.id && keyFocus !== item.id) {
				if (touchOpen === item.id) touchOpen = null;
				if (intent === item.id) intent = pointerOver ?? keyFocus;
			}
		}, confirmDuration);
	}
	async function activate(item: ExpandingButtonGroupItem) {
		if (item.disabled || busy === item.id || done === item.id) return;
		intent = item.id;
		onAction?.(item.id);
		let result: void | boolean;
		try {
			const pending = item.onSelect?.();
			if (pending instanceof Promise) {
				busy = item.id;
				result = await pending;
			} else result = pending;
		} catch {
			result = false;
		} finally {
			if (mounted && busy === item.id) busy = null;
		}
		if (!mounted || result === false || !item.doneLabel) return;
		confirm(item);
	}
	function itemDown(item: ExpandingButtonGroupItem, event: PointerEvent) {
		press = { id: item.id, kind: event.pointerType, wasExpanded: expandedId === item.id };
	}
	function itemClick(item: ExpandingButtonGroupItem) {
		const last = press;
		press = null;
		if (last && last.id === item.id && last.kind === 'touch' && !last.wasExpanded) {
			touchOpen = item.id;
			intent = item.id;
			return;
		}
		if (last?.kind === 'touch') touchOpen = item.id;
		void activate(item);
	}
	function itemFocus(
		item: ExpandingButtonGroupItem,
		event: FocusEvent & { currentTarget: HTMLButtonElement }
	) {
		focused = item.id;
		let visible = true;
		try {
			visible = event.currentTarget.matches(':focus-visible');
		} catch {
			/* Older engines expand on all focus. */
		}
		if (!visible) return;
		keyFocus = item.id;
		intent = item.id;
	}
	function blur(event: FocusEvent) {
		if (root.contains(event.relatedTarget as Node | null)) return;
		keyFocus = null;
		touchOpen = null;
		intent = pointerOver ?? done;
	}
	function move(event: PointerEvent) {
		if (event.pointerType !== 'mouse') return;
		const at = pointerAt;
		if (at && Math.abs(at.x - event.clientX) < 1 && Math.abs(at.y - event.clientY) < 1) return;
		pointerAt = { x: event.clientX, y: event.clientY };
		const button = (event.target as HTMLElement).closest<HTMLElement>('[data-ebg-item]'),
			id = button?.dataset.id;
		if (!button || !id || id === pointerOver) return;
		if (pointerOver) {
			const box = button.getBoundingClientRect();
			if (event.clientX < box.left + 4 || event.clientX > box.right - 4) return;
		}
		pointerOver = id;
		intent = id;
	}
	function leave(event: PointerEvent) {
		if (event.pointerType !== 'mouse') return;
		pointerAt = null;
		pointerOver = null;
		intent = done ?? keyFocus;
	}
	function key(event: KeyboardEvent) {
		const list = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-ebg-item]')),
			index = list.findIndex((button) => button === document.activeElement);
		if (index < 0) return;
		const last = list.length - 1,
			target =
				event.key === 'ArrowRight'
					? index === last
						? 0
						: index + 1
					: event.key === 'ArrowLeft'
						? index === 0
							? last
							: index - 1
						: event.key === 'Home'
							? 0
							: event.key === 'End'
								? last
								: -1;
		if (target < 0) return;
		event.preventDefault();
		list[target]!.focus();
	}
</script>

<!-- svelte-ignore a11y_interactive_supports_focus (The toolbar uses a roving item tab stop, matching the source.) -->
<div
	bind:this={root}
	role="toolbar"
	aria-label={label}
	aria-orientation="horizontal"
	class={['arc-expanding-button-group__group', `arc-expanding-button-group__${size}`, className]}
	style={`--ebg-h:${metric.height}px;--ebg-icon:${metric.icon}px;--ebg-start:${metric.start}px;--ebg-gap:${metric.gap}px;--ebg-end:${metric.end}px;${style ?? ''}`}
	onkeydown={key}
	onfocusout={blur}
	onpointermove={move}
	onpointerleave={leave}
>
	{#each items as item (item.id)}<ExpandingItem
			{item}
			{size}
			expanded={expandedId === item.id}
			done={done === item.id}
			busy={busy === item.id}
			tabStop={tabStop === item.id}
			{reduced}
			onPointerDown={itemDown}
			onClick={itemClick}
			onFocus={itemFocus}
		/>{/each}
	<span class="arc-expanding-button-group__srOnly" role="status" aria-live="polite"
		>{announcement}</span
	>
</div>
