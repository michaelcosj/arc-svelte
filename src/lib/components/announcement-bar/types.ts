import type { Snippet } from 'svelte';
import type { ClassValue } from 'svelte/elements';
export interface AnnouncementAction {
	label: string;
	href?: string;
	onClick?: () => void;
}
export interface Announcement {
	id: string;
	message: string | number | Snippet;
	action?: AnnouncementAction;
	countdown?: { to: Date | string | number; label?: string };
}
export interface AnnouncementBarProps {
	messages: Announcement[];
	id?: string;
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	index?: number;
	defaultIndex?: number;
	onIndexChange?: (index: number) => void;
	interval?: number;
	autoPlay?: boolean;
	controls?: boolean;
	dismissible?: boolean;
	tone?: 'neutral' | 'inverted';
	onAction?: (announcement: Announcement) => void;
	onCountdownEnd?: (announcement: Announcement) => void;
	label?: string;
	class?: ClassValue;
	ref?: HTMLElement | null;
}
