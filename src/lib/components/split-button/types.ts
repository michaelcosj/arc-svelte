import type { Snippet } from 'svelte';
export interface SplitButtonAction {
	label: string;
	onSelect?: () => void;
	disabled?: boolean;
	destructive?: boolean;
	icon?: Snippet;
}
export interface SplitButtonProps {
	label: string;
	actions: SplitButtonAction[];
	onclick?: () => void;
	disabled?: boolean;
	/** Passing a different snippet morphs the icon; re-rendering the same one stays still. */
	icon?: Snippet;
	variant?: 'primary' | 'secondary';
}
