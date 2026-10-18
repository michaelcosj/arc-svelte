import type { Dialog } from 'bits-ui';
import type { Snippet } from 'svelte';
import type { ClassValue } from 'svelte/elements';

export type DrawerProps = Dialog.RootProps & { defaultOpen?: boolean };
export interface DrawerContentProps extends Omit<
	Dialog.ContentProps,
	'child' | 'children' | 'class' | 'forceMount' | 'title'
> {
	title: string;
	description?: string;
	children: Snippet;
	side?: 'left' | 'right' | 'top' | 'bottom';
	container?: HTMLElement | null;
	class?: ClassValue;
}
