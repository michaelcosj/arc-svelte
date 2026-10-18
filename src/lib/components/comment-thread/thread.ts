import type { ThreadComment, CommentAuthor, CommentThreadLabels } from './types';
export const DEFAULT_LABELS: Required<CommentThreadLabels> = {
	thread: 'Comment thread',
	commentCount: (count) => `${count} ${count === 1 ? 'comment' : 'comments'}`,
	peopleCount: (count) => `${count} ${count === 1 ? 'person' : 'people'}`,
	resolve: 'Resolve',
	resolved: 'Resolved',
	reopen: 'Reopen',
	empty: 'No comments yet. Start the conversation below.',
	reply: 'Reply',
	edit: 'Edit',
	delete: 'Delete',
	cancel: 'Cancel',
	send: 'Send',
	save: 'Save',
	editComment: 'Edit comment',
	edited: 'edited',
	deleteConfirm: 'Delete this comment?',
	deletedText: 'This comment was deleted',
	deletedComment: 'Deleted comment',
	replyingTo: (name) => `Replying to ${name}`,
	cancelReply: 'Cancel reply',
	showReplies: (count) => `Show ${count} ${count === 1 ? 'reply' : 'replies'}`,
	hideReplies: 'Hide replies',
	addReaction: 'Add reaction',
	closeReactions: 'Close reactions',
	reactions: 'Reactions',
	reactWith: (emoji) => `React with ${emoji}`,
	reactionCount: (emoji, count, includesYou) =>
		`${emoji} ${count}${includesYou ? ', including you' : ''}`,
	mentions: 'People'
};

/** A key passed as undefined keeps its default too. */
export const withDefaults = <T extends object>(defaults: Required<T>, given?: T): Required<T> => ({
	...defaults,
	...Object.fromEntries(Object.entries(given ?? {}).filter(([, value]) => value !== undefined))
});

export const mapTree = (
	list: ThreadComment[],
	id: string,
	fn: (comment: ThreadComment) => ThreadComment | null
): ThreadComment[] =>
	list.flatMap((comment) => {
		if (comment.id === id) {
			const next = fn(comment);
			return next ? [next] : [];
		}
		return comment.replies?.length
			? [{ ...comment, replies: mapTree(comment.replies, id, fn) }]
			: [comment];
	});
export const countTree = (list: ThreadComment[]): number =>
	list.reduce(
		(sum, comment) => sum + (comment.deleted ? 0 : 1) + countTree(comment.replies ?? []),
		0
	);
export const authorsOf = (list: ThreadComment[], into = new Map<string, CommentAuthor>()) => {
	list.forEach((comment) => {
		if (!comment.deleted) into.set(comment.author.id, comment.author);
		authorsOf(comment.replies ?? [], into);
	});
	return into;
};
/** Path of ids from the root to `id`. */
export const pathTo = (
	list: ThreadComment[],
	id: string,
	trail: string[] = []
): string[] | null => {
	for (const comment of list) {
		if (comment.id === id) return [...trail, id];
		const found = pathTo(comment.replies ?? [], id, [...trail, comment.id]);
		if (found) return found;
	}
	return null;
};
export const find = (list: ThreadComment[], id: string): ThreadComment | null => {
	for (const comment of list) {
		if (comment.id === id) return comment;
		const found = find(comment.replies ?? [], id);
		if (found) return found;
	}
	return null;
};
