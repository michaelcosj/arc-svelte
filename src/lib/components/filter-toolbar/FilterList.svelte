<script lang="ts">
	import { DropdownMenu as Menu } from 'bits-ui';
	import { Tween } from 'svelte/motion';
	import { untrack } from 'svelte';
	import Check from '@lucide/svelte/icons/check';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { motionTokens as m, easeInOut } from '#lib/motion';
	import type { FilterRow } from './types';
	let {
		rows,
		labelledBy,
		reduced,
		radio = false,
		onChoose,
		onBack,
		onLeave
	}: {
		rows: FilterRow[];
		labelledBy: string;
		reduced: boolean;
		radio?: boolean;
		onChoose: (row: FilterRow, keyboard: boolean) => void;
		onBack?: (keyboard: boolean) => void;
		onLeave: () => void;
	} = $props();
	let list = $state<HTMLDivElement>(),
		current = $state(
			untrack(() =>
				Math.max(
					0,
					rows.findIndex((r) => r.checked)
				)
			)
		),
		pointer = false,
		keyboard = true,
		shown = false;
	let ring = $state(false);
	const box = new Tween({ top: 0, height: 0 }),
		alpha = new Tween(0);
	function focus(event: FocusEvent) {
		const item = (event.target as HTMLElement).closest<HTMLElement>('[data-row]');
		if (!item) return;
		current = rows.findIndex((r) => r.key === item.dataset.row);
		ring = !pointer && item.matches(':focus-visible');
		void box.set(
			{ top: item.offsetTop, height: item.offsetHeight },
			pointer && shown && !reduced ? m.spring.snappy : { duration: 0 }
		);
		shown = true;
		void alpha.set(1, { duration: reduced ? 0 : 80, easing: easeInOut });
		if (list) {
			if (item.offsetTop < list.scrollTop) list.scrollTop = item.offsetTop;
			else if (item.offsetTop + item.offsetHeight > list.scrollTop + list.clientHeight)
				list.scrollTop = item.offsetTop + item.offsetHeight - list.clientHeight;
		}
	}
</script>

<!-- Popover owns the overlay lifecycle. The inactive menu supplies only Bits' item, roving-key and typeahead behavior. -->
<Menu.Root open={false}>
	<Menu.ContentStatic
		forceMount
		loop
		onOpenAutoFocus={(e) => e.preventDefault()}
		onCloseAutoFocus={(e) => e.preventDefault()}
	>
		{#snippet child({ props })}
			<div
				{...props}
				bind:this={list}
				class="arc-filter-toolbar__list"
				aria-labelledby={labelledBy}
				data-current=""
				onfocusin={focus}
				onfocusout={(e) => {
					if (!list?.contains(e.relatedTarget as Node | null)) {
						shown = false;
						ring = false;
						void alpha.set(0, { duration: reduced ? 0 : 80, easing: easeInOut });
					}
				}}
				onpointermovecapture={() => {
					pointer = true;
					keyboard = false;
				}}
				onkeydowncapture={() => {
					pointer = false;
					keyboard = true;
				}}
				onpointerleave={() => {
					if (pointer && list?.contains(document.activeElement)) onLeave();
				}}
				onkeydown={(e) => {
					if (e.key === 'ArrowLeft' && onBack) {
						e.preventDefault();
						onBack(true);
					} else if (e.key === 'ArrowRight') {
						const row = rows[current];
						if (row?.drill) {
							e.preventDefault();
							onChoose(row, true);
						}
					} else if (e.key !== 'Tab')
						(props.onkeydown as ((event: KeyboardEvent) => void) | undefined)?.(e);
				}}
			>
				<span
					class="arc-filter-toolbar__highlight"
					data-ring={ring || undefined}
					aria-hidden="true"
					style:transform={`translateY(${box.current.top}px)`}
					style:height={`${box.current.height}px`}
					style:opacity={alpha.current}
				></span>
				{#each rows as row, index (row.key)}
					<Menu.Item closeOnSelect={false} onSelect={() => onChoose(row, keyboard)}>
						{#snippet child({ props: itemProps })}<button
								{...itemProps}
								type="button"
								class="arc-filter-toolbar__item"
								role={radio ? 'menuitemradio' : 'menuitem'}
								aria-checked={radio ? Boolean(row.checked) : undefined}
								tabindex={current === index ? 0 : -1}
								data-row={row.key}
								data-text={row.label}
								onclickcapture={(e) => (keyboard = e.detail === 0)}
							>
								{#if row.icon}<span class="arc-filter-toolbar__item-icon" aria-hidden="true"
										>{@render row.icon()}</span
									>{/if}
								<span class="arc-filter-toolbar__item-label">{row.label}</span>
								{#if row.drill || row.hint != null || row.checked}<span
										class="arc-filter-toolbar__item-meta"
										>{#if row.value}<span class="arc-filter-toolbar__meta-value">{row.value}</span
											>{/if}{#if row.drill}<ChevronRight
												size={15}
												strokeWidth={1.8}
												aria-hidden="true"
											/>{:else}{#if row.hint != null}<span class="arc-filter-toolbar__hint"
													>{row.hint}</span
												>{/if}<span
												class="arc-filter-toolbar__check"
												data-on={row.checked || undefined}
												><Check size={15} strokeWidth={2} aria-hidden="true" /></span
											>{/if}</span
									>{/if}
							</button>{/snippet}
					</Menu.Item>
				{/each}
			</div>
		{/snippet}
	</Menu.ContentStatic>
</Menu.Root>
