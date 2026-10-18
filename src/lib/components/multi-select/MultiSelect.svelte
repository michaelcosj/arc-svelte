<script lang="ts">
	import { Combobox } from 'bits-ui';
	import { tick, untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import X from '@lucide/svelte/icons/x';
	import {
		Mounted,
		motionTokens as m,
		swap,
		widthPresence,
		springCurve,
		listboxMotion
	} from '#lib/motion';
	import type { TransitionConfig } from 'svelte/transition';
	import type { MultiSelectProps } from './types';
	import './multi-select.css';

	let {
		label,
		options,
		defaultValue = [],
		value = $bindable(defaultValue),
		onValueChange,
		placeholder = 'Select options',
		description,
		maxVisible = 2,
		disabled = false,
		class: className,
		ref = $bindable(null)
	}: MultiSelectProps = $props();
	const id = $props.id();
	const mounted = new Mounted();
	const reduced = $derived(prefersReducedMotion.current);
	let open = $state(false);
	let active = $state(false);
	function setOpen(next: boolean) {
		open = next;
		active = false;
	}
	const labelFor = (item: string) => options.find((option) => option.value === item)?.label ?? item;
	const visible = $derived(value.slice(0, maxVisible));
	const remaining = $derived(Math.max(0, value.length - visible.length));
	let previous = untrack(() => remaining);
	let direction = $state(1);
	$effect.pre(() => {
		const next = remaining;
		untrack(() => {
			direction = next > previous ? 1 : -1;
			previous = next;
		});
	});
	function update(next: string[]) {
		value = next;
		onValueChange?.(next);
	}
	const fade = $derived({ duration: m.duration.instant, skip: !mounted.current });
	const chipIn = $derived(
		reduced
			? { skip: true }
			: {
					scale: 0.9,
					blur: m.blur.soft,
					opacity: 1,
					...m.spring.snappy,
					fade: { duration: m.duration.standard, easing: m.ease.enter },
					skip: !mounted.current
				}
	);
	const chipOut = $derived(
		reduced
			? { skip: true }
			: {
					scale: 0.9,
					blur: m.blur.subtle,
					opacity: 1,
					duration: m.duration.instant,
					easing: m.ease.standard
				}
	);
	/** Chip slots keep their natural contents while their width opens or closes. */
	function slot(
		node: HTMLElement,
		_: unknown,
		transition: { direction?: 'in' | 'out' | 'both' }
	): TransitionConfig {
		if (!mounted.current) return { duration: 0 };
		if (reduced) return swap(node, { duration: m.duration.instant });
		const out = transition.direction === 'out';
		return widthPresence(
			node,
			{
				spring: springCurve(m.specs.smooth, Math.round(node.getBoundingClientRect().width)),
				fade: {
					duration: out ? m.duration.instant : m.duration.fast,
					easing: out ? m.ease.standard : m.ease.enter
				}
			},
			transition
		);
	}
	function check(
		node: SVGElement,
		_: unknown,
		transition: { direction?: string }
	): TransitionConfig {
		const out = transition.direction === 'out';
		return {
			duration: reduced ? m.duration.instant : m.duration.standard,
			css: (t) => {
				const elapsed = (out ? 1 - t : t) * (reduced ? m.duration.instant : m.duration.standard);
				const opacity = Math.min(1, elapsed / m.duration.instant);
				const draw = m.ease.enter(Math.min(1, elapsed / m.duration.standard));
				return `opacity:${out ? 1 - opacity : opacity}; stroke-dasharray:1; stroke-dashoffset:${reduced ? 0 : out ? draw : 1 - draw};`;
			}
		};
	}
</script>

<Combobox.Root
	type="multiple"
	{disabled}
	loop
	items={options}
	bind:value={() => value, update}
	bind:open={() => open, setOpen}
>
	<div bind:this={ref} class={['arc-multi-select__field', className]}>
		<span id="{id}-label" class="arc-multi-select__label">{label}</span>
		<div class="arc-multi-select__control">
			<Combobox.Input>
				{#snippet child({ props })}
					<button
						{...props}
						type="button"
						role={undefined}
						aria-autocomplete={undefined}
						aria-haspopup="listbox"
						aria-controls="{id}-listbox"
						aria-labelledby="{id}-label {id}-value"
						class={['arc-multi-select__trigger', value.length && 'arc-multi-select__has-clear']}
						aria-activedescendant={active ? (props['aria-activedescendant'] as string) : undefined}
						onclick={() => setOpen(!open)}
						onkeydown={async (event) => {
							if (event.key === ' ' || (event.key === 'Enter' && (!open || !active))) {
								event.preventDefault();
								setOpen(!open);
							} else {
								const keydown = props.onkeydown as ((event: KeyboardEvent) => void) | undefined;
								const first = !active && (event.key === 'ArrowDown' || event.key === 'ArrowUp');
								keydown?.(event);
								if (first) {
									await tick();
									keydown?.(
										new KeyboardEvent('keydown', {
											key: event.key === 'ArrowDown' ? 'Home' : 'End'
										})
									);
									active = true;
								}
							}
						}}
					>
						<span id="{id}-value" class="arc-multi-select__sr-only"
							>{value.length ? value.map(labelFor).join(', ') : placeholder}</span
						>
						<span class="arc-multi-select__value" aria-hidden="true">
							{#each visible as item (item)}<span class="arc-multi-select__slot" in:slot out:slot
									><span
										class="arc-multi-select__chip"
										in:swap|global={chipIn}
										out:swap|global={chipOut}>{labelFor(item)}</span
									></span
								>{/each}
							{#each remaining > 0 ? ['more'] : [] as item (item)}<span
									class="arc-multi-select__slot"
									in:slot
									out:slot
									><span
										class="arc-multi-select__more"
										in:swap|global={chipIn}
										out:swap|global={chipOut}
										>+<span class="arc-multi-select__count"
											>{#key remaining}<span
													in:swap={reduced
														? fade
														: {
																y: `${direction * 0.5}em`,
																blur: m.blur.subtle,
																duration: m.duration.standard,
																easing: m.ease.enter,
																skip: !mounted.current
															}}
													out:swap={reduced
														? fade
														: {
																y: `${direction * -0.5}em`,
																blur: m.blur.subtle,
																duration: m.duration.instant,
																easing: m.ease.standard
															}}>{remaining}</span
												>{/key}</span
										></span
									></span
								>{/each}
							{#each value.length ? [] : ['placeholder'] as item (item)}<span
									class="arc-multi-select__placeholder"
									in:swap={fade}
									out:swap={fade}>{placeholder}</span
								>{/each}
						</span>
						<ChevronDown class="arc-multi-select__chevron" size={16} aria-hidden="true" />
					</button>
				{/snippet}
			</Combobox.Input>
			{#each value.length && !disabled ? ['clear'] : [] as item (item)}<button
					type="button"
					aria-label="Clear selections"
					class="arc-multi-select__clear"
					onclick={() => {
						update([]);
						open = false;
					}}
					in:swap={reduced
						? fade
						: {
								scale: 0.6,
								blur: m.blur.subtle,
								...m.spring.snappy,
								fade: { duration: m.duration.fast },
								skip: !mounted.current
							}}
					out:swap={reduced
						? fade
						: {
								scale: 0.6,
								blur: m.blur.subtle,
								duration: m.duration.instant,
								easing: m.ease.standard
							}}><X size={14} aria-hidden="true" /></button
				>{/each}
			<Combobox.ContentStatic forceMount id="{id}-listbox" aria-label={label} preventScroll={false}>
				{#snippet child({ props, open: shown })}
					{#if shown}<div
							{...props}
							class="arc-multi-select__menu"
							in:listboxMotion={{ reduced }}
							out:listboxMotion={{ reduced }}
						>
							{#each options as option (option.value)}
								<Combobox.Item value={option.value} label={option.label} disabled={option.disabled}>
									{#snippet child({ props, selected, highlighted })}
										<button
											{...props}
											type="button"
											disabled={option.disabled}
											tabindex={0}
											aria-selected={selected}
											role="option"
											class="arc-multi-select__option"
											data-active={active && highlighted}
											onpointermove={(event) => {
												active = true;
												(props.onpointermove as ((event: PointerEvent) => void) | undefined)?.(
													event
												);
											}}
											><span>{option.label}</span
											>{#each selected ? ['check'] : [] as item (item)}<svg
													class="arc-multi-select__check"
													width="16"
													height="16"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="1.75"
													stroke-linecap="round"
													stroke-linejoin="round"
													aria-hidden="true"
													in:check
													out:check><path d="M4 12.5 9 17.5 20 6.5" pathLength="1" /></svg
												>{/each}</button
										>
									{/snippet}
								</Combobox.Item>
							{/each}
						</div>{/if}
				{/snippet}
			</Combobox.ContentStatic>
		</div>
		{#if description}<span class="arc-multi-select__description">{description}</span>{/if}
	</div>
</Combobox.Root>
