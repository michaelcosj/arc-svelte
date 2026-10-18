<script lang="ts">
	import { untrack } from 'svelte';
	import { prefersReducedMotion, Tween } from 'svelte/motion';
	import { motionTokens as m } from '#lib/motion';
	import type { RadioGroupProps } from './types';
	import './radio-group.css';

	const id = $props.id();
	let {
		label,
		options,
		value = $bindable(''),
		onValueChange,
		name,
		class: className,
		ref = $bindable(null)
	}: RadioGroupProps = $props();

	const reduced = $derived(prefersReducedMotion.current);
	let list = $state<HTMLDivElement>();
	let ready = $state(false);
	const row = (index: number) =>
		list?.querySelectorAll<HTMLElement>(':scope > .arc-radio-group__option')[index];

	const selected = $derived(options.findIndex((option) => option.value === value));

	// One highlight travels to the chosen row on the morph spring; the first paint and resizes place it at once.
	// Whole-pixel offset boxes like the original (the shared Highlight measures fractional boxes).
	const box = new Tween({ y: 0, height: 0 });
	let at = '';
	let shown: number | null = null;
	const place = (target: HTMLElement | undefined, glide: boolean) => {
		const next = target ? `${target.offsetTop} ${target.offsetHeight}` : '';
		if (next === at) return;
		const visible = at !== '';
		at = next;
		if (!target) return;
		const to = { y: target.offsetTop, height: target.offsetHeight };
		void box.set(to, glide && visible ? m.spring.morph : { duration: 0 });
	};
	let visibleRow = $state(false);
	const highlightStyle = $derived(
		visibleRow
			? `transform: translateY(${box.current.y}px); height: ${box.current.height}px; opacity: 1;`
			: undefined
	);

	$effect(() => {
		const index = selected;
		void reduced;
		untrack(() => {
			place(row(index), shown !== null && shown !== index && !reduced);
			visibleRow = index >= 0;
			shown = index;
			ready = true;
		});
	});

	$effect(() => {
		const node = list;
		void options.length;
		if (!node || typeof ResizeObserver === 'undefined') return;
		const observer = new ResizeObserver(() => place(row(shown ?? -1), false));
		observer.observe(node);
		for (const option of node.querySelectorAll(':scope > .arc-radio-group__option'))
			observer.observe(option);
		return () => observer.disconnect();
	});

	const choose = (next: string) => {
		value = next;
		onValueChange?.(next);
	};
</script>

<!-- One highlight travels to the chosen row while the new dot springs in and the old one shrinks away. Native radios, like the original: arrow keys take the same path. -->
<fieldset bind:this={ref} class={['arc-radio-group', className]}>
	<legend>{label}</legend>
	<div bind:this={list} class="arc-radio-group__options" data-ready={ready ? '' : undefined}>
		<span class="arc-radio-group__highlight" aria-hidden="true" style={highlightStyle}></span>
		{#each options as option (option.value)}
			<label class="arc-radio-group__option">
				<input
					type="radio"
					name={name ?? id}
					value={option.value}
					checked={value === option.value}
					onchange={() => choose(option.value)}
				/>
				<span class="arc-radio-group__mark" aria-hidden="true"
					><span class="arc-radio-group__dot"></span></span
				>
				<span
					><strong>{option.label}</strong>{#if option.description}<small>{option.description}</small
						>{/if}</span
				>
			</label>
		{/each}
	</div>
</fieldset>
