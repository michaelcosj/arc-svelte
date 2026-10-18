<script lang="ts">
	import type { TabsListProps } from './types';
	import { Tabs as Primitive } from 'bits-ui';
	import { prefersReducedMotion } from 'svelte/motion';
	import { untrack } from 'svelte';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { Highlight } from '#lib/motion';
	import { getTabsState } from './tabs-state.svelte';

	let { ref = $bindable(null), class: className, children, ...props }: TabsListProps = $props();

	const tabs = getTabsState();
	const reduced = $derived(prefersReducedMotion.current);

	let shell = $state<HTMLDivElement>();
	let viewport = $state<HTMLDivElement>();
	let edges = $state({ overflow: false, left: false, right: false });

	function update() {
		if (!shell || !viewport) return;
		const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
		const next = {
			overflow: viewport.scrollWidth > shell.clientWidth + 1,
			left: viewport.scrollLeft > 1,
			right: viewport.scrollLeft < max - 1
		};
		if (next.overflow !== edges.overflow || next.left !== edges.left || next.right !== edges.right)
			edges = next;
	}

	function reveal(tab: HTMLElement | null) {
		if (!viewport || !tab) return;
		const frame = viewport.getBoundingClientRect();
		const item = tab.getBoundingClientRect();
		const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
		const left = frame.left + (viewport.scrollLeft > 1 ? 34 : 0);
		const right = frame.right - (viewport.scrollLeft < max - 1 ? 34 : 0);
		const delta = item.left < left ? item.left - left : item.right > right ? item.right - right : 0;
		if (delta) viewport.scrollBy({ left: delta, behavior: reduced ? 'instant' : 'smooth' });
	}

	const scrollTabs = (direction: number) =>
		viewport?.scrollBy({
			left: direction * (viewport.clientWidth ?? 0) * 0.75,
			behavior: reduced ? 'instant' : 'smooth'
		});

	// The shared highlight (motion's layoutId): one element per list, gliding to the active trigger's box.
	const selection = new Highlight(() => ({ reduced }));
	const measure = (animate: boolean) =>
		selection.move(
			ref?.querySelector<HTMLElement>(':scope > [role="tab"][data-state="active"]'),
			animate
		);

	// A new active tab glides the highlight and scrolls into view; layout changes (fonts, resizes) snap it.
	$effect(() => {
		void tabs.value;
		untrack(() => {
			measure(true);
			reveal(ref?.querySelector<HTMLElement>('[role="tab"][data-state="active"]') ?? null);
		});
	});

	$effect(() => {
		const frame = shell;
		const scroll = viewport;
		const content = ref;
		if (!frame || !scroll || !content) return;
		const observer = new ResizeObserver(() => {
			update();
			measure(false);
		});
		observer.observe(frame);
		observer.observe(scroll);
		observer.observe(content);
		scroll.addEventListener('scroll', update, { passive: true });
		update();
		return () => {
			observer.disconnect();
			scroll.removeEventListener('scroll', update);
		};
	});
</script>

<div
	bind:this={shell}
	class="arc-tabs__list-shell"
	data-overflow={edges.overflow}
	data-left={edges.left}
	data-right={edges.right}
>
	{#if edges.overflow}
		<button
			type="button"
			class="arc-tabs__scroll-button arc-tabs__scroll-left"
			aria-label="Scroll tabs left"
			disabled={!edges.left}
			onclick={() => scrollTabs(-1)}
		>
			<ChevronLeft size={17} aria-hidden="true" />
		</button>
	{/if}
	<div
		bind:this={viewport}
		class="arc-tabs__viewport"
		onfocuscapture={(event) => {
			if (event.target instanceof HTMLElement && event.target.getAttribute('role') === 'tab')
				reveal(event.target);
		}}
	>
		<Primitive.List {...props} bind:ref class={['arc-tabs__list', className]}>
			<span
				class="arc-tabs__selection"
				aria-hidden="true"
				hidden={!selection.shown}
				style={selection.style}
			></span>
			{@render children?.()}
		</Primitive.List>
	</div>
	{#if edges.overflow}
		<button
			type="button"
			class="arc-tabs__scroll-button arc-tabs__scroll-right"
			aria-label="Scroll tabs right"
			disabled={!edges.right}
			onclick={() => scrollTabs(1)}
		>
			<ChevronRight size={17} aria-hidden="true" />
		</button>
	{/if}
</div>
