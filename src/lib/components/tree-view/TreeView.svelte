<script lang="ts">
	import { tick, untrack } from 'svelte';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { prefersReducedMotion } from 'svelte/motion';
	import type { TransitionConfig } from 'svelte/transition';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import File from '@lucide/svelte/icons/file';
	import Folder from '@lucide/svelte/icons/folder';
	import FolderOpen from '@lucide/svelte/icons/folder-open';
	import {
		heightPresence,
		Highlight,
		Mounted,
		motionTokens as m,
		springCurve,
		swap
	} from '#lib/motion';
	import { fileTone, flattenTree } from './tree';
	import type { TreeNode, TreeViewProps, VisibleNode } from './types';
	import './tree-view.css';

	let {
		nodes,
		defaultExpandedIds = [],
		expandedIds: expandedProp = $bindable(),
		onExpandedChange,
		onSelect,
		'aria-label': ariaLabel = 'File tree'
	}: TreeViewProps = $props();
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	const mounted = new Mounted();
	let internalExpanded = $state<string[]>(untrack(() => defaultExpandedIds));
	const expanded = $derived(new Set(expandedProp ?? internalExpanded));
	const visible = $derived(flattenTree(nodes, expanded));
	let focusedId = $state<string | null>(untrack(() => nodes[0]?.id ?? null));
	let selectedId = $state<string | null>(null);
	let openedId = $state<string | null>(null);
	const refs = new SvelteMap<string, HTMLButtonElement>();
	const rows = new SvelteMap<string, HTMLDivElement>();
	const focusableId = $derived(
		visible.some(({ node }) => node.id === focusedId) ? focusedId : (visible[0]?.node.id ?? null)
	);
	const openedIndex = $derived(visible.findIndex(({ node }) => node.id === openedId));
	const selection = new Highlight(() => ({ reduced, spring: m.spring.morph }));
	$effect(() => {
		const id = selectedId;
		const shown = visible.some(({ node }) => node.id === id);
		const row = id && shown ? rows.get(id) : null;
		untrack(() => selection.move(row));
	});
	function observe(node: HTMLElement) {
		const observer = new ResizeObserver(() =>
			selection.move(
				selectedId && visible.some(({ node }) => node.id === selectedId)
					? rows.get(selectedId)
					: null,
				false
			)
		);
		observer.observe(node);
		return () => observer.disconnect();
	}
	function toggle(node: TreeNode) {
		if (!node.children?.length) return;
		const next = new SvelteSet(expanded);
		if (next.has(node.id)) next.delete(node.id);
		else {
			next.add(node.id);
			openedId = node.id;
		}
		const values = [...next];
		if (expandedProp === undefined) internalExpanded = values;
		else if (!onExpandedChange) expandedProp = values;
		onExpandedChange?.(values);
	}
	function focus(id: string) {
		focusedId = id;
		const row = refs.get(id);
		if (row) row.focus();
		else void tick().then(() => refs.get(id)?.focus());
	}
	function select(node: TreeNode) {
		selectedId = node.id;
		onSelect?.(node);
	}
	function onKeyDown(event: KeyboardEvent, item: VisibleNode, index: number) {
		const { node } = item;
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			focus(visible[Math.min(index + 1, visible.length - 1)]!.node.id);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			focus(visible[Math.max(index - 1, 0)]!.node.id);
		} else if (event.key === 'Home') {
			event.preventDefault();
			focus(visible[0]!.node.id);
		} else if (event.key === 'End') {
			event.preventDefault();
			focus(visible[visible.length - 1]!.node.id);
		} else if (event.key === 'ArrowRight' && node.children?.length) {
			event.preventDefault();
			if (!expanded.has(node.id)) toggle(node);
			else if (visible[index + 1]?.parentId === node.id) focus(visible[index + 1]!.node.id);
		} else if (event.key === 'ArrowLeft') {
			event.preventDefault();
			if (node.children?.length && expanded.has(node.id)) toggle(node);
			else if (item.parentId) focus(item.parentId);
		} else if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			select(node);
			toggle(node);
		}
	}
	function rowMotion(
		node: HTMLElement,
		{ delay = 0 }: { delay?: number },
		options: { direction: 'in' | 'out' | 'both' }
	): TransitionConfig {
		const entering = options.direction !== 'out';
		if (entering) node.removeAttribute('aria-hidden');
		else node.setAttribute('aria-hidden', 'true');
		const transition = heightPresence(
			node,
			{
				reduced,
				skip: entering && !mounted.current,
				spring: springCurve(m.specs.smooth, 38),
				fade: {
					duration: entering ? m.duration.fast : m.duration.instant,
					easing: entering ? m.ease.enter : m.ease.standard,
					delay: entering ? delay : 0
				}
			},
			options
		);
		const duration = Math.max(
			transition.duration ?? 0,
			reduced || !mounted.current
				? 0
				: entering
					? delay + m.spring.smooth.duration
					: m.duration.instant
		);
		const heightDuration = transition.duration ?? 0;
		return {
			...transition,
			duration,
			css: (t) => {
				const elapsed = (entering ? t : 1 - t) * duration;
				const heightT = heightDuration ? Math.min(1, elapsed / heightDuration) : 1;
				const progress =
					reduced || (entering && !mounted.current)
						? 1
						: entering
							? m.spring.smooth.easing(
									Math.max(0, Math.min(1, (elapsed - delay) / m.spring.smooth.duration))
								)
							: m.ease.standard(Math.min(1, elapsed / m.duration.instant));
				return `${transition.css?.(entering ? heightT : 1 - heightT, entering ? 1 - heightT : heightT) ?? ''}transform:translateX(${entering ? -6 * (1 - progress) : -4 * progress}px);`;
			}
		};
	}
