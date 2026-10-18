<script lang="ts">
	import { Popover } from 'bits-ui';
	import { tick, untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { Calendar } from '#arc/calendar';
	import { monthStart } from '../calendar/dates';
	import { Mounted, motionTokens as m, swap, positionFlip } from '#lib/motion';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import type { DatePickerProps } from './types';
	import './date-picker.css';
	const uid = $props.id();
	let {
		label,
		value = $bindable(undefined),
		onChange,
		description,
		placeholder = 'Select a date',
		minDate,
		maxDate,
		disabledDates,
		locale = 'en-US',
		format = { month: 'short', day: 'numeric', year: 'numeric' },
		showToday,
		id: suppliedId,
		class: className,
		disabled,
		...buttonProps
	}: DatePickerProps = $props();
	const id = $derived(suppliedId ?? uid);
	let open = $state(false),
		month = $state(untrack(() => monthStart(value ?? new Date()))),
		trigger = $state<HTMLButtonElement | null>(null),
		panel = $state<HTMLDivElement | null>(null),
		root = $state<HTMLDivElement>(),
		direction = $state(1),
		previous = untrack(() => value?.getTime() ?? null);
	let timer: ReturnType<typeof setTimeout>;
	const formatter = $derived(new Intl.DateTimeFormat(locale, format)),
		shown = $derived(value ? formatter.format(value) : placeholder),
		parts = $derived(value ? formatter.formatToParts(value) : []),
		time = $derived(value?.getTime() ?? null),
		hintId = $derived(description ? `${id}-description` : undefined),
		reduced = $derived(Boolean(prefersReducedMotion.current)),
		mounted = new Mounted();
	$effect.pre(() => {
		const next = time;
		untrack(() => {
			if (previous !== next) {
				direction = next === null || previous === null || next >= previous ? 1 : -1;
				previous = next;
			}
		});
	});
	function cleanup() {
		return () => clearTimeout(timer);
	}
	async function show() {
		clearTimeout(timer);
		month = monthStart(value ?? new Date());
		open = true;
		await tick();
		panel
			?.querySelector<HTMLButtonElement>('[data-present] [data-date][tabindex="0"]')
			?.focus({ preventScroll: true });
	}
	function close() {
		clearTimeout(timer);
		if (panel?.contains(document.activeElement)) trigger?.focus();
		open = false;
	}
	function select(date: Date | undefined) {
		if (onChange) onChange(date);
		else value = date;
		clearTimeout(timer);
		if (reduced || !date) close();
		else timer = setTimeout(close, 300);
	}
</script>

<Popover.Root {open} onOpenChange={(next) => (next ? show() : close())}
	><div
		bind:this={root}
		class={['arc-date-picker__field', className]}
		onfocusout={(e) => {
			if (open && e.relatedTarget && !root?.contains(e.relatedTarget as Node)) close();
		}}
		{@attach cleanup}
	>
		<label class="arc-date-picker__label" for={id}>{label}</label>
		<div class="arc-date-picker__anchor">
			<Popover.Trigger
				bind:ref={trigger}
				{id}
				type="button"
				disabled={Boolean(disabled)}
				aria-haspopup="dialog"
				aria-describedby={hintId}
				class="arc-date-picker__trigger"
				onkeydown={(e) => {
					if (['ArrowDown', 'Enter', ' '].includes(e.key) && !open) {
						e.preventDefault();
						void show();
					}
					if (e.key === 'Escape') close();
				}}
				>{#snippet child({ props: triggerProps })}<button {...buttonProps} {...triggerProps}
						><CalendarDays size={16} strokeWidth={1.75} aria-hidden="true" /><span
							class="arc-date-picker__sr-only">{shown}</span
						><span class="arc-date-picker__value-text" aria-hidden="true"
							>{#key Boolean(value)}{#if value}<span
										class="arc-date-picker__value"
										in:swap={{
											y: reduced ? 0 : '0.35em',
											blur: reduced ? 0 : 4,
											duration: reduced ? 120 : 240,
											easing: m.ease.enter,
											skip: !mounted.current
										}}
										out:swap={{
											y: reduced ? 0 : '-0.3em',
											blur: reduced ? 0 : 2,
											duration: reduced ? 120 : 140,
											easing: m.ease.standard,
											pop: true
										}}
										>{#each parts as part, index (`${index}-${part.type}`)}<span
												class="arc-date-picker__part"
												animate:positionFlip={{ duration: reduced ? 0 : 240, easing: m.ease.enter }}
												>{#if part.type === 'literal'}<span class="arc-date-picker__part-value"
														>{part.value}</span
													>{:else}{#key part.value}<span
															class="arc-date-picker__part-value"
															in:swap={{
																y: reduced ? 0 : `${direction * 0.35}em`,
																blur: reduced ? 0 : 4,
																duration: reduced ? 120 : 240,
																easing: m.ease.enter,
																skip: !mounted.current
															}}
															out:swap={{
																y: reduced ? 0 : `${direction * -0.3}em`,
																blur: reduced ? 0 : 2,
																duration: reduced ? 120 : 140,
																easing: m.ease.standard,
																pop: true
															}}>{part.value}</span
														>{/key}{/if}</span
											>{/each}</span
									>{:else}<span
										class="arc-date-picker__placeholder"
										in:swap={{
											y: reduced ? 0 : '-0.35em',
											blur: reduced ? 0 : 4,
											duration: reduced ? 120 : 240,
											easing: m.ease.enter,
											skip: !mounted.current
										}}
										out:swap={{
											y: reduced ? 0 : '0.3em',
											blur: reduced ? 0 : 2,
											duration: reduced ? 120 : 140,
											easing: m.ease.standard,
											pop: true
										}}>{placeholder}</span
									>{/if}{/key}</span
						><ChevronDown
							class="arc-date-picker__chevron"
							size={16}
							strokeWidth={1.75}
							aria-hidden="true"
						/></button
					>{/snippet}</Popover.Trigger
			>
			<Popover.ContentStatic
				forceMount
				bind:ref={panel}
				trapFocus={false}
				preventScroll={false}
				onOpenAutoFocus={(e) => e.preventDefault()}
				onCloseAutoFocus={(e) => e.preventDefault()}
				onEscapeKeydown={(e) => {
					e.preventDefault();
					close();
				}}
				>{#snippet child({ props })}{#if open}<div
							{...props}
							class="arc-date-picker__popover"
							role="dialog"
							aria-label={`${label} calendar`}
							in:swap={{
								y: reduced ? 0 : -8,
								scale: reduced ? 1 : 0.95,
								...(reduced ? { duration: 120 } : m.spring.snappy),
								fade: { duration: 160, easing: m.ease.enter }
							}}
							out:swap={{
								y: reduced ? 0 : -6,
								scale: reduced ? 1 : 0.97,
								duration: 140,
								easing: m.ease.standard
							}}
						>
							<Calendar
								{value}
								onChange={select}
								{month}
								onMonthChange={(next) => (month = next)}
								{minDate}
								{maxDate}
								{disabledDates}
								{locale}
								{showToday}
							/>
							<div class="arc-date-picker__footer">
								<button type="button" onclick={() => select(undefined)} disabled={!value}
									>Clear</button
								><span class="arc-date-picker__status"
									>{#key time}<span
											in:swap={{
												y: reduced ? 0 : '0.3em',
												blur: reduced ? 0 : 4,
												duration: reduced ? 120 : 240,
												easing: m.ease.enter,
												skip: !mounted.current
											}}
											out:swap={{
												y: reduced ? 0 : '-0.3em',
												blur: reduced ? 0 : 2,
												duration: reduced ? 120 : 140,
												easing: m.ease.standard
											}}>{value ? `Selected ${formatter.format(value)}` : 'Choose a day'}</span
										>{/key}</span
								>
							</div>
						</div>{/if}{/snippet}</Popover.ContentStatic
			>
		</div>
		{#if description}<span id={hintId} class="arc-date-picker__description">{description}</span
			>{/if}
	</div></Popover.Root
>
