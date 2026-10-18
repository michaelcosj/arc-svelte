import type { HTMLButtonAttributes } from 'svelte/elements';
export interface ActionButtonProps extends Omit<HTMLButtonAttributes, 'onclick'> {
	label: string;
	successLabel?: string;
	pendingLabel?: string;
	onAction: () => void | Promise<void>;
	resetAfterMs?: number;
	onActionError?: (error: unknown) => void;
	ref?: HTMLButtonElement | null;
}
