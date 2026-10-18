import type { Snippet } from 'svelte';
import type { ClassValue, HTMLAttributes } from 'svelte/elements';

export interface ScrollAreaEdges {
	top: boolean;
	bottom: boolean;
	left: boolean;
	right: boolean;
}

export interface ScrollAreaProps extends Omit<
	HTMLAttributes<HTMLDivElement>,
	'class' | 'children' | 'onscroll'
> {
	children?: Snippet;
	class?: ClassValue;
	ref?: HTMLDivElement | null;
	orientation?: 'vertical' | 'horizontal' | 'both';
	fade?: number;
	scrollbars?: 'auto' | 'always';
	hideDelay?: number;
	maxHeight?: string | number;
	snap?: string;
	label?: string;
	wheelToHorizontal?: boolean;
	viewportClass?: ClassValue;
	viewportStyle?: string;
	viewportRef?: HTMLDivElement | null;
	onScroll?: (event: Event & { currentTarget: HTMLDivElement }) => void;
	onEdgeChange?: (edges: ScrollAreaEdges) => void;
}
