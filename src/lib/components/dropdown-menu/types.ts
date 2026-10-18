import type { Snippet } from 'svelte';

export interface DropdownItem {
	label: string;
	onSelect?: () => void;
	disabled?: boolean;
	/** Leading icon, decorative. */
	icon?: Snippet;
	destructive?: boolean;
	/** Draw a separator above this item. */
	separatorBefore?: boolean;
}

export interface DropdownMenuProps {
	/** Trigger label. A new value rises in while the old one leaves, and the trigger width springs to it. */
	label: string;
	items: DropdownItem[];
	/** Leading trigger icon, decorative. */
	icon?: Snippet;
}
