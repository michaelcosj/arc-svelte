<script lang="ts">
	import { Accordion as Primitive } from 'bits-ui';
	import { untrack } from 'svelte';
	import AccordionSection from './AccordionSection.svelte';
	import type { AccordionProps } from './types';
	import './accordion.css';

	let {
		items,
		defaultOpen = 0,
		size = 'md',
		class: className,
		ref = $bindable(null)
	}: AccordionProps = $props();

	let value = $state(
		untrack(() => (defaultOpen >= 0 && defaultOpen < items.length ? String(defaultOpen) : ''))
	);
</script>

<Primitive.Root
	bind:ref
	bind:value
	type="single"
	class={['arc-accordion', size === 'lg' && 'arc-accordion--lg', className]}
>
	{#each items as item, index (`${item.title}-${index}`)}
		<AccordionSection {item} value={String(index)} open={value === String(index)} />
	{/each}
</Primitive.Root>
