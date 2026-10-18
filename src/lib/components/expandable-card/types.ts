import type { Snippet } from 'svelte';
import type { HTMLAttributes } from 'svelte/elements';
export interface ExpandableCardProps extends Omit<
	HTMLAttributes<HTMLElement>,
	'title' | 'children'
> {
	title: string;
	description?: string;
	children: Snippet;
	defaultExpanded?: boolean;
	width?: number;
	expandedWidth?: number;
}
