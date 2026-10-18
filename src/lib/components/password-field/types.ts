import type { ClassValue, HTMLInputAttributes } from 'svelte/elements';

/** The toggle's names. Both have English defaults; pass the ones you translate. */
export interface PasswordFieldMessages {
	showPassword: string;
	hidePassword: string;
}

export const defaultPasswordFieldMessages: PasswordFieldMessages = {
	showPassword: 'Show password',
	hidePassword: 'Hide password'
};

export interface PasswordFieldProps extends Omit<HTMLInputAttributes, 'type' | 'class'> {
	label: string;
	description?: string;
	/** Translated or reworded toggle names. */
	messages?: Partial<PasswordFieldMessages>;
	class?: ClassValue;
	ref?: HTMLInputElement | null;
}
