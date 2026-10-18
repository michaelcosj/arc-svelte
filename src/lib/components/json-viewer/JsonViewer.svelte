<script lang="ts">
	import { tick, untrack } from 'svelte';
	import { prefersReducedMotion, Tween } from 'svelte/motion';
	import { Mounted, motionTokens as m, heightPresence, swap, Highlight } from '#lib/motion';
	import Search from '@lucide/svelte/icons/search';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
	import ChevronsDownUp from '@lucide/svelte/icons/chevrons-down-up';
	import JsonCopy from './JsonCopy.svelte';
	import JsonHighlight from './JsonHighlight.svelte';
	import {
		typeOf,
		entries,
		isBranch,
		within,
		childPath,
		primitiveText,
		copyText,
		countLabel,
		allBranches,
		branchesToDepth,
		searchJson
	} from './json';
	import type { JsonViewerProps, Row } from './types';
	import './json-viewer.css';
	let {
		data,
		rootName = 'root',
		defaultExpandDepth = 1,
		expanded = $bindable(undefined),
		defaultExpanded,
		onExpandedChange,
		searchable = true,
		query = $bindable(undefined),
		defaultQuery = '',
		onQueryChange,
		pageSize = 50,
		copyable = true,
		onCopy,
		onSelect,
		showPath = true,
		maxHeight = 420,
		label = 'JSON',
		class: className,
		ref = $bindable(null)
	}: JsonViewerProps = $props();
	const uid = $props.id(),
		mounted = new Mounted(),
		reduced = $derived(Boolean(prefersReducedMotion.current));
	let internal = $state(
			untrack(() => defaultExpanded ?? branchesToDepth(data, rootName, defaultExpandDepth))
		),
		queryInternal = $state(untrack(() => defaultQuery)),
		closed = $state<{ needle: string; ids: string[] }>({ needle: '', ids: [] }),
		pages = $state<Record<string, number>>({}),
		activeRaw = $state(untrack(() => rootName)),
		matchIndex = $state(0),
		announcement = $state(''),
		tree = $state<HTMLDivElement>(),
		input = $state<HTMLInputElement>();
	const expandedList = $derived(expanded ?? internal),
		text = $derived(query ?? queryInternal),
		needle = $derived(text.trim().toLowerCase()),
		search = $derived(needle ? searchJson(data, rootName, needle) : null),
		matches = $derived(search?.matches ?? []),
		currentMatch = $derived(matches[Math.min(matchIndex, matches.length - 1)]);
	function setExpanded(next: string[]) {
		if (expanded === undefined) internal = next;
		else if (!onExpandedChange) expanded = next;
		onExpandedChange?.(next);
	}
	function isOpen(id: string) {
		return search?.ancestors.has(id)
			? !(closed.needle === needle && closed.ids.includes(id))
			: expandedList.includes(id);
	}
	function limitOf(id: string) {
		return Math.max((pages[id] ?? 1) * pageSize, search?.needed.get(id) ?? 0);
	}
	const rows = $derived.by(() => {
		const out: Row[] = [];
		function visit(
			value: unknown,
			id: string,
			name: string | number | null,
			level: number,
			parent: string | null,
			posinset: number,
			setsize: number
		) {
			const type = typeOf(value),
				list = isBranch(type) ? entries(value) : [],
				open = isBranch(type) && isOpen(id);
			out.push({
				id,
				kind: 'node',
				level,
				name,
				value,
				type,
				count: list.length,
				open,
				parent,
				posinset,
				setsize
			});
			if (!open) return;
			const shown = list.slice(0, limitOf(id)),
				more = list.length - shown.length,
				size = shown.length + (more > 0 ? 1 : 0);
			shown.forEach(([key, v], i) => visit(v, childPath(id, key), key, level + 1, id, i + 1, size));
			if (more > 0)
				out.push({
					id: `${id}::more`,
					kind: 'more',
					level: level + 1,
					name: null,
					value: null,
					type: 'other',
					count: 0,
					open: false,
					parent: id,
					posinset: size,
					setsize: size,
					hidden: more
				});
		}
		visit(data, rootName, null, 1, null, 1, 1);
		return out;
	});
	const active = $derived.by(() => {
			if (rows.some((r) => r.id === activeRaw)) return activeRaw;
			let best = rootName;
			for (const r of rows)
				if (r.kind === 'node' && within(r.id, activeRaw) && r.id.length > best.length) best = r.id;
			return best;
		}),
		activeIndex = $derived(
			Math.max(
				0,
				rows.findIndex((r) => r.id === active)
			)
		),
		activeRow = $derived(rows[activeIndex]),
		bulk = $derived(rows.length > 400);
	const highlight = new Highlight(() => ({
		reduced: reduced || active !== activeRaw,
		spring: m.spring.smooth
	}));
	let lastReported: string | null = null;
	$effect(() => {
		const row = activeRow;
		untrack(() => {
			if (row?.kind === 'node' && row.id !== lastReported) {
				lastReported = row.id;
				onSelect?.({ path: row.id, value: row.value, type: row.type });
			}
		});
	});
	$effect(() => {
		void active;
		void rows;
		untrack(() =>
			highlight.move(tree?.querySelector<HTMLElement>('[data-active]'), mounted.current)
		);
	});
	const scrollValue = new Tween(0);
	let scrollArmed = false;
	$effect(() => {
		const value = scrollValue.current;
		untrack(() => {
			if (scrollArmed && tree) tree.scrollTop = value;
		});
	});
	function reveal(index: number, center: boolean) {
		if (!tree) return;
		const top = index * 30,
			bottom = top + 30,
			view = tree.clientHeight,
			now = tree.scrollTop;
		let target = now;
		if (center) target = top - view / 2 + 15;
		else if (top < now + 4) target = top - 4;
		else if (bottom > now + view - 4) target = bottom - view + 4;
		target = Math.max(0, target);
		if (Math.abs(target - now) < 1) return;
		scrollArmed = true;
		void scrollValue.set(now, { duration: 0 });
		void scrollValue.set(target, reduced ? { duration: 0 } : m.spring.smooth);
	}
	async function moveTo(id: string, focus = true, center = false) {
		activeRaw = id;
		await tick();
		if (focus) tree?.querySelector<HTMLElement>('[data-active]')?.focus({ preventScroll: true });
		reveal(
			Math.max(
				0,
				rows.findIndex((r) => r.id === active)
			),
			center
		);
	}
	function toggle(id: string, want = !isOpen(id)) {
		if (want === isOpen(id)) return;
		if (search?.ancestors.has(id)) {
			const ids = closed.needle === needle ? closed.ids : [];
			closed = { needle, ids: want ? ids.filter((v) => v !== id) : [...ids, id] };
			if (want && !expandedList.includes(id)) setExpanded([...expandedList, id]);
		} else setExpanded(want ? [...expandedList, id] : expandedList.filter((v) => v !== id));
	}
	function showMore(parent: string) {
		pages = { ...pages, [parent]: Math.ceil(limitOf(parent) / pageSize) + 1 };
	}
	function expandAll() {
		setExpanded(allBranches(data, rootName));
		closed = { needle, ids: [] };
		void moveTo(active, false);
	}
	function collapseAll() {
		setExpanded(isBranch(typeOf(data)) ? [rootName] : []);
		closed = { needle, ids: [...(search?.ancestors ?? [])].filter((v) => v !== rootName) };
		pages = {};
		void moveTo(rootName, false);
	}
	async function copy(row: Row, kind: 'value' | 'path') {
		const text = kind === 'path' ? row.id : copyText(row.value, row.type);
		try {
			if (!navigator.clipboard?.writeText) throw Error('Clipboard unavailable');
			await navigator.clipboard.writeText(text);
			announcement = `Copied ${kind === 'path' ? 'path' : 'value of'} ${row.id}`;
			onCopy?.({ kind, path: row.id, text });
		} catch (e) {
			announcement = 'Copy failed';
			throw e;
		}
	}
	function stepMatch(step: number) {
		if (!matches.length) return;
		const next =
			(((Math.min(matchIndex, matches.length - 1) + step) % matches.length) + matches.length) %
			matches.length;
		matchIndex = next;
		void moveTo(matches[next]!, false, true);
	}
	function onQuery(next: string) {
		if (query === undefined) queryInternal = next;
		else if (!onQueryChange) query = next;
		onQueryChange?.(next);
		matchIndex = 0;
		const trimmed = next.trim().toLowerCase(),
			first = trimmed ? searchJson(data, rootName, trimmed).matches[0] : undefined;
		if (first) void moveTo(first, false, true);
		else if (!trimmed) void moveTo(activeRaw, false);
	}
	function key(e: KeyboardEvent) {
		const row = rows[activeIndex];
		if (!row || e.altKey) return;
		const mod = e.metaKey || e.ctrlKey;
		if (mod && e.key.toLowerCase() === 'c') {
			if (row.kind === 'node' && !getSelection()?.toString()) {
				e.preventDefault();
				void copy(row, e.shiftKey ? 'path' : 'value').catch(() => {});
			}
			return;
		}
		if (mod) return;
		const go = (index: number) => {
			e.preventDefault();
			const r = rows[Math.max(0, Math.min(rows.length - 1, index))];
			if (r) void moveTo(r.id);
		};
		switch (e.key) {
			case 'ArrowDown':
				go(activeIndex + 1);
				break;
			case 'ArrowUp':
				go(activeIndex - 1);
				break;
			case 'Home':
				go(0);
				break;
			case 'End':
				go(rows.length - 1);
				break;
			case 'ArrowRight':
				e.preventDefault();
				if (row.kind === 'node' && isBranch(row.type)) {
					if (!row.open) toggle(row.id, true);
					else if (row.count) go(activeIndex + 1);
				}
				break;
			case 'ArrowLeft':
				e.preventDefault();
				if (row.kind === 'node' && row.open) toggle(row.id, false);
				else if (row.parent) void moveTo(row.parent);
				break;
			case 'Enter':
			case ' ':
				e.preventDefault();
				if (row.kind === 'more') showMore(row.parent!);
				else if (isBranch(row.type)) toggle(row.id);
				break;
			case '/':
				if (searchable) {
					e.preventDefault();
					input?.focus();
					input?.select();
				}
				break;
		}
	}
	function describe(row: Row) {
		const name = row.name === null ? rootName : String(row.name);
		return row.kind === 'more'
			? `Show ${Math.min(pageSize, row.hidden ?? 0)} more, ${row.hidden} hidden`
			: isBranch(row.type)
				? `${name}, ${row.type}, ${countLabel(row)}`
				: `${name}: ${primitiveText(row.value, row.type)}`;
	}
