<script lang="ts">
	import { Select } from 'bits-ui';
	import { tick, untrack } from 'svelte';
	import { prefersReducedMotion, Tween } from 'svelte/motion';
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import { PhysicalSpring, Mounted, motionTokens as m, springCurve, swap } from '#lib/motion';
	import MorphValue from './MorphValue.svelte';
	import type { MorphSelectProps, MorphSelectOption } from './types';
	import './morph-select.css';
	let {
		label,
		hideLabel = false,
		items,
		defaultValue = null,
		value = $bindable(undefined),
		onValueChange,
		placeholder = 'Select',
		searchable = 'auto',
		searchPlaceholder,
		panelWidth = 272,
		maxListHeight = 296,
		align = 'start',
		name,
		disabled = false,
		class: className
	}: MorphSelectProps = $props();
	let inner = $state(untrack(() => defaultValue));
	const selectedValue = $derived(value === undefined ? inner : value);
	const uid = $props.id(),
		labelId = `${uid}-label`,
		listId = `${uid}-list`,
		mounted = new Mounted(),
		reduced = $derived(mounted.current && Boolean(prefersReducedMotion.current));
	const sections = $derived.by(() => {
		const out: { key: string; label?: string; options: MorphSelectOption[] }[] = [];
		items.forEach((item, i) => {
			if ('options' in item)
				out.push({ key: `group-${i}`, label: item.label, options: item.options });
			else {
				const last = out.at(-1);
				if (last && !last.label) last.options.push(item);
				else out.push({ key: `loose-${i}`, options: [item] });
			}
		});
		return out;
	});
	const all = $derived(sections.flatMap((s) => s.options)),
		selected = $derived(all.find((o) => o.value === selectedValue)),
		canSearch = $derived(searchable === 'auto' ? all.length > 8 : searchable);
	let open = $state(false),
		query = $state(''),
		active = $state<string | null>(null),
		announcement = $state(''),
		ready = $state(false),
		fly = $state<{ x: number; y: number } | null>(null),
		direction = $state(1);
	const visible = $derived(
		query.trim()
			? sections
					.map((s) => ({
						...s,
						options: s.options.filter((o) =>
							`${o.label} ${o.meta ?? ''} ${o.keywords ?? ''}`
								.toLowerCase()
								.includes(query.trim().toLowerCase())
						)
					}))
					.filter((s) => s.options.length)
			: sections
	);
	const enabled = $derived(visible.flatMap((s) => s.options).filter((o) => !o.disabled)),
		current = $derived(
			enabled.some((o) => o.value === active) ? active : (enabled[0]?.value ?? null)
		),
		count = $derived(visible.reduce((n, s) => n + s.options.length, 0));
	let root = $state<HTMLDivElement>(),
		measure = $state<HTMLElement>(),
		face = $state<HTMLDivElement>(),
		scroll = $state<HTMLDivElement>(),
		trigger = $state<HTMLButtonElement | null>(null),
		input = $state<HTMLInputElement>(),
		slot = $state<HTMLElement>();
	const grow = { visualDuration: 0.4, bounce: 0.12 },
		shrink = { visualDuration: 0.34, bounce: 0 },
		glide = { visualDuration: 0.28, bounce: 0.08 },
		wide = { visualDuration: 0.42, bounce: 0.16 },
		narrow = { visualDuration: 0.42, bounce: 0 };
	const anchor = new PhysicalSpring(0, wide),
		w = new PhysicalSpring(0, grow),
		h = new PhysicalSpring(0, grow),
		radius = new PhysicalSpring(22, grow),
		hy = new PhysicalSpring(0, glide),
		hh = new PhysicalSpring(0, glide),
		ho = new Tween(0),
		rotation = new PhysicalSpring(0, glide);
	let lastOpen = false,
		measured = false;
	const rowId = (v: string) => `${uid}-option-${all.findIndex((o) => o.value === v)}`;
	function place(animated: boolean) {
		if (!measure || !face || !root) return;
		const exact = measure.getBoundingClientRect().width,
			rounded = measure.offsetWidth,
			tw = Math.abs(exact - rounded) <= 0.5 ? Math.ceil(exact - 0.01) : rounded + 1,
			lid = measure.offsetHeight;
		root.style.setProperty('--ms-trigger-w', `${tw}px`);
		const nw = open ? Math.max(tw, face.offsetWidth) : tw,
			nh = open ? lid + face.offsetHeight : lid,
			nr = open ? 22 : lid / 2;
		if (!measured || !animated || reduced) {
			anchor.jump(tw);
			w.jump(nw);
			h.jump(nh);
			radius.jump(nr);
			measured = true;
		} else {
			const spec = nw * nh >= w.current * h.current ? grow : shrink;
			anchor.set(tw, { spec: tw < anchor.current ? narrow : wide });
			w.set(nw, { spec: open ? spec : nw < w.current ? narrow : wide });
			h.set(nh, { spec });
			radius.set(nr, { spec });
		}
		ready = true;
	}
	function observe() {
		if (!measure || !face) return;
		untrack(() => place(false));
		const ro = new ResizeObserver(() => place(true));
		ro.observe(measure);
		ro.observe(face);
		return () => {
			ro.disconnect();
			[anchor, w, h, radius, hy, hh, rotation].forEach((s) => s.destroy());
		};
	}
	$effect(() => {
		const mode = open;
		untrack(() => {
			if (mode === lastOpen) return;
			lastOpen = mode;
			place(true);
			if (reduced) rotation.jump(mode ? 180 : 0);
			else rotation.set(mode ? 180 : 0);
			void tick().then(() => {
				if (open && canSearch) input?.focus({ preventScroll: true });
			});
		});
	});
	$effect(() => {
		void current;
		void open;
		void visible;
		untrack(() => {
			const node = open && current !== null ? document.getElementById(rowId(current)) : null;
			if (!node) {
				void ho.set(0, { duration: 0 });
				return;
			}
			if (reduced || ho.current < 0.05) {
				hy.jump(node.offsetTop);
				hh.jump(node.offsetHeight);
			} else {
				hy.set(node.offsetTop);
				hh.set(node.offsetHeight);
			}
			void ho.set(1, { duration: reduced ? 0 : 120, easing: m.ease.enter });
			if (scroll) {
				const top = node.offsetTop,
					bottom = top + node.offsetHeight;
				if (top < scroll.scrollTop + 6) scroll.scrollTop = top - 6;
				else if (bottom > scroll.scrollTop + scroll.clientHeight - 6)
					scroll.scrollTop = bottom - scroll.clientHeight + 6;
			}
		});
	});
	function openList(seed = '') {
		if (disabled || open) return;
		query = seed;
		active = selectedValue;
		announcement = '';
		open = true;
	}
	function close(restore: boolean) {
		open = false;
		if (restore) void tick().then(() => trigger?.focus({ preventScroll: true }));
	}
	function commit(option: MorphSelectOption) {
		if (option.disabled) return;
		if (option.value !== selectedValue) {
			const part = document
				.getElementById(rowId(option.value))
				?.querySelector<HTMLElement>('[data-part=value]');
			if (!reduced && part && slot) {
				const a = part.getBoundingClientRect(),
					b = slot.getBoundingClientRect();
				fly = { x: a.left - b.left, y: a.top + a.height / 2 - b.top - b.height / 2 };
			} else fly = null;
			direction =
				Math.sign(all.indexOf(option) - all.findIndex((o) => o.value === selectedValue)) || 1;
			if (value === undefined) inner = option.value;
			else if (!onValueChange) value = option.value;
			onValueChange?.(option.value, option);
		}
		close(true);
	}
	function queryChanged(next: string) {
		query = next;
		active = null;
		if (scroll) scroll.scrollTop = 0;
		void tick().then(() => {
			announcement = query.trim()
				? count
					? `${count} ${count === 1 ? 'option' : 'options'}`
					: 'No matches'
				: '';
			if (current !== null) highlight(current);
		});
	}
	function highlight(v: string) {
		active = v;
		document
			.getElementById(rowId(v))
			?.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse' }));
	}
	function key(event: KeyboardEvent, fromInput: boolean, bits?: unknown) {
		const k = event.key,
			printable = k.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
		if (!open) {
			if (['ArrowDown', 'ArrowUp', 'Enter', ' ', 'Home', 'End'].includes(k)) {
				event.preventDefault();
				openList();
				if (k === 'Home') active = enabled[0]?.value ?? null;
				if (k === 'End') active = enabled.at(-1)?.value ?? null;
				return;
			}
			if (printable) {
				event.preventDefault();
				openList(canSearch ? k : '');
				if (!canSearch)
					void tick().then(() =>
						trigger?.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
					);
			}
			return;
		}
		if (k === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			close(true);
			return;
		}
		if (k === 'Tab') {
			close(false);
			return;
		}
		if (k === 'Enter' || (!fromInput && k === ' ') || (k === 'ArrowUp' && event.altKey)) {
			event.preventDefault();
			const option = enabled.find((o) => o.value === current);
			if (option) commit(option);
			return;
		}
		if ((k === 'Home' || k === 'End') && fromInput && query) return;
		if (k === 'PageDown' || k === 'PageUp') {
			event.preventDefault();
			const at = enabled.findIndex((o) => o.value === current),
				next = enabled[Math.min(enabled.length - 1, Math.max(0, at + (k === 'PageDown' ? 8 : -8)))];
			if (next) highlight(next.value);
			return;
		}
		if (fromInput && printable) return;
		if (typeof bits === 'function') bits(event);
	}
	let keyHandler: unknown;
