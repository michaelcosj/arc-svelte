<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import type { TransitionConfig } from 'svelte/transition';
	import type { ClassValue } from 'svelte/elements';
	import type { Easing } from './easing';
	import { cssEasing } from './easing';
	import { springCurve } from './spring';
	import { motionTokens as m } from './tokens';
	import { swap } from './swap';
	import MotionText from './MotionText.svelte';
	import './field-message.css';

	/**
	 * Helper and error copy under a field: the row opens its height on a spring, then the words
	 * settle in. The row tracks the measured copy, so a longer message that wraps opens its next
	 * line instead of snapping.
	 */
	let {
		id,
		text,
		class: className,
		alert = false,
		numbers = false,
		exit
	}: {
		id?: string;
		text?: string;
		class?: ClassValue;
		/** Announce the copy (`role="alert"`), for errors. */
		alert?: boolean;
		numbers?: boolean;
		exit?: { duration: number; easing?: Easing };
	} = $props();

	const reduced = $derived(prefersReducedMotion.current);
	let copy = $state<HTMLElement>();
	let opening = false;

	/** Height on the smooth spring, opacity on its own clock. */
	function slot(node: HTMLElement, _: unknown, options?: { direction?: string }): TransitionConfig {
		if (reduced) return { duration: 0 };
		const out = options?.direction === 'out';
		const height = out ? node.offsetHeight : (copy?.offsetHeight ?? node.offsetHeight);
		// Ends where motion stops a spring over this many pixels.
		const spring = height > 0 ? springCurve(m.specs.smooth, Math.round(height)) : m.spring.smooth;
		const fade = out ? m.duration.instant : m.duration.fast;
		const total = Math.max(spring.duration, fade);
		if (!out) opening = true;
		return {
			duration: total,
			css: (t) => {
				const elapsed = (out ? 1 - t : t) * total;
				const open = spring.easing(Math.min(1, elapsed / spring.duration));
				const shown = m.ease.inOut(Math.min(1, elapsed / fade));
				return out
					? `height: ${height * (1 - open)}px; opacity: ${1 - shown};`
					: `height: ${height * open}px; opacity: ${shown};`;
			}
		};
	}

	// After it opens, follow the copy's height (rewrapping) on the same spring.
	function follow(node: HTMLElement) {
		let last: number | undefined;
		let animation: Animation | undefined;
		const target = node.firstElementChild as HTMLElement | null;
		const observer = new ResizeObserver(() => {
			const next = target?.offsetHeight;
			if (next === undefined) return;
			const from = animation ? node.getBoundingClientRect().height : last;
			last = next;
			if (opening || from === undefined || from === next || reduced) return;
			animation?.cancel();
			const running = node.animate([{ height: `${from}px` }, { height: `${next}px` }], {
				duration: m.spring.smooth.duration,
				easing: cssEasing(m.spring.smooth.easing)
			});
			animation = running;
			running.onfinish = () => {
				if (animation === running) animation = undefined;
			};
		});
		if (target) observer.observe(target);
		return () => {
			observer.disconnect();
			animation?.cancel();
		};
	}
</script>

{#if text}
	<span
		class="arc-field-message"
		in:slot
		out:slot
		onintroend={() => (opening = false)}
		{@attach follow}
	>
		<span
			bind:this={copy}
			{id}
			class={className}
			role={alert ? 'alert' : undefined}
			in:swap={reduced
				? { skip: true }
				: {
						y: '0.35em',
						blur: m.blur.soft,
						opacity: 1,
						duration: m.duration.standard,
						easing: m.ease.enter
					}}><MotionText {text} {numbers} {exit} /></span
		>
	</span>
{/if}
