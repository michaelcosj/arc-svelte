import type { Snippet } from 'svelte';
import type { ClassValue } from 'svelte/elements';
export interface SwipeAction {
	label: string;
	icon: Snippet;
	tone?: 'neutral' | 'accent' | 'danger';
	onSelect: () => void;
	keepRow?: boolean;
}
export interface SwipeActionsProps {
	label: string;
	children: Snippet;
	class?: ClassValue;
}
export interface SwipeActionsRowProps {
	label: string;
	leading?: SwipeAction[];
	trailing?: SwipeAction[];
	fullSwipe?: boolean;
	children: Snippet;
	class?: ClassValue;
}
export type Side = 'leading' | 'trailing';
