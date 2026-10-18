import type { Snippet } from 'svelte';
import type { ClassValue, HTMLAttributes } from 'svelte/elements';
export interface HoverCardProps {
	child: Snippet<[{ props: HTMLAttributes<HTMLElement> }]>;
	content: Snippet;
	side?: 'top' | 'bottom' | 'left' | 'right';
	align?: 'start' | 'center' | 'end';
	openDelay?: number;
	closeDelay?: number;
	class?: ClassValue;
}
export interface HoverCardStat {
	label: string;
	value: string | number;
}
export interface HoverCardProfileProps {
	name: string;
	role?: string;
	avatar?: string | Snippet;
	bio?: string;
	stats?: HoverCardStat[];
	meta?: Snippet;
}
