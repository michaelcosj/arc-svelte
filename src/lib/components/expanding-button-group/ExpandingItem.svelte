<script lang="ts">
	import { untrack } from 'svelte';
	import { easeOut, TimedTween, TargetSpring, motionTokens as m } from '#lib/motion';
	import ItemPresence from './ItemPresence.svelte';
	import { metrics, type ExpandingButtonGroupItem, type ExpandingButtonGroupSize } from './types';
	let {
		item,
		size,
		expanded,
		done,
		busy,
		tabStop,
		reduced,
		onPointerDown,
		onClick,
		onFocus
	}: {
		item: ExpandingButtonGroupItem;
		size: ExpandingButtonGroupSize;
		expanded: boolean;
		done: boolean;
		busy: boolean;
		tabStop: boolean;
		reduced: boolean;
		onPointerDown: (item: ExpandingButtonGroupItem, event: PointerEvent) => void;
		onClick: (item: ExpandingButtonGroupItem) => void;
		onFocus: (
			item: ExpandingButtonGroupItem,
			event: FocusEvent & { currentTarget: HTMLButtonElement }
		) => void;
	} = $props();
	let text = $state(0),
		labelNode: HTMLSpanElement,
		doneNode = $state<HTMLSpanElement>();
	let settled = false;
	const metric = $derived(metrics[size]),
		measured = $derived(text > 0);
	const target = $derived(
		expanded && measured
			? metric.start + metric.icon + metric.gap + text + metric.end
			: metric.height
	);
	const width = new TargetSpring(0, m.specs.morph);
	const labelMotion = new TimedTween(
		untrack(() => ({
			opacity: expanded ? 1 : 0,
			x: reduced || expanded ? 0 : -6,
			blur: reduced || expanded ? 0 : 2
		}))
	);
	let labelSettled = false;
	$effect(() => {
		const shown = expanded,
			reduce = reduced;
		untrack(() => {
			// The gallery disables CSS transitions under reduced motion, but the source retains this fade.
			void labelMotion.set(
				{ opacity: shown ? 1 : 0, x: reduce || shown ? 0 : -6, blur: reduce || shown ? 0 : 2 },
				{
					duration: !labelSettled ? 0 : reduce ? 120 : shown ? 240 : 120,
					delay: labelSettled && !reduce && shown ? 40 : 0,
					easing: reduce ? easeOut : shown ? m.ease.enter : m.ease.standard
				}
			);
			labelSettled = true;
		});
	});
	const showDone = $derived(done && !!item.doneLabel),
		word = $derived(showDone ? item.doneLabel! : item.label);
	function measure(node: HTMLSpanElement) {
		const update = () => {
			const next = Math.max(
				labelNode?.getBoundingClientRect().width ?? 0,
				doneNode?.getBoundingClientRect().width ?? 0
			);
			if (Math.abs(text - next) >= 0.5) text = next;
		};
		untrack(update);
		const observer = new ResizeObserver(update);
		observer.observe(node);
		return () => observer.disconnect();
	}
	$effect(() => {
		const next = target,
			ready = measured,
			reduce = reduced;
		untrack(() => {
			void width.set(next, { instant: !settled || reduce });
			if (ready) settled = true;
		});
	});
</script>

<button
	type="button"
	class="arc-expanding-button-group__item"
	style:width="{width.current || target}px"
	data-ebg-item=""
	data-id={item.id}
	data-tone={item.tone ?? 'neutral'}
	data-state={showDone ? 'done' : 'idle'}
	data-expanded={expanded || undefined}
	data-unmeasured={measured ? undefined : ''}
	aria-label={item.label}
	aria-disabled={item.disabled || undefined}
	aria-busy={busy || undefined}
	tabindex={tabStop ? 0 : -1}
	onpointerdown={(event) => onPointerDown(item, event)}
	onclick={() => onClick(item)}
	onfocus={(event) => onFocus(item, event)}
>
	<span class="arc-expanding-button-group__icon" aria-hidden="true">
		<ItemPresence value={showDone} {reduced} kind="glyph">
			{#snippet children(confirmed)}
				{#if confirmed}<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><path
							class="arc-expanding-button-group__check"
							pathLength="1"
							d="M4 12.5l5 5L20 6.5"
						/></svg
					>{:else}{@render item.icon()}{/if}
			{/snippet}
		</ItemPresence>
	</span>
	<span
		class="arc-expanding-button-group__label"
		aria-hidden="true"
		data-shown={expanded || undefined}
		style:opacity={labelMotion.current.opacity}
		style:transform="translateX({labelMotion.current.x}px)"
		style:filter="blur({labelMotion.current.blur}px)"
	>
		<ItemPresence value={word} {reduced} kind="word">
			{#snippet children(caption)}{caption}{/snippet}
		</ItemPresence>
		<span bind:this={labelNode} {@attach measure} class="arc-expanding-button-group__sizer"
			>{item.label}</span
		>{#if item.doneLabel}<span
				bind:this={doneNode}
				{@attach measure}
				class="arc-expanding-button-group__sizer">{item.doneLabel}</span
			>{/if}
	</span>
</button>
