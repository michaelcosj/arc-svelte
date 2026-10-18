import type { ClassValue } from 'svelte/elements';

export interface AnimatedCounterProps {
	value: number;
	/** Caption above the number; a new label rises in as the old one lifts away. */
	label?: string;
	prefix?: string;
	suffix?: string;
	decimals?: number;
	/** Roll every digit up from zero the first time the counter scrolls into view. */
	animateOnView?: boolean;
	/** Formatting locale. Fixed by default so server and client render the same digits. */
	locale?: string;
	class?: ClassValue;
	ref?: HTMLElement | null;
}
