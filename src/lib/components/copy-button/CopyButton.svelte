<script lang="ts">
	import { untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { flip } from 'svelte/animate';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import Copy from '@lucide/svelte/icons/copy';
	import { CopyFeedback } from '#lib/copy-feedback.svelte.ts';
	import {
		motionTokens as m,
		createGlyphRun,
		updateGlyphRun,
		PopLayout,
		springCurve,
		swap,
		type SwapParams
	} from '#lib/motion';
	import type { CopyButtonProps } from './types';
	import './copy-button.css';

	let {
		value,
		label = 'Copy',
		class: className,
		iconOnly = false,
		variant = 'outline',
		disabled,
		onCopied,
		ref = $bindable(null)
	}: CopyButtonProps = $props();

	const feedback = new CopyFeedback();
	const reduced = $derived(prefersReducedMotion.current);
	const text = $derived(
		feedback.state === 'copied' ? 'Copied' : feedback.state === 'error' ? 'Failed' : label
	);

	/**
	 * Copy feedback is deliberately unhurried: a slow, almost critically damped spring and long, soft
	 * crossfades read as calm, never busy. The same motion plays in reverse when the confirmation
	 * hands back to idle, so nothing ever snaps.
	 */
	const settle = springCurve({ visualDuration: 0.5, bounce: 0.06 });
	const enter = { duration: 360, easing: m.ease.enter };
	const instant: SwapParams = { duration: m.duration.instant };
	const soft = m.blur.soft;

	/** Icons trade places in one soft breath: the old glyph shrinks into a blur while the new one grows out of it on the slow spring. */
	const iconIn = $derived<SwapParams>(
		reduced ? instant : { scale: 0.6, blur: soft, ...settle, fade: { ...enter, delay: 30 } }
	);
	const iconOut = $derived<SwapParams>(
		reduced
			? instant
			: { scale: 0.6, blur: soft, duration: m.duration.standard, easing: m.ease.standard }
	);

	let glyphState = $state.raw(untrack(() => createGlyphRun(text)));
	const glyphs = $derived(glyphState.glyphs);

	// Outgoing letters pop out of flow where they stood (mode="popLayout"), measured before the swap.
	const layout = new PopLayout();
	let glyphRow = $state<HTMLElement>();
	$effect.pre(() => {
		const next = text;
		untrack(() => {
			if (glyphRow) layout.capture(glyphRow);
			if (glyphState.text !== next) glyphState = updateGlyphRun(glyphState, next);
		});
	});

	/** Letters rise about .3em out of a soft blur; the outgoing ones lift away a little faster. */
	const glyphIn = (order: number): SwapParams =>
		reduced ? instant : { y: 4, blur: soft, ...enter, delay: Math.min(order * 20, 120) };
	const glyphOut = (id: string): SwapParams =>
		reduced
			? { ...instant, y: 0, pop: layout.box(id) }
			: {
					y: -3,
					blur: soft,
					duration: 200,
					easing: m.ease.standard,
					pop: layout.box(id)
				};

	async function handleCopy() {
		if (await feedback.copy(value)) onCopied?.();
	}
</script>

<button
	bind:this={ref}
	type="button"
	class={[
		'arc-copy-button',
		iconOnly && 'arc-copy-button--icon-only',
		variant === 'plain' && 'arc-copy-button--plain',
		className
	]}
	onclick={() => void handleCopy()}
	aria-label={label}
	data-copy-state={feedback.state}
	{disabled}
>
	<span class="arc-copy-button__icon" aria-hidden="true">
		{#key feedback.state}
			<span
				class="arc-copy-button__icon-inner"
				data-state={feedback.state}
				in:swap={iconIn}
				out:swap={iconOut}
			>
				{#if feedback.state === 'copied'}
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.75"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path class="arc-copy-button__check" d="M4 12l5 5L20 6" pathLength="1" />
					</svg>
				{:else if feedback.state === 'error'}
					<CircleAlert size={16} strokeWidth={1.75} />
				{:else}
					<Copy size={16} strokeWidth={1.75} />
				{/if}
			</span>
		{/key}
	</span>
	{#if !iconOnly}
		<span class="arc-copy-button__label" aria-hidden="true">
			<span class="arc-copy-button__measure">{label}</span><span class="arc-copy-button__measure"
				>Copied</span
			><span class="arc-copy-button__measure">Failed</span>
			<!-- A layout root: the letters glide inside the label only, so they ride along when the button itself moves. -->
			<span bind:this={glyphRow} class="arc-copy-button__glyphs">
				{#each glyphs as glyph (glyph.id)}
					<span
						class="arc-copy-button__glyph"
						data-pop-key={glyph.id}
						animate:flip={reduced ? { duration: 0 } : settle}
						in:swap={glyphIn(glyph.order)}
						out:swap={glyphOut(glyph.id)}>{glyph.char}</span
					>
				{/each}
			</span>
		</span>
	{/if}
</button><span class="arc-copy-button__sr-only" role="status" aria-live="polite"
	>{feedback.state === 'idle'
		? ''
		: feedback.state === 'error'
			? `${label}: Could not copy`
			: `${label}: Copied`}</span
>
