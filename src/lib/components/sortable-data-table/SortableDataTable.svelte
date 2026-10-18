<script lang="ts" generics="T extends Record<string, unknown>">
	import { untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { prefersReducedMotion } from 'svelte/motion';
	import { motionTokens as m, positionFlip, swap } from '#lib/motion';
	import SelectBox from './SelectBox.svelte';
	import SortGlyph from './SortGlyph.svelte';
	import CountSwap from './CountSwap.svelte';
	import { isEmptyCell, sortRows } from './sort';
	import type { DataColumn, SortableDataTableProps, SortState } from './types';
	import './sortable-data-table.css';

	let {
		rows,
		columns,
		rowKey,
		caption = 'Data table',
		emptyMessage = 'No rows to show',
		defaultSort,
		onSortChange,
		selectable = false,
		selectedKeys = $bindable(),
		defaultSelectedKeys = [],
		onSelectionChange,
		itemName = { one: 'row', other: 'rows' }
	}: SortableDataTableProps<T> = $props();
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	let wrapper = $state<HTMLDivElement>(),
		table = $state<HTMLTableElement>();
	let selectAll = $state<HTMLInputElement | null>(null);
	let anchor: string | null = null;
	let sort = $state<SortState | null>(untrack(() => defaultSort ?? null));
	let announcement = $state('');
	let internalSelection = $state<string[]>(untrack(() => defaultSelectedKeys));
	const selection = $derived(new Set(selectedKeys ?? internalSelection));
	const sortedRows = $derived(sortRows(rows, sort));
	const numeric = $derived(
		new Set(
			columns
				.filter(
					(column) =>
						column.numeric ??
						(rows.some((row) => typeof row[column.key] === 'number') &&
							rows.every(
								(row) => typeof row[column.key] === 'number' || isEmptyCell(row[column.key])
							))
				)
				.map((column) => column.key)
		)
	);
	const getRowKey = (row: T) => String(typeof rowKey === 'function' ? rowKey(row) : row[rowKey]);
	const keys = $derived(sortedRows.map(getRowKey));
	const selectedCount = $derived(keys.filter((key) => selection.has(key)).length);
	const allSelected = $derived(keys.length > 0 && selectedCount === keys.length);
	const signature = $derived(
		[selectable ? 'select' : '', ...columns.map((column) => column.key)].join('\u0000')
	);
	let locked = $state<{ signature: string; widths: Record<string, number> } | null>(null);
	const widths = $derived(locked?.signature === signature ? locked.widths : null);
	let band = $state<{ left: number; width: number } | null>(null);
	let seenSort = false;
	$effect(() => {
		const node = table,
			key = signature;
		if (!node || widths) return;
		const measure = () => {
			const total = node.getBoundingClientRect().width;
			if (!total || getComputedStyle(node).display !== 'table') return false;
			const next: Record<string, number> = {};
			node.querySelectorAll<HTMLElement>('thead th[data-key]').forEach((cell) => {
				next[cell.dataset.key ?? ''] = (cell.getBoundingClientRect().width / total) * 100;
			});
			locked = { signature: key, widths: next };
			return true;
		};
		let active = true,
			ready = false,
			frame = 0;
		const observer = new ResizeObserver(() => {
			if (ready && measure()) observer.disconnect();
		});
		observer.observe(node);
		// Child width observers run after the parent effect; lock only once their natural widths and fonts have settled.
		void document.fonts.ready.then(() => {
			if (!active) return;
			frame = requestAnimationFrame(() => {
				frame = requestAnimationFrame(() => {
					if (active) {
						ready = true;
						if (measure()) observer.disconnect();
					}
				});
			});
		});
		return () => {
			active = false;
			cancelAnimationFrame(frame);
			observer.disconnect();
		};
	});
	$effect(() => {
		const node = table,
			key = sort?.key;
		void widths;
		const update = () => {
			const cell = key
				? node?.querySelector<HTMLElement>(`thead th[data-key="${CSS.escape(key)}"]`)
				: null;
			band = cell ? { left: cell.offsetLeft, width: cell.offsetWidth } : null;
		};
		update();
		if (!node || !key) return;
		const cell = node.querySelector<HTMLElement>(`thead th[data-key="${CSS.escape(key)}"]`),
			strip = cell?.parentElement;
		if (
			cell &&
			strip &&
			strip.scrollWidth > strip.clientWidth &&
			getComputedStyle(node).display !== 'table'
		) {
			const bounds = strip.getBoundingClientRect(),
				target = cell.getBoundingClientRect(),
				start =
					Math.max(
						bounds.left,
						strip.querySelector('th:not([data-key])')?.getBoundingClientRect().right ?? bounds.left
					) + 8;
			const shift =
				target.right > bounds.right - 8
					? target.right - bounds.right + 8
					: target.left < start
						? target.left - start
						: 0;
			if (shift)
				strip.scrollTo({
					left: strip.scrollLeft + shift,
					behavior: reduced || !seenSort ? 'auto' : 'smooth'
				});
		}
		seenSort = true;
		const observer = new ResizeObserver(update);
		observer.observe(node);
		return () => observer.disconnect();
	});
	const shownCount = $derived(selectedCount || keys.length);
	const noun = $derived(
		selectedCount ? 'selected' : keys.length === 1 ? itemName.one : itemName.other
	);
	let previousCount = untrack(() => shownCount);
	let countDirection = $state(1);
	$effect.pre(() => {
		const count = shownCount;
		untrack(() => {
			if (count !== previousCount) {
				countDirection = count > previousCount ? 1 : -1;
				previousCount = count;
			}
		});
	});
	function sortBy(column: DataColumn<T>) {
		const next: SortState = {
			key: column.key,
			direction: sort?.key === column.key && sort.direction === 'asc' ? 'desc' : 'asc'
		};
		sort = next;
		onSortChange?.(next);
		announcement = `Sorted by ${column.label}, ${next.direction === 'asc' ? 'ascending' : 'descending'}`;
	}
	function commit(next: ReadonlySet<string>) {
		const list = keys.filter((key) => next.has(key));
		if (selectedKeys === undefined) internalSelection = list;
		else if (!onSelectionChange) selectedKeys = list;
		onSelectionChange?.(list);
		announcement = list.length ? `${list.length} of ${keys.length} selected` : 'Selection cleared';
	}
	function toggleRow(key: string, extend: boolean) {
		const next = new SvelteSet(selection),
			checked = !selection.has(key),
			from = extend && anchor ? keys.indexOf(anchor) : -1,
			to = keys.indexOf(key);
		(from < 0 ? [key] : keys.slice(Math.min(from, to), Math.max(from, to) + 1)).forEach((item) => {
			if (checked) next.add(item);
			else next.delete(item);
		});
		anchor = key;
		commit(next);
	}
	function clearSelection() {
		commit(new Set());
		selectAll?.focus();
	}
	function onRowClick(event: MouseEvent & { currentTarget: HTMLTableRowElement }, key: string) {
		if (
			!selectable ||
			(event.target as HTMLElement).closest(
				"a, button, input, label, select, textarea, [role='button'], [contenteditable='true']"
			) ||
			window.getSelection()?.toString()
		)
			return;
		toggleRow(key, event.shiftKey);
		event.currentTarget
			.querySelector<HTMLInputElement>('input[type="checkbox"]')
			?.focus({ preventScroll: true });
	}
	function onKeyDown(event: KeyboardEvent) {
		const target = event.target as HTMLElement;
		if (event.key === 'Escape' && selectedCount) {
			event.preventDefault();
			event.stopPropagation();
			if (target.dataset.clear !== undefined) clearSelection();
			else commit(new Set());
			return;
		}
		const nav = target.dataset.nav;
		const node = wrapper;
		if (!nav || !node) return;
		const list = (name: string) => [...node.querySelectorAll<HTMLElement>(`[data-nav="${name}"]`)];
		const items = list(nav),
			index = items.indexOf(target);
		const steps: Record<string, [HTMLElement[], number]> =
			nav === 'head'
				? {
						ArrowRight: [items, index + 1],
						ArrowLeft: [items, index - 1],
						Home: [items, 0],
						End: [items, items.length - 1],
						...(target === selectAll
							? { ArrowDown: [list('row'), 0] as [HTMLElement[], number] }
							: {})
					}
				: {
						ArrowDown: [items, index + 1],
						ArrowUp: index === 0 && selectAll ? [[selectAll], 0] : [items, index - 1],
						Home: [items, 0],
						End: [items, items.length - 1]
					};
		const step = steps[event.key],
			next = step?.[0][step[1]];
		if (next) {
			event.preventDefault();
			next.focus();
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="arc-sortable-data-table__wrapper" bind:this={wrapper} onkeydown={onKeyDown}>
	<div class="arc-sortable-data-table__scroller">
		{#if band}<span
				class="arc-sortable-data-table__band"
				style:left={`${band.left}px`}
				style:width={`${band.width}px`}
				aria-hidden="true"
			></span>{/if}
		<!-- Explicit roles retain table semantics when the mobile CSS changes display. -->
		<!-- svelte-ignore a11y_no_redundant_roles -->
		<table
			bind:this={table}
			role="table"
			class="arc-sortable-data-table__table"
			data-fixed={widths ? '' : undefined}
			data-selectable={selectable || undefined}
		>
			<caption>{caption}</caption>
			<colgroup
				>{#if selectable}<col
						class="arc-sortable-data-table__select-col"
					/>{/if}{#each columns as column, index (column.key)}<col
						style:width={column.width !== undefined
							? typeof column.width === 'number'
								? `${column.width}px`
								: column.width
							: widths && index > 0
								? `${widths[column.key]}%`
								: undefined}
					/>{/each}</colgroup
			>
			<thead role="rowgroup"
				><tr role="row">
					{#if selectable}<th
							scope="col"
							role="columnheader"
							class="arc-sortable-data-table__select-cell"
							><SelectBox
								bind:ref={selectAll}
								checked={allSelected}
								mixed={selectedCount > 0 && !allSelected}
								label="Select all rows"
								nav="head"
								{reduced}
								onToggle={() => commit(allSelected ? new Set() : new Set(keys))}
							/></th
						>{/if}
					{#each columns as column, index (column.key)}
						{@const active = sort?.key === column.key}
						{@const sortable = column.sortable !== false}
						<th
							scope="col"
							role="columnheader"
							data-key={column.key}
							data-primary={index === 0 || undefined}
							data-sorted={active || undefined}
							data-numeric={numeric.has(column.key) || undefined}
							data-sortable={sortable || undefined}
							aria-sort={!sortable
								? undefined
								: active
									? sort?.direction === 'asc'
										? 'ascending'
										: 'descending'
									: 'none'}
							>{#if sortable}<button
									class="arc-sortable-data-table__sort-button"
									type="button"
									data-nav="head"
									onclick={() => sortBy(column)}
									aria-label={`Sort by ${column.label}${active ? `, currently ${sort?.direction === 'asc' ? 'ascending' : 'descending'}` : ''}`}
									><span class="arc-sortable-data-table__sort-inner"
										><span>{column.label}</span><SortGlyph
											{active}
											descending={active && sort?.direction === 'desc'}
											{reduced}
										/></span
									></button
								>{:else}{column.label}{/if}</th
						>
					{/each}
				</tr></thead
			>
			<tbody role="rowgroup">
				{#each sortedRows as row, index (getRowKey(row))}
					{@const key = keys[index]!}
					{@const selected = selectable && selection.has(key)}
					<tr
						role="row"
						animate:positionFlip={reduced
							? { duration: 0, easing: m.ease.standard }
							: m.spring.smooth}
						data-selected={selected || undefined}
						onclick={(event) => onRowClick(event, key)}
						onmousedown={(event) => {
							if (selectable && event.shiftKey) event.preventDefault();
						}}
					>
						{#if selectable}<td role="cell" class="arc-sortable-data-table__select-cell"
								><SelectBox
									checked={selected}
									label={`Select ${String(row[columns[0]?.key as string] ?? key)}`}
									nav="row"
									{reduced}
									onToggle={(extend) => toggleRow(key, extend)}
								/></td
							>{/if}
						{#each columns as column, columnIndex (column.key)}<td
								role="cell"
								data-label={column.label}
								data-primary={columnIndex === 0 || undefined}
								data-sorted={sort?.key === column.key || undefined}
								data-numeric={numeric.has(column.key) || undefined}
								>{#if column.render}{@render column.render(row[column.key], row)}{:else}{String(
										row[column.key] ?? '–'
									)}{/if}</td
							>{/each}
					</tr>
				{:else}<tr role="row"
						><td
							role="cell"
							class="arc-sortable-data-table__empty"
							colspan={columns.length + (selectable ? 1 : 0)}>{emptyMessage}</td
						></tr
					>{/each}
			</tbody>
		</table>
	</div>
	{#if selectable}<div class="arc-sortable-data-table__footer">
			<span class="arc-sortable-data-table__sr-only">{shownCount} {noun}</span><span
				class="arc-sortable-data-table__count"
				data-active={selectedCount > 0 || undefined}
				aria-hidden="true"
				><CountSwap
					value={String(shownCount)}
					direction={countDirection}
					{reduced}
					number
				/><CountSwap value={noun} direction={selectedCount ? 1 : -1} {reduced} /></span
			>{#each selectedCount ? ['clear'] : [] as key (key)}<button
					type="button"
					class="arc-sortable-data-table__clear"
					data-clear=""
					onclick={clearSelection}
					in:swap={{
						scale: reduced ? 1 : 0.96,
						blur: reduced ? 0 : m.blur.soft,
						duration: reduced ? m.duration.instant : m.duration.standard,
						easing: m.ease.enter
					}}
					out:swap={{
						scale: reduced ? 1 : 0.98,
						blur: reduced ? 0 : m.blur.subtle,
						duration: reduced ? m.duration.instant : m.duration.fast,
						easing: m.ease.standard
					}}>Clear selection</button
				>{/each}
		</div>{/if}
	<p class="arc-sortable-data-table__sr-only" role="status">{announcement}</p>
</div>
