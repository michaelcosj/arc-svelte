export type Part = { key: string; char: string; ghost: boolean };
export type CurrencyInfo = {
	code: string;
	symbol: string;
	position: 'prefix' | 'suffix';
	digits: number;
	name: string;
	whole: Intl.NumberFormat;
	full: Intl.NumberFormat;
};

const infoCache = new Map<string, CurrencyInfo>();
export function currencyInfo(code: string, locale: string): CurrencyInfo {
	const cacheKey = `${locale}:${code}`;
	const cached = infoCache.get(cacheKey);
	if (cached) return cached;
	const full = new Intl.NumberFormat(locale, {
		style: 'currency',
		currency: code,
		currencyDisplay: 'narrowSymbol',
		numberingSystem: 'latn'
	});
	const parts = full.formatToParts(1);
	const symbolAt = parts.findIndex((part) => part.type === 'currency'),
		numberAt = parts.findIndex((part) => part.type === 'integer');
	const digits = full.resolvedOptions().maximumFractionDigits ?? 2;
	let name = code;
	try {
		name = new Intl.DisplayNames([locale], { type: 'currency' }).of(code) ?? code;
	} catch {
		/* older engines keep the code */
	}
	const info: CurrencyInfo = {
		code,
		symbol: parts[symbolAt]?.value ?? code,
		position: symbolAt < numberAt ? 'prefix' : 'suffix',
		digits,
		name: name.charAt(0).toUpperCase() + name.slice(1),
		full,
		whole: new Intl.NumberFormat(locale, {
			style: 'currency',
			currency: code,
			currencyDisplay: 'narrowSymbol',
			maximumFractionDigits: 0,
			numberingSystem: 'latn'
		})
	};
	infoCache.set(cacheKey, info);
	return info;
}

export function localeSymbols(locale: string) {
	const parts = new Intl.NumberFormat(locale, { numberingSystem: 'latn' }).formatToParts(12345.6);
	return {
		group: parts.find((part) => part.type === 'group')?.value ?? ',',
		decimal: parts.find((part) => part.type === 'decimal')?.value ?? '.'
	};
}

/* A draft is the amount as typed in a canonical form: digits with an optional ".", such as "1234.5". */
export const pow10 = (digits: number) => 10 ** digits;
export function toMinor(draft: string, digits: number): number | null {
	if (!draft) return null;
	const [whole, fraction = ''] = draft.split('.');
	return (
		Number(whole || '0') * pow10(digits) +
		Number(fraction.padEnd(digits, '0').slice(0, digits) || '0')
	);
}
export function fromMinor(minor: number | null | undefined, digits: number) {
	if (minor === null || minor === undefined || !Number.isFinite(minor)) return '';
	const text = String(Math.round(Math.abs(minor))).padStart(digits + 1, '0');
	return digits
		? `${text.slice(0, text.length - digits)}.${text.slice(text.length - digits)}`
		: text;
}
/** Settles a draft the way it will be read back: fraction padded to the currency, leading zeros gone. */
export function settle(draft: string, digits: number) {
	return draft ? fromMinor(toMinor(draft, digits), digits) : '';
}
/** Carries an amount across currencies with different minor units, keeping the major amount. */
export function convertDraft(draft: string, digits: number) {
	if (!draft) return '';
	const [whole = '', fraction] = draft.split('.');
	if (!digits) return whole || '0';
	return fraction === undefined ? whole : `${whole}.${fraction.slice(0, digits)}`;
}

function groupInteger(whole: string, group: string) {
	return whole.replace(/\B(?=(\d{3})+(?!\d))/g, group);
}
export function displayOf(draft: string, symbols: { group: string; decimal: string }) {
	if (!draft) return '';
	const [whole = '', fraction] = draft.split('.');
	return (
		groupInteger(whole, symbols.group) + (fraction !== undefined ? symbols.decimal + fraction : '')
	);
}

/** Columns keyed by place value, so 9 → 10 keeps the ones column the ones column. Missing fraction digits are ghosts that hold their width. */
export function partsOf(
	draft: string,
	digits: number,
	symbols: { group: string; decimal: string }
): Part[] {
	const [whole = '', fraction] = draft ? draft.split('.') : [];
	const parts: Part[] = [];
	const intDigits = whole || '0';
	const ghostInt = !whole;
	Array.from(intDigits).forEach((char, index) => {
		const place = intDigits.length - 1 - index;
		parts.push({ key: `i${place}`, char, ghost: ghostInt });
		if (place > 0 && place % 3 === 0)
			parts.push({ key: `g${place}`, char: symbols.group, ghost: ghostInt });
	});
	if (digits) {
		parts.push({ key: 'd', char: symbols.decimal, ghost: fraction === undefined });
		for (let index = 0; index < digits; index++)
			parts.push({
				key: `f${index}`,
				char: fraction?.[index] ?? '0',
				ghost: fraction === undefined || index >= fraction.length
			});
	}
	return parts;
}

export const isSignificant = (char: string, decimal: string) => /\d/.test(char) || char === decimal;
export function positionAfter(text: string, count: number, decimal: string) {
	if (count <= 0) return 0;
	let seen = 0;
	for (let index = 0; index < text.length; index++)
		if (isSignificant(text[index]!, decimal) && ++seen === count) return index + 1;
	return text.length;
}
