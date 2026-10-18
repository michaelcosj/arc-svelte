import type { Snippet } from 'svelte';
import type { HTMLAttributes } from 'svelte/elements';
export type AlertTone = 'info' | 'success' | 'warning' | 'danger';
export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children'> {
	tone?: AlertTone;
	title: string;
	children?: Snippet | string | number;
	open?: boolean;
	onDismiss?: () => void;
}
