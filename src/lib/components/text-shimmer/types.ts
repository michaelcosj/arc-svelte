import type { ClassValue } from 'svelte/elements';
export interface TextShimmerProps {
	text: string;
	active?: boolean;
	duration?: number;
	as?: 'span' | 'p' | 'div' | 'h2' | 'h3' | 'h4';
	class?: ClassValue;
	id?: string;
}
