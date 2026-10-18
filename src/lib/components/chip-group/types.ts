import type { ClassValue } from 'svelte/elements';

export interface ChipOption {
	value: string;
	label: string;
}

export interface ChipGroupProps {
	options: ChipOption[];
	value: string[];
	onValueChange?: (value: string[]) => void;
	label: string;
	multiple?: boolean;
	maxVisible?: number;
	class?: ClassValue;
}
