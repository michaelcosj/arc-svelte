<script lang="ts">
	import { untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import X from '@lucide/svelte/icons/x';
	import { HeightMorph, Mounted, motionTokens as m, swap } from '#lib/motion';
	import FilterMenu from './FilterMenu.svelte';
	import FilterText from './FilterText.svelte';
	import { filterSlot, reflowGlide } from './filter-motion';
	import type { FilterToolbarProps, FilterChip } from './types';
	import './filter-toolbar.css';
	let {
		filters,
		onRemove,
		onClearAll,
		children,
		label = 'Active filters',
		addFilter
	}: FilterToolbarProps = $props();
	const reduced = $derived(Boolean(prefersReducedMotion.current)),
		mounted = new Mounted();
	let root = $state<HTMLDivElement>(),
		message = $state(''),
		seen: FilterChip[] = untrack(() => filters),
		pendingFocus: number | null = null,
		armed = 0;
	const signature = $derived(filters.map((f) => `${f.id}:${f.value ?? ''}`).join('|'));
	const height = new HeightMorph(() => ({
		reduced,
		measure: 'offset',
		pinned: true,
		window: 900,
		clip: false
	}));
	$effect.pre(() => {
		void signature;
		untrack(() => {
			armed = performance.now() + 900;
			height.changed();
		});
	});
	$effect.pre(() => {
		const next = filters;
		untrack(() => {
			if (seen === next) return;
			const old = seen;
			seen = next;
			const text = (f: FilterChip) => (f.value ? `${f.label}: ${f.value}` : f.label),
				removed = old.filter((f) => !next.some((n) => n.id === f.id)),
				added = next.filter((f) => !old.some((o) => o.id === f.id)),
				changed = next.filter((f) => old.some((o) => o.id === f.id && o.value !== f.value));
			const change =
				!next.length && removed.length > 1
					? 'All filters cleared'
					: [
							...added.map((f) => `Added ${text(f)}`),
							...changed.map((f) => `${f.label} changed to ${f.value ?? 'any'}`),
							...removed.map((f) => `Removed ${text(f)}`)
						].join('. ');
			if (change) message = change;
		});
	});
	$effect(() => {
		void filters;
		untrack(() => {
			if (pendingFocus === null || !root) return;
			const index = pendingFocus;
			pendingFocus = null;
			const next = filters[Math.min(index, filters.length - 1)];
			const target = next
				? root.querySelector<HTMLElement>(`[data-chip-remove="${CSS.escape(next.id)}"]`)
				: root.querySelector<HTMLElement>('[data-filter-trigger]');
			target?.focus({ preventScroll: true });
		});
	});
	function reflow(node: HTMLElement) {
		return reflowGlide(node, () => ({ reduced, armed }));
	}
</script>

<div bind:this={root} class="arc-filter-toolbar__toolbar" role="group" aria-label={label}>
	<div class="arc-filter-toolbar__frame" {@attach height.body}>
		<div class="arc-filter-toolbar__chips" {@attach height.content} {@attach reflow}>
			{#each filters as filter, index (filter.id)}
				<span
					class="arc-filter-toolbar__slot"
					in:filterSlot={{ gap: 8, reduced, skip: !mounted.current }}
					out:filterSlot={{ gap: 8, reduced }}
				>
					<span
						class="arc-filter-toolbar__chip"
						in:swap|global={{
							scale: 0.9,
							blur: m.blur.soft,
							...m.spring.snappy,
							fade: { duration: 240, easing: m.ease.enter },
							skip: reduced || !mounted.current
						}}
						out:swap|global={{
							scale: 0.9,
							blur: m.blur.subtle,
							duration: reduced ? 0 : 120,
							easing: m.ease.standard
						}}
					>
						<span class="arc-filter-toolbar__chip-label"
							>{filter.label}{#if filter.value}<span class="arc-filter-toolbar__value"
									><span class="arc-filter-toolbar__separator">{' · '}</span><FilterText
										text={filter.value}
									/></span
								>{/if}</span
						><button
							type="button"
							data-chip-remove={filter.id}
							aria-label={`Remove ${filter.label}${filter.value ? `: ${filter.value}` : ''}`}
							onclick={(e) => {
								if (document.activeElement === e.currentTarget) pendingFocus = index;
								onRemove(filter.id);
							}}><X size={14} strokeWidth={1.8} aria-hidden="true" /></button
						>
					</span>
				</span>
			{/each}
			{#each filters.length ? [] : ['empty'] as key (key)}<span
					class="arc-filter-toolbar__empty"
					in:swap={{
						y: reduced ? 0 : '0.3em',
						blur: reduced ? 0 : m.blur.soft,
						duration: reduced ? 0 : 240,
						delay: reduced ? 0 : 90,
						easing: m.ease.enter,
						skip: !mounted.current
					}}
					out:swap={{
						y: reduced ? 0 : '-0.3em',
						blur: reduced ? 0 : m.blur.subtle,
						duration: reduced ? 0 : 120,
						easing: m.ease.standard
					}}>No filters applied</span
				>{/each}
		</div>
	</div>
	<div class="arc-filter-toolbar__actions">
		{#if addFilter}<FilterMenu
				fields={addFilter.fields}
				onSelect={addFilter.onAdd}
				active={filters}
				label={addFilter.label}
				align={addFilter.align}
			/>{/if}
		{@render children?.()}
		{#each filters.length ? ['clear'] : [] as key (key)}<span
				class="arc-filter-toolbar__slot"
				in:filterSlot={{ gap: 12, reduced, skip: !mounted.current }}
				out:filterSlot={{ gap: 12, reduced }}
				><button
					class="arc-filter-toolbar__clear"
					type="button"
					onclick={() => {
						pendingFocus = -1;
						onClearAll?.();
					}}
					><span
						class="arc-filter-toolbar__clear-text"
						in:swap|global={{
							y: '0.3em',
							blur: m.blur.soft,
							duration: 240,
							easing: m.ease.enter,
							skip: reduced || !mounted.current
						}}
						out:swap|global={{
							y: '-0.3em',
							blur: m.blur.subtle,
							duration: reduced ? 0 : 120,
							easing: m.ease.standard
						}}>Clear all</span
					></button
				></span
			>{/each}
	</div>
	<span class="arc-filter-toolbar__sr-only" role="status">{message}</span>
</div>
