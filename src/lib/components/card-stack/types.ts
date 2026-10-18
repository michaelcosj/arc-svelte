import type { Snippet } from 'svelte';
import type { ClassValue } from 'svelte/elements';
export type CardDecision = 'left' | 'right';
export interface CardStackProps<T> {
	items: T[];
	getKey: (item: T) => string;
	getLabel: (item: T) => string;
	renderCard: Snippet<[T]>;
	onDecide?: (item: T, decision: CardDecision) => void;
	onUndo?: (item: T, decision: CardDecision) => void;
	onReset?: () => void;
	labels?: { left: string; right: string };
	outcomes?: { left: string; right: string };
	label?: string;
	renderEmpty?: Snippet<[() => void]>;
	class?: ClassValue;
}
export type Point = { x: number; y: number };
export type CardExit = Point & { tilt: number };
export type CardReturn = CardExit & { delay: number };
