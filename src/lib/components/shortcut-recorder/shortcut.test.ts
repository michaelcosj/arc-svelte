import { expect, it } from 'vite-plus/test';
import { shortcutFromEvent, normalizeShortcut, shortcutTokens, matchesShortcut } from './shortcut';
it('uses physical keys for modified international input', () => {
	expect(
		shortcutFromEvent(
			{ key: '˚', code: 'KeyK', metaKey: false, ctrlKey: false, altKey: true, shiftKey: false },
			'mac'
		)
	).toBe('alt+k');
});
it('normalizes the primary modifier and speaks platform-specific keys', () => {
	expect(normalizeShortcut('shift+meta+k', 'mac')).toBe('mod+shift+k');
	expect(normalizeShortcut('ctrl+shift+k', 'other')).toBe('mod+shift+k');
	expect(shortcutTokens('mod+backspace', 'mac').map((k) => k.spoken)).toEqual([
		'Command',
		'Delete'
	]);
});
it('matches only the full recorded chord', () => {
	const e = {
		key: 'k',
		code: 'KeyK',
		metaKey: false,
		ctrlKey: true,
		altKey: false,
		shiftKey: true
	};
	expect(matchesShortcut(e, 'mod+shift+k', 'other')).toBe(true);
	expect(matchesShortcut(e, 'mod+k', 'other')).toBe(false);
});
