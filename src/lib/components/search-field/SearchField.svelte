<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import { prefersReducedMotion } from 'svelte/motion';
	import { motionTokens as m, swap, type SwapParams } from '#lib/motion';
	import type { SearchFieldProps } from './types';
	import './search-field.css';

	const uid = $props.id();
	let {
		label,
		value = $bindable(''),
		onValueChange,
		id = uid,
		class: className,
		ref = $bindable(null),
		...props
	}: SearchFieldProps = $props();

	const reduced = $derived(prefersReducedMotion.current);

	function set(next: string) {
		value = next;
		onValueChange?.(next);
	}

	// Clearing returns focus to the field, since the clear button unmounts under the pointer.
	function clear() {
		set('');
		ref?.focus();
	}

	const clearIn = $derived<SwapParams>(
		reduced
			? { duration: m.duration.instant }
			: {
					scale: 0.8,
					blur: m.blur.subtle,
					...m.spring.snappy,
					fade: { duration: m.duration.fast }
				}
	);
	const clearOut = $derived<SwapParams>(
		reduced
			? { skip: true }
			: { scale: 0.8, blur: m.blur.subtle, duration: m.duration.instant, easing: m.ease.standard }
	);
</script>

<div class="arc-search-field">
	<label for={id}>{label}</label>
	<div class="arc-search-field__shell" data-filled={value ? 'true' : undefined}>
		<Search size={18} aria-hidden="true" />
		<input
			{...props}
			bind:this={ref}
			{id}
			type="search"
			{value}
			oninput={(event) => set(event.currentTarget.value)}
			class={['arc-search-field__input', className]}
		/>
		<!-- The clear button has a reserved slot, so the field never changes width when it appears or leaves. -->
		<span class="arc-search-field__clear-slot">
			{#if value}
				<button
					type="button"
					tabindex="0"
					onclick={clear}
					aria-label="Clear search"
					in:swap={clearIn}
					out:swap={clearOut}
				>
					<X size={16} aria-hidden="true" />
				</button>
			{/if}
		</span>
	</div>
</div>
