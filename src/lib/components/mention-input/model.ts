import type { Mention, MentionValue, MentionKind } from './types';
export type Suggestion =
	| { kind: 'person'; item: import('./types').MentionPerson }
	| { kind: 'channel'; item: import('./types').MentionChannel };
export type Trigger = { kind: MentionKind; start: number; query: string };
export const EMPTY: MentionValue = { text: '', mentions: [] };
export const SYMBOL: Record<MentionKind, string> = { person: '@', channel: '#' };
export const mentionText = (kind: MentionKind, label: string) => `${SYMBOL[kind]}${label}`;

/** Turns a value into storage friendly text, `<@id>` for people and `<#id>` for channels by default. */
export function serializeMentions(
	value: MentionValue,
	format: (mention: Mention) => string = (mention) => `<${SYMBOL[mention.kind]}${mention.id}>`
) {
	let out = '',
		at = 0;
	for (const mention of [...value.mentions].sort((a, b) => a.start - b.start)) {
		out += value.text.slice(at, mention.start) + format(mention);
		at = mention.end;
	}
	return out + value.text.slice(at);
}

/** Moves mentions along with an edit and drops any the edit touched. `hint` is the caret before the edit, which settles repeated characters. */
export function reconcile(previous: MentionValue, text: string, hint: number): Mention[] {
	const a = previous.text;
	let prefix = 0;
	const maxPrefix = Math.min(a.length, text.length, Math.max(0, hint));
	while (prefix < maxPrefix && a[prefix] === text[prefix]) prefix++;
	let suffix = 0;
	while (
		suffix < a.length - prefix &&
		suffix < text.length - prefix &&
		a[a.length - 1 - suffix] === text[text.length - 1 - suffix]
	)
		suffix++;
	const oldEnd = a.length - suffix,
		delta = text.length - a.length;
	return previous.mentions
		.flatMap((mention) => {
			if (mention.end <= prefix) return [mention];
			if (mention.start >= oldEnd)
				return [{ ...mention, start: mention.start + delta, end: mention.end + delta }];
			return [];
		})
		.filter(
			(mention) =>
				text.slice(mention.start, mention.end) === mentionText(mention.kind, mention.label)
		);
}

export function findTrigger(
	text: string,
	caret: number,
	mentions: Mention[],
	kinds: Record<MentionKind, boolean>
): Trigger | null {
	for (let index = caret - 1; index >= 0 && index >= caret - 48; index--) {
		const char = text[index];
		if (char === '\n') return null;
		if (char !== '@' && char !== '#') continue;
		const kind: MentionKind = char === '@' ? 'person' : 'channel';
		if (!kinds[kind]) return null;
		if (index > 0 && !/[\s([{"']/.test(text[index - 1]!)) return null;
		if (mentions.some((mention) => index >= mention.start && index < mention.end)) return null;
		const query = text.slice(index + 1, caret);
		const shape = kind === 'person' ? /^[^\s@#]*( [^\s@#]*)?$/ : /^[^\s@#]*$/;
		return shape.test(query) ? { kind, start: index, query } : null;
	}
	return null;
}

export function rank(label: string, extra: string, query: string) {
	const name = label.toLowerCase();
	if (!query) return 1;
	if (name.startsWith(query)) return 4;
	if (name.split(/[\s\-_.]+/).some((word) => word.startsWith(query))) return 3;
	if (name.includes(query)) return 2;
	return extra.toLowerCase().includes(query) ? 1 : 0;
}

export function initials(name: string) {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join('');
}
