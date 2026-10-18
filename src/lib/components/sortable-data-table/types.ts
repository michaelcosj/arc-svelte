import type { Snippet } from 'svelte';

export type SortDirection = 'asc' | 'desc';
export type SortState = { key: string; direction: SortDirection };
export interface DataColumn<T> {
	key: string;
	label: string;
	sortable?: boolean;
	render?: Snippet<[unknown, T]>;
	numeric?: boolean;
	width?: number | string;
}
export interface SortableDataTableProps<T extends Record<string, unknown>> {
	rows: T[];
	columns: DataColumn<T>[];
	rowKey: keyof T | ((row: T) => string);
	caption?: string;
	emptyMessage?: string;
	defaultSort?: SortState;
	onSortChange?: (sort: SortState) => void;
	selectable?: boolean;
	selectedKeys?: string[];
	defaultSelectedKeys?: string[];
	onSelectionChange?: (keys: string[]) => void;
	itemName?: { one: string; other: string };
}
