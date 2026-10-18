import type { ClassValue } from 'svelte/elements';

export interface InlineEditProps {
	/** Saved value. External changes replace the display while idle. */
	value: string;
	/** Persist the optimistic edit; rejecting restores the last saved value. */
	onSave: (next: string) => void | Promise<unknown>;
	/** Accessible name, such as “Project name”. */
	label: string;
	/** Return a message to keep an invalid draft open. */
	validate?: (next: string) => string | null | undefined;
	placeholder?: string;
	/** Wrap and grow vertically; Enter saves and Shift+Enter inserts a line break. */
	multiline?: boolean;
	variant?: 'title' | 'body';
	/** Semantic text host; typography still follows the variant. */
	as?: 'span' | 'p' | 'h1' | 'h2' | 'h3';
	class?: ClassValue;
}
export type EditPhase = 'idle' | 'saving' | 'saved' | 'failed';
export interface EditMessage {
	key: string;
	tone: 'error' | 'failed';
	text: string;
	retry: boolean;
}
