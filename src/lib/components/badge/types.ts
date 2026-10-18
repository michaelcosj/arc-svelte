import type { Snippet } from 'svelte';
import type { ClassValue, HTMLAttributes } from 'svelte/elements';

export type BadgeTone = 'neutral' | 'success' | 'info' | 'warning' | 'danger';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'class'> {
	tone?: BadgeTone;
	size?: BadgeSize;
	/** Leading icon. Passing a different snippet crossfades it in; the same one stays still. */
	icon?: Snippet;
	/** Text label. A new value rises in while the old one lifts away. */
	label?: string | number;
	/** Rich content, rendered as is in place of `label`. */
	children?: Snippet;
	class?: ClassValue;
	ref?: HTMLSpanElement | null;
}
