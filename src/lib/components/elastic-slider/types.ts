import type { Snippet } from 'svelte';
import type { ClassValue } from 'svelte/elements';

export interface ElasticSliderMark {
	value: number;
	label?: string;
}

export interface ElasticSliderProps {
	/** Visible label and accessible name of the thumb. */
	label: string;
	value?: number;
	defaultValue?: number;
	onValueChange?: (value: number) => void;
	onValueCommit?: (value: number) => void;
	min?: number;
	max?: number;
	step?: number;
	largeStep?: number;
	marks?: (number | ElasticSliderMark)[];
	format?: (value: number) => string;
	showValue?: boolean;
	startIcon?: Snippet;
	endIcon?: Snippet;
	name?: string;
	disabled?: boolean;
	class?: ClassValue;
	ref?: HTMLDivElement | null;
}