</script>

<div
	class="arc-tree-view__tree"
	role="tree"
	aria-label={ariaLabel}
	aria-multiselectable="false"
	{@attach observe}
>
	<span
		class="arc-tree-view__selection"
		hidden={!selection.shown}
		aria-hidden="true"
		style:transform={`translate(${selection.box.x}px, ${selection.box.y + 2}px)`}
		style:width={`${selection.box.width}px`}
		style:height="36px"
	></span>
	{#each visible as item, index (item.node.id)}
		{@const hasChildren = Boolean(item.node.children?.length)}
		{@const isExpanded = hasChildren && expanded.has(item.node.id)}
		{@const delay =
			openedIndex >= 0 && index > openedIndex
				? Math.min(index - openedIndex - 1, 7) * m.stagger.item
				: 0}
		<div
			class="arc-tree-view__row"
			{@attach (node) => {
				rows.set(item.node.id, node);
				return () => {
					rows.delete(item.node.id);
				};
			}}
			in:rowMotion={{ delay }}
			out:rowMotion={{}}
		>
			<button
				type="button"
				class="arc-tree-view__item"
				role="treeitem"
				aria-level={item.depth}
				aria-posinset={item.position}
				aria-setsize={item.setSize}
				aria-expanded={hasChildren ? isExpanded : undefined}
				aria-selected={selectedId === item.node.id}
				tabindex={focusableId === item.node.id ? 0 : -1}
				style:--tree-depth={item.depth}
				{@attach (node) => {
					refs.set(item.node.id, node);
					return () => {
						refs.delete(item.node.id);
					};
				}}
				onfocus={() => {
					focusedId = item.node.id;
				}}
				onkeydown={(event) => onKeyDown(event, item, index)}
				onclick={() => {
					focusedId = item.node.id;
					select(item.node);
					toggle(item.node);
				}}
			>
				{#if item.depth > 1}<span
						aria-hidden="true"
						class="arc-tree-view__branch"
						in:swap|global={{
							duration: reduced ? 0 : m.duration.standard,
							skip: !mounted.current,
							delay: reduced ? 0 : delay,
							easing: m.ease.enter,
							extra: (t) => `scale:1 ${t};`
						}}
					></span>{/if}
				<span
					class="arc-tree-view__disclosure"
					aria-hidden="true"
					style:rotate={isExpanded ? '90deg' : '0deg'}
					>{#if hasChildren}<ChevronRight size={14} strokeWidth={1.9} />{/if}</span
				>
				<span
					class={[
						'arc-tree-view__icon',
						`arc-tree-view__${hasChildren ? 'folder' : fileTone(item.node.label)}`
					]}
					aria-hidden="true"
				>
					{#if item.node.icon}{@render item.node.icon()}{:else if hasChildren}
						{#key isExpanded}<span
								class="arc-tree-view__folder-glyph"
								in:swap={{
									scale: reduced ? 1 : 0.6,
									blur: reduced ? 0 : m.blur.subtle,
									...(reduced ? { duration: 0 } : m.spring.snappy),
									fade: { duration: reduced ? 0 : m.duration.fast, easing: m.ease.enter },
									skip: !mounted.current
								}}
								out:swap={{
									scale: reduced ? 1 : 0.6,
									blur: reduced ? 0 : m.blur.subtle,
									duration: reduced ? 0 : m.duration.instant,
									easing: m.ease.standard,
									pop: true
								}}
								>{#if isExpanded}<FolderOpen size={16} strokeWidth={1.7} />{:else}<Folder
										size={16}
										strokeWidth={1.7}
									/>{/if}</span
							>{/key}
					{:else}<File size={16} strokeWidth={1.7} />{/if}
				</span>
				<span class="arc-tree-view__label">{item.node.label}</span>
			</button>
		</div>
	{/each}
</div>
