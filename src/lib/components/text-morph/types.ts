import type { ClassValue } from 'svelte/elements';

export interface TextMorphProps {
	/** The label. Letters both strings share glide to their new positions; the rest blur in and out. */
	text: string;
	as?: 'span' | 'div' | 'p' | 'strong' | 'h1' | 'h2' | 'h3';
	class?: ClassValue;
	id?: string;
	ref?: HTMLElement | null;
}
