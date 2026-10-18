<script lang="ts">
	import { Select as Primitive } from 'bits-ui';
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import { prefersReducedMotion } from 'svelte/motion';
	import { untrack } from 'svelte';
	import { Mounted, valueRoll } from '#lib/motion';
	import type { SelectProps } from './types';
	import './select.css';

	const generatedId = $props.id();
	let {
		label,
		dir = 'ltr',
		description,
		placeholder = 'Select an option',
		options,
		id = generatedId,
		class: className,
		ref = $bindable(null),
		defaultValue = '',
		value = $bindable(defaultValue),
		defaultOpen = false,
		open = $bindable(defaultOpen),
		onValueChange,
		...rootProps
	}: SelectProps = $props();
	const hintId = $derived(description ? `${id}-description` : undefined);
	const index = $derived(options.findIndex((option) => option.value === value));
	const shown = $derived(value ? (options[index]?.label ?? '') : placeholder);
	let previousIndex = untrack(() => index);
	let direction = $state(1);
	$effect.pre(() => {
		const next = index;
		untrack(() => {
			if (previousIndex !== next) {
				direction = next > previousIndex ? 1 : -1;
				previousIndex = next;
			}
		});
	});
	const mounted = new Mounted();
	const reduced = $derived(prefersReducedMotion.current);
</script>

<div class="arc-select__field">
	<label for={id}>{label}</label>
	<Primitive.Root
		{...rootProps}
		type="single"
		bind:value
		bind:open
		items={options}
		allowDeselect={false}
		{onValueChange}
	>
		<Primitive.Trigger
			role="combobox"
			{dir}
			bind:ref
			{id}
			aria-describedby={hintId}
			aria-autocomplete="none"
			class={['arc-select__trigger', className]}
		>
			<span class="arc-select__sr-only"><span>{shown}</span></span>
			<span class="arc-select__value-text" aria-hidden="true">
				{#key value}<span
						data-placeholder={value ? undefined : ''}
						in:valueRoll={{ direction, reduced, skip: !mounted.current }}
						out:valueRoll={{ direction, reduced }}>{shown}</span
					>{/key}
			</span>
			<span class="arc-select__chevron" aria-hidden="true"
				><ChevronDown size={16} strokeWidth={1.75} /></span
			>
		</Primitive.Trigger>
		<Primitive.Portal>
			<Primitive.Content
				{dir}
				class="arc-select__content"
				align="start"
				sideOffset={4}
				collisionPadding={12}
				preventScroll
			>
				<Primitive.ScrollUpButton class="arc-select__scroll-button"
					><ChevronUp size={16} strokeWidth={1.75} aria-hidden="true" /></Primitive.ScrollUpButton
				>
				<Primitive.Viewport class="arc-select__viewport">
					{#each options as option (option.value)}
						<Primitive.Item {...option} class="arc-select__item">
							{#snippet children({ selected })}
								<span>{option.label}</span>
								{#if selected}<span class="arc-select__indicator" aria-hidden="true"
										><Check size={16} strokeWidth={1.75} /></span
									>{/if}
							{/snippet}
						</Primitive.Item>
					{/each}
				</Primitive.Viewport>
				<Primitive.ScrollDownButton class="arc-select__scroll-button"
					><ChevronDown
						size={16}
						strokeWidth={1.75}
						aria-hidden="true"
					/></Primitive.ScrollDownButton
				>
			</Primitive.Content>
		</Primitive.Portal>
	</Primitive.Root>
	{#if description}<span id={hintId} class="arc-select__hint">{description}</span>{/if}
</div>
