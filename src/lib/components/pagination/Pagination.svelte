<script lang="ts">
	import { untrack } from 'svelte';
	import { flip } from 'svelte/animate';
	import { prefersReducedMotion, Tween } from 'svelte/motion';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { Mounted, motionTokens as m, PopLayout, swap } from '#lib/motion';
	import type { PaginationProps } from './types';
	import './pagination.css';
	let { page, pageCount, onPageChange, label = 'Pagination' }: PaginationProps = $props();
	/** When the five page window shifts, numbers travel like a belt: each one moves by the same number of slots. */
	const slot = 1000 / 9; // One button plus the gap (36px + 4px), as a percentage of the button width.
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	const mounted = new Mounted();
	const layout = new PopLayout();
	const count = $derived(Math.max(0, Math.floor(pageCount)));
	const current = $derived(count > 0 ? Math.min(Math.max(1, Math.floor(page)), count) : 0);
	const start = $derived(count > 0 ? Math.max(1, Math.min(count - 4, current - 2)) : 1);
	const visible = $derived(Array.from({ length: Math.min(count, 5) }, (_, index) => start + index));
	let nav = $state<HTMLElement>();
	let belt = $state(untrack(() => ({ start, shift: 0 })));
	// Read the shift before the DOM changes so entering and leaving numbers travel the same way.
	$effect.pre(() => {
		const next = start;
		untrack(() => {
			if (belt.start === next) return;
			layout.capture(nav);
			belt = { start: next, shift: next - belt.start };
		});
	});

	// One mark travels to the current page's final slot. Until it has measured once (and during
	// server render), the current button draws its own border so nothing flashes before hydration.
	const markX = new Tween(0);
	const markY = new Tween(0);
	let ready = $state(false);
	$effect(() => {
		void [current, start, count];
		const instant = reduced || !untrack(() => ready);
		const el = nav;
		const target = el?.querySelector<HTMLElement>("[aria-current='page']");
		if (!el || !target) return;
		const place = (now: boolean) => {
			const options = now ? { duration: 0 } : m.spring.morph;
			markX.set(target.offsetLeft, options);
			markY.set(target.offsetTop, options);
		};
		place(instant);
		ready = true;
		let size = `${el.offsetWidth}x${el.offsetHeight}`;
		const observer = new ResizeObserver(() => {
			const next = `${el.offsetWidth}x${el.offsetHeight}`;
			if (next !== size) {
				size = next;
				place(true);
			}
		});
		observer.observe(el);
		return () => observer.disconnect();
	});
</script>

{#if !count}
	<nav class="arc-pagination" aria-label={label}></nav>
{:else}
	<nav
		bind:this={nav}
		class="arc-pagination"
		aria-label={label}
		data-mark-ready={ready ? '' : undefined}
	>
		<button
			type="button"
			class="arc-pagination__step"
			onclick={() => onPageChange(current - 1)}
			disabled={current <= 1}
			aria-label="Previous page"><ChevronLeft width={16} height={16} aria-hidden="true" /></button
		>
		<span
			aria-hidden="true"
			class="arc-pagination__mark"
			style:transform={`translate(${markX.current}px, ${markY.current}px)`}
		></span>
		{#each visible as number (number)}
			<button
				type="button"
				data-pop-key={number}
				onclick={() => onPageChange(number)}
				aria-label={`Page ${number}`}
				aria-current={current === number ? 'page' : undefined}
				animate:flip={reduced ? { duration: 0 } : m.spring.smooth}
				in:swap={{
					x: `${slot * belt.shift}%`,
					...m.spring.smooth,
					fade: { duration: m.duration.standard, easing: m.ease.enter },
					skip: !mounted.current || reduced
				}}
				out:swap={reduced
					? { skip: true }
					: {
							x: `${-slot * belt.shift}%`,
							...m.spring.smooth,
							fade: { duration: m.duration.instant, easing: m.ease.standard },
							pop: layout.box(number)
						}}>{number}</button
			>
		{/each}
		<button
			type="button"
			class="arc-pagination__step"
			onclick={() => onPageChange(current + 1)}
			disabled={current >= count}
			aria-label="Next page"><ChevronRight width={16} height={16} aria-hidden="true" /></button
		>
	</nav>
{/if}
