import type { Snippet } from 'svelte';
import type { ClassValue } from 'svelte/elements';
export type FloatingButtonGroupVariant = 'muted' | 'floating';
export type FloatingButtonGroupSize = 'sm' | 'md';
export type FloatingButtonGroupOrientation = 'horizontal' | 'vertical';
export interface FloatingButtonGroupAction {
	type?: 'action';
	id: string;
	label: string;
	icon?: Snippet;
	iconOnly?: boolean;
	onSelect?: () => void;
	disabled?: boolean;
	pressed?: boolean;
	shortcut?: string;
	reserveLabels?: readonly string[];
}
export interface FloatingButtonGroupSeparator {
	type: 'separator';
	id?: string;
}
export type FloatingButtonGroupItem = FloatingButtonGroupAction | FloatingButtonGroupSeparator;
export interface FloatingButtonGroupProps {
	items: readonly FloatingButtonGroupItem[];
	label: string;
	variant?: FloatingButtonGroupVariant;
	size?: FloatingButtonGroupSize;
	orientation?: FloatingButtonGroupOrientation;
	iconOnly?: boolean;
	tooltipSide?: 'top' | 'bottom' | 'left' | 'right';
	onAction?: (id: string) => void;
	class?: ClassValue;
	style?: string;
}
