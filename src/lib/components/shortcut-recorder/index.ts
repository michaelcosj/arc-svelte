export { default as ShortcutRecorder } from './ShortcutRecorder.svelte';
export { default as ShortcutKbd, default as Kbd } from './ShortcutKbd.svelte';
export { default as ShortcutKeys } from './ShortcutKeys.svelte';
export { default as ShortcutList } from './ShortcutList.svelte';
export { usePlatform, usePressedKeys } from './shortcut-state.svelte';
export {
	keyId,
	normalizeShortcut,
	shortcutFromEvent,
	matchesShortcut,
	shortcutTokens,
	formatShortcut,
	type Platform,
	type ShortcutToken
} from './shortcut';
export type {
	ShortcutKbdProps,
	KbdProps,
	ShortcutKeysProps,
	ShortcutBinding,
	ShortcutRecorderProps,
	ShortcutListItem,
	ShortcutListGroup,
	ShortcutListProps
} from './types';
