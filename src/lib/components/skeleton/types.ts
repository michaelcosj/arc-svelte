import type { Snippet } from 'svelte';
import type { ClassValue } from 'svelte/elements';

export interface SkeletonProps {
	label?: string;
	lines?: number;
	avatar?: boolean;
	class?: ClassValue;
	children?: Snippet;
	loading?: boolean;
}
