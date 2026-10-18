<script lang="ts" generics="T extends string">
	import { RadioGroup } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { Highlight } from '#lib/motion';
	import { untrack } from 'svelte';
	let {
		label,
		options,
		value,
		onChange,
		render,
		name,
		reduced
	}: {
		label: string;
		options: T[];
		value: T;
		onChange: (v: T) => void;
		render: Snippet<[T]>;
		name: (v: T) => string;
		reduced: boolean;
	} = $props();
	let root = $state<HTMLElement | null>(null);
	const mark = new Highlight(() => ({ reduced }));
	$effect(() => {
		void value;
		untrack(() => mark.move(root?.querySelector<HTMLElement>('[data-state=checked]'), true));
	});
	function observe(node: HTMLElement) {
		const ro = new ResizeObserver(() =>
			mark.move(node.querySelector<HTMLElement>('[data-state=checked]'), false)
		);
		ro.observe(node);
		return () => ro.disconnect();
	}
</script>

<RadioGroup.Root
	bind:ref={root}
	{value}
	onValueChange={(v) => onChange(v as T)}
	aria-label={label}
	class="arc-signature-pad__choice"
	style="position:relative"
	{@attach observe}
	><span
		class="arc-signature-pad__selected"
		hidden={!mark.shown}
		aria-hidden="true"
		style={`${mark.style};inset:auto;top:0;left:0;`}
	></span>{#each options as option (option)}<RadioGroup.Item
			value={option}
			class="arc-signature-pad__option"
			aria-label={name(option)}
			title={name(option)}>{@render render(option)}</RadioGroup.Item
		>{/each}</RadioGroup.Root
>
