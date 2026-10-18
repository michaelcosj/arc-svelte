<script lang="ts">
	import { untrack } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { Command } from 'bits-ui';
	import { flip } from 'svelte/animate';
	import { prefersReducedMotion, Tween } from 'svelte/motion';
	import CommandIcon from '@lucide/svelte/icons/command';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import {
		easeOut,
		HeightMorph,
		Mounted,
		motionTokens as m,
		PopLayout,
		springCurve,
		swap
	} from '#lib/motion';
	import type { CommandItem, CommandPaletteProps } from './types';
	import './command-palette.css';

	let {
		items,
		placeholder = 'Search commands',
		onSelect,
		onClose,
		label = 'Command palette',
		autoFocus = false
	}: CommandPaletteProps = $props();
	const inputId = $props.id();
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	const mounted = new Mounted();
	let query = $state('');
	let activeIndex = $state<number | null>(null);
	let resultMode = $state<'results' | 'empty'>(untrack(() => (items.length ? 'results' : 'empty')));
	let modeShown = $state(true);
	let input = $state<HTMLInputElement | null>(null);
	let list = $state<HTMLDivElement | null>(null);
	let pointer = false;
	let lastPointer = { x: -1, y: -1 };
	let highlightShown = false;
	const highlightY = new Tween(0);
	const highlightHeight = new Tween(0);
	const highlightOpacity = new Tween(0);
	const layout = new PopLayout();
	const height = new HeightMorph(() => ({
		reduced,
		follow: true,
		measure: 'offset',
		pinned: true
	}));
	const filtered = $derived.by(() => {
		const normalized = query.trim().toLowerCase();
		return normalized
			? items.filter((item) =>
					[item.label, item.description, item.group, ...(item.keywords ?? [])]
						.filter(Boolean)
						.join(' ')
						.toLowerCase()
						.includes(normalized)
				)
			: items;
	});
	const groups = $derived.by(() => {
		const grouped = new SvelteMap<string, { item: CommandItem; index: number }[]>();
		filtered.forEach((item, index) => {
			const group = item.group ?? 'Actions';
			const entries = grouped.get(group) ?? [];
			entries.push({ item, index });
			grouped.set(group, entries);
		});
		return [...grouped];
	});
	const safeIndex = $derived(
		activeIndex === null ? -1 : Math.min(activeIndex, Math.max(filtered.length - 1, 0))
	);
	const activeId = $derived(filtered[safeIndex]?.id);
	$effect.pre(() => {
		const target = filtered.length ? 'results' : 'empty';
		untrack(() => {
			if (resultMode !== target) modeShown = false;
		});
	});
	function finishModeExit(event: Event) {
		if (event.target !== event.currentTarget) return;
		resultMode = filtered.length ? 'results' : 'empty';
		modeShown = true;
	}
	let previous: CommandItem[] = [];
	let glide = $state(true);
	$effect.pre(() => {
		const next = filtered;
		untrack(() => {
			const before = new Map(previous.map((item, index) => [item.id, index]));
			glide =
				!reduced &&
				next.every((item, index) => Math.abs((before.get(item.id) ?? index) - index) <= 6);
			previous = next;
			layout.capture(list);
		});
	});
	$effect(() => {
		if (autoFocus) input?.focus({ preventScroll: true });
	});
	$effect(() => {
		void activeId;
		void filtered;
		untrack(() => {
			const node = activeId ? document.getElementById(`${inputId}-${activeId}`) : null;
			if (!node) {
				highlightShown = false;
				void highlightOpacity.set(0, { duration: reduced ? 0 : 100, easing: easeOut });
				return;
			}
			let top = 0;
			for (
				let element: HTMLElement | null = node;
				element && element !== list;
				element = element.offsetParent as HTMLElement | null
			)
				top += element.offsetTop + (element === node ? 0 : element.clientTop);
			const move =
				!highlightShown || reduced
					? { duration: 0 }
					: pointer
						? springCurve(
								m.specs.snappy,
								Math.max(
									Math.abs(top - highlightY.current),
									Math.abs(node.offsetHeight - highlightHeight.current)
								)
							)
						: { duration: 70, easing: m.ease.enter };
			void highlightY.set(top, move);
			void highlightHeight.set(node.offsetHeight, move);
			void highlightOpacity.set(1, { duration: reduced ? 0 : 80, easing: easeOut });
			highlightShown = true;
			node.scrollIntoView({ block: 'nearest' });
		});
	});

	function setQuery(value: string) {
		query = value;
		activeIndex = null;
	}
	function clear() {
		setQuery('');
		input?.focus();
	}
	function choose(item: CommandItem) {
		onSelect?.(item);
		clear();
	}
	// Bits selects the first result on registration. The source leaves selection empty.
	function ignoreSelection(_value: string) {}
	function onKeyDown(event: KeyboardEvent) {
		pointer = false;
		let handled = true;
		if (event.key === 'ArrowDown')
			activeIndex = Math.min((activeIndex ?? -1) + 1, Math.max(filtered.length - 1, 0));
		else if (event.key === 'ArrowUp')
			activeIndex = Math.max((activeIndex ?? filtered.length) - 1, 0);
		else if (event.key === 'Home') activeIndex = 0;
		else if (event.key === 'End') activeIndex = Math.max(filtered.length - 1, 0);
		else if (event.key === 'Enter') {
			const target = filtered[safeIndex] ?? (query ? filtered[0] : undefined);
			if (target) choose(target);
		} else if (event.key === 'Escape') {
			if (query) setQuery('');
			else onClose?.();
		} else handled = false;
		if (handled) {
			event.preventDefault();
			event.stopPropagation();
		}
	}
