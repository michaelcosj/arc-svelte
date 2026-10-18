<script lang="ts">
	import { untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { Highlight } from '#lib/motion';
	import type { SegmentedControlProps } from './types';
	import './segmented-control.css';

	const id = $props.id();
	let {
		options,
		value = $bindable(''),
		onValueChange,
		label,
		onOptionIntent,
		class: className,
		ref = $bindable(null)
	}: SegmentedControlProps = $props();

	const reduced = $derived(prefersReducedMotion.current);
	let track = $state<HTMLDivElement>();

	const select = (next: string) => {
		value = next;
		onValueChange?.(next);
	};

	const selectedButton = () => track?.querySelector<HTMLElement>('[aria-pressed="true"]');

	// The shared highlight (motion's layoutId): one element in the track, gliding to the selected option.
	const selection = new Highlight(() => ({ reduced }));

	// When the options are wider than the container, the track scrolls inside itself. Edges fade only on the side with more to see.
	$effect(() => {
		const node = track;
		void options.length;
		if (!node) return;
		const edges = () => {
			const rest = node.scrollWidth - node.clientWidth - node.scrollLeft;
			node.toggleAttribute('data-fade-start', node.scrollLeft > 1);
			node.toggleAttribute('data-fade-end', rest > 1);
		};
		const resized = () => {
			edges();
			selection.move(selectedButton(), false);
		};
		edges();
		node.addEventListener('scroll', edges, { passive: true });
		const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resized);
		observer?.observe(node);
		return () => {
			node.removeEventListener('scroll', edges);
			observer?.disconnect();
		};
	});

	// The selected option glides the highlight and is always scrolled fully into view, with a little room so it clears the fade.
	let first = true;
	$effect(() => {
		void value;
		void options;
		untrack(() => {
			const node = track;
			const button = selectedButton();
			selection.move(button);
			if (!node || !button || node.scrollWidth <= node.clientWidth) {
				first = false;
				return;
			}
			const room = 20;
			const start = button.offsetLeft - room;
			const end = button.offsetLeft + button.offsetWidth + room - node.clientWidth;
			const left = node.scrollLeft > start ? start : node.scrollLeft < end ? end : node.scrollLeft;
			if (left !== node.scrollLeft)
				node.scrollTo({ left: Math.max(0, left), behavior: first || reduced ? 'auto' : 'smooth' });
			first = false;
		});
	});

	// Arrow keys, Home and End move the selection like a tab list; only the selected option is a tab stop.
	const selectedIndex = $derived(
		Math.max(
			0,
			options.findIndex((option) => option.value === value)
		)
	);
	function onkeydown(event: KeyboardEvent) {
		const last = options.length - 1;
		const target =
			event.key === 'ArrowRight' || event.key === 'ArrowDown'
				? selectedIndex === last
					? 0
					: selectedIndex + 1
				: event.key === 'ArrowLeft' || event.key === 'ArrowUp'
					? selectedIndex === 0
						? last
						: selectedIndex - 1
					: event.key === 'Home'
						? 0
						: event.key === 'End'
							? last
							: -1;
		const option = options[target];
		if (target < 0 || !option) return;
		event.preventDefault();
		select(option.value);
		track
			?.querySelector<HTMLElement>(`[data-value="${CSS.escape(option.value)}"]`)
			?.focus({ preventScroll: true });
	}
</script>

<div bind:this={ref} class={['arc-segmented-control', className]} role="group" aria-label={label}>
	<div bind:this={track} class="arc-segmented-control__track">
		<span
			class="arc-segmented-control__selection"
			aria-hidden="true"
			hidden={!selection.shown}
			style={selection.style}
		></span>
		{#each options as option, index (option.value)}
			<button
				id="{id}-{option.value}"
				class="arc-segmented-control__button"
				type="button"
				data-value={option.value}
				aria-pressed={value === option.value}
				tabindex={index === selectedIndex ? 0 : -1}
				onclick={() => select(option.value)}
				{onkeydown}
				onpointerenter={onOptionIntent ? () => onOptionIntent(option.value) : undefined}
				onfocus={onOptionIntent ? () => onOptionIntent(option.value) : undefined}
			>
				<span class="arc-segmented-control__label"
					>{option.label}{@render option.accessory?.()}</span
				>
			</button>
		{/each}
	</div>
</div>
