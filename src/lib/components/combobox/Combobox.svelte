<script lang="ts">
	import { Combobox as Primitive } from 'bits-ui';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Check from '@lucide/svelte/icons/check';
	import { prefersReducedMotion } from 'svelte/motion';
	import { untrack } from 'svelte';
	import { motionTokens as m, swap, Mounted, cssEasing } from '#lib/motion';
	import AutoHeight from './AutoHeight.svelte';
	import type { ComboboxProps } from './types';
	import './combobox.css';
	const uid = $props.id();
	let {
		label,
		options,
		defaultValue = '',
		value = $bindable(defaultValue),
		onValueChange,
		description,
		placeholder = 'Search or select…',
		emptyMessage = 'No matches found',
		id = uid,
		class: className,
		disabled,
		ref = $bindable(null),
		onfocus,
		...inputProps
	}: ComboboxProps = $props();
	let open = $state(false);
	let query = $state('');
	let activeIndex = $state(-1);
	const selected = $derived(options.find((option) => option.value === value));
	const filtered = $derived.by(() => {
		const text = query.trim().toLocaleLowerCase();
		return text
			? options.filter((option) =>
					[option.label, ...(option.keywords ?? [])].some((term) =>
						term.toLocaleLowerCase().includes(text)
					)
				)
			: options;
	});
	const reduced = $derived(prefersReducedMotion.current);
	const mounted = new Mounted();
	const hintId = $derived(description ? `${id}-description` : undefined);
	let settled = untrack(() => value);
	$effect(() => {
		const next = value;
		if (settled === next) return;
		settled = next;
		if (!ref || reduced || (next && open)) return;
		const animation = ref.animate(
			next
				? [
						{ opacity: 0, transform: 'translateY(0.35em)', filter: `blur(${m.blur.soft}px)` },
						{ opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' }
					]
				: [{ opacity: 0 }, { opacity: 1 }],
			{ duration: next ? m.duration.standard : m.duration.fast, easing: cssEasing(m.ease.enter) }
		);
		return () => animation.finish();
	});
	function openMenu() {
		if (!disabled) {
			query = '';
			activeIndex = -1;
			open = true;
		}
	}
	function changed(next: string) {
		query = '';
		onValueChange?.(next);
	}
	function clear(event: MouseEvent) {
		event.preventDefault();
		value = '';
		changed('');
		open = true;
		ref?.focus();
	}
	// Bits selects an initial option and handles Home/End and Tab. The original does not.
	function keydown(event: KeyboardEvent) {
		if (disabled) return;
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			if (!open) {
				openMenu();
				return;
			}
			const enabled = filtered.flatMap((option, index) => (option.disabled ? [] : [index]));
			if (!enabled.length) return;
			const position = enabled.indexOf(activeIndex);
			activeIndex =
				enabled[
					(position + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length
				];
			const option = document.getElementById(`${id}-option-${filtered[activeIndex].value}`);
			const listbox = option?.parentElement;
			if (option && listbox) {
				const bottom = option.offsetTop + option.offsetHeight;
				if (option.offsetTop < listbox.scrollTop) listbox.scrollTop = option.offsetTop;
				else if (bottom > listbox.scrollTop + listbox.clientHeight)
					listbox.scrollTop = bottom - listbox.clientHeight;
			}
		} else if (event.key === 'Enter' && open && activeIndex >= 0) {
			event.preventDefault();
			const option = filtered[activeIndex];
			if (option && !option.disabled) {
				value = option.value;
				changed(value);
				open = false;
				ref?.focus();
			}
		} else if (event.key === 'Escape' && open) {
			event.preventDefault();
			open = false;
			query = '';
		}
	}
</script>

<div class="arc-combobox__field">
	<label for={id}>{label}</label>
	<Primitive.Root
		type="single"
		bind:value
		bind:open
		inputValue={open ? query : (selected?.label ?? '')}
		{disabled}
		items={options}
		allowDeselect={false}
		loop
		onValueChange={changed}
		onOpenChange={(next) => {
			if (!next) query = '';
		}}
	>
		<div
			class={[
				'arc-combobox__control',
				open && 'arc-combobox--open',
				disabled && 'arc-combobox--disabled',
				className
			]}
		>
			<Search class="arc-combobox__search-icon" size={16} strokeWidth={1.75} aria-hidden="true" />
			<Primitive.Input {id} bind:ref defaultValue={selected?.label}>
				{#snippet child({ props })}
					<input
						{...inputProps}
						{...props}
						type="text"
						value={open ? query : (selected?.label ?? '')}
						placeholder={selected?.label ?? placeholder}
						aria-describedby={hintId}
						aria-controls={open ? `${id}-listbox` : undefined}
						aria-activedescendant={open && filtered[activeIndex]
							? `${id}-option-${filtered[activeIndex].value}`
							: undefined}
						onkeydown={keydown}
						onfocus={(event) => {
							onfocus?.(event);
							openMenu();
						}}
						onclick={openMenu}
						oninput={(event) => {
							query = event.currentTarget.value;
							activeIndex = -1;
							open = true;
						}}
					/>
				{/snippet}
			</Primitive.Input>
			{#each selected && !disabled ? [true] : [] as shown (shown)}
				<button
					type="button"
					class="arc-combobox__clear"
					aria-label="Clear selection"
					onmousedown={(event) => event.preventDefault()}
					onclick={clear}
					in:swap={reduced
						? { duration: m.duration.instant, skip: !mounted.current }
						: {
								scale: 0.6,
								blur: m.blur.subtle,
								...m.spring.snappy,
								fade: { duration: m.duration.fast },
								skip: !mounted.current
							}}
					out:swap={{
						scale: reduced ? 1 : 0.6,
						blur: reduced ? 0 : m.blur.subtle,
						duration: m.duration.instant,
						easing: m.ease.standard
					}}
				>
					<X size={16} strokeWidth={1.75} aria-hidden="true" />
				</button>
			{/each}
			<ChevronDown class="arc-combobox__chevron" size={16} strokeWidth={1.75} aria-hidden="true" />
		</div>
		{#if description}<span id={hintId} class="arc-combobox__hint">{description}</span>{/if}
		<Primitive.ContentStatic forceMount preventScroll={false}>
			{#snippet child({ props })}
				{#if open}
					<div
						{...props}
						role="presentation"
						class="arc-combobox__popover"
						in:swap={reduced
							? { duration: m.duration.instant }
							: {
									y: -6,
									scale: 0.97,
									...m.spring.snappy,
									fade: { duration: m.duration.fast, easing: m.ease.enter }
								}}
						out:swap={{
							y: reduced ? 0 : -4,
							scale: reduced ? 1 : 0.98,
							duration: m.duration.instant,
							easing: m.ease.standard
						}}
					>
						<AutoHeight>
							<div
								id={`${id}-listbox`}
								class="arc-combobox__listbox"
								role="listbox"
								aria-label={`${label} options`}
							>
								{#each filtered as option, index (option.value)}
									<Primitive.Item
										{...option}
										id={`${id}-option-${option.value}`}
										class="arc-combobox__option"
										data-active={index === activeIndex ? 'true' : undefined}
										onmouseenter={() => {
											if (!option.disabled) activeIndex = index;
										}}
									>
										{#snippet children({ selected })}<span>{option.label}</span>{#if selected}<Check
													class="arc-combobox__check"
													size={16}
													strokeWidth={1.75}
													aria-hidden="true"
												/>{/if}{/snippet}
									</Primitive.Item>
								{:else}
									<div
										class="arc-combobox__empty"
										role="status"
										in:swap={{
											skip: reduced,
											y: 4,
											blur: m.blur.soft,
											duration: m.duration.standard,
											easing: m.ease.enter
										}}
									>
										{emptyMessage}
									</div>
								{/each}
							</div>
						</AutoHeight>
					</div>
				{/if}
			{/snippet}
		</Primitive.ContentStatic>
	</Primitive.Root>
</div>
