<script lang="ts">
	import { Switch as Primitive } from 'bits-ui';
	import { untrack } from 'svelte';
	import { prefersReducedMotion, Spring } from 'svelte/motion';
	import { cssEasing, easeInOut, easeOut, motionTokens as m, springOptions } from '#lib/motion';
	import type { SwitchProps } from './types';
	import './switch.css';

	let {
		label,
		checked = $bindable(false),
		disabled,
		class: className,
		ref = $bindable(null),
		onpointerdown,
		onpointerup,
		onpointerleave,
		onpointercancel,
		onkeydown,
		onkeyup,
		onblur,
		...props
	}: SwitchProps = $props();

	/** Track inner width (42 - 6 padding) minus the 18px thumb; keep in sync with switch.css. */
	const size = 18;
	const travel = 18;
	/** How far the thumb widens toward the other side while pressed. */
	const stretch = 5;
	/** Critically damped: the thumb lands on its end without overshooting the state it reports. */
	const glide = springOptions({ visualDuration: 0.3, bounce: 0 });

	const reduced = $derived(prefersReducedMotion.current);
	let pressed = $state(false);
	let thumb = $state<HTMLElement>();
	// A pointer or Space press already stretched the thumb, so its release should not add a second stretch on top.
	let releasedAt = -Infinity;

	const extra = $derived(pressed && !reduced && !disabled ? stretch : 0);
	const x = new Spring(checked ? travel : 0, glide);
	const width = new Spring(size, m.physics.snappy);

	$effect(() => {
		const instant = reduced;
		void x.set(checked ? travel - extra : 0, { instant });
		void width.set(size + extra, { instant });
	});

	// A brief stretch along the travel, so the thumb reads as moving mass rather than a sliding dot.
	let shown = untrack(() => checked);
	$effect(() => {
		const on = checked;
		if (shown === on) return;
		shown = on;
		const fromPress = performance.now() - releasedAt < 250;
		if (untrack(() => reduced) || fromPress || !thumb) return;
		const animation = thumb.animate(
			[
				{ scale: '1 1', easing: cssEasing(easeOut) },
				{ scale: '1.16 1', offset: 0.4, easing: cssEasing(easeInOut) },
				{ scale: '1 1' }
			],
			{ duration: 340 }
		);
		return () => animation.cancel();
	});

	const release = () => {
		if (pressed && !disabled) releasedAt = performance.now();
		pressed = false;
	};
</script>

<Primitive.Root
	{...props}
	bind:ref
	bind:checked
	{disabled}
	class={['arc-switch', className]}
	aria-label={props['aria-label'] ?? label}
	onpointerdown={(event) => {
		onpointerdown?.(event);
		if (event.button === 0) pressed = true;
	}}
	onpointerup={(event) => {
		onpointerup?.(event);
		release();
	}}
	onpointerleave={(event) => {
		onpointerleave?.(event);
		pressed = false;
	}}
	onpointercancel={(event) => {
		onpointercancel?.(event);
		pressed = false;
	}}
	onkeydown={(event) => {
		onkeydown?.(event);
		if (event.key === ' ') pressed = true;
	}}
	onkeyup={(event) => {
		onkeyup?.(event);
		release();
	}}
	onblur={(event) => {
		onblur?.(event);
		pressed = false;
	}}
>
	<span class="arc-switch__track">
		<!-- The thumb stretches like a held finger and keeps its far edge anchored, then travels on a spring. -->
		<span
			bind:this={thumb}
			class="arc-switch__thumb"
			style:translate={x.current ? `${x.current}px` : undefined}
			style:width="{width.current}px"
		></span>
	</span>
	{#if label}<span class="arc-switch__label">{label}</span>{/if}
</Primitive.Root>
