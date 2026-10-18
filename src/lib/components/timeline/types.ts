import type { Snippet } from 'svelte';
import type { ClassValue } from 'svelte/elements';
export interface TimelineEvent {
	id: string;
	at: string | number;
	actor?: string;
	title: string;
	meta?: string;
	detail?: string | number | Snippet;
	avatar?: string;
	icon?: Snippet;
	tone?: 'neutral' | 'success' | 'danger';
}
export interface TimelineProps {
	events: TimelineEvent[];
	now: number;
	label: string;
	timeZone?: string;
	locale?: string;
	maxHeight?: number | string;
	scrollToNew?: boolean;
	defaultExpanded?: string[];
	headingLevel?: 2 | 3 | 4 | 5 | 6;
	class?: ClassValue;
}
export type Row = TimelineEvent & { time: number; day: string };
export type Group = { day: string; label: string; rows: Row[] };
