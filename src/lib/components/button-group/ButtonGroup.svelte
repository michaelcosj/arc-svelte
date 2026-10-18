<script lang="ts">
	import { untrack } from 'svelte';
	import { DropdownMenu as Primitive } from 'bits-ui';
	import { prefersReducedMotion } from 'svelte/motion';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { motionTokens as m, PointerHighlight } from '#lib/motion';
	import SegmentContent from './SegmentContent.svelte';
	import type { ButtonGroupProps, ButtonGroupItem } from './types';
	import './button-group.css';
	let {
		items,
		menu,
		label,
		variant = 'outline',
		size = 'md',
		orientation = 'horizontal',
		collapseLabels = true,
		disabled = false,
		class: className,
		style
	}: ButtonGroupProps = $props();
	const MENU = 'button-group-menu';
	const uid = $props.id();
	const triggerId = `arc-button-group-${uid}`;
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	const vertical = $derived(orientation === 'vertical');
	let root = $state<HTMLDivElement>();
	let hover = $state<string | null>(null);
	let pressed = $state<string | null>(null);
	let focused = $state<string | null>(null);
	let menuOpen = $state(false);
	const active = $derived(hover ?? pressed ?? (menuOpen ? MENU : null) ?? focused);
	const keys = $derived([...items.map((item) => item.id), ...(menu ? [MENU] : [])]);
	const activeIndex = $derived(active ? keys.indexOf(active) : -1);
	const inertKey = $derived(`${disabled}${items.map((item) => (item.disabled ? 1 : 0)).join('')}`);
	const keyList = $derived(keys.join('\u0000'));
	const highlight = new PointerHighlight(() => ({ spec: m.specs.snappy, reduced }));
	const { box, opacity } = highlight;
	let shown: string | null = null;
	const segments = () =>
		Array.from(root?.querySelectorAll<HTMLElement>(':scope > [data-key]') ?? []);
	const segment = (key: string | null) => segments().find((node) => node.dataset.key === key);
	const inert = (node: HTMLElement) =>
		(node as HTMLButtonElement).disabled || node.getAttribute('aria-disabled') === 'true';
	function boxOf(node: HTMLElement) {
		const group = root!;
		const outer = group.getBoundingClientRect(),
			inner = node.getBoundingClientRect();
		const scale =
			group.offsetWidth && Math.abs(outer.width - group.offsetWidth) > 1
				? outer.width / group.offsetWidth
				: 1;
		return [
			(inner.left - outer.left) / scale - group.clientLeft + group.scrollLeft,
			(inner.top - outer.top) / scale - group.clientTop + group.scrollTop,
			inner.width / scale,
			inner.height / scale
		];
	}
	$effect(() => {
		const key = active,
			focus = focused,
			reduce = reduced;
		void inertKey;
		void root;
		untrack(() => {
			const node = segment(key);
			const duration = reduce ? m.duration.instant : m.duration.fast;
			if (!node || (inert(node) && key !== focus)) {
				if (shown !== null) void opacity.set(0, { duration, easing: m.ease.standard });
				shown = null;
				return;
			}
			highlight.move(boxOf(node), shown === null || reduce);
			void opacity.set(1, { duration, easing: m.ease.standard });
			shown = key;
		});
	});
	$effect(() => {
		void keyList;
		const group = root,
			reduce = reduced;
		if (!group) return;
		const observer = new ResizeObserver(() => {
			const node = segment(shown);
			if (!node) return;
			const target = boxOf(node);
			if (target.every((value, i) => Math.abs(value - box.target[i]!) < 0.01)) return;
			const moving = box.current.some((value, i) => Math.abs(value - box.target[i]!) >= 0.01);
			highlight.move(target, reduce || !moving);
		});
		observer.observe(group);
		segments().forEach((node) => observer.observe(node));
		return () => observer.disconnect();
	});
	let overflowing = $state(false);
	let fullWidth = 0,
		blockedAt = 0;
	const collapsible = $derived(
		collapseLabels &&
			!vertical &&
			items.some((item) => item.icon && !item.iconOnly && item.content === undefined)
	);
	const compact = $derived(collapsible && overflowing);
	$effect(() => {
		void keyList;
		const group = root,
			parent = group?.parentElement;
		if (!group || !parent || !collapsible) return;
		const observer = new ResizeObserver(() => {
			const style = getComputedStyle(parent);
			const available =
				parent.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
			if (group.dataset.compact === undefined) {
				if (group.scrollWidth > group.clientWidth + 1) {
					fullWidth = group.scrollWidth + 2;
					blockedAt = available;
					overflowing = true;
				}
			} else if (available > blockedAt && available >= fullWidth) overflowing = false;
		});
		observer.observe(group);
		observer.observe(parent);
		return () => observer.disconnect();
	});
	$effect(() => {
		if (pressed === null) return;
		const release = () => {
			pressed = null;
		};
		window.addEventListener('pointerup', release);
		window.addEventListener('pointercancel', release);
		return () => {
			window.removeEventListener('pointerup', release);
			window.removeEventListener('pointercancel', release);
		};
	});
	function hit(event: PointerEvent) {
		for (const node of segments()) {
			const r = node.getBoundingClientRect();
			if (
				event.clientX >= r.left &&
				event.clientX < r.right &&
				event.clientY >= r.top &&
				event.clientY < r.bottom
			)
				return inert(node) ? null : (node.dataset.key ?? null);
		}
		return null;
	}
	function onfocusin(event: FocusEvent) {
		const target = event.target as HTMLElement;
		if (target.dataset.key === undefined) return;
		focused = target.matches(':focus-visible') ? target.dataset.key : null;
	}
	function onkeydown(event: KeyboardEvent) {
		if (event.defaultPrevented) return;
		const list = segments().filter((node) => !(node as HTMLButtonElement).disabled);
		const index = list.findIndex((node) => node === document.activeElement);
		if (index < 0) return;
		const rtl = !vertical && getComputedStyle(root!).direction === 'rtl';
		const forward = vertical ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight';
		const backward = vertical ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft';
		const last = list.length - 1;
		const target =
			event.key === forward
				? index === last
					? 0
					: index + 1
				: event.key === backward
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
	let announcement = $state('');
	let labels: Map<string, string> | undefined;
	let activated = { key: '', at: -Infinity };
	const labelList = $derived(items.map((item) => `${item.id}\u0000${item.label}`).join('\u0001'));
	$effect(() => {
		void labelList;
		untrack(() => {
			const previous = labels;
			labels = new Map(items.map((item) => [item.id, item.label]));
			if (!previous) return;
			const changed = items.filter(
				(item) =>
					performance.now() - activated.at < 1000 &&
					item.id === activated.key &&
					previous.has(item.id) &&
					previous.get(item.id) !== item.label &&
					item.content === undefined
			);
			if (changed.length) announcement = changed.map((item) => item.label).join(', ');
		});
	});
	function select(item: ButtonGroupItem) {
		activated = { key: item.id, at: performance.now() };
		item.onSelect?.();
	}
	const quiet = (index: number) =>
		activeIndex >= 0 && (index === activeIndex || index === activeIndex + 1) ? '' : undefined;
</script>

{#snippet group()}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		bind:this={root}
		class={[
			'arc-button-group__group',
			`arc-button-group__${variant}`,
			`arc-button-group__${size}`,
			vertical && 'arc-button-group__vertical',
			compact && 'arc-button-group__compact',
			className
		]}
		{style}
		role="group"
		aria-label={label}
		aria-disabled={disabled || undefined}
		data-orientation={orientation}
		data-compact={compact ? '' : undefined}
		onpointermove={(event) => {
			if (event.pointerType !== 'touch') hover = hit(event);
		}}
		onpointerleave={() => {
			hover = null;
		}}
		onpointerdown={(event) => {
			if (event.button === 0) pressed = hit(event);
		}}
		{onfocusin}
		onfocusout={(event) => {
			if (!root?.contains(event.relatedTarget as Node | null)) focused = null;
		}}
		{onkeydown}
	>
		<span
			class="arc-button-group__highlight"
			style="transform: translate({box.current[0]}px, {box.current[1]}px); width: {box
				.current[2]}px; height: {box.current[3]}px; opacity: {opacity.current}"
			data-pressed={pressed && pressed === active ? '' : undefined}
			aria-hidden="true"
		></span>
		{#each items as item, index (item.id)}
			{@const off = item.disabled && !disabled}
			{@const named = item.iconOnly || item.content !== undefined || (compact && !!item.icon)}
			{@const classes = [
				'arc-button-group__segment',
				item.iconOnly && 'arc-button-group__iconOnly'
			]}
			{#if item.href && !off && !disabled}
				<a
					class={classes}
					data-key={item.id}
					data-quiet={quiet(index)}
					data-collapsible={item.icon && !item.iconOnly && item.content === undefined
						? ''
						: undefined}
					aria-label={named ? item.label : undefined}
					title={item.iconOnly || (compact && item.icon) ? item.label : undefined}
					href={item.href}
					onclick={() => select(item)}
				>
					<span class="arc-button-group__content"><SegmentContent {item} {reduced} /></span>
					{#if !named}<span class="arc-button-group__srOnly">{item.label}</span>{/if}
				</a>
			{:else}
				<button
					class={classes}
					data-key={item.id}
					data-quiet={quiet(index)}
					data-collapsible={item.icon && !item.iconOnly && item.content === undefined
						? ''
						: undefined}
					aria-label={named ? item.label : undefined}
					title={item.iconOnly || (compact && item.icon) ? item.label : undefined}
					type="button"
					{disabled}
					aria-disabled={off || undefined}
					onclick={off ? undefined : () => select(item)}
				>
					<span class="arc-button-group__content"><SegmentContent {item} {reduced} /></span>
					{#if !named}<span class="arc-button-group__srOnly">{item.label}</span>{/if}
				</button>
			{/if}
		{/each}
		{#if menu}
			<Primitive.Trigger
				id={triggerId}
				class="arc-button-group__segment arc-button-group__trigger"
				data-key={MENU}
				data-quiet={quiet(items.length)}
				aria-label={menu.label}
				title={menu.label}
				{disabled}
			>
				<span class="arc-button-group__content"
					><ChevronDown class="arc-button-group__chevron" aria-hidden="true" /></span
				>
			</Primitive.Trigger>
		{/if}
		<span class="arc-button-group__srOnly" aria-live="polite">{announcement}</span>
	</div>
{/snippet}
{#if menu}
	<Primitive.Root bind:open={menuOpen}>
		{@render group()}
		<Primitive.Portal>
			<Primitive.Content
				class="arc-button-group__menu"
				aria-labelledby={triggerId}
				side="bottom"
				align={vertical ? 'start' : 'end'}
				alignOffset={-1}
				sideOffset={6}
				collisionPadding={12}
				preventScroll={false}
				trapFocus={false}
				loop
			>
				{#each menu.items as action, index (action.id)}
					{#snippet body()}
						{#if action.icon}<span class="arc-button-group__itemIcon" aria-hidden="true"
								>{@render action.icon()}</span
							>{/if}
						<span class="arc-button-group__itemLabel">{action.label}</span>
					{/snippet}
					<Primitive.Item
						class={[
							'arc-button-group__item',
							action.destructive && 'arc-button-group__destructive'
						]}
						style="--i: {index}"
						disabled={action.disabled}
						onSelect={() => action.onSelect?.()}
					>
						{#snippet child({ props })}
							{#if action.href}<a {...props} href={action.href}>{@render body()}</a>{:else}<div
									{...props}
								>
									{@render body()}
								</div>{/if}
						{/snippet}
					</Primitive.Item>
				{/each}
			</Primitive.Content>
		</Primitive.Portal>
	</Primitive.Root>
{:else}
	{@render group()}
{/if}
