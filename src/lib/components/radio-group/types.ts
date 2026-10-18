import type { ClassValue } from 'svelte/elements';

export interface RadioOption {
	value: string;
	label: string;
	description?: string;
}

export interface RadioGroupProps {
	/** The group's legend. */
	label: string;
	options: RadioOption[];
	value?: string;
	onValueChange?: (value: string) => void;
	/** The inputs' `name`; defaults to a generated id. */
	name?: string;
	class?: ClassValue;
	ref?: HTMLFieldSetElement | null;
}
