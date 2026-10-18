import type { HTMLInputAttributes } from 'svelte/elements';
export interface ComboboxOption {
	value: string;
	label: string;
	disabled?: boolean;
	keywords?: string[];
}
export interface ComboboxProps extends Omit<
	HTMLInputAttributes,
	'value' | 'defaultValue' | 'onchange' | 'placeholder'
> {
	label: string;
	options: ComboboxOption[];
	value?: string;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	description?: string;
	placeholder?: string;
	emptyMessage?: string;
	ref?: HTMLInputElement | null;
	id?: string;
	disabled?: boolean;
}
