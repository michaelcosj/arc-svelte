import type { ChatMessage, ChatComposerLabels, ChatThreadLabels } from './types';
export const COMPOSER_LABELS: Required<ChatComposerLabels> = {
	send: 'Send',
	attach: 'Attach files',
	attachments: 'Attachments',
	removeFile: (name) => `Remove ${name}`
};

const firstName = (name: string) => name.split(' ')[0];
export const THREAD_LABELS: Omit<Required<ChatThreadLabels>, 'today' | 'yesterday'> = {
	...COMPOSER_LABELS,
	sending: 'Sending',
	sent: 'Sent',
	delivered: 'Delivered',
	read: 'Read',
	failed: 'Not delivered',
	retry: 'Retry',
	readBy: (names) => `Read by ${names.join(', ')}`,
	typing: (names) =>
		names.length === 1
			? `${firstName(names[0]!)} is typing`
			: names.length === 2
				? `${firstName(names[0]!)} and ${firstName(names[1]!)} are typing`
				: 'Several people are typing',
	newMessages: (count) => `${count} new ${count === 1 ? 'message' : 'messages'}`,
	jumpToLatest: 'Jump to latest',
	unknownAuthor: 'Unknown',
	addReaction: 'Add reaction',
	reactions: 'Reactions',
	reactWith: (emoji) => `React with ${emoji}`,
	reactionCount: (emoji, count, includesYou) =>
		`${emoji} ${count}${includesYou ? ', including you' : ''}`
};

/** A key passed as undefined keeps its default too. */
export const withDefaults = <T extends object, D extends object>(defaults: D, given?: T): D => ({
	...defaults,
	...Object.fromEntries(Object.entries(given ?? {}).filter(([, value]) => value !== undefined))
});

/** "Today" and "Yesterday" in the thread's language, from Intl, with a capital first letter. */
export function relativeDay(locale: string, offset: 0 | -1) {
	const word = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(offset, 'day');
	return word.charAt(0).toLocaleUpperCase(locale) + word.slice(1);
}

export const toDate = (value: ChatMessage['createdAt']) =>
	value instanceof Date ? value : new Date(value);
export const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

export function dayLabel(date: Date, locale: string, words: { today: string; yesterday: string }) {
	const today = new Date();
	const start = (value: Date) =>
		new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
	const days = Math.round((start(today) - start(date)) / 86_400_000);
	if (days === 0) return words.today;
	if (days === 1) return words.yesterday;
	if (days > 1 && days < 7) return date.toLocaleDateString(locale, { weekday: 'long' });
	return date.toLocaleDateString(locale, {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric'
	});
}

export function formatBytes(bytes = 0) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 ** 2) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export function initials(name: string) {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join('');
}
