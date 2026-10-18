<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { Toolbar, Tooltip as Tip, mergeProps } from 'bits-ui';
	import ItemTooltip from './FloatingButtonGroupTooltip.svelte';
	import { PhysicalSpring, PointerHighlight, Mounted, motionTokens as m, swap } from '#lib/motion';
	import type { FloatingButtonGroupProps, FloatingButtonGroupAction } from './types';
	import './floating-button-group.css';
	let {
		items,
		label,
		variant = 'muted',
		size = 'md',
		orientation = 'horizontal',
		iconOnly: groupIconOnly = false,
		tooltipSide,
		onAction,
		class: className,
		style
	}: FloatingButtonGroupProps = $props();
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	const mounted = new Mounted();
	let tray = $state<HTMLDivElement | null>(null),
		hover = $state<string | null>(null),
		focus = $state<string | null>(null),
		pressing = $state(false),
		tabStop = $state<string | null>(null);
	const actions = $derived(
		items.filter((item): item is FloatingButtonGroupAction => item.type !== 'separator')
	);
	const stop = $derived(
		actions.find((item) => item.id === tabStop && !item.disabled)?.id ??
			actions.find((item) => !item.disabled)?.id ??
			null
	);
	const active = $derived(
		actions.some((item) => item.id === hover && !item.disabled)
			? hover
			: actions.some((item) => item.id === focus)
				? focus
				: null
	);
	const vertical = $derived(orientation === 'vertical'),
		side = $derived(tooltipSide ?? (vertical ? 'right' : 'top'));
	const idsKey = $derived(actions.map((item) => item.id).join('\u0000'));
	const highlight = new PointerHighlight(() => ({ spec: m.specs.morph, reduced }));
	const scale = new PhysicalSpring(1, m.specs.snappy, { delta: 0.005, speed: 0.01 });
	onDestroy(() => scale.destroy());
	function place(key: string | null, follow = false) {
		const node = Array.from(tray?.querySelectorAll<HTMLElement>('[data-fbg-item]') ?? []).find(
			(n) => n.dataset.fbgItem === key
		);
		if (!node || !tray) {
			highlight.fade(0, reduced ? m.duration.instant : m.duration.standard);
			return;
		}
		const outer = tray.getBoundingClientRect(),
			r = node.getBoundingClientRect();
		const unscale = outer.width ? tray.offsetWidth / outer.width : 1,
			dpr = window.devicePixelRatio || 1;
		const snap = (value: number) => Math.round(value * unscale * dpr) / dpr;
		const rect = [
			snap(r.left - outer.left) - tray.clientLeft,
			snap(r.top - outer.top) - tray.clientTop,
			snap(r.width),
			snap(r.height)
		];
		const visible = highlight.opacity.current > 0.15;
		if (follow && visible) highlight.follow(rect);
		else highlight.move(rect, !visible || reduced);
		if (!visible && !reduced) {
			scale.jump(0.94);
			scale.set(pressing ? 0.965 : 1, { velocity: 0 });
		}
		highlight.fade(1, reduced ? m.duration.instant : m.duration.fast);
	}
	$effect(() => {
		const key = active;
		void reduced;
		untrack(() => place(key));
	});
	$effect(() => {
		const next = pressing && active ? 0.965 : 1;
		if (reduced) scale.jump(next);
		else scale.set(next, { velocity: 0 });
	});
	$effect(() => {
		void idsKey;
		const root = tray;
		if (!root) return;
		const observer = new ResizeObserver(() =>
			untrack(() => {
				if (active) place(active, true);
			})
		);
		observer.observe(root);
		root.querySelectorAll('[data-fbg-item]').forEach((n) => observer.observe(n));
		return () => observer.disconnect();
	});
</script>

