import type { Snippet } from 'svelte';
import type { ClassValue, HTMLButtonAttributes } from 'svelte/elements';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<HTMLButtonAttributes, 'class'> {
	variant?: ButtonVariant;
	size?: ButtonSize;
	/** Shows a spinner, hides the label, and swallows presses while keeping focus. */
	loading?: boolean;
	/** Text label. A new value crossfades in while the button's width springs to fit. */
	label?: string | number;
	/** Rich content (icons, text). Passing a different snippet, or a new `contentKey`, crossfades it. */
	children?: Snippet;
	/** Identity of `children`: change it to crossfade content that a single snippet renders. */
	contentKey?: unknown;
	class?: ClassValue;
	ref?: HTMLButtonElement | null;
}
