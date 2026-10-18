<script lang="ts">
	import { untrack } from 'svelte';
	import { prefersReducedMotion, Tween } from 'svelte/motion';
	import { springCurve, type SpringSpec } from '#lib/motion';
	import StableSwap from './StableSwap.svelte';
	import type { BillingToggleOption, BillingToggleProps } from './types';
	import './billing-toggle.css';

	const DEFAULT_OPTIONS: BillingToggleOption[] = [
		{ value: 'monthly', label: 'Monthly' },
		{ value: 'yearly', label: 'Yearly', badge: 'Save 20%' }
	];

	/** Critically damped: the thumb glides and lands without overshoot. */
	const glide: SpringSpec = { visualDuration: 0.34, bounce: 0 };

	let {
		options = DEFAULT_OPTIONS,
		value = $bindable(options[0]?.value),
		onValueChange,
		label = 'Billing period',
		size = 'md',
		class: className,
		ref = $bindable(null)
	}: BillingToggleProps = $props();

	const reduced = $derived(prefersReducedMotion.current);
	const selectedIndex = $derived(
		Math.max(
			0,
			options.findIndex((option) => option.value === value)
		)
	);
	const buttons: (HTMLButtonElement | null)[] = $state([]);

	// One thumb for the whole track, measured from the selected option. Until the first
	// measurement a static thumb sits inside the selected option, so the server render is right.
	let measured = $state(false);
	const x = new Tween(0);
	const width = new Tween(0);

	function moveTo(tween: Tween<number>, next: number, instant: boolean) {
		if (tween.target === next) return;
		const distance = Math.abs(next - tween.current);
		tween.set(next, instant ? { duration: 0 } : springCurve(glide, distance));
	}

	function measure() {
		const node = buttons[selectedIndex];
		if (!node) return;
		const instant = !measured || reduced;
		moveTo(x, node.offsetLeft, instant);
		moveTo(width, node.offsetWidth, instant);
		measured = true;
	}

	$effect(() => {
		void selectedIndex;
		const root = ref;
		untrack(measure);
		if (!root || typeof ResizeObserver === 'undefined') return;
		const observer = new ResizeObserver(() => untrack(measure));
		observer.observe(root);
		return () => observer.disconnect();
	});

	function select(next: string) {
		value = next;
		onValueChange?.(next);
	}

	function onkeydown(event: KeyboardEvent, index: number) {
		const step =
			event.key === 'ArrowRight' || event.key === 'ArrowDown'
				? 1
				: event.key === 'ArrowLeft' || event.key === 'ArrowUp'
					? -1
					: 0;
		const target =
			event.key === 'Home'
				? 0
				: event.key === 'End'
					? options.length - 1
					: step
						? (index + step + options.length) % options.length
						: -1;
		if (target < 0) return;
		event.preventDefault();
		select(options[target]!.value);
		buttons[target]?.focus();
	}
</script>

<div
	bind:this={ref}
	role="radiogroup"
	aria-label={label}
	class={['arc-billing-toggle', className]}
	data-size={size}
>
	{#if measured}
		<span
			class="arc-billing-toggle__thumb"
			aria-hidden="true"
			style:transform="translateX({x.current}px)"
			style:width="{width.current}px"
		></span>
	{/if}
	{#each options as option, index (option.value)}
		{@const selected = index === selectedIndex}
		{@const badgeText = selected ? (option.activeBadge ?? option.badge) : option.badge}
		<button
			bind:this={buttons[index]}
			type="button"
			role="radio"
			aria-checked={selected}
			tabindex={selected ? 0 : -1}
			class="arc-billing-toggle__option"
			data-selected={selected || undefined}
			onclick={() => select(option.value)}
			onkeydown={(event) => onkeydown(event, index)}
		>
			{#if selected && !measured}
				<span class="arc-billing-toggle__thumb-static" aria-hidden="true"></span>
			{/if}
			<span class="arc-billing-toggle__content"
				><span class="arc-billing-toggle__label">{option.label}</span>{#if badgeText}<span
						class="arc-billing-toggle__badge"
						data-active={selected || undefined}
						><StableSwap
							text={badgeText}
							candidates={[option.badge, option.activeBadge].filter(
								(text): text is string => !!text
							)}
							{reduced}
						/></span
					>{/if}</span
			>
		</button>
	{/each}
</div>
