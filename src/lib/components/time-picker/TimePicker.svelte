<script lang="ts">
	import Clock3 from '@lucide/svelte/icons/clock-3';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { Popover, PopoverTrigger, PopoverContent } from '#arc/popover';
	import { Mounted, valueRoll, listboxMotion } from '#lib/motion';
	import type { TimePickerProps } from './types';
	import './time-picker.css';

	const id = $props.id();
	let {
		label,
		defaultValue = '09:00',
		value = $bindable(defaultValue),
		onChange,
		description,
		placeholder = 'Select a time',
		minuteStep = 15,
		format = '12h',
		disabled = false,
		class: className,
		ref = $bindable(null)
	}: TimePickerProps = $props();
	let open = $state(false);
	let activeIndex = $state(-1);
	let menu = $state<HTMLDivElement | null>(null);
	let centerOnOpen = false;
	let closedFromOption = false;
	const mounted = new Mounted();
	const reduced = $derived(prefersReducedMotion.current);
	const pad = (number: number) => String(number).padStart(2, '0');
	const toMinutes = (raw: string) => {
		const [hour = NaN, minute = NaN] = raw.split(':').map(Number);
		return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : 0;
	};
	const options = $derived(
		Array.from({ length: Math.ceil(1440 / minuteStep) }, (_, index) => {
			const minutes = index * minuteStep;
			return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
		})
	);
	function display(raw: string) {
		const minutes = toMinutes(raw);
		const hour = Math.floor(minutes / 60);
		const minute = minutes % 60;
		return format === '24h'
			? `${pad(hour)}:${pad(minute)}`
			: `${hour % 12 || 12}:${pad(minute)} ${hour < 12 ? 'AM' : 'PM'}`;
	}
	let previous = untrack(() => value);
	let rollDirection = 1;
	const direction = $derived.by(() => {
		if (previous !== value) {
			rollDirection = toMinutes(value) >= toMinutes(previous) ? 1 : -1;
			previous = value;
		}
		return rollDirection;
	});
	function setOpen(next: boolean) {
		if (!next && open) closedFromOption = !!menu?.contains(document.activeElement);
		if (next && !open) {
			activeIndex = Math.max(0, options.indexOf(value));
			centerOnOpen = true;
		}
		open = next;
	}
	function choose(next: string) {
		value = next;
		onChange?.(next);
		setOpen(false);
	}
	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			setOpen(false);
		} else if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			if (open && activeIndex >= 0) choose(options[activeIndex]!);
			else setOpen(true);
		} else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			if (!open) setOpen(true);
			else
				activeIndex =
					(activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
		}
	}
	$effect(() => {
		if (!open || !menu || activeIndex < 0) return;
		const option = menu.children[activeIndex] as HTMLElement | undefined;
		if (!option) return;
		const top = option.offsetTop;
		const bottom = top + option.offsetHeight;
		if (centerOnOpen) {
			centerOnOpen = false;
			menu.scrollTop = top - (menu.clientHeight - option.offsetHeight) / 2;
		} else if (top < menu.scrollTop) menu.scrollTop = top;
		else if (bottom > menu.scrollTop + menu.clientHeight)
			menu.scrollTop = bottom - menu.clientHeight;
	});
</script>

<div bind:this={ref} class={['arc-time-picker__field', className]}>
	<span id="{id}-label" class="arc-time-picker__label">{label}</span>
	<div class="arc-time-picker__anchor">
		<Popover bind:open={() => open, setOpen}>
			<PopoverTrigger
				{disabled}
				aria-labelledby="{id}-label {id}-value"
				aria-haspopup="listbox"
				aria-controls="{id}-listbox"
				{onkeydown}
				class="arc-time-picker__trigger"
			>
				{#snippet child({ props })}
					<button {...props} aria-haspopup="listbox">
						<Clock3 size={16} aria-hidden="true" />
						<span id="{id}-value" class="arc-time-picker__sr-only"
							>{value ? display(value) : placeholder}</span
						>
						<span class="arc-time-picker__value-text" aria-hidden="true">
							{#key value || 'placeholder'}
								<span
									class={value ? 'arc-time-picker__value' : 'arc-time-picker__placeholder'}
									in:valueRoll={{ direction, reduced, skip: !mounted.current }}
									out:valueRoll={{ direction, reduced }}
									>{value ? display(value) : placeholder}</span
								>
							{/key}
						</span>
						<ChevronDown class="arc-time-picker__chevron" size={16} aria-hidden="true" />
					</button>
				{/snippet}
			</PopoverTrigger>
			<PopoverContent
				forceMount
				avoidCollisions={false}
				trapFocus={false}
				role="listbox"
				id="{id}-listbox"
				aria-label="{label} options"
				preventScroll={false}
				onFocusOutside={(event) => event.preventDefault()}
				onOpenAutoFocus={(event) => event.preventDefault()}
				onCloseAutoFocus={(event) => {
					if (closedFromOption) event.preventDefault();
					closedFromOption = false;
				}}
			>
				{#snippet child({ props, wrapperProps, open: shown })}
					<div {...wrapperProps}>
						{#if shown}
							<div
								{...props}
								bind:this={menu}
								class="arc-time-picker__menu"
								in:listboxMotion={{ reduced }}
								out:listboxMotion={{ reduced }}
							>
								{#each options as option, index (option)}
									<button
										id="{id}-option-{index}"
										type="button"
										role="option"
										aria-selected={option === value}
										data-active={activeIndex === index || undefined}
										class="arc-time-picker__option"
										onpointermove={() => {
											if (activeIndex !== index) activeIndex = index;
										}}
										onclick={() => choose(option)}
									>
										{display(option)}{#if option === value}<span
												class="arc-time-picker__dot"
												aria-hidden="true"
											></span>{/if}
									</button>
								{/each}
							</div>
						{/if}
					</div>
				{/snippet}
			</PopoverContent>
		</Popover>
	</div>
	{#if description}<span class="arc-time-picker__description">{description}</span>{/if}
</div>
