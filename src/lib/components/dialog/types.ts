import type { Dialog } from 'bits-ui';
import type { Snippet } from 'svelte';
import type { ClassValue } from 'svelte/elements';

export type DialogProps = Dialog.RootProps;

export interface DialogContentProps extends Omit<
	Dialog.ContentProps,
	'child' | 'children' | 'class' | 'forceMount' | 'title'
> {
	/** The dialog's heading. A new title while open rises in and the old one leaves upward. */
	title: string;
	/** Optional line under the title; swaps like the title. */
	description?: string;
	children: Snippet;
	class?: ClassValue;
}
