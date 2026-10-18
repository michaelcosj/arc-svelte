<script lang="ts">
	import { untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import type { ToastStackProps, ToastTarget, ToastRecord } from './types';
	import { useToastQueue } from './toast-stack-state.svelte';
	import ToastItem from './ToastItem.svelte';
	import './toast-stack.css';
	let {
		label = 'Notifications',
		position = 'bottom-right',
		contained = false,
		visibleToasts = 3,
		hotkey = true,
		class: className
	}: ToastStackProps = $props();
	const queue = useToastQueue();
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	let hovered = $state(false),
		focused = $state(false),
		tapped = $state(false),
		dragging = $state(false),
		pageHidden = $state(false),
		heights = $state<Record<string, number>>({});
	let region = $state<HTMLElement>(),
		list = $state<HTMLOListElement>(),
		returnFocus: HTMLElement | null = null;
	const expanded = $derived(queue.toasts.length > 0 && (hovered || focused || tapped));
	const paused = $derived(expanded || dragging || pageHidden);
	const layout = $derived.by(() => {
		const toasts = queue.toasts,
			front = toasts.length ? (heights[toasts[0].id] ?? 0) : 0;
		const tops = [0];
		for (let i = 0; i < toasts.length; i++)
			tops.push(tops[i] + (i < visibleToasts ? (heights[toasts[i].id] ?? 0) + 12 : 0));
		const targets = toasts.map((item, index): ToastTarget => {
			const visible = index < visibleToasts,
				depth = Math.min(index, visibleToasts);
			return expanded
				? {
						y: -tops[index],
						scale: 1,
						height: heights[item.id] ?? 0,
						opacity: visible ? 1 : 0,
						content: 1
					}
				: {
						y: -14 * depth,
						scale: 1 - 0.05 * depth,
						height: index === 0 ? (heights[item.id] ?? 0) : front,
						opacity: visible ? 1 : 0,
						content: index === 0 ? 1 : 0
					};
		});
		return {
			targets,
			height: !toasts.length
				? 0
				: expanded
					? tops[toasts.length] - 12
					: front + 14 * (Math.min(toasts.length, visibleToasts) - 1)
		};
	});
	// Retain departing rows while their motion values finish. Svelte block outros freeze
	// child updates, which would otherwise stop a thrown card before its exit completes.
	type Entry = {
		toast: ToastRecord;
		target: ToastTarget;
		expanded: boolean;
		front: boolean;
		hidden: boolean;
		present: boolean;
	};
	let entries = $state<Entry[]>([]);
	$effect(() => {
		const toasts = queue.toasts,
			targets = layout.targets,
			expand = expanded,
			limit = visibleToasts;
		untrack(() => {
			const previous = entries;
			const next = toasts.map((toast, index) => {
				const entry = previous.find((e) => e.toast.id === toast.id) ?? {
					toast,
					target: targets[index]!,
					expanded: expand,
					front: index === 0,
					hidden: index >= limit,
					present: true
				};
				Object.assign(entry, {
					toast,
					target: targets[index]!,
					expanded: expand,
					front: index === 0,
					hidden: index >= limit,
					present: true
				});
				return entry;
			});
			previous.forEach((entry, index) => {
				if (toasts.some((toast) => toast.id === entry.toast.id)) return;
				entry.present = false;
				next.splice(Math.min(index, next.length), 0, entry);
			});
			entries = next;
		});
	});
	function removeEntry(entry: Entry) {
		if (!entry.present) entries = entries.filter((candidate) => candidate !== entry);
	}
	function measure(id: string, height: number) {
		if (heights[id] !== height) heights = { ...heights, [id]: height };
	}
	function handoff(leaving: HTMLElement, keyboard: boolean) {
		const items = Array.from(list?.children ?? []) as HTMLElement[],
			at = items.indexOf(leaving),
			candidates = items.filter((n) => n !== leaving && !n.inert);
		const next = candidates.find((n) => items.indexOf(n) > at) ?? candidates.at(-1),
			button = next?.querySelector<HTMLElement>('button');
		if (keyboard && button) button.focus();
		else if (keyboard && returnFocus?.isConnected) returnFocus.focus();
		else (document.activeElement as HTMLElement | null)?.blur();
	}
	function focus(event: FocusEvent) {
		if (!(event.relatedTarget instanceof Node) || !region?.contains(event.relatedTarget))
			returnFocus = event.relatedTarget instanceof HTMLElement ? event.relatedTarget : null;
		if (event.target instanceof Element && event.target.matches(':focus-visible')) focused = true;
	}
	function blur(event: FocusEvent) {
		if (!(event.relatedTarget instanceof Node) || !region?.contains(event.relatedTarget))
			focused = false;
	}
	$effect(() => {
		if (queue.toasts.length === 0) tapped = false;
		untrack(() => {
			const ids = new Set(queue.toasts.map((t) => t.id));
			heights = Object.fromEntries(Object.entries(heights).filter(([id]) => ids.has(id)));
		});
	});
	$effect(() => {
		const change = () => (pageHidden = document.hidden);
		document.addEventListener('visibilitychange', change);
		return () => document.removeEventListener('visibilitychange', change);
	});
	$effect(() => {
		if (!hotkey) return;
		const key = (event: KeyboardEvent) => {
			if (!event.altKey || event.metaKey || event.ctrlKey || event.code !== 'KeyT') return;
			const target = list?.querySelector<HTMLElement>(':scope > li:not([inert]) button');
			if (!target) return;
			event.preventDefault();
			target.focus({ focusVisible: true } as FocusOptions);
			focused = true;
		};
		document.addEventListener('keydown', key);
		return () => document.removeEventListener('keydown', key);
	});
	$effect(() => {
		if (!tapped) return;
		const down = (event: PointerEvent) => {
			if (!region?.contains(event.target as Node)) tapped = false;
		};
		document.addEventListener('pointerdown', down);
		return () => document.removeEventListener('pointerdown', down);
	});
</script>

<section
	bind:this={region}
	class={[
		'arc-toast-stack__viewport',
		`arc-toast-stack__${position}`,
		contained && 'arc-toast-stack__contained',
		className
	]}
	aria-label={hotkey ? `${label} (Alt+T)` : label}
	aria-live="polite"
	aria-relevant="additions text"
	aria-atomic="false"
	onfocusin={focus}
	onfocusout={blur}
>
	<ol
		bind:this={list}
		class="arc-toast-stack__list"
		style:height={`${layout.height}px`}
		data-expanded={expanded}
		onpointerenter={(e) => {
			if (e.pointerType === 'mouse') hovered = true;
		}}
		onpointermove={(e) => {
			if (e.pointerType === 'mouse' && !hovered) hovered = true;
		}}
		onpointerleave={(e) => {
			if (e.pointerType === 'mouse') hovered = false;
		}}
	>
		{#each entries as entry (entry.toast.id)}<ToastItem
				toast={entry.toast}
				target={entry.target}
				expanded={entry.expanded}
				front={entry.front}
				hidden={entry.hidden}
				present={entry.present}
				onGone={() => removeEntry(entry)}
				{paused}
				{reduced}
				{queue}
				{measure}
				{handoff}
				onDragChange={(value) => (dragging = value)}
				onTap={() => (tapped = !tapped)}
			/>{/each}
	</ol>
</section>
