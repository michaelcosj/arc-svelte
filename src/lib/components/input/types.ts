import type { ClassValue, HTMLInputAttributes } from 'svelte/elements';

export interface InputProps extends Omit<HTMLInputAttributes, 'class'> {
	/** Visible label, tied to the input. */
	label: string;
	/** Helper copy under the field, linked through aria-describedby. */
	description?: string;
	/** Error copy. Sets aria-invalid and renders in a role="alert" row. */
	error?: string;
	class?: ClassValue;
	ref?: HTMLInputElement | null;
}
