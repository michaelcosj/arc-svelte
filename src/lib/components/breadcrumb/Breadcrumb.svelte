<script lang="ts">
	import { flip } from 'svelte/animate';
	import { prefersReducedMotion } from 'svelte/motion';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { ArcLink } from '#lib/arc/index.ts';
	import { Mounted, motionTokens as m, PopLayout, swap } from '#lib/motion';
	import type { BreadcrumbProps } from './types';
	import './breadcrumb.css';
	let { items, ariaLabel = 'Breadcrumb' }: BreadcrumbProps = $props();
	const reduced = $derived(Boolean(prefersReducedMotion.current));
	const mounted = new Mounted();
	const layout = new PopLayout();
	let list = $state<HTMLOListElement>();
	const crumbs = $derived(items.map((item, index) => ({ ...item, key: `${item.label}-${index}` })));
	// Measure every crumb before the path changes, so a leaving crumb pops out where it stood.
	$effect.pre(() => {
		void crumbs;
		layout.capture(list);
	});
</script>

<!-- Crumbs present on first render stay still; crumbs added later slide in from the path before them. -->
<nav aria-label={ariaLabel}>
	<ol class="arc-breadcrumb" bind:this={list}>
		{#each crumbs as item, index (item.key)}
			{@const current = index === crumbs.length - 1}
			<li
				data-pop-key={item.key}
				animate:flip={reduced ? { duration: 0 } : m.spring.smooth}
				in:swap={{
					x: -8,
					blur: m.blur.subtle,
					duration: m.duration.standard,
					easing: m.ease.enter,
					skip: !mounted.current || reduced
				}}
				out:swap={reduced
					? { duration: 0, pop: layout.box(item.key) }
					: {
							x: -4,
							blur: m.blur.subtle,
							duration: m.duration.instant,
							easing: m.ease.standard,
							pop: layout.box(item.key)
						}}
			>
				{#if index > 0}<ChevronRight width={14} height={14} aria-hidden="true" />{/if}
				{#if !current && item.href}
					<ArcLink href={item.href} data-label={item.label} onclick={item.onclick}
						>{item.label}</ArcLink
					>
				{:else if !current && item.onclick}
					<button type="button" data-label={item.label} onclick={item.onclick}>{item.label}</button>
				{:else}
					<span aria-current={current ? 'page' : undefined} data-label={item.label}
						>{item.label}</span
					>
				{/if}
			</li>
		{/each}
	</ol>
</nav>
