<script lang="ts">
	import type { MorphSelectOption } from './types';
	let { option, placeholder }: { option?: MorphSelectOption; placeholder: string } = $props();
</script>

{#if option}{#if option.icon}<span class="arc-morph-select__icon" aria-hidden="true"
			>{@render option.icon()}</span
		>{/if}<span class="arc-morph-select__value-text">{option.label}</span>{:else}<span
		class="arc-morph-select__placeholder">{placeholder}</span
	>{/if}
