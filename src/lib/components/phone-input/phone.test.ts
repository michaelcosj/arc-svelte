import { describe, expect, it } from 'vite-plus/test';
import {
	PHONE_COUNTRIES,
	BY_ISO,
	formatNational,
	parsePhoneNumber,
	formatPhoneNumber,
	statusOf,
	capDigits,
	toE164,
	flagOf,
	matchesQuery,
	caretAfterDigits
} from './phone';

describe('phone-input countries and formatting', () => {
	it('validates and round trips all 49 built-in examples', () => {
		expect(PHONE_COUNTRIES).toHaveLength(49);
		for (const country of PHONE_COUNTRIES) {
			expect(statusOf(country, country.example), country.iso).toBe('valid');
			expect(parsePhoneNumber(toE164(country, country.example))?.national, country.iso).toBe(
				country.example
			);
			expect(formatPhoneNumber(toE164(country, country.example)), country.iso).toBe(
				`+${country.dial} ${formatNational(country, country.example)}`
			);
		}
	});

	it('selects Canada for its shared +1 area codes and respects a restricted pool', () => {
		expect(parsePhoneNumber('+14165550123')?.country.iso).toBe('CA');
		expect(parsePhoneNumber('+12015550123')?.country.iso).toBe('US');
		expect(parsePhoneNumber('+14165550123', [BY_ISO.get('US')!])?.country.iso).toBe('US');
		expect(parsePhoneNumber('+447911123456', [BY_ISO.get('US')!])).toBeNull();
	});

	it('normalizes international prefixes and an optional full-number trunk', () => {
		for (const input of ['+44 (0)7911 123456', '0044 7911 123456']) {
			const parsed = parsePhoneNumber(input);
			expect(parsed?.country.iso).toBe('GB');
			expect(parsed?.national).toBe('7911123456');
		}
		const country = BY_ISO.get('GB')!;
		expect(parsePhoneNumber('07911123456')).toBeNull();
		expect(formatNational(country, '07911123456')).toBe('07911 123456');
		expect(toE164(country, '07911123456')).toBe('+447911123456');
	});

	it('avoids trailing separators in partial formats and caps national digits', () => {
		const country = BY_ISO.get('US')!;
		expect(formatNational(country, '201')).toBe('(201');
		expect(formatNational(country, '2015')).toBe('(201) 5');
		expect(capDigits(country, '2015550123456789')).toBe('2015550123');
		expect(statusOf(country, '201')).toBe('incomplete');
		expect(statusOf(country, '')).toBe('empty');
		expect(statusOf(country, '20155501234')).toBe('too-long');
	});

	it('filters country names/codes and restores digit-based caret positions', () => {
		const country = BY_ISO.get('GB')!;
		expect(matchesQuery(country, '+44')).toBe(true);
		expect(matchesQuery(country, 'kingdom')).toBe(true);
		expect(matchesQuery(country, 'gb')).toBe(true);
		expect(matchesQuery(country, '+1')).toBe(false);
		expect(caretAfterDigits('(201) 5', 0)).toBe(1);
		expect(caretAfterDigits('(201) 5', 3)).toBe(4);
		expect(caretAfterDigits('(201) 5', 4)).toBe(7);
		expect(flagOf('US')).toBe('🇺🇸');
	});

	it('preserves empty/trunk-only states and unreadable external strings', () => {
		const country = BY_ISO.get('GB')!;
		expect(statusOf(country, '0')).toBe('empty');
		expect(toE164(country, '0')).toBe('');
		expect(formatNational(country, '0')).toBe('0');
		expect(parsePhoneNumber('+999123456')).toBeNull();
		expect(formatPhoneNumber('not a number')).toBe('not a number');
	});
});
