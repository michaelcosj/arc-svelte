import type { Snippet } from 'svelte';
import type { ClassValue, HTMLButtonAttributes } from 'svelte/elements';

export interface HoldToConfirmProps extends Omit<
	HTMLButtonAttributes,
	'children' | 'onclick' | 'class'
> {
	/** The instruction and action, for example “Hold to delete project”. */
	label: string;
	confirmedLabel?: string;
	onConfirm: () => void;
	/** Hold length in milliseconds. */
	duration?: number;
	icon?: Snippet;
	tone?: 'accent' | 'danger' | 'neutral';
	/** Leave undefined for internal state; set back to false to reset. */
	confirmed?: boolean;
	onHoldChange?: (holding: boolean) => void;
	class?: ClassValue;
	ref?: HTMLButtonElement | null;
}
