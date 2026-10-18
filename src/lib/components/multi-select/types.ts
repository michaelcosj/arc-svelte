import type { ClassValue } from 'svelte/elements';

export interface MultiSelectOption {
	value: string;
	label: string;
	disabled?: boolean;
}

export interface MultiSelectProps {
	label: string;
	options: MultiSelectOption[];
	value?: string[];
	defaultValue?: string[];
	onValueChange?: (value: string[]) => void;
	placeholder?: string;
	description?: string;
	maxVisible?: number;
	disabled?: boolean;
	class?: ClassValue;
	ref?: HTMLDivElement | null;
}
