import type { Snippet } from 'svelte';
import type { ClassValue } from 'svelte/elements';
export type CountdownUnit = 'days' | 'hours' | 'minutes' | 'seconds';
export interface CountdownProps {
	target: Date | number | string;
	timeZone?: string;
	units?: CountdownUnit[];
	variant?: 'large' | 'compact';
	completeLabel?: string | number | Snippet | null;
	onComplete?: () => void;
	label?: string;
	clock?: () => number;
	ref?: HTMLDivElement | null;
	class?: ClassValue;
}
