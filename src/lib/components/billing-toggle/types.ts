import type { ClassValue } from 'svelte/elements';

export interface BillingToggleOption {
	value: string;
	label: string;
	/** Short savings note, e.g. "Save 20%". */
	badge?: string;
	/** Badge text once this option is selected, e.g. "You save $48". Defaults to `badge`. */
	activeBadge?: string;
}

export interface BillingToggleProps {
	/** The selected option's value. Bind it, or pair it with `onValueChange`. */
	value?: string;
	onValueChange?: (value: string) => void;
	options?: BillingToggleOption[];
	/** Accessible name of the group. */
	label?: string;
	size?: 'md' | 'lg';
	class?: ClassValue;
	ref?: HTMLDivElement | null;
}

export interface BillingPriceProps {
	amount: number;
	currency?: string;
	/** Period after the price, e.g. "per month". Swaps in place when it changes. */
	period?: string;
	/** Previous price, shown struck through when it is higher than `amount`. */
	was?: number;
	decimals?: number;
	class?: ClassValue;
}
