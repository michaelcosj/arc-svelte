import type { Snippet } from 'svelte';
import type { ClassValue } from 'svelte/elements';
export type ToastType = 'success' | 'info' | 'warning' | 'error' | 'loading';
export interface ToastAction {
	label: string;
	onClick: (id: string) => void;
}
export interface ToastOptions {
	id?: string;
	type?: ToastType;
	title: string;
	description?: string;
	action?: ToastAction;
	duration?: number;
}
export interface ToastStackApi {
	toast: (options: ToastOptions) => string;
	update: (id: string, patch: Partial<Omit<ToastOptions, 'id'>>) => void;
	dismiss: (id?: string) => void;
}
export interface ToastStackProviderProps {
	children?: Snippet;
	duration?: number;
	limit?: number;
}
export interface ToastStackProps {
	label?: string;
	position?: 'bottom-right' | 'bottom-center' | 'bottom-left';
	contained?: boolean;
	visibleToasts?: number;
	hotkey?: boolean;
	class?: ClassValue;
}
export type ToastRecord = {
	id: string;
	type: ToastType;
	title: string;
	description?: string;
	action?: ToastAction;
	duration: number;
	seq: number;
	version: number;
};
export type ToastTarget = {
	y: number;
	scale: number;
	height: number;
	opacity: number;
	content: number;
};
