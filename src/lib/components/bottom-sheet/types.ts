import type { Snippet } from 'svelte';
import type { ClassValue, HTMLButtonAttributes } from 'svelte/elements';
export interface BottomSheetProps {
	trigger?: Snippet<[{ props: HTMLButtonAttributes }]>;
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	title: string;
	description?: string;
	detents?: number[];
	initialDetent?: number;
	onDetentChange?: (index: number) => void;
	closeLabel?: string;
	class?: ClassValue;
	children: Snippet;
}
