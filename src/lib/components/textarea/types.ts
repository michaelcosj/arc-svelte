import type { ClassValue, HTMLTextareaAttributes } from 'svelte/elements';

export interface TextareaProps extends Omit<HTMLTextareaAttributes, 'class'> {
	/** Visible label, tied to the textarea. */
	label: string;
	/** Helper copy under the field. Counts such as "120 characters" roll their digits. */
	description?: string;
	/** Error copy. Sets aria-invalid and renders in a role="alert" row. */
	error?: string;
	class?: ClassValue;
	ref?: HTMLTextAreaElement | null;
}
