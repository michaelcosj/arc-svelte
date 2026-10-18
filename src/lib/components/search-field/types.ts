import type { ClassValue, HTMLInputAttributes } from 'svelte/elements';

export interface SearchFieldProps extends Omit<HTMLInputAttributes, 'type' | 'class' | 'value'> {
	/** Visible label tied to the input. */
	label: string;
	/** Current query. Bind it, or pair it with `onValueChange`. */
	value?: string;
	/** Called on every keystroke and with an empty string when cleared. */
	onValueChange?: (value: string) => void;
	class?: ClassValue;
	ref?: HTMLInputElement | null;
}
