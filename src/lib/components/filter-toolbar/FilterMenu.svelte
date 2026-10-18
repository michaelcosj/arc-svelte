<script lang="ts">
	import { Popover } from 'bits-ui';
	import { tick, untrack } from 'svelte';
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import Plus from '@lucide/svelte/icons/plus';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import { motionTokens as m, swap, widthPresence, Mounted } from '#lib/motion';
	import FilterList from './FilterList.svelte';
	import type { FilterMenuProps, FilterRow, FocusRequest } from './types';
	import './filter-toolbar.css';
	let {
		fields,
		onSelect,
		active = [],
		label = 'Add filter',
		align = 'end'
	}: FilterMenuProps = $props();
	const id = $props.id(),
		titleId = `${id}-title`,
		panelId = `${id}-panel`,
		reduced = $derived(Boolean(prefersReducedMotion.current)),
		mounted = new Mounted();
	let root = $state<HTMLDivElement>(),
		trigger = $state<HTMLButtonElement | null>(null),
		panel = $state<HTMLDivElement | null>(null);
	let phase = $state<'closed' | 'open' | 'closing'>('closed'),
		fieldId = $state<string | null>(null),
		direction = $state(1),
		up = $state(false),
		origin = $state('100% 0'),
		sized = $state(false);
	let request: FocusRequest | null = null,
		run = 0,
		target = $state(0),
		from = $state(0),
		to = $state(0);
	const width = new Tween(0),
		height = new Tween(0),
		left = new Tween(0);
	const field = $derived(fields.find((f) => f.id === fieldId) ?? null),
		open = $derived(phase === 'open');
	const progress = $derived(
		!sized ? 0 : to > from ? Math.min(1, Math.max(0, (width.current - from) / (to - from))) : 1
	);
	const face = $derived(Math.min(1, progress / 0.35)),
		content = $derived(Math.min(1, Math.max(0, (progress - 0.4) / 0.5)));
	const current = (id: string) => active.find((f) => f.id === id)?.value;
	const rows = $derived<FilterRow[]>(
		field
			? field.options
					.map((e) => (typeof e === 'string' ? { value: e } : e))
					.map((e) => ({
						key: e.value,
						label: e.label ?? e.value,
						icon: e.icon,
						hint: e.hint,
						checked: current(field.id) === (e.label ?? e.value)
					}))
			: fields.map((f) => ({
					key: f.id,
					label: f.label,
					icon: f.icon,
					value: current(f.id),
					drill: true
				}))
	);
	function roomFor(node: HTMLElement) {
		const room = {
			left: 0,
			top: 0,
			right: document.documentElement.clientWidth,
			bottom: innerHeight
		};
		for (let p = node.parentElement; p && p !== document.body; p = p.parentElement) {
			const s = getComputedStyle(p),
				r = p.getBoundingClientRect();
			if (s.overflowX !== 'visible') {
				room.left = Math.max(room.left, r.left);
				room.right = Math.min(room.right, r.right);
			}
			if (s.overflowY !== 'visible') {
				room.top = Math.max(room.top, r.top);
				room.bottom = Math.min(room.bottom, r.bottom);
			}
		}
		return room;
	}
	async function focusRequested() {
		await tick();
		if (!panel || !open || !request) return;
		const ask = request;
		request = null;
		if (ask === 'panel') {
			panel.focus({ preventScroll: true });
			return;
		}
		const items = [...panel.querySelectorAll<HTMLElement>('[data-current] [data-row]')];
		const next =
			ask === 'first'
				? items[0]
				: ask === 'last'
					? items.at(-1)
					: ask === 'checked'
						? (items.find((e) => e.getAttribute('aria-checked') === 'true') ?? items[0])
						: (items.find((e) => e.dataset.row === ask.key) ?? items[0]);
		next?.focus({ preventScroll: true });
	}
	function openMenu(focus: FocusRequest) {
		if (!trigger || !panel) return;
		const rect = trigger.getBoundingClientRect(),
			w = panel.offsetWidth + 2,
			h = panel.offsetHeight + 2,
			room = roomFor(root ?? trigger),
			min = room.left + 16 - rect.left,
			max = room.right - 16 - rect.left - w,
			end = rect.width - w;
		let x =
			align === 'end'
				? end >= min
					? end
					: 0 <= max
						? 0
						: end
				: 0 <= max
					? 0
					: end >= min
						? end
						: 0;
		x = Math.round(Math.min(Math.max(x, min), Math.max(min, max)));
		const below = room.bottom - rect.top,
			above = rect.bottom - room.top;
		up = below < h + 16 && above > below;
		if (phase === 'closed') {
			void width.set(rect.width, { duration: 0 });
			void height.set(rect.height, { duration: 0 });
			void left.set(0, { duration: 0 });
		}
		target = x;
		from = rect.width;
		to = w;
		sized = true;
		phase = 'open';
		run++;
		request = focus;
		fieldId = null;
		direction = -1;
		origin = `${Math.round(rect.width / 2 - x)}px ${up ? '100%' : '0'}`;
		const curve = reduced ? { duration: 0 } : m.spring.morph;
		void left.set(x, curve);
		void width.set(w, curve);
		void height.set(h, curve);
		void focusRequested();
	}
	function closeMenu(restore: false | 'keyboard' | 'pointer') {
		if (phase !== 'open' || !trigger) return;
		const token = ++run;
		phase = 'closing';
		if (restore)
			trigger.focus({ preventScroll: true, focusVisible: restore === 'keyboard' } as FocusOptions);
		const rect = trigger.getBoundingClientRect(),
			curve = reduced ? { duration: 0 } : m.spring.snappy;
		void left.set(0, curve);
		void height.set(rect.height, curve);
		void width.set(rect.width, curve).then(() => {
			if (token !== run) return;
			phase = 'closed';
			sized = false;
			fieldId = null;
		});
	}
	function observe(node: HTMLElement) {
		const ro = new ResizeObserver(() => {
			if (open) void height.set(node.offsetHeight + 2, reduced ? { duration: 0 } : m.spring.smooth);
		});
		ro.observe(node);
		return () => {
			ro.disconnect();
			run++;
		};
	}
	function back(keyboard: boolean) {
		if (!field) return;
		request = keyboard ? { key: field.id } : 'panel';
		direction = -1;
		fieldId = null;
		void focusRequested();
	}
	function choose(row: FilterRow, keyboard: boolean) {
		if (!field) {
			request = keyboard ? 'checked' : 'panel';
			direction = 1;
			fieldId = row.key;
			void focusRequested();
		} else {
			onSelect({ id: field.id, label: field.label, value: row.label }, field);
			closeMenu(keyboard ? 'keyboard' : 'pointer');
		}
	}
	$effect(() => {
		void fields;
		untrack(() => {
			if (open) void focusRequested();
		});
	});
