export interface CommentAuthor {
	id: string;
	name: string;
	/** Square image URL. Initials are shown without one. */
	avatar?: string;
}

export interface CommentReaction {
	emoji: string;
	/** Ids of the people who reacted. */
	users: string[];
}

export interface ThreadComment {
	id: string;
	author: CommentAuthor;
	/** Plain text. "@Full Name" mentions of known people are highlighted. */
	body: string;
	/** Display label such as "2h" or "Sep 18". */
	createdAt: string;
	edited?: boolean;
	/** A deleted comment that still has replies keeps its place as a quiet placeholder. */
	deleted?: boolean;
	reactions?: CommentReaction[];
	replies?: ThreadComment[];
}

/** What changed, for syncing to a server. `comments` on `onCommentsChange` is always the full next tree. */
export type CommentThreadEvent =
	| { type: 'reply'; comment: ThreadComment; parentId: string | null }
	| { type: 'edit'; id: string; body: string }
	| { type: 'delete'; id: string }
	| { type: 'react'; id: string; emoji: string; added: boolean };

/** Every word the thread shows or announces. Each one has an English default; words with a count or a name are functions, so an app can apply its own plural rules. */
export interface CommentThreadLabels {
	/** Accessible name of the whole thread. */
	thread?: string;
	/** Header and resolved chip, such as "3 comments". */
	commentCount?: (count: number) => string;
	/** Resolved chip, such as "2 people". */
	peopleCount?: (count: number) => string;
	resolve?: string;
	/** Title of the resolved chip. */
	resolved?: string;
	reopen?: string;
	/** Shown when there are no comments. */
	empty?: string;
	reply?: string;
	edit?: string;
	delete?: string;
	cancel?: string;
	send?: string;
	/** Saves an edit. */
	save?: string;
	/** Placeholder and accessible name of the edit field. */
	editComment?: string;
	/** After the time of an edited comment. */
	edited?: string;
	deleteConfirm?: string;
	/** Placeholder text of a deleted comment that still has replies. */
	deletedText?: string;
	/** Accessible name of that placeholder. */
	deletedComment?: string;
	/** Above the composer while replying. The name inside it is highlighted. */
	replyingTo?: (name: string) => string;
	cancelReply?: string;
	showReplies?: (count: number) => string;
	hideReplies?: string;
	addReaction?: string;
	closeReactions?: string;
	/** Accessible name of the reaction picker. */
	reactions?: string;
	/** Accessible name of an emoji in the picker. */
	reactWith?: (emoji: string) => string;
	/** Accessible name of a reaction under a comment. */
	reactionCount?: (emoji: string, count: number, includesYou: boolean) => string;
	/** Accessible name of the @mention suggestions. */
	mentions?: string;
}

/**
 * A threaded discussion: replies nest under their comment and collapse, reactions toggle with a count that rolls,
 * authors edit and delete their own comments in place, mentions autocomplete in the composer, and resolving folds the
 * whole thread into a single chip that reopens it. Controlled with `comments` and `resolved`, or uncontrolled.
 */
export interface CommentThreadProps {
	comments?: ThreadComment[];
	defaultComments?: ThreadComment[];
	onCommentsChange?: (comments: ThreadComment[], event: CommentThreadEvent) => void;
	/** The person writing. Their comments can be edited and deleted. */
	currentUser: CommentAuthor;
	/** People who can be mentioned. Defaults to everyone in the thread. */
	people?: CommentAuthor[];
	resolved?: boolean;
	defaultResolved?: boolean;
	onResolvedChange?: (resolved: boolean) => void;
	/** What the thread is about, shown in its header, such as "Hero headline". */
	title?: string | import('svelte').Snippet;
	/** Emoji offered by the reaction picker. */
	reactions?: string[];
	placeholder?: string;
	/** Replies deeper than this attach to the deepest allowed parent. Defaults to 2. */
	maxDepth?: number;
	/** Label for comments written now. */
	nowLabel?: string;
	/** Words for localization. Leave out any key to keep its English default. */
	labels?: CommentThreadLabels;
	class?: import('svelte/elements').ClassValue;
	ref?: HTMLElement | null;
}
