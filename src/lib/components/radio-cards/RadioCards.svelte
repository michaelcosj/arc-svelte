<script lang="ts">
	import { untrack } from 'svelte';
	import { RadioGroup } from 'bits-ui';
	import { prefersReducedMotion } from 'svelte/motion';
	import { cssEasing, Highlight, motionTokens as m } from '#lib/motion';
	import type { RadioCardContent, RadioCardsProps } from './types';
	import './radio-cards.css';

	let {
		options,
		defaultValue = null,
		value: valueProp = $bindable(),
		onValueChange,
		layout = 'grid',
		minColumnWidth = 180,
		name,
		required,
		disabled = false,
		class: className,
		style,
		ref = $bindable(null),
		...rest
	}: RadioCardsProps = $props();
	const uid = $props.id();
	let internal = $state<string | null>(untrack(() => defaultValue));
	const value = $derived(valueProp !== undefined ? valueProp : internal);
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	const selectedIndex = $derived(options.findIndex((option) => option.value === value));
	const usable = (index: number) =>
		Boolean(options[index]) && !disabled && !options[index]!.disabled;
	const tabStop = $derived(
		selectedIndex >= 0 && usable(selectedIndex)
			? selectedIndex
			: options.findIndex((_, index) => usable(index))
	);
	const root = (2 * Math.PI) / (0.42 * 1.2);
	const ring = new Highlight(() => ({
		reduced,
		measure: 'offset',
		spec: { stiffness: root * root, damping: 2 * (1 - 0.14) * root, mass: 1 }
	}));
	let ringNode = $state<HTMLSpanElement>();
	let fade: Animation | undefined;
	const card = (index: number) => ref?.querySelector<HTMLElement>(`[data-card="${index}"]`);

	function place(glide: boolean) {
		const target = card(selectedIndex);
		const first = !ring.shown;
		ring.move(target, glide);
		fade?.cancel();
		if (target && first && glide && !reduced)
			fade = ringNode?.animate([{ opacity: 0 }, { opacity: 1 }], {
				duration: m.duration.fast,
				easing: cssEasing(m.ease.standard)
			});
	}
	$effect(() => {
		void selectedIndex;
		void options;
		void reduced;
		untrack(() => place(true));
	});
	function observe(node: HTMLDivElement) {
		const observer = new ResizeObserver(() => place(false));
		observer.observe(node);
		return () => {
			observer.disconnect();
			fade?.cancel();
		};
	}
	function choose(next: string) {
		if (next === value) return;
		if (valueProp === undefined) internal = next;
		else if (!onValueChange) valueProp = next;
		onValueChange?.(next);
	}
	function keydown(event: KeyboardEvent, index: number, navigate: unknown) {
		const key = event.key;
		if (key === ' ' || key === 'Enter') {
			event.preventDefault();
			if (usable(index)) choose(options[index]!.value);
			return;
		}
		if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key)) return;
		if (usable(index) && typeof navigate === 'function') navigate(event);
		else {
			// Bits stops handling a focused card once it becomes disabled. The source can still leave it.
			event.preventDefault();
			const rtl =
				(key === 'ArrowLeft' || key === 'ArrowRight') &&
				getComputedStyle(event.currentTarget as HTMLElement).direction === 'rtl'
					? -1
					: 1;
			const step =
				key === 'Home'
					? 1
					: key === 'End'
						? -1
						: (key === 'ArrowRight' || key === 'ArrowDown' ? 1 : -1) * rtl;
			let at = key === 'Home' ? -1 : key === 'End' ? options.length : index;
			for (let tries = 0; tries < options.length; tries++) {
				at = (at + step + options.length) % options.length;
				if (usable(at)) {
					card(at)?.focus();
					break;
				}
			}
		}
		const focused = options.findIndex((_, at) => card(at) === document.activeElement);
		if (focused >= 0 && usable(focused)) choose(options[focused]!.value);
	}
</script>

{#snippet content(copy: RadioCardContent)}
	{#if typeof copy === 'function'}{@render copy()}{:else}{copy}{/if}
{/snippet}

<RadioGroup.Root
	value={value === null ? '' : `option:${value}`}
	orientation="horizontal"
	{disabled}
	{required}
	bind:ref
>
	{#snippet child({ props })}
		<div
			{...props}
			{...rest}
			class={['arc-radio-cards', className]}
			data-layout={layout}
			style={`--min-column: ${minColumnWidth}px; ${style ?? ''}`}
			aria-disabled={disabled || undefined}
			aria-required={required || undefined}
			{@attach observe}
		>
			<span
				class="arc-radio-cards__ring"
				aria-hidden="true"
				bind:this={ringNode}
				hidden={!ring.shown}
				style={ring.style}
			></span>
			{#each options as option, index (option.value)}
				{@const checked = selectedIndex === index}
				{@const off = !usable(index)}
				{@const description =
					off && option.disabledReason ? option.disabledReason : option.description}
				{@const labelId = `${uid}-${index}-label`}
				{@const descriptionId = `${uid}-${index}-description`}
				<RadioGroup.Item value={`option:${option.value}`} disabled={off}>
					{#snippet child({ props: itemProps })}
						<div
							{...{ ...itemProps, type: undefined, disabled: undefined }}
							role="radio"
							class="arc-radio-cards__card"
							data-card={index}
							aria-checked={checked}
							aria-disabled={off || undefined}
							aria-labelledby={labelId}
							aria-describedby={description ? descriptionId : undefined}
							tabindex={index === tabStop ? 0 : -1}
							data-checked={checked || undefined}
							onfocus={undefined}
							onclick={() => {
								if (!off) choose(option.value);
							}}
							onkeydown={(event) => keydown(event, index, itemProps.onkeydown)}
						>
							<span class="arc-radio-cards__indicator" aria-hidden="true"
								><span
									class="arc-radio-cards__indicator-dot"
									style:transform={`scale(${checked ? 1 : 0})`}
								></span></span
							>
							<span class="arc-radio-cards__body">
								<span id={labelId} class="arc-radio-cards__label">
									{#if option.icon}<span class="arc-radio-cards__icon">{@render option.icon()}</span
										>{/if}
									<span class="arc-radio-cards__label-text">{@render content(option.label)}</span>
								</span>
								{#if description}<span id={descriptionId} class="arc-radio-cards__description"
										>{@render content(description)}</span
									>{/if}
							</span>
							{#if option.meta}<span class="arc-radio-cards__meta"
									>{@render content(option.meta)}</span
								>{/if}
						</div>
					{/snippet}
				</RadioGroup.Item>
			{/each}
			{#if name}<input type="hidden" {name} value={value ?? ''} {required} />{/if}
		</div>
	{/snippet}
</RadioGroup.Root>
