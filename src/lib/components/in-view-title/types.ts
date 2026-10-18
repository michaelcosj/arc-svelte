import type { ClassValue } from 'svelte/elements';
export type InViewTitleVariant = 'word' | 'line' | 'blur' | 'tracking' | 'wipe';
export interface InViewTitleProps {
	text: string;
	variant?: InViewTitleVariant;
	as?: 'h1' | 'h2' | 'h3';
	lines?: string[];
	class?: ClassValue;
	id?: string;
	once?: boolean;
}
