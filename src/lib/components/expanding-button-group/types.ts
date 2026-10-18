import type { Snippet } from 'svelte';
import type { ClassValue } from 'svelte/elements';
export type ExpandingButtonGroupSize = 'sm' | 'md';
export type ExpandingButtonGroupTone = 'neutral' | 'danger';
export interface ExpandingButtonGroupItem {
	id: string;
	label: string;
	icon: Snippet;
	onSelect?: () => void | boolean | Promise<void | boolean>;
	doneLabel?: string;
	tone?: ExpandingButtonGroupTone;
	disabled?: boolean;
}
export interface ExpandingButtonGroupProps {
	items: readonly ExpandingButtonGroupItem[];
	label: string;
	size?: ExpandingButtonGroupSize;
	defaultExpanded?: string | null;
	onAction?: (id: string) => void;
	confirmDuration?: number;
	class?: ClassValue;
	style?: string;
}
export const metrics = {
	sm: { height: 28, icon: 14, start: 7, gap: 5, end: 11 },
	md: { height: 36, icon: 16, start: 10, gap: 7, end: 14 }
} as const;
