import type { Snippet } from 'svelte';
import type { ClassValue } from 'svelte/elements';

export interface AccordionItem {
	title: string;
	/** Plain text, or a snippet for rich content. */
	content: string | Snippet;
}

export interface AccordionProps {
	items: AccordionItem[];
	/** Index of the item open on first render; out of range (e.g. `-1`) starts with all closed. */
	defaultOpen?: number;
	/** "lg" suits page-level FAQs: questions at the large text size, answers at body size. */
	size?: 'md' | 'lg';
	class?: ClassValue;
	ref?: HTMLElement | null;
}
