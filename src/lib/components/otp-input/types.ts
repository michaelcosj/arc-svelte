import type { ClassValue } from 'svelte/elements';

export interface OtpInputProps {
	length?: number;
	value?: string;
	onChange?: (value: string) => void;
	label: string;
	description?: string;
	error?: string;
	autofocus?: boolean;
	disabled?: boolean;
	inputmode?: 'numeric' | 'text';
	class?: ClassValue;
}
