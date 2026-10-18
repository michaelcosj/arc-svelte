<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';
	import { Button } from '#arc/button';
	import { motionTokens as m, swap } from '#lib/motion';
	import type { ThemeSwitchProps } from './types';
	import './theme-switch.css';

	let {
		theme,
		variant = 'reveal',
		onThemeChange,
		label,
		iconOnly = false
	}: ThemeSwitchProps = $props();

	const reduced = $derived(prefersReducedMotion.current);
	const next = $derived(theme === 'light' ? 'dark' : 'light');

	/**
	 * A stored preference usually reaches the theme prop just after hydration. That correction swaps
	 * the icon in place; only changes after the first painted frames animate, so a page that loads in
	 * dark mode never spins its switches.
	 */
	let settled = $state(false);
	$effect(() => {
		let second = 0;
		const first = requestAnimationFrame(() => {
			second = requestAnimationFrame(() => (settled = true));
		});
		return () => {
			cancelAnimationFrame(first);
			cancelAnimationFrame(second);
		};
	});

	// Both icons turn the same way (clockwise into dark, back out of it), so the swap reads as one rotation rather than two fades.
	const turn = (angle: number) => (t: number) => `rotate: ${angle * (1 - t)}deg;`;
	const blur = m.blur.subtle;
	const leaving = new WeakSet<HTMLElement>();

	/** Rotation and scale ride the spring; opacity and blur tween so the blur never overshoots below zero. */
	function iconIn(node: HTMLElement, angle: number) {
		const start = leaving.has(node) ? parseFloat(getComputedStyle(node).rotate) || 0 : angle;
		leaving.delete(node);
		if (!settled) return swap(node, { skip: true });
		if (reduced) return swap(node, { duration: m.duration.instant });
		return swap(node, {
			scale: 0.7,
			blur,
			extra: turn(start),
			...m.spring.snappy,
			fade: { duration: m.duration.fast, easing: m.ease.enter }
		});
	}
	function iconOut(node: HTMLElement, angle: number) {
		const start = parseFloat(getComputedStyle(node).rotate) || 0;
		leaving.add(node);
		if (!settled) return swap(node, { duration: 0 }, { direction: 'out' });
		if (reduced) return swap(node, { duration: m.duration.instant }, { direction: 'out' });
		return swap(
			node,
			{
				scale: 0.7,
				blur,
				extra: (t) => `rotate: ${angle + (start - angle) * t}deg;`,
				duration: m.duration.fast,
				easing: m.ease.standard
			},
			{ direction: 'out' }
		);
	}
</script>

<Button
	type="button"
	size="sm"
	variant="secondary"
	contentKey="theme-switch"
	class={[
		'arc-theme-switch',
		`arc-theme-switch--${variant}`,
		iconOnly && 'arc-theme-switch--icon-only',
		settled && 'arc-theme-switch--settled'
	]}
	data-theme={theme}
	aria-label={label ?? `Switch to ${next} mode`}
	aria-pressed={theme === 'dark'}
	onclick={(event) => onThemeChange(next, variant, event.currentTarget)}
>
	<span class="arc-theme-switch__icon-wrap">
		{#key theme}
			{@const angle = theme === 'light' ? 30 : -30}
			<span class="arc-theme-switch__icon" aria-hidden="true" in:iconIn={angle} out:iconOut={angle}>
				{#if theme === 'light'}
					<Sun size={16} strokeWidth={1.75} />
				{:else}
					<Moon size={16} strokeWidth={1.75} />
				{/if}
			</span>
		{/key}
	</span>
	{#if !iconOnly}<span class="arc-theme-switch__label">Switch theme</span>{/if}
</Button>
