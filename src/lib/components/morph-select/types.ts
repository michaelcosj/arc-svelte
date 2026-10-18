import type { Snippet } from 'svelte';
import type { ClassValue } from 'svelte/elements';
export interface MorphSelectOption {
	value: string;
	label: string;
	icon?: Snippet;
	meta?: string;
	keywords?: string;
	disabled?: boolean;
}
export interface MorphSelectGroup {
	label: string;
	options: MorphSelectOption[];
}
export type MorphSelectItem = MorphSelectOption | MorphSelectGroup;
export interface MorphSelectProps {
	label: string;
	hideLabel?: boolean;
	items: MorphSelectItem[];
	value?: string | null;
	defaultValue?: string | null;
	onValueChange?: (value: string, option: MorphSelectOption) => void;
	placeholder?: string;
	searchable?: boolean | 'auto';
	searchPlaceholder?: string;
	panelWidth?: number;
	maxListHeight?: number;
	align?: 'start' | 'end';
	name?: string;
	disabled?: boolean;
	class?: ClassValue;
}
