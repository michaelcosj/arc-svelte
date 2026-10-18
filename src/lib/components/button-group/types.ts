import type { Snippet } from 'svelte';
import type { ClassValue } from 'svelte/elements';
export type ButtonGroupVariant = 'outline' | 'solid';
export type ButtonGroupSize = 'sm' | 'md';
export type ButtonGroupOrientation = 'horizontal' | 'vertical';
export interface ButtonGroupItem {
	id: string;
	label: string;
	reserve?: string[];
	icon?: Snippet;
	/** Stable identity for icons rendered by a single changing snippet. */
	iconKey?: string;
	iconOnly?: boolean;
	content?: Snippet;
	onSelect?: () => void;
	href?: string;
	disabled?: boolean;
}
export interface ButtonGroupMenuItem {
	id: string;
	label: string;
	icon?: Snippet;
	onSelect?: () => void;
	href?: string;
	disabled?: boolean;
	destructive?: boolean;
}
export interface ButtonGroupMenu {
	label: string;
	items: ButtonGroupMenuItem[];
}
export interface ButtonGroupProps {
	items: ButtonGroupItem[];
	menu?: ButtonGroupMenu;
	label: string;
	variant?: ButtonGroupVariant;
	size?: ButtonGroupSize;
	orientation?: ButtonGroupOrientation;
	collapseLabels?: boolean;
	disabled?: boolean;
	class?: ClassValue;
	style?: string;
}
