<script lang="ts">
	import { flushSync, untrack } from 'svelte';
	import { Command } from 'bits-ui';
	import { prefersReducedMotion, Tween } from 'svelte/motion';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import { motionTokens as m, swap } from '#lib/motion';
	import SearchList from './SearchList.svelte';
	import { groupSearch, rankSearch } from './search';
	import type { ExpandingSearchItem, ExpandingSearchProps } from './types';
	import './expanding-search.css';

	let {
		label,
		items,
		suggestions = [],
		suggestionsLabel = 'Recent',
		placeholder,
		onSelect,
		onExpandedChange,
		expandedWidth = 360,
		maxResults = 6,
		anchor = 'end',
		emptyHint = 'Try a shorter word or check the spelling.',
		class: className
	}: ExpandingSearchProps = $props();
	const id = $props.id(),
		reduced = $derived(Boolean(prefersReducedMotion.current));
	let root = $state<HTMLDivElement>(),
		shell = $state<HTMLDivElement>();
	let input = $state<HTMLInputElement | null>(null),
		button = $state<HTMLButtonElement>();
	let expanded = $state(false),
		focused = $state(false),
		query = $state(''),
		active = $state(-1);
	let keyboard = false;
	let size = $state({ collapsed: 44, expanded: untrack(() => expandedWidth) });
	const width = new Tween(44),
		panelHeight = new Tween(0);
	const shape = $derived(
		Math.min(
			1,
			Math.max(0, (width.current - size.collapsed) / Math.max(1, size.expanded - size.collapsed))
		)
	);
	const trimmed = $derived(query.trim());
	const results = $derived(trimmed ? rankSearch(items, trimmed, maxResults) : []);
	const mode = $derived(
		!trimmed ? (suggestions.length ? 'suggestions' : null) : results.length ? 'results' : 'empty'
	);
	const groups = $derived(
		mode === 'suggestions'
			? [{ name: suggestionsLabel, items: suggestions }]
			: mode === 'results'
				? groupSearch(results, items)
				: []
	);
	const flat = $derived(groups.flatMap((group) => group.items));
	const activeIndex = $derived(Math.min(active, flat.length - 1));
	const activeItem = $derived(flat[activeIndex]);
	const optionId = (item: ExpandingSearchItem) => `${id}-${mode}-${item.id}`;
	const listboxId = $derived(`${id}-${mode}-listbox`);
	const panelOpen = $derived(expanded && focused && mode !== null);
	const announcement = $derived(
		!panelOpen
			? ''
			: mode === 'empty'
				? `No results for ${trimmed}`
				: mode === 'results'
					? `${flat.length} ${flat.length === 1 ? 'result' : 'results'}`
					: `${flat.length} ${suggestionsLabel.toLocaleLowerCase()} ${flat.length === 1 ? 'item' : 'items'}`
	);
	$effect(() => {
		const node = root,
			frame = shell,
			limit = expandedWidth;
		if (!node || !frame) return;
		const measure = () => {
			const collapsed = frame.offsetHeight || 44,
				full = Math.max(collapsed, Math.min(limit, node.clientWidth));
			size = { collapsed, expanded: full };
			const goal = expanded ? full : collapsed;
			void width.set(goal, width.current !== width.target ? m.spring.morph : { duration: 0 });
		};
		untrack(measure);
		const observer = new ResizeObserver(measure);
		observer.observe(node);
		return () => observer.disconnect();
	});
	function morphTo(goal: number) {
		void width.set(
			goal,
			reduced ? { duration: 0 } : goal >= width.current ? m.spring.morph : m.spring.smooth
		);
	}
	function expand() {
		if (expanded) return;
		flushSync(() => {
			expanded = true;
			focused = true;
		});
		input?.focus({ preventScroll: true });
		morphTo(size.expanded);
		onExpandedChange?.(true);
	}
	function collapse(returnFocus: boolean) {
		if (!expanded) return;
		flushSync(() => {
			expanded = false;
			focused = false;
			query = '';
			active = -1;
		});
		if (returnFocus) button?.focus({ preventScroll: true });
		morphTo(size.collapsed);
		onExpandedChange?.(false);
	}
	function choose(item: ExpandingSearchItem) {
		collapse(true);
		onSelect?.(item);
	}
	function onKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			collapse(true);
			return;
		}
		if (!panelOpen || !flat.length) return;
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			keyboard = true;
			const step = event.key === 'ArrowDown' ? 1 : -1;
			active =
				activeIndex < 0
					? step > 0
						? 0
						: flat.length - 1
					: (activeIndex + step + flat.length) % flat.length;
		} else if (event.key === 'Enter' && activeItem) {
			event.preventDefault();
			choose(activeItem);
		}
	}
	function observePanel(node: HTMLElement) {
		void panelHeight.set(0, { duration: 0 });
		const observer = new ResizeObserver(() => {
			const panel = node.parentElement;
			const height = node.offsetHeight + (panel ? panel.offsetHeight - panel.clientHeight : 2);
			void panelHeight.set(height, reduced ? { duration: 0 } : m.spring.smooth);
		});
		observer.observe(node);
		return () => observer.disconnect();
	}
	function ignoreValue(_value: string) {}
	function cleanup() {
		return () => {
			void width.set(width.current, { duration: 0 });
			void panelHeight.set(panelHeight.current, { duration: 0 });
		};
	}
