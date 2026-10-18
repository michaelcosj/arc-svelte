import type { Snippet } from 'svelte';

export interface ContextMenuItem {
	id: string;
	label: string;
	icon?: Snippet;
	onSelect?: () => void;
	disabled?: boolean;
	destructive?: boolean;
	checked?: boolean;
}

export interface ContextMenuProps {
	children: Snippet;
	items: ContextMenuItem[];
	label?: string;
}

export interface MenuPoint {
	x: number;
	y: number;
	key: number;
}