{#snippet body(item: FloatingButtonGroupAction, iconOnly: boolean)}
	<span class="arc-floating-button-group__slot">
		{#each iconOnly ? [] : [...new Set([item.label, ...(item.reserveLabels ?? [])])] as text (text)}
			<span class="arc-floating-button-group__ghost" aria-hidden="true"
				>{#if item.icon}<span class="arc-floating-button-group__iconSpace"></span>{/if}<span
					class="arc-floating-button-group__text">{text}</span
				></span
			>
		{/each}
		{#key item.label}
			<span
				class="arc-floating-button-group__phase"
				in:swap={reduced
					? { duration: m.duration.instant, skip: !mounted.current }
					: {
							y: 4,
							blur: m.blur.soft,
							duration: m.duration.standard,
							easing: m.ease.enter,
							skip: !mounted.current
						}}
				out:swap={reduced
					? { duration: m.duration.instant }
					: { y: -3, blur: m.blur.soft, duration: m.duration.fast, easing: m.ease.standard }}
			>
				{#if item.icon}<span class="arc-floating-button-group__icon" aria-hidden="true"
						>{@render item.icon()}</span
					>{/if}{#if !iconOnly}<span class="arc-floating-button-group__text">{item.label}</span
					>{/if}
			</span>
		{/key}
	</span>
{/snippet}
{#snippet button(
	item: FloatingButtonGroupAction,
	iconOnly: boolean,
	tipProps: Record<string, unknown> = {}
)}
	<Toolbar.Button
		disabled={item.disabled}
		class="arc-floating-button-group__item"
		data-fbg-item={item.id}
		data-active={active === item.id ? '' : undefined}
		data-icon={item.icon ? '' : undefined}
		data-icon-only={iconOnly ? '' : undefined}
		aria-label={item.label}
		aria-pressed={item.pressed}
		aria-disabled={item.disabled || undefined}
		onpointermove={(event) => {
			if (event.pointerType === 'mouse' || event.pointerType === 'pen') hover = item.id;
		}}
		onpointerdown={(event) => {
			if (item.disabled || event.button !== 0) return;
			hover = item.id;
			pressing = true;
		}}
		onpointerup={() => {
			pressing = false;
		}}
		onpointercancel={() => {
			pressing = false;
		}}
		onpointerleave={() => {
			pressing = false;
		}}
		onkeydown={(event) => {
			if ((event.key === 'Enter' || event.key === ' ') && !event.repeat && !item.disabled)
				pressing = true;
		}}
		onkeyup={(event) => {
			if (event.key === 'Enter' || event.key === ' ') pressing = false;
		}}
		onfocus={(event) => {
			tabStop = item.id;
			focus = event.currentTarget.matches(':focus-visible') ? item.id : null;
		}}
		onclick={() => {
			if (item.disabled) return;
			item.onSelect?.();
			onAction?.(item.id);
		}}
	>
		{#snippet child({ props })}<button
				{...mergeProps(props, tipProps)}
				disabled={false}
				tabindex={stop === item.id ? 0 : -1}>{@render body(item, iconOnly)}</button
			>{/snippet}
	</Toolbar.Button>
{/snippet}
{#snippet tip(item: FloatingButtonGroupAction)}<span class="arc-floating-button-group__tip"
		>{item.label}{#if item.shortcut}<kbd class="arc-floating-button-group__kbd">{item.shortcut}</kbd
			>{/if}</span
	>{/snippet}
<Tip.Provider delayDuration={250} skipDelayDuration={300} disableHoverableContent>
	<Toolbar.Root
		bind:ref={tray}
		{orientation}
		loop
		aria-label={label}
		aria-orientation={orientation}
		data-variant={variant}
		class={[
			'arc-floating-button-group__group',
			`arc-floating-button-group__${variant}`,
			`arc-floating-button-group__${size}`,
			vertical && 'arc-floating-button-group__vertical',
			className
		]}
		{style}
		onkeydowncapture={(event) => {
			if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key))
				hover = null;
		}}
		onfocusout={(event) => {
			if (!tray?.contains(event.relatedTarget as Node | null)) {
				focus = null;
				pressing = false;
			}
		}}
		onpointerleave={() => {
			hover = null;
			pressing = false;
		}}
	>
		<span
			class="arc-floating-button-group__highlight"
			data-pressing={pressing && active ? '' : undefined}
			aria-hidden="true"
			style="transform:translate({highlight.box.current[0]}px,{highlight.box
				.current[1]}px) scale({scale.current});width:{highlight.box.current[2]}px;height:{highlight
				.box.current[3]}px;opacity:{highlight.opacity.current}"
		></span>
		{#each items as item, position (item.id ?? `separator-${position}`)}
			{#if item.type === 'separator'}<span
					class="arc-floating-button-group__separator"
					role="separator"
					aria-orientation={vertical ? 'horizontal' : 'vertical'}
				></span>
			{:else}
				{@const iconOnly = Boolean(item.icon && (item.iconOnly ?? groupIconOnly))}
				{#if !iconOnly && !item.shortcut}{@render button(item, iconOnly)}
				{:else}
					{#snippet tipContent()}{@render tip(item)}{/snippet}
					<ItemTooltip {side} content={tipContent}>
						{#snippet child({ props })}{@render button(item, iconOnly, props)}{/snippet}
					</ItemTooltip>
				{/if}
			{/if}
		{/each}
	</Toolbar.Root>
</Tip.Provider>
