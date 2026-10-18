import type { Snippet } from 'svelte';
import type { ClassValue, HTMLAttributes } from 'svelte/elements';
import type { Platform } from './shortcut';
export interface ShortcutKbdProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
	children?: Snippet;
	label?: string;
	pressed?: boolean;
	size?: 'sm' | 'md';
	ref?: HTMLElement | null;
}
export type KbdProps = ShortcutKbdProps;
export interface ShortcutKeysProps {
	shortcut: string;
	platform?: Platform;
	pressed?: ReadonlySet<string>;
	size?: 'sm' | 'md';
	class?: ClassValue;
}
export interface ShortcutBinding {
	shortcut: string;
	label: string;
}
export interface ShortcutRecorderProps {
	label: string;
	hideLabel?: boolean;
	value?: string | null;
	defaultValue?: string | null;
	onValueChange?: (value: string | null, details: { replaced?: ShortcutBinding }) => void;
	resetValue?: string | null;
	bindings?: ShortcutBinding[];
	warnReserved?: boolean;
	requireModifier?: boolean;
	platform?: Platform;
	placeholder?: string;
	description?: string;
	disabled?: boolean;
	id?: string;
	class?: ClassValue;
}
export interface ShortcutListItem {
	label: string;
	shortcut: string;
	keywords?: string;
}
export interface ShortcutListGroup {
	label: string;
	items: ShortcutListItem[];
}
export interface ShortcutListProps {
	groups: ShortcutListGroup[];
	label?: string;
	searchable?: boolean;
	searchPlaceholder?: string;
	highlightPressed?: boolean;
	platform?: Platform;
	class?: ClassValue;
}
