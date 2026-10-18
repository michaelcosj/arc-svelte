import { describe, expect, it } from 'vite-plus/test';
import { findTrigger, reconcile, serializeMentions, mentionText, rank } from './model';
import type { MentionValue } from './types';

describe('mention edits', () => {
	const value: MentionValue = {
		text: 'Hi @Ava Chen in #launch',
		mentions: [
			{ kind: 'person', id: 'ava', label: 'Ava Chen', start: 3, end: 12 },
			{ kind: 'channel', id: 'launch', label: 'launch', start: 16, end: 23 }
		]
	};
	it('moves untouched tokens and drops the token an edit touches', () => {
		expect(reconcile(value, 'Hello @Ava Chen in #launch', 2)).toEqual(
			value.mentions.map((m) => ({ ...m, start: m.start + 3, end: m.end + 3 }))
		);
		expect(reconcile(value, 'Hi @Ava Chan in #launch', 10)).toEqual([value.mentions[1]]);
		expect(reconcile(value, 'Hi  in #launch', 12)).toEqual([
			{ ...value.mentions[1], start: 7, end: 14 }
		]);
	});
	it('uses the caret hint to disambiguate repeated characters at token boundaries', () => {
		const repeated: MentionValue = {
			text: '@a',
			mentions: [{ kind: 'person', id: 'a', label: 'a', start: 0, end: 2 }]
		};
		expect(reconcile(repeated, '@aa', 2)).toEqual(repeated.mentions);
		expect(reconcile(repeated, '@aa', 1)).toEqual([]);
	});
	it('serializes offsets in order and supports application storage formats', () => {
		expect(serializeMentions({ ...value, mentions: [...value.mentions].reverse() })).toBe(
			'Hi <@ava> in <#launch>'
		);
		expect(serializeMentions(value, (m) => `[${m.kind}:${m.id}]`)).toBe(
			'Hi [person:ava] in [channel:launch]'
		);
		expect(mentionText('person', 'Zoë 🦊')).toBe('@Zoë 🦊');
	});
});
it('detects enabled triggers at word boundaries without reopening inside tokens', () => {
	const enabled = { person: true, channel: true };
	expect(findTrigger('(@Ava C', 7, [], enabled)).toEqual({
		kind: 'person',
		start: 1,
		query: 'Ava C'
	});
	for (const text of ['mail@ava', '@Ava Chen more', '#two words', '@ava\nhello'])
		expect(findTrigger(text, text.length, [], enabled)).toBeNull();
	expect(
		findTrigger('@a', 2, [{ kind: 'person', id: 'a', label: 'a', start: 0, end: 2 }], enabled)
	).toBeNull();
	expect(findTrigger('#launch', 7, [], { person: true, channel: false })).toBeNull();
	expect(rank('Ava Chen', 'Designer', 'ava')).toBeGreaterThan(rank('Chen Ava', 'Designer', 'ava'));
	expect(rank('Ava Chen', 'Designer', 'designer')).toBe(1);
});
