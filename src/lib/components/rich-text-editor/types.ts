import type { ClassValue } from 'svelte/elements';
export type { BlockType } from './editor-dom';
export interface RichTextValue {
	html: string;
	markdown: string;
	text: string;
	empty: boolean;
}

export interface RichTextEditorHandle {
	focus: () => void;
	getHTML: () => string;
	getMarkdown: () => string;
	getText: () => string;
	setHTML: (html: string) => void;
	setMarkdown: (markdown: string) => void;
	clear: () => void;
	undo: () => void;
	redo: () => void;
	element: HTMLDivElement | null;
}
export interface RichTextEditorProps {
	/** Caller-owned HTML with onChange; bind:value also works without a callback. Only differing HTML rewrites the DOM. */
	value?: string;
	defaultValue?: string;
	/** Initial Markdown, used only when neither value nor defaultValue supplies HTML. */
	defaultMarkdown?: string;
	onChange?: (value: RichTextValue) => void;
	/** Reports availability of the editor-owned, 300-snapshot undo history. */
	onHistoryChange?: (state: { canUndo: boolean; canRedo: boolean }) => void;
	placeholder?: string;
	blockHint?: string;
	readOnly?: boolean;
	autoFocus?: boolean;
	'aria-label'?: string;
	class?: ClassValue;
	style?: string;
	/** Bind the imperative editor handle. Cleared when the component is destroyed. */
	ref?: RichTextEditorHandle | null;
}