</script>

<Popover.Root
	{open}
	onOpenChange={(next) => {
		if (next) openMenu(request ?? 'first');
		else closeMenu(false);
	}}
>
	<div
		bind:this={root}
		class="arc-filter-toolbar__menu"
		data-state={phase}
		data-y={up ? 'up' : 'down'}
		onfocusout={(e) => {
			if (open && e.relatedTarget && !root?.contains(e.relatedTarget as Node)) closeMenu(false);
		}}
	>
		<Popover.Trigger
			bind:ref={trigger}
			class="arc-filter-toolbar__trigger"
			data-filter-trigger=""
			aria-haspopup="dialog"
			aria-controls={panelId}
			tabindex={open ? -1 : undefined}
			onclickcapture={(e) => (request = e.detail === 0 ? 'first' : 'panel')}
			onkeydown={(e) => {
				if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
					e.preventDefault();
					openMenu(e.key === 'ArrowDown' ? 'first' : 'last');
				}
			}}
		>
			<span
				class="arc-filter-toolbar__face"
				style:opacity={1 - face}
				style:transform={`scale(${1 - face * 0.04})`}
				style:filter={face ? `blur(${face * m.blur.subtle}px)` : 'none'}
				><Plus size={15} strokeWidth={1.8} aria-hidden="true" />{label}</span
			>
		</Popover.Trigger>
		<div
			class="arc-filter-toolbar__surface"
			style:left={`${left.current}px`}
			style:width={sized ? `${width.current}px` : '100%'}
			style:height={sized ? `${height.current}px` : '100%'}
		>
			<Popover.ContentStatic
				forceMount
				bind:ref={panel}
				id={panelId}
				trapFocus={false}
				preventScroll={false}
				onOpenAutoFocus={(e) => e.preventDefault()}
				onCloseAutoFocus={(e) => e.preventDefault()}
				onEscapeKeydown={(e) => {
					e.preventDefault();
					closeMenu('keyboard');
				}}
				onInteractOutside={(e) => {
					const hit = e.target as Element | null;
					if (!hit?.closest('button,a[href],input,select,textarea,[tabindex],[contenteditable]'))
						setTimeout(() => {
							if (
								!document.activeElement ||
								document.activeElement === document.body ||
								root?.contains(document.activeElement)
							)
								trigger?.focus({ preventScroll: true });
						}, 0);
				}}
			>
				{#snippet child({ props })}<div
						{...props}
						class="arc-filter-toolbar__panel"
						role="dialog"
						aria-labelledby={titleId}
						tabindex={-1}
						inert={!open}
						style:transform={`translateX(${target - left.current}px)`}
						onkeydown={(e) => {
							if (e.defaultPrevented) return;
							if (e.key === 'ArrowLeft' && field) {
								e.preventDefault();
								back(true);
							} else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
								e.preventDefault();
								const items = panel?.querySelectorAll<HTMLElement>('[data-current] [data-row]');
								(e.key === 'ArrowDown' ? items?.[0] : items?.[items.length - 1])?.focus({
									preventScroll: true
								});
							}
						}}
						{@attach observe}
					>
						<div
							style:opacity={content}
							style:transform-origin={origin}
							style:transform={`translateY(${(1 - content) * (up ? -6 : 6)}px) scale(${0.96 + content * 0.04})`}
							style:filter={content === 1 ? 'none' : `blur(${(1 - content) * m.blur.soft}px)`}
						>
							<div class="arc-filter-toolbar__head">
								{#each field ? [field.id] : [] as key (key)}<button
										type="button"
										class="arc-filter-toolbar__back"
										aria-label="Back to fields"
										style:margin-right="2px"
										onclick={(e) => back(e.detail === 0)}
										in:widthPresence={{
											spring: m.spring.snappy,
											scale: 0.6,
											skip: reduced,
											fade: { duration: m.duration.standard, easing: m.ease.enter }
										}}
										out:widthPresence={{
											spring: m.spring.snappy,
											scale: 0.6,
											skip: reduced,
											fade: { duration: m.duration.instant, easing: m.ease.standard }
										}}><ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" /></button
									>{/each}
								<span class="arc-filter-toolbar__title" id={titleId}
									>{#key field?.id ?? 'fields'}<span
											class="arc-filter-toolbar__title-text"
											in:swap={{
												y: reduced ? 0 : '0.3em',
												blur: reduced ? 0 : m.blur.soft,
												duration: reduced ? 120 : 240,
												easing: m.ease.enter,
												skip: !mounted.current
											}}
											out:swap={{
												y: reduced ? 0 : '-0.3em',
												blur: reduced ? 0 : m.blur.subtle,
												duration: reduced ? 0 : 120,
												easing: m.ease.standard,
												pop: true
											}}>{field?.label ?? label}</span
										>{/key}</span
								>
							</div>
							<div class="arc-filter-toolbar__stage">
								{#key field?.id ?? 'fields'}<div
										class="arc-filter-toolbar__step"
										in:swap={{
											x: reduced ? 0 : direction * 18,
											blur: reduced ? 0 : m.blur.soft,
											...(reduced ? { duration: 120 } : m.spring.smooth),
											fade: { duration: reduced ? 120 : 240, easing: m.ease.enter },
											skip: !mounted.current
										}}
										out:swap={{
											x: reduced ? 0 : -direction * 18,
											blur: reduced ? 0 : m.blur.subtle,
											duration: reduced ? 0 : 120,
											easing: m.ease.standard,
											pop: true
										}}
									>
										<FilterList
											{rows}
											{reduced}
											labelledBy={titleId}
											radio={Boolean(field)}
											onChoose={choose}
											onBack={field ? back : undefined}
											onLeave={() => panel?.focus({ preventScroll: true })}
										/>
									</div>{/key}
							</div>
						</div>
					</div>{/snippet}
			</Popover.ContentStatic>
		</div>
	</div>
</Popover.Root>
