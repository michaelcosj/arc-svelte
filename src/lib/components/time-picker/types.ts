import type { ClassValue } from 'svelte/elements';

export interface TimePickerProps {
	label: string;
	value?: string;
	defaultValue?: string;
	onChange?: (value: string) => void;
	description?: string;
	placeholder?: string;
	minuteStep?: 1 | 5 | 10 | 15 | 30;
	format?: '12h' | '24h';
	disabled?: boolean;
	class?: ClassValue;
	ref?: HTMLDivElement | null;
}
