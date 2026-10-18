import type { Snippet } from 'svelte';
import type { HTMLAttributes } from 'svelte/elements';

export type RadioCardContent = string | number | Snippet;

export interface RadioCardOption {
	value: string;
	label: RadioCardContent;
	description?: RadioCardContent;
	meta?: RadioCardContent;
	icon?: Snippet;
	disabled?: boolean;
	disabledReason?: RadioCardContent;
}

export interface RadioCardsProps extends Omit<
	HTMLAttributes<HTMLDivElement>,
	'onchange' | 'defaultValue' | 'children'
> {
	options: RadioCardOption[];
	value?: string | null;
	defaultValue?: string | null;
	/** With `value`, the callback owns updates. Without it, use `bind:value`. */
	onValueChange?: (value: string) => void;
	layout?: 'grid' | 'list';
	minColumnWidth?: number;
	name?: string;
	required?: boolean;
	disabled?: boolean;
	ref?: HTMLDivElement | null;
}
