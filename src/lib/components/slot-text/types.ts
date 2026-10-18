import type { ClassValue } from 'svelte/elements';
export interface SlotTextProps {
	value: string | number;
	format?: (value: number) => string;
	duration?: number;
	stagger?: number;
	spins?: number;
	align?: 'start' | 'end';
	announce?: boolean;
	class?: ClassValue;
	style?: string;
}
export interface ReelProps {
	char: string;
	order: number;
	entering: boolean;
	rising: boolean;
	duration: number;
	stagger: number;
	spins: number;
	reduced: boolean;
}
