import type { Snippet } from 'svelte';
export interface FilterChip {
	id: string;
	label: string;
	value?: string;
}
export interface FilterOption {
	value: string;
	label?: string;
	hint?: string | number;
	icon?: Snippet;
}
export interface FilterField {
	id: string;
	label: string;
	icon?: Snippet;
	options: (string | FilterOption)[];
}
export interface FilterMenuProps {
	fields: FilterField[];
	onSelect: (filter: FilterChip, field: FilterField) => void;
	active?: FilterChip[];
	label?: string;
	align?: 'start' | 'end';
}
export interface FilterToolbarProps {
	filters: FilterChip[];
	onRemove: (id: string) => void;
	onClearAll?: () => void;
	children?: Snippet;
	label?: string;
	addFilter?: {
		fields: FilterField[];
		onAdd: FilterMenuProps['onSelect'];
		label?: string;
		align?: 'start' | 'end';
	};
}
export interface FilterRow {
	key: string;
	label: string;
	icon?: Snippet;
	value?: string;
	hint?: string | number;
	checked?: boolean;
	drill?: boolean;
}
export type FocusRequest = 'first' | 'last' | 'checked' | 'panel' | { key: string };
