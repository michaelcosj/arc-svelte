export type JsonValueType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null' | 'other';

export interface JsonViewerCopyDetail {
	kind: 'value' | 'path';
	path: string;
	text: string;
}

/**
 * A collapsible tree for JSON. Values are colored by type, branches unfold row by row, search highlights every match and
 * opens the branches that hold them, long arrays and objects load in pages, and each row can copy its value or path.
 * The tree follows the WAI-ARIA tree pattern: arrows move and open, Home and End jump, Enter toggles, and the modifier
 * key with C copies the focused value.
 */
export interface JsonViewerProps {
	data: unknown;
	/** Name of the root in paths, as in `root.users[0].name`. Defaults to "root". */
	rootName?: string;
	/** Levels open on first render when `defaultExpanded` is not set. Defaults to 1, which opens the root. */
	defaultExpandDepth?: number;
	/** Paths of open branches. */
	expanded?: string[];
	defaultExpanded?: string[];
	onExpandedChange?: (paths: string[]) => void;
	/** Show the search field. Defaults to true. */
	searchable?: boolean;
	query?: string;
	defaultQuery?: string;
	onQueryChange?: (query: string) => void;
	/** Children shown per page in a long array or object. Defaults to 50. */
	pageSize?: number;
	/** Show copy value and copy path actions. Defaults to true. */
	copyable?: boolean;
	onCopy?: (detail: JsonViewerCopyDetail) => void;
	/** Called when a row becomes the current one. */
	onSelect?: (detail: { path: string; value: unknown; type: JsonValueType }) => void;
	/** Show the path of the current row under the tree. Defaults to true. */
	showPath?: boolean;
	/** Height of the scrolling tree area. Defaults to 420px. */
	maxHeight?: number | string;
	/** Accessible name of the tree. */
	label?: string;
	class?: import('svelte/elements').ClassValue;
	ref?: HTMLDivElement | null;
}

export type Row = {
	id: string;
	kind: 'node' | 'more';
	level: number;
	name: string | number | null;
	value: unknown;
	type: JsonValueType;
	count: number;
	open: boolean;
	parent: string | null;
	posinset: number;
	setsize: number;
	/** For "more" rows: how many children are still hidden. */
	hidden?: number;
};
