import type { ClassValue } from 'svelte/elements';

export interface CopyButtonProps {
	/** The text written to the clipboard. */
	value: string;
	/** Visible label and accessible name. Defaults to "Copy". */
	label?: string;
	class?: ClassValue;
	/** Show only the icon; the label stays the accessible name. */
	iconOnly?: boolean;
	variant?: 'outline' | 'plain';
	disabled?: boolean;
	/** Called after the value reaches the clipboard. */
	onCopied?: () => void;
	ref?: HTMLButtonElement | null;
}
