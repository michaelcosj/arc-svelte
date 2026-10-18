import type { Snippet } from 'svelte';
import type { ClassValue } from 'svelte/elements';

export interface ExpandingSearchItem {
	id: string;
	title: string;
	meta?: string;
	group?: string;
	icon?: Snippet;
	keywords?: string[];
}
export interface ExpandingSearchProps {
	label: string;
	items: ExpandingSearchItem[];
	suggestions?: ExpandingSearchItem[];
	suggestionsLabel?: string;
	placeholder?: string;
	onSelect?: (item: ExpandingSearchItem) => void;
	onExpandedChange?: (expanded: boolean) => void;
	expandedWidth?: number;
	maxResults?: number;
	anchor?: 'start' | 'end';
	emptyHint?: string;
	class?: ClassValue;
}
export interface SearchGroup {
	name: string;
	items: ExpandingSearchItem[];
}
