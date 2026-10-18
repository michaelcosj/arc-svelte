import type { Select as Primitive } from 'bits-ui';
import type { ClassValue } from 'svelte/elements';

export type SelectProps = Omit<
	Primitive.RootProps,
	'type' | 'value' | 'onValueChange' | 'children'
> & {
	label: string;
	description?: string;
	placeholder?: string;
	id?: string;
	class?: ClassValue;
	options: { value: string; label: string; disabled?: boolean }[];
	value?: string;
	defaultValue?: string;
	defaultOpen?: boolean;
	onValueChange?: (value: string) => void;
	ref?: HTMLButtonElement | null;
	dir?: 'ltr' | 'rtl';
};
