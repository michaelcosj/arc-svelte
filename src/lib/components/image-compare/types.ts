import type { Snippet } from 'svelte';
import type { ClassValue } from 'svelte/elements';

export interface ImageCompareProps {
	before: Snippet;
	after: Snippet;
	position?: number;
	defaultPosition?: number;
	onPositionChange?: (position: number) => void;
	orientation?: 'horizontal' | 'vertical';
	labels?: [string, string] | false;
	label?: string;
	aspectRatio?: string;
	class?: ClassValue;
}
export interface CompareMetrics {
	w: number;
	h: number;
	bw: number;
	bh: number;
	aw: number;
	ah: number;
}
export interface CompareDrag {
	pointer: number;
	grab: number;
	press: boolean;
	started: boolean;
	x: number;
	y: number;
	raw: number;
}
