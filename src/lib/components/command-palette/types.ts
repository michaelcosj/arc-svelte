import type { Snippet } from 'svelte';

export interface CommandItem {
	id: string;
	label: string;
	description?: string;
	group?: string;
	keywords?: string[];
	icon?: Snippet;
	shortcut?: string;
}

export interface CommandPaletteProps {
	items: CommandItem[];
	placeholder?: string;
	onSelect?: (item: CommandItem) => void;
	onClose?: () => void;
	label?: string;
	autoFocus?: boolean;
}
