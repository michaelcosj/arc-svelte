import type { Snippet } from 'svelte';
import type { ClassValue, HTMLAttributes } from 'svelte/elements';

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title' | 'class'> {
	title: string;
	description?: string;
	media?: Snippet;
	action?: Snippet;
	avatar?: Snippet;
	meta?: string | Snippet;
	status?: string;
	details?: Snippet;
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	children?: Snippet;
	class?: ClassValue;
	ref?: HTMLElement | null;
}
