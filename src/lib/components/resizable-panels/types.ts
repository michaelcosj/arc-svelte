import type { Snippet } from 'svelte';
import type { ClassValue } from 'svelte/elements';
export interface ResizablePanelProps {
	id: string;
	label: string;
	defaultSize: number;
	minSize?: number;
	maxSize?: number;
	collapsible?: boolean;
	defaultCollapsed?: boolean;
	class?: ClassValue;
	children?: Snippet;
}
export interface ResizablePanelsProps {
	label?: string;
	children: ResizablePanelProps[];
	onLayoutChange?: (sizes: number[]) => void;
	class?: ClassValue;
}
