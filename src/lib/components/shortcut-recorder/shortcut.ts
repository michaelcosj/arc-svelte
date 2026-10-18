export type Platform = 'mac' | 'other';
export interface ShortcutToken {
	/** What the key cap shows. */ label: string;
	/** Physical key id, matched against held keys. */ id: string;
	spoken: string;
}

const MODIFIER_ORDER = ['mod', 'ctrl', 'alt', 'shift', 'meta'] as const;
type Modifier = (typeof MODIFIER_ORDER)[number];
const isModifier = (part: string): part is Modifier =>
	(MODIFIER_ORDER as readonly string[]).includes(part);

const CODE_KEYS: Record<string, string> = {
	Comma: ',',
	Period: '.',
	Slash: '/',
	Semicolon: ';',
	Quote: "'",
	BracketLeft: '[',
	BracketRight: ']',
	Backslash: '\\',
	Minus: '-',
	Equal: '=',
	Backquote: '`',
	Space: 'space',
	Enter: 'enter',
	NumpadEnter: 'enter',
	Escape: 'escape',
	Backspace: 'backspace',
	Delete: 'delete',
	Tab: 'tab',
	ArrowUp: 'up',
	ArrowDown: 'down',
	ArrowLeft: 'left',
	ArrowRight: 'right',
	Home: 'home',
	End: 'end',
	PageUp: 'pageup',
	PageDown: 'pagedown'
};
const MODIFIER_KEYS: Record<string, string> = {
	Meta: 'meta',
	OS: 'meta',
	Control: 'ctrl',
	Alt: 'alt',
	AltGraph: 'alt',
	Shift: 'shift'
};

/** The physical key id for an event: "k", "1", "enter", "meta", "shift"… `null` for keys that never make a shortcut, such as Caps Lock. */
export function keyId(event: Pick<KeyboardEvent, 'key' | 'code'>): string | null {
	const { code, key } = event;
	if (MODIFIER_KEYS[key]) return MODIFIER_KEYS[key];
	if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
	if (/^Digit\d$/.test(code)) return code.slice(5);
	if (/^Numpad\d$/.test(code)) return code.slice(6);
	if (CODE_KEYS[code]) return CODE_KEYS[code];
	if (/^F\d{1,2}$/.test(key)) return key.toLowerCase();
	if (
		key === 'CapsLock' ||
		key === 'Fn' ||
		key === 'Dead' ||
		key === 'Unidentified' ||
		key === 'Process'
	)
		return null;
	return key.length === 1 ? key.toLowerCase() : null;
}

export function splitShortcut(shortcut: string) {
	const parts = shortcut
		.toLowerCase()
		.split('+')
		.map((part) => part.trim())
		.filter(Boolean);
	const key = parts.filter((part) => !isModifier(part)).pop() ?? '';
	return { mods: new Set(parts.filter(isModifier)), key };
}

/** One spelling per combination: on a Mac, Command is `mod`; elsewhere, Ctrl is. Modifiers come in a fixed order. */
export function normalizeShortcut(shortcut: string, platform: Platform) {
	const { mods, key } = splitShortcut(shortcut);
	if (platform === 'mac' && mods.delete('meta')) mods.add('mod');
	if (platform === 'other' && mods.delete('ctrl')) mods.add('mod');
	return [...MODIFIER_ORDER.filter((mod) => mods.has(mod)), key].filter(Boolean).join('+');
}

/** Reads a keydown into a shortcut string, or `null` while only modifiers are down. */
export function shortcutFromEvent(
	event: Pick<KeyboardEvent, 'key' | 'code' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>,
	platform: Platform
) {
	const key = keyId(event);
	if (!key || ['meta', 'ctrl', 'alt', 'shift'].includes(key)) return null;
	const mods: string[] = [];
	if (platform === 'mac' ? event.metaKey : event.ctrlKey) mods.push('mod');
	if (platform === 'mac' ? event.ctrlKey : false) mods.push('ctrl');
	if (event.altKey) mods.push('alt');
	if (event.shiftKey) mods.push('shift');
	if (platform === 'other' && event.metaKey) mods.push('meta');
	return normalizeShortcut([...mods, key].join('+'), platform);
}

/** True when a keydown is this shortcut. Use it to run the action a recorded shortcut is bound to. */
export function matchesShortcut(
	event: Pick<KeyboardEvent, 'key' | 'code' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>,
	shortcut: string,
	platform: Platform
) {
	const pressed = shortcutFromEvent(event, platform);
	return !!pressed && pressed === normalizeShortcut(shortcut, platform);
}