</script>

<Command.Root
	{label}
	shouldFilter={false}
	disablePointerSelection
	vimBindings={false}
	disableInitialScroll
	bind:value={() => activeItem?.id ?? '', ignoreValue}
>
	{#snippet child({ props })}
		{@const attributes = { ...props, role: undefined, tabindex: undefined, onkeydown: undefined }}
		<div
			{...attributes}
			bind:this={root}
			class={['arc-expanding-search__root', className]}
			data-anchor={anchor}
			style:--es-width={`${size.expanded}px`}
			{@attach cleanup}
		>
			<div
				bind:this={shell}
				class="arc-expanding-search__shell"
				data-expanded={expanded || undefined}
				style:width={`${width.current}px`}
				style:--es-open={shape}
			>
				<button
					bind:this={button}
					type="button"
					class="arc-expanding-search__trigger"
					aria-label={label}
					hidden={expanded}
					onclick={expand}
				></button>
				<Search
					class="arc-expanding-search__icon"
					width={18}
					height={18}
					strokeWidth={1.75}
					aria-hidden="true"
				/>
				<Command.Input bind:ref={input}>
					{#snippet child({ props: inputProps })}
						<input
							{...inputProps}
							class="arc-expanding-search__input"
							type="text"
							role="combobox"
							inert={!expanded}
							value={query}
							placeholder={placeholder ?? label}
							aria-label={label}
							aria-labelledby={undefined}
							aria-expanded={panelOpen}
							aria-controls={panelOpen && mode !== 'empty' ? listboxId : undefined}
							aria-activedescendant={panelOpen && activeItem ? optionId(activeItem) : undefined}
							autocomplete="off"
							autocorrect="off"
							spellcheck={false}
							enterkeyhint="search"
							data-expanded={expanded || undefined}
							oninput={(event) => {
								query = event.currentTarget.value;
								active = query.trim() ? 0 : -1;
								keyboard = false;
							}}
							onfocus={() => {
								focused = true;
							}}
							onblur={() => {
								if (!document.hasFocus()) return;
								focused = false;
								if (expanded && !input?.value.trim()) collapse(false);
							}}
							onkeydown={onKeyDown}
						/>
					{/snippet}
				</Command.Input>
				{#each expanded && query ? ['clear'] : [] as key (key)}<button
						type="button"
						tabindex="-1"
						class="arc-expanding-search__clear"
						aria-label="Clear search"
						onmousedown={(event) => event.preventDefault()}
						onclick={() => {
							query = '';
							active = -1;
							input?.focus({ preventScroll: true });
						}}
						in:swap={reduced
							? { duration: 150 }
							: {
									scale: 0.6,
									blur: m.blur.subtle,
									...m.spring.snappy,
									fade: { duration: m.duration.fast }
								}}
						out:swap={{
							scale: reduced ? 1 : 0.6,
							blur: reduced ? 0 : m.blur.subtle,
							duration: reduced ? 100 : m.duration.instant,
							easing: m.ease.standard
						}}><X width={16} height={16} strokeWidth={1.75} aria-hidden="true" /></button
					>{/each}
			</div>
			{#each panelOpen ? ['panel'] : [] as key (key)}
				<div
					class="arc-expanding-search__panel"
					style:width={`${width.current}px`}
					style:height={reduced ? 'auto' : `${panelHeight.current}px`}
					in:swap={{ duration: reduced ? 150 : m.duration.fast, easing: m.ease.enter }}
					out:swap={{ duration: reduced ? 100 : m.duration.instant, easing: m.ease.standard }}
				>
					<div class="arc-expanding-search__body" {@attach observePanel}>
						{#key mode}<div
								class="arc-expanding-search__view"
								in:swap={{
									blur: reduced ? 0 : m.blur.subtle,
									duration: reduced ? 150 : m.duration.fast,
									easing: m.ease.enter
								}}
								out:swap={{ duration: 100, easing: m.ease.standard, pop: true }}
							>
								{#if mode === 'empty'}<div class="arc-expanding-search__empty">
										<p class="arc-expanding-search__empty-title">No results for “{trimmed}”</p>
										<p class="arc-expanding-search__empty-hint">{emptyHint}</p>
									</div>{:else}<SearchList
										id={listboxId}
										label={mode === 'suggestions' ? suggestionsLabel : `Results for ${trimmed}`}
										{groups}
										query={mode === 'results' ? trimmed : ''}
										{activeIndex}
										{optionId}
										{reduced}
										keyboard={() => keyboard}
										onHover={(index) => {
											keyboard = false;
											active = index;
										}}
										onChoose={choose}
									/>{/if}
							</div>{/key}
					</div>
				</div>
			{/each}
			<span class="arc-expanding-search__sr-only" role="status" aria-live="polite"
				>{announcement}</span
			>
		</div>
	{/snippet}
</Command.Root>