</script>

<svelte:document
	onkeydown={(event) => {
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			input?.focus();
		}
	}}
/>

<Command.Root
	{label}
	shouldFilter={false}
	disablePointerSelection
	vimBindings={false}
	disableInitialScroll
	bind:value={() => activeId ?? '', ignoreSelection}
>
	{#snippet child({ props })}
		{@const attributes = { ...props, role: undefined, tabindex: undefined }}
		<div
			{...attributes}
			class="arc-command-palette__palette"
			in:swap|global={reduced
				? { duration: 0 }
				: {
						y: 6,
						scale: 0.98,
						...springCurve(m.specs.smooth, 6),
						fade: { duration: m.duration.fast, easing: m.ease.enter }
					}}
		>
			<div class="arc-command-palette__search-row">
				<span class="arc-command-palette__search-icon"
					><Search width={18} height={18} strokeWidth={1.75} aria-hidden="true" /></span
				>
				<!-- Keep Bits search empty: manual filtering must not remount its List on the first character. -->
				<Command.Input id={inputId} bind:ref={input}>
					{#snippet child({ props: inputProps })}
						<input
							{...inputProps}
							value={query}
							{placeholder}
							autocomplete="off"
							aria-controls={`${inputId}-results`}
							aria-activedescendant={activeId ? `${inputId}-${activeId}` : undefined}
							oninput={(event) => setQuery(event.currentTarget.value)}
							onkeydown={onKeyDown}
						/>
					{/snippet}
				</Command.Input>
				{#each query ? ['clear'] : [] as key (key)}
					<button
						class="arc-command-palette__clear-button"
						type="button"
						aria-label="Clear search"
						onclick={clear}
						in:swap={reduced
							? { duration: 0 }
							: {
									scale: 0.6,
									blur: m.blur.subtle,
									...m.spring.snappy,
									fade: { duration: m.duration.instant }
								}}
						out:swap={{
							scale: reduced ? 1 : 0.6,
							blur: reduced ? 0 : m.blur.subtle,
							duration: reduced ? 0 : m.duration.instant,
							easing: m.ease.standard,
							pop: true
						}}><X width={15} height={15} aria-hidden="true" /></button
					>
				{/each}
				{#if onClose}<button
						class="arc-command-palette__close-button"
						type="button"
						aria-label="Close command palette"
						onclick={onClose}>Esc</button
					>{/if}
				<kbd class="arc-command-palette__command-key">⌘ K</kbd>
			</div>
			<div class="arc-command-palette__results-frame" {@attach height.body}>
				<Command.List
					id={`${inputId}-results`}
					bind:ref={list}
					class="arc-command-palette__results"
					aria-label="Command results"
					{@attach height.content}
				>
					<span
						class="arc-command-palette__highlight"
						style:transform={`translateY(${highlightY.current}px)`}
						style:height={`${highlightHeight.current}px`}
						style:opacity={highlightOpacity.current}
						aria-hidden="true"
					></span>
					{#if modeShown && resultMode === 'results'}
						<div
							in:swap|global={{
								duration: reduced ? 0 : m.duration.standard,
								easing: m.ease.enter,
								skip: !mounted.current
							}}
							out:swap={{ duration: reduced ? 0 : m.duration.instant, easing: m.ease.standard }}
							onoutroend={finishModeExit}
						>
							{#each groups as [group, entries] (group)}
								<div
									class="arc-command-palette__group"
									role="group"
									aria-label={group}
									data-pop-key={`group-${group}`}
									animate:flip={glide ? m.spring.smooth : { duration: 0 }}
									in:swap|global={{
										duration: reduced ? 0 : m.duration.standard,
										easing: m.ease.enter,
										skip: !mounted.current
									}}
									out:swap={{
										duration: glide ? m.duration.instant : 0,
										easing: m.ease.standard,
										pop: layout.box(`group-${group}`)
									}}
								>
									<span class="arc-command-palette__group-heading" aria-hidden="true">{group}</span>
									{#each entries as { item, index } (item.id)}
										<div
											data-pop-key={item.id}
											animate:flip={glide ? m.spring.smooth : { duration: 0 }}
											in:swap|global={{
												duration: reduced ? 0 : m.duration.standard,
												easing: m.ease.enter,
												skip: !mounted.current
											}}
											out:swap={{
												duration: glide ? m.duration.instant : 0,
												easing: m.ease.standard,
												pop: layout.box(item.id)
											}}
										>
											<Command.Item
												id={`${inputId}-${item.id}`}
												value={item.id}
												onSelect={() => choose(item)}
											>
												{#snippet child({ props: itemProps })}
													<button
														{...itemProps}
														type="button"
														role="option"
														tabindex={undefined}
														class={[
															'arc-command-palette__result',
															index === safeIndex && 'arc-command-palette__active-result'
														]}
														aria-selected={index === safeIndex}
														onpointermove={(event) => {
															if (
																event.clientX === lastPointer.x &&
																event.clientY === lastPointer.y
															)
																return;
															lastPointer = { x: event.clientX, y: event.clientY };
															if (index !== safeIndex) {
																pointer = true;
																activeIndex = index;
															}
														}}
													>
														<span class="arc-command-palette__item-icon" aria-hidden="true"
															>{#if item.icon}{@render item.icon()}{:else}<CommandIcon
																	width={16}
																	height={16}
																/>{/if}</span
														><span class="arc-command-palette__result-copy"
															><strong>{item.label}</strong>{#if item.description}<small
																	>{item.description}</small
																>{/if}</span
														>{#if item.shortcut}<kbd class="arc-command-palette__shortcut"
																>{item.shortcut}</kbd
															>{/if}
													</button>
												{/snippet}
											</Command.Item>
										</div>
									{/each}
								</div>
							{/each}
						</div>
					{/if}
					{#if modeShown && resultMode === 'empty'}
						<div
							class="arc-command-palette__empty"
							onoutroend={finishModeExit}
							in:swap|global={{
								y: reduced ? 0 : 6,
								blur: reduced ? 0 : m.blur.subtle,
								duration: reduced ? 0 : m.duration.standard,
								easing: m.ease.enter,
								skip: !mounted.current
							}}
							out:swap={{
								y: reduced ? 0 : -4,
								duration: reduced ? 0 : m.duration.instant,
								easing: m.ease.standard
							}}
						>
							<span><Search width={20} height={20} aria-hidden="true" /></span><strong
								>No matching actions</strong
							><small>Try a different word or clear the search.</small>
						</div>
					{/if}
				</Command.List>
			</div>
		</div>
	{/snippet}
</Command.Root>
