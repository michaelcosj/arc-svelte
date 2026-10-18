import { describe, expect, it } from 'vite-plus/test';
import {
	currencyInfo,
	localeSymbols,
	toMinor,
	fromMinor,
	settle,
	convertDraft,
	displayOf,
	partsOf,
	positionAfter
} from './format';

describe('money-input formatting', () => {
	it('round trips minor units for zero-, two- and three-digit currencies', () => {
		for (const digits of [0, 2, 3]) {
			for (const minor of [0, 1, 10, 1250, 99999999]) {
				expect(toMinor(fromMinor(minor, digits), digits)).toBe(minor);
			}
		}
		expect(toMinor('', 2)).toBeNull();
		expect(settle('00012.5', 2)).toBe('12.50');
	});

	it('uses currency precision and localized symbol placement', () => {
		expect(currencyInfo('JPY', 'en-US').digits).toBe(0);
		expect(currencyInfo('KWD', 'en-US').digits).toBe(3);
		expect(currencyInfo('EUR', 'de-DE').position).toBe('suffix');
	});

	it('preserves major amounts when converting currency precision', () => {
		expect(convertDraft('1234.56', 0)).toBe('1234');
		expect(convertDraft('12.345', 2)).toBe('12.34');
		expect(settle(convertDraft('1234', 2), 2)).toBe('1234.00');
		expect(convertDraft('', 2)).toBe('');
	});

	it('groups localized display without losing the significant-character caret', () => {
		const symbols = localeSymbols('de-DE');
		expect(symbols).toEqual({ group: '.', decimal: ',' });
		expect(displayOf('1234.5', symbols)).toBe('1.234,5');
		expect(positionAfter('1.234,5', 4, ',')).toBe(5);
		expect(positionAfter('1.234,5', 5, ',')).toBe(6);
		expect(positionAfter('1.234,5', 0, ',')).toBe(0);
		expect(positionAfter('1.234,5', Number.MAX_SAFE_INTEGER, ',')).toBe(7);
	});

	it('keeps place-value keys and reserves ghost cents', () => {
		const symbols = localeSymbols('en-US');
		const before = partsOf('9', 2, symbols);
		const after = partsOf('10', 2, symbols);
		expect(before.find((part) => part.key === 'i0')?.char).toBe('9');
		expect(after.find((part) => part.key === 'i0')?.char).toBe('0');
		expect(before.filter((part) => part.ghost)).toHaveLength(3);
		expect(partsOf('9.5', 2, symbols).find((part) => part.key === 'f1')?.ghost).toBe(true);
	});

	it('keeps an empty draft distinct from zero and pads settled fractions', () => {
		expect(fromMinor(null, 2)).toBe('');
		expect(fromMinor(undefined, 2)).toBe('');
		expect(fromMinor(Number.NaN, 2)).toBe('');
		expect(fromMinor(0, 2)).toBe('0.00');
		expect(toMinor('0.', 2)).toBe(0);
		expect(settle('12.', 2)).toBe('12.00');
		expect(settle('', 2)).toBe('');
	});
});