</script>

<Select.Root
	type="single"
	value={selectedValue === null ? '' : `v:${selectedValue}`}
	{open}
	{disabled}
	loop={false}
	allowDeselect={false}
	onValueChange={(v) => {
		const option = all.find((o) => `v:${o.value}` === v);
		if (option) commit(option);
	}}
	onOpenChange={(next) => {
		if (next) openList();
		else close(false);
	}}
>
	<div
		bind:this={root}
		class={['arc-morph-select__root', className]}
		style={`--ms-panel-w:${panelWidth}px;--ms-list-max:${maxListHeight}px`}
		data-open={open || undefined}
		data-align={align}
		data-disabled={disabled || undefined}
		data-ready={ready ? '' : undefined}
		onfocusout={(e) => {
			if (open && e.relatedTarget && !root?.contains(e.relatedTarget as Node)) close(false);
		}}
		{@attach observe}
	>
		<span id={labelId} class={hideLabel ? 'arc-morph-select__sr-only' : 'arc-morph-select__label'}
			>{label}</span
		>
		<div class="arc-morph-select__anchor" style:width={ready ? `${anchor.current}px` : undefined}>
			<span
				bind:this={measure}
				class="arc-morph-select__trigger arc-morph-select__measure"
				aria-hidden="true"><MorphValue option={selected} {placeholder} /></span
			>
			<Select.ContentStatic
				forceMount
				onEscapeKeydown={(e) => {
					e.preventDefault();
					close(true);
				}}
			>
				{#snippet child({ props })}<div
						{...props}
						role={undefined}
						class="arc-morph-select__shape"
						style:width={ready ? `${w.current}px` : '100%'}
						style:height={ready ? `${h.current}px` : '100%'}
						style:border-radius={`${radius.current}px`}
					>
						<div class="arc-morph-select__lid">
							<Select.Trigger bind:ref={trigger}>
								{#snippet child({ props: tp })}<button
										{...tp}
										type="button"
										class="arc-morph-select__trigger"
										role="combobox"
										aria-labelledby={labelId}
										aria-controls={listId}
										aria-activedescendant={open && !canSearch && current !== null
											? rowId(current)
											: undefined}
										{disabled}
										inert={open && canSearch}
										tabindex={open && canSearch ? -1 : 0}
										onpointerdown={undefined}
										onpointerup={undefined}
										onclick={() => (open ? close(true) : openList())}
										onkeydown={(e) => key(e, false, tp.onkeydown)}
										{@attach () => {
											keyHandler = tp.onkeydown;
										}}
									>
										<span
											bind:this={slot}
											class="arc-morph-select__slot"
											data-hidden={(open && canSearch) || undefined}
											>{#key selectedValue}<span
													class="arc-morph-select__layer"
													in:swap={{
														x: fly?.x ?? 0,
														y: fly?.y ?? `${direction * 0.5}em`,
														opacity: fly ? 1 : 0,
														blur: fly ? 0 : m.blur.soft,
														...springCurve(fly ? { visualDuration: 0.3, bounce: 0.06 } : glide),
														fade: { duration: fly ? 0 : 220, easing: m.ease.enter },
														skip: !mounted.current || reduced
													}}
													out:swap={{
														y: fly ? '-0.3em' : `${direction * -0.45}em`,
														blur: reduced ? 0 : m.blur.subtle,
														duration: reduced ? 100 : 120,
														easing: m.ease.standard
													}}><MorphValue option={selected} {placeholder} /></span
												>{/key}</span
										>
									</button>{/snippet}
							</Select.Trigger>
							{#if canSearch}<div
									class="arc-morph-select__search-row"
									inert={!open}
									style:opacity={open ? 1 : 0}
								>
									<Search
										class="arc-morph-select__search-icon"
										size={16}
										strokeWidth={1.75}
										aria-hidden="true"
									/><input
										bind:this={input}
										class="arc-morph-select__input"
										type="text"
										role="combobox"
										aria-label={`Search ${label.toLowerCase()}`}
										aria-expanded={open}
										aria-controls={listId}
										aria-autocomplete="list"
										aria-activedescendant={open && current !== null ? rowId(current) : undefined}
										placeholder={searchPlaceholder ?? selected?.label ?? 'Search'}
										value={query}
										autocomplete="off"
										spellcheck={false}
										oninput={(e) => queryChanged(e.currentTarget.value)}
										onkeydown={(e) => key(e, true, keyHandler)}
									/>{#if query}<button
											class="arc-morph-select__clear"
											type="button"
											aria-label="Clear search"
											onpointerdown={(e) => e.preventDefault()}
											onclick={() => {
												queryChanged('');
												input?.focus();
											}}><X size={14} strokeWidth={1.75} /></button
										>{/if}<button
										type="button"
										class="arc-morph-select__close-hit"
										aria-label={`Close ${label.toLowerCase()}`}
										onclick={() => close(true)}
									></button>
								</div>{/if}
							<span
								class="arc-morph-select__chevron"
								aria-hidden="true"
								style:transform={`rotate(${rotation.current}deg)`}
								><ChevronDown size={16} strokeWidth={1.75} /></span
							>
						</div>
						<div
							bind:this={face}
							class="arc-morph-select__list-face"
							inert={!open}
							aria-hidden={!open || undefined}
							style:opacity={open ? 1 : 0}
						>
							<div bind:this={scroll} class="arc-morph-select__scroll">
								<div
									id={listId}
									class="arc-morph-select__options"
									role="listbox"
									aria-labelledby={labelId}
								>
									<span
										class="arc-morph-select__highlight"
										style:transform={`translateY(${hy.current}px)`}
										style:height={`${hh.current}px`}
										style:opacity={ho.current}
										aria-hidden="true"
									></span>
									{#each visible as section (section.key)}<div
											class="arc-morph-select__group"
											role={section.label ? 'group' : 'presentation'}
											aria-labelledby={section.label ? `${uid}-${section.key}` : undefined}
										>
											{#if section.label}<div
													id={`${uid}-${section.key}`}
													class="arc-morph-select__group-label"
													role="presentation"
												>
													{section.label}
												</div>{/if}{#each section.options as option (option.value)}<Select.Item
													value={`v:${option.value}`}
													label={option.label}
													disabled={option.disabled}
													onHighlight={() => (active = option.value)}
												>
													{#snippet child({ props: op })}<div
															{...op}
															id={rowId(option.value)}
															role="option"
															aria-selected={option.value === selectedValue}
															aria-disabled={option.disabled || undefined}
															class="arc-morph-select__option"
															data-active={option.value === current || undefined}
															onpointerdown={(e) => e.preventDefault()}
															onclick={() => commit(option)}
														>
															<span class="arc-morph-select__option-value" data-part="value"
																><MorphValue {option} {placeholder} /></span
															>{#if option.meta}<span class="arc-morph-select__meta"
																	>{option.meta}</span
																>{/if}<span
																class="arc-morph-select__check"
																data-on={option.value === selectedValue || undefined}
																aria-hidden="true"><Check size={16} strokeWidth={1.75} /></span
															>
														</div>{/snippet}
												</Select.Item>{/each}
										</div>{/each}
									{#if !count}<p class="arc-morph-select__empty">
											No matches for “{query.trim()}”
										</p>{/if}
								</div>
							</div>
						</div>
					</div>{/snippet}
			</Select.ContentStatic>
		</div>
		{#if name}<input type="hidden" {name} value={selectedValue ?? ''} />{/if}<span
			class="arc-morph-select__sr-only"
			role="status"
			aria-live="polite">{announcement}</span
		>
	</div>
</Select.Root>
