import type { ClassValue, HTMLInputAttributes } from 'svelte/elements';
export interface PasswordRule {
	id: string;
	label: string;
	test: (password: string) => boolean;
	/** Characters still missing. Shown as a rolling count beside the rule while it is unmet. */
	remaining?: (password: string) => number;
}

export interface PasswordStrengthResult {
	level: 0 | 1 | 2 | 3 | 4;
	label: string;
	met: string[];
	/** True while the password is shorter than the short length, so the meter holds at its first step. */
	short?: boolean;
}

/** The strength words, one per meter step. Override them to translate the meter. */
export interface PasswordStrengthLevels {
	tooShort: string;
	weak: string;
	fair: string;
	good: string;
	strong: string;
}

/** Every user-facing string in PasswordStrength. All have English defaults; pass only the ones you change. */
export interface PasswordStrengthMessages {
	levels: PasswordStrengthLevels;
	/** Name of the show password toggle. It is a pressed toggle (aria-pressed), so the name stays the same in both states. */
	showPassword: string;
	/** Accessible name of the strength meter. */
	meterLabel: string;
	/** Meter value text while the field is empty. */
	noPassword: string;
	/** Accessible name of the requirements list. */
	rulesLabel: string;
	/** Read after a rule's label for screen readers, including any leading punctuation. */
	ruleMet: string;
	ruleNotMet: string;
	/** Words around the rolling count beside an unmet rule, as in "4 more". */
	remainingPrefix: string;
	remainingSuffix: string;
	/** The polite live-region summary read after each change. */
	summary: (result: { label: string; met: number; total: number }) => string;
}

export const defaultPasswordStrengthMessages: PasswordStrengthMessages = {
	levels: { tooShort: 'Too short', weak: 'Weak', fair: 'Fair', good: 'Good', strong: 'Strong' },
	showPassword: 'Show password',
	meterLabel: 'Password strength',
	noPassword: 'No password yet',
	rulesLabel: 'Password requirements',
	ruleMet: ', met',
	ruleNotMet: ', not met',
	remainingPrefix: '',
	remainingSuffix: 'more',
	summary: ({ label, met, total }) => `Strength: ${label}. ${met} of ${total} requirements met.`
};

/** Partial messages, with partial strength words, for the `messages` prop. */
export type PasswordStrengthMessagesInput = Partial<Omit<PasswordStrengthMessages, 'levels'>> & {
	levels?: Partial<PasswordStrengthLevels>;
};

/**
 * A new password field that shows how strong the password is while it is typed: four segments fill and change tone,
 * each rule checks off with a drawn tick, and the strength word morphs in place. Use it when creating or changing a password;
 * use a plain password field for sign in. Scoring happens on the device, nothing is sent anywhere.
 */
export interface PasswordStrengthProps extends Omit<
	HTMLInputAttributes,
	'type' | 'value' | 'defaultValue' | 'children' | 'onchange'
> {
	label: string;
	class?: ClassValue;
	ref?: HTMLInputElement | null;
	onchange?: (event: Event & { currentTarget: EventTarget & HTMLInputElement }) => void;
	value?: string;
	defaultValue?: string;
	onValueChange?: (value: string, strength: PasswordStrengthResult) => void;
	/** Rules to check. Strength is the share of rules met, spread over four steps. */
	rules?: PasswordRule[];
	/** Error copy tied to the field. The field shakes once each time a new error appears. */
	error?: string;
	revealed?: boolean;
	onRevealedChange?: (revealed: boolean) => void;
	/** Translated or reworded copy. Every string has an English default; see PasswordStrengthMessages. */
	messages?: PasswordStrengthMessagesInput;
	/** Below this many characters the meter holds at its first step and reads "Too short". Defaults to 8. */
	shortLength?: number;
	/** How characters are counted for shortLength. Defaults to code points, so an emoji counts once; pass `password => password.length` to count UTF-16 units like a server might. */
	countCharacters?: (password: string) => number;
}

/** Counts code points, so an emoji or other astral character counts as one. */
export const countCodePoints = (password: string) => Array.from(password).length;

/** Labels for the built-in rules. `length` receives the minimum length. */
export interface PasswordRuleLabels {
	length: (minLength: number) => string;
	case: string;
	number: string;
	symbol: string;
}

export interface PasswordRuleOptions {
	/** Characters the length rule asks for. Defaults to 12. */
	minLength?: number;
	/** Translated or reworded rule labels. */
	labels?: Partial<PasswordRuleLabels>;
	/** How the length rule counts characters. Defaults to code points. */
	countCharacters?: (password: string) => number;
}

const defaultRuleLabels: PasswordRuleLabels = {
	length: (minLength) => `At least ${minLength} characters`,
	case: 'Upper and lowercase letters',
	number: 'At least one number',
	symbol: 'At least one symbol'
};

/** The built-in rules (length, mixed case, number, symbol) with your own minimum length, labels and character count. */
export function createPasswordRules({
	minLength = 12,
	labels,
	countCharacters = countCodePoints
}: PasswordRuleOptions = {}): PasswordRule[] {
	const copy = { ...defaultRuleLabels, ...labels };
	return [
		{
			id: 'length',
			label: copy.length(minLength),
			test: (password) => countCharacters(password) >= minLength,
			remaining: (password) => Math.max(0, minLength - countCharacters(password))
		},
		{
			id: 'case',
			label: copy.case,
			test: (password) => /\p{Ll}/u.test(password) && /\p{Lu}/u.test(password)
		},
		{ id: 'number', label: copy.number, test: (password) => /\p{N}/u.test(password) },
		{ id: 'symbol', label: copy.symbol, test: (password) => /[^\p{L}\p{N}\s]/u.test(password) }
	];
}

export const defaultPasswordRules: PasswordRule[] = createPasswordRules();

export interface EstimateStrengthOptions {
	/** Below this many characters a password stays at the first step, however varied it is. Defaults to 8. */
	shortLength?: number;
	/** Strength words for the result's label. */
	levels?: Partial<PasswordStrengthLevels>;
	/** How characters are counted for shortLength. Defaults to code points. */
	countCharacters?: (password: string) => number;
}

/** Scores a password on the device: one step per share of rules met, capped at the first step while it is shorter than the short length (8 by default). */
export function estimateStrength(
	password: string,
	rules: PasswordRule[] = defaultPasswordRules,
	{ shortLength = 8, levels, countCharacters = countCodePoints }: EstimateStrengthOptions = {}
): PasswordStrengthResult {
	if (!password) return { level: 0, label: '', met: [] };
	const words = { ...defaultPasswordStrengthMessages.levels, ...levels };
	const met = rules.filter((rule) => rule.test(password)).map((rule) => rule.id);
	if (countCharacters(password) < shortLength)
		return { level: 1, label: words.tooShort, met, short: true };
	const level = Math.min(
		4,
		Math.max(1, Math.round((met.length / Math.max(rules.length, 1)) * 4))
	) as 1 | 2 | 3 | 4;
	return {
		level,
		label: [words.weak, words.fair, words.good, words.strong][level - 1] ?? words.weak,
		met
	};
}