const MAC_KEYS: Record<string, [string, string]> = {
	enter: ['↩', 'Return'],
	backspace: ['⌫', 'Delete'],
	delete: ['⌦', 'Forward delete'],
	tab: ['⇥', 'Tab'],
	escape: ['esc', 'Escape']
};
const SHARED_KEYS: Record<string, [string, string]> = {
	space: ['Space', 'Space'],
	enter: ['Enter', 'Enter'],
	escape: ['Esc', 'Escape'],
	backspace: ['Backspace', 'Backspace'],
	delete: ['Del', 'Delete'],
	tab: ['Tab', 'Tab'],
	up: ['↑', 'Up arrow'],
	down: ['↓', 'Down arrow'],
	left: ['←', 'Left arrow'],
	right: ['→', 'Right arrow'],
	home: ['Home', 'Home'],
	end: ['End', 'End'],
	pageup: ['PgUp', 'Page up'],
	pagedown: ['PgDn', 'Page down'],
	',': [',', 'Comma'],
	'.': ['.', 'Period'],
	'/': ['/', 'Slash'],
	';': [';', 'Semicolon'],
	"'": ["'", 'Quote'],
	'[': ['[', 'Left bracket'],
	']': [']', 'Right bracket'],
	'\\': ['\\', 'Backslash'],
	'-': ['-', 'Minus'],
	'=': ['=', 'Equals'],
	'`': ['`', 'Backtick']
};

/** Key caps for a shortcut in platform order: ⌃ ⌥ ⇧ ⌘ on a Mac, Ctrl Alt Shift Win elsewhere. */
export function shortcutTokens(shortcut: string, platform: Platform): ShortcutToken[] {
	const { mods, key } = splitShortcut(normalizeShortcut(shortcut, platform));
	const tokens: ShortcutToken[] = [];
	if (platform === 'mac') {
		if (mods.has('ctrl')) tokens.push({ label: '⌃', id: 'ctrl', spoken: 'Control' });
		if (mods.has('alt')) tokens.push({ label: '⌥', id: 'alt', spoken: 'Option' });
		if (mods.has('shift')) tokens.push({ label: '⇧', id: 'shift', spoken: 'Shift' });
		if (mods.has('mod') || mods.has('meta'))
			tokens.push({ label: '⌘', id: 'meta', spoken: 'Command' });
	} else {
		if (mods.has('mod') || mods.has('ctrl'))
			tokens.push({ label: 'Ctrl', id: 'ctrl', spoken: 'Control' });
		if (mods.has('alt')) tokens.push({ label: 'Alt', id: 'alt', spoken: 'Alt' });
		if (mods.has('shift')) tokens.push({ label: 'Shift', id: 'shift', spoken: 'Shift' });
		if (mods.has('meta')) tokens.push({ label: 'Win', id: 'meta', spoken: 'Windows' });
	}
	if (key) {
		const named = (platform === 'mac' ? MAC_KEYS[key] : undefined) ?? SHARED_KEYS[key];
		tokens.push(
			named
				? { label: named[0], id: key, spoken: named[1] }
				: { label: key.toUpperCase(), id: key, spoken: key.toUpperCase() }
		);
	}
	return tokens;
}

/** "⌘⇧K" on a Mac, "Ctrl+Shift+K" elsewhere, plus a spoken form for assistive technology. */
export function formatShortcut(shortcut: string, platform: Platform) {
	const tokens = shortcutTokens(shortcut, platform);
	return {
		text: tokens.map((token) => token.label).join(platform === 'mac' ? '' : '+'),
		spoken: tokens.map((token) => token.spoken).join(' ')
	};
}

export const RESERVED: { shortcut: string; label: string }[] = [
	{ shortcut: 'mod+w', label: 'Close tab' },
	{ shortcut: 'mod+t', label: 'New tab' },
	{ shortcut: 'mod+n', label: 'New window' },
	{ shortcut: 'mod+q', label: 'Quit' },
	{ shortcut: 'mod+l', label: 'Address bar' },
	{ shortcut: 'mod+r', label: 'Reload' },
	{ shortcut: 'mod+shift+t', label: 'Reopen tab' },
	{ shortcut: 'mod+c', label: 'Copy' },
	{ shortcut: 'mod+v', label: 'Paste' },
	{ shortcut: 'mod+x', label: 'Cut' },
	{ shortcut: 'mod+z', label: 'Undo' },
	{ shortcut: 'mod+a', label: 'Select all' }
];
