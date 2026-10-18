import type { Snippet } from 'svelte';
import type { ClassValue } from 'svelte/elements';
export interface EmptyStateProps {
	title: string;
	description: string;
	action?: Snippet;
	icon?: Snippet;
	class?: ClassValue;
	label?: string;
}
