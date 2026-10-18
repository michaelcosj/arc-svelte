import type { Snippet } from 'svelte';
import type { ClassValue } from 'svelte/elements';

export interface Segment {
	value: string;
	label: string;
	/** Optional content after the label, such as a badge. */
	accessory?: Snippet;
}

export interface SegmentedControlProps {
	options: Segment[];
	value?: string;
	onValueChange?: (value: string) => void;
	/** Accessible name for the group. */
	label?: string;
	/** Called when the pointer or focus reaches an option, before it is chosen. Use it to start loading what that option shows. */
	onOptionIntent?: (value: string) => void;
	class?: ClassValue;
	ref?: HTMLElement | null;
}
