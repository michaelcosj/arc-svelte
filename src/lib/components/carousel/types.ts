import type { Snippet } from 'svelte';
import type { ClassValue } from 'svelte/elements';
export interface CarouselProps {
	label: string;
	/** One snippet per slide, in display order. */
	children: Snippet[];
	index?: number;
	defaultIndex?: number;
	onIndexChange?: (index: number) => void;
	slideSize?: string;
	slideLabel?: (index: number, count: number) => string;
	interval?: number;
	autoplay?: boolean;
	class?: ClassValue;
}
