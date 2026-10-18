export interface ChatParticipant {
	id: string;
	name: string;
	/** Portrait URL. Initials show when it is missing. */
	avatar?: string;
}

export interface ChatAttachment {
	id: string;
	name: string;
	kind: 'image' | 'file';
	url?: string;
	/** Bytes. */
	size?: number;
	/** Intrinsic image size, used to reserve space before the image loads. */
	width?: number;
	height?: number;
	alt?: string;
}

export interface ChatReaction {
	emoji: string;
	count: number;
	/** The current user reacted with this emoji. */
	mine?: boolean;
}

export type ChatMessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface ChatMessage {
	id: string;
	authorId: string;
	text?: string;
	createdAt: Date | string | number;
	attachments?: ChatAttachment[];
	reactions?: ChatReaction[];
	/** Delivery state of the current user's own messages. */
	status?: ChatMessageStatus;
}

export interface ChatDraft {
	text: string;
	files: File[];
}

/** Words the composer shows or announces. Each has an English default. */
export interface ChatComposerLabels {
	/** Accessible name of the send button. */
	send?: string;
	/** Accessible name of the attach button. */
	attach?: string;
	/** Accessible name of the list of files waiting to send. */
	attachments?: string;
	/** Accessible name of the button that takes a file back out. */
	removeFile?: (name: string) => string;
}

/** Every word the thread shows or announces. Each has an English default; words with a count or names are functions, so an app can apply its own plural rules. */
export interface ChatThreadLabels extends ChatComposerLabels {
	sending?: string;
	sent?: string;
	delivered?: string;
	read?: string;
	failed?: string;
	retry?: string;
	/** Accessible name of the read receipts under a message. */
	readBy?: (names: string[]) => string;
	/** Day separators for the last two days. Older days are formatted by `locale`. Defaults come from Intl for `locale`. */
	today?: string;
	yesterday?: string;
	/** Screen reader announcement of who is typing. */
	typing?: (names: string[]) => string;
	/** The pill when new messages land out of view. The count inside it rolls. */
	newMessages?: (count: number) => string;
	jumpToLatest?: string;
	/** Name shown for a message whose author is not in `participants`. */
	unknownAuthor?: string;
	addReaction?: string;
	/** Accessible name of the reaction picker and of the reactions under a message. */
	reactions?: string;
	/** Accessible name of an emoji in the picker. */
	reactWith?: (emoji: string) => string;
	/** Accessible name of a reaction under a message. */
	reactionCount?: (emoji: string, count: number, includesYou: boolean) => string;
}

export interface ChatThreadHandle {
	scrollToBottom: (smooth?: boolean) => void;
	focusComposer: () => void;
}

export interface ChatThreadProps {
	ref?: ChatThreadHandle | null;
	participants: ChatParticipant[];
	currentUserId: string;
	/** Controlled messages, oldest first. Leave it out to let the thread keep its own list. */
	messages?: ChatMessage[];
	defaultMessages?: ChatMessage[];
	/** Participant ids currently typing. */
	typing?: string[];
	/** The last message each participant has read, by participant id. Their avatar sits under that message and glides as it moves. */
	readBy?: Record<string, string>;
	/** Called with the composer's text and files. Uncontrolled threads also append the message themselves. */
	onSend?: (draft: ChatDraft) => void | Promise<void>;
	onReact?: (messageId: string, emoji: string) => void;
	onRetry?: (messageId: string) => void;
	/** Emoji offered by the reaction picker. */
	reactions?: string[];
	placeholder?: string;
	/** Show the composer. Defaults to true. */
	composer?: boolean;
	allowAttachments?: boolean;
	/** File types the attach button offers, as for `<input accept>`. */
	accept?: string;
	/** Messages from one person closer together than this, in ms, share a group. Defaults to five minutes. */
	groupWindow?: number;
	locale?: string;
	/** Accessible name of the message log. */
	label?: string;
	/** Words for localization. Leave out any key to keep its English default. */
	labels?: ChatThreadLabels;
	class?: import('svelte/elements').ClassValue;
}

export interface ChatComposerProps {
	ref?: ChatComposerHandle | null;
	onSend: (draft: ChatDraft) => void;
	placeholder?: string;
	allowAttachments?: boolean;
	accept?: string;
	disabled?: boolean;
	/** Words for localization. Leave out any key to keep its English default. */
	labels?: ChatComposerLabels;
	class?: import('svelte/elements').ClassValue;
}

export interface ChatComposerHandle {
	focus: () => void;
}
