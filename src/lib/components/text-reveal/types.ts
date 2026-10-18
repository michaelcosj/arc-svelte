import type { ClassValue } from 'svelte/elements';

export interface TextRevealProps {
	text: string;
	as?: 'h1' | 'h2' | 'h3' | 'p';
	class?: ClassValue;
	id?: string;
	/** Seconds before the first word rises, as in the original API. */
	delay?: number;
}