</script>

<div
	bind:this={ref}
	class={['arc-json-viewer__root', className]}
	style={`--json-max-height:${typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight}`}
>
	{#if searchable || rows.length > 1}<div class="arc-json-viewer__toolbar">
			{#if searchable}<label class="arc-json-viewer__search"
					><Search
						size={15}
						strokeWidth={1.75}
						aria-hidden="true"
						class="arc-json-viewer__search-icon"
					/><input
						bind:this={input}
						type="search"
						class="arc-json-viewer__input"
						value={text}
						placeholder="Search keys and values"
						aria-label="Search JSON"
						aria-controls={`${uid}-tree`}
						oninput={(e) => onQuery(e.currentTarget.value)}
						onkeydown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault();
								stepMatch(e.shiftKey ? -1 : 1);
							} else if (e.key === 'Escape' && text) {
								e.preventDefault();
								e.stopPropagation();
								onQuery('');
							} else if (e.key === 'ArrowDown' && !e.altKey) {
								e.preventDefault();
								void moveTo(active);
							}
						}}
						spellcheck={false}
						autocomplete="off"
					/>{#each needle ? ['matches'] : [] as k (k)}<span
							class="arc-json-viewer__matches"
							in:swap={{ x: reduced ? 0 : 6, duration: 160, easing: m.ease.enter }}
							out:swap={{ x: reduced ? 0 : 6, duration: 160, easing: m.ease.enter }}
							><span class="arc-json-viewer__count" aria-live="polite"
								>{matches.length
									? `${Math.min(matchIndex, matches.length - 1) + 1}/${matches.length}`
									: '0/0'}</span
							><button
								type="button"
								class="arc-json-viewer__tool"
								aria-label="Previous match"
								disabled={!matches.length}
								onclick={() => stepMatch(-1)}><ChevronUp size={15} strokeWidth={1.75} /></button
							><button
								type="button"
								class="arc-json-viewer__tool"
								aria-label="Next match"
								disabled={!matches.length}
								onclick={() => stepMatch(1)}><ChevronDown size={15} strokeWidth={1.75} /></button
							></span
						>{/each}</label
				>{:else}<span class="arc-json-viewer__grow"></span>{/if}<span
				class="arc-json-viewer__divider"
				aria-hidden="true"
			></span><button
				type="button"
				class="arc-json-viewer__tool"
				aria-label="Expand all"
				title="Expand all"
				onclick={expandAll}><ChevronsUpDown size={15} strokeWidth={1.75} /></button
			><button
				type="button"
				class="arc-json-viewer__tool"
				aria-label="Collapse all"
				title="Collapse all"
				onclick={collapseAll}><ChevronsDownUp size={15} strokeWidth={1.75} /></button
			>
		</div>{/if}
	<div
		bind:this={tree}
		id={`${uid}-tree`}
		role="tree"
		tabindex="-1"
		aria-label={label}
		class="arc-json-viewer__tree"
		onkeydown={(e) => {
			if (e.target === e.currentTarget) key(e);
		}}
	>
		<span
			class="arc-json-viewer__highlight"
			aria-hidden="true"
			hidden={!highlight.shown}
			style={`${highlight.style};inset:auto;top:1px;left:0;height:28px;`}
		></span>
		{#each rows as row (row.id)}{@const branch = isBranch(row.type)}{@const matched = Boolean(
				search && row.kind === 'node' && matches.includes(row.id)
			)}{@const mark = matched ? needle : ''}
			<div
				role="treeitem"
				tabindex={row.id === active ? 0 : -1}
				aria-level={row.level}
				aria-posinset={row.posinset}
				aria-setsize={row.setsize}
				aria-expanded={row.kind === 'node' && branch ? row.open : undefined}
				aria-selected={row.id === active}
				aria-label={describe(row)}
				class="arc-json-viewer__row"
				data-kind={row.kind}
				data-active={row.id === active || undefined}
				style={`--level:${row.level - 1};height:30px`}
				in:heightPresence={{
					skip: reduced || bulk || !mounted.current,
					fade: { duration: 160, easing: m.ease.standard }
				}}
				out:heightPresence={{
					skip: reduced || bulk,
					fade: { duration: 160, easing: m.ease.standard }
				}}
				onkeydown={(e) => {
					key(e);
				}}
				onfocus={(e) => {
					if (e.target === e.currentTarget && row.id !== active) activeRaw = row.id;
				}}
				onclick={() => {
					if (row.kind === 'more') showMore(row.parent!);
					else if (branch) toggle(row.id);
					void moveTo(row.id);
				}}
			>
				<span class="arc-json-viewer__line"
					>{#if row.kind === 'more'}<span class="arc-json-viewer__more"
							><span class="arc-json-viewer__more-label"
								>Show {Math.min(pageSize, row.hidden ?? 0)} more</span
							><span class="arc-json-viewer__muted">{row.hidden} hidden</span></span
						>{:else}<span
							class="arc-json-viewer__chevron"
							data-open={row.open || undefined}
							data-branch={branch || undefined}
							aria-hidden="true"
							>{#if branch}<ChevronRight size={14} strokeWidth={1.75} />{/if}</span
						><span
							class={typeof row.name === 'number'
								? 'arc-json-viewer__index'
								: 'arc-json-viewer__key'}
							>{#if row.name === null}{rootName}{:else if typeof row.name === 'number'}{row.name}{:else}<JsonHighlight
									text={row.name}
									needle={mark}
									current={row.id === currentMatch}
								/>{/if}</span
						><span class="arc-json-viewer__colon" aria-hidden="true"
							>{row.name === null && branch ? '' : ':'}</span
						>{#if branch}<span class="arc-json-viewer__summary"
								>{#if !row.open}<span class="arc-json-viewer__preview"
										>{row.type === 'array'
											? '[…]'
											: `{ ${entries(row.value)
													.slice(0, 3)
													.map(([key]) => key)
													.join(', ')}${row.count > 3 ? ', …' : ''} }`}</span
									>{/if}<span class="arc-json-viewer__count-label">{countLabel(row)}</span></span
							>{:else}<span
								class="arc-json-viewer__value"
								data-type={row.type}
								title={row.type === 'string' && (row.value as string).length > 40
									? (row.value as string)
									: undefined}
								>{#if row.type === 'string'}&quot;<JsonHighlight
										text={row.value as string}
										needle={mark}
										current={row.id === currentMatch}
									/>&quot;{:else}<JsonHighlight
										text={primitiveText(row.value, row.type)}
										needle={mark}
										current={row.id === currentMatch}
									/>{/if}</span
							>{/if}{#if copyable}<span class="arc-json-viewer__actions"
								><JsonCopy
									label="Copy value"
									{reduced}
									onCopy={() => copy(row, 'value')}
								/><JsonCopy
									label="Copy path"
									path
									{reduced}
									onCopy={() => copy(row, 'path')}
								/></span
							>{/if}{/if}</span
				>
			</div>{/each}
	</div>
	{#if showPath && activeRow}<div class="arc-json-viewer__path-bar">
			<code
				class="arc-json-viewer__path"
				title={activeRow.kind === 'node' ? activeRow.id : (activeRow.parent ?? '')}
				>{activeRow.kind === 'node' ? activeRow.id : activeRow.parent}</code
			><span class="arc-json-viewer__path-type"
				>{activeRow.kind === 'node'
					? isBranch(activeRow.type)
						? `${activeRow.type}, ${countLabel(activeRow)}`
						: activeRow.type
					: 'page'}</span
			>{#if copyable && activeRow.kind === 'node'}{#key activeRow.id}<JsonCopy
						focusable
						class="arc-json-viewer__path-copy"
						label="Copy path"
						{reduced}
						onCopy={() => copy(activeRow, 'path')}
					/>{/key}{/if}
		</div>{/if}<span class="arc-json-viewer__sr-only" role="status">{announcement}</span>
</div>
