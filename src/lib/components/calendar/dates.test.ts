import { describe, expect, it } from 'vite-plus/test';
import {
	addDays,
	addMonths,
	dateKey,
	fromIndex,
	makeWeeks,
	monthIndex,
	shiftMonths,
	toNative,
	toValue
} from './dates';

describe('calendar date boundaries', () => {
	it('clamps month navigation to the last valid day, including leap years', () => {
		expect(dateKey(shiftMonths(new Date(2024, 0, 31), 1))).toBe('2024-02-29');
		expect(dateKey(shiftMonths(new Date(2025, 0, 31), 1))).toBe('2025-02-28');
		expect(dateKey(shiftMonths(new Date(2025, 0, 31), -1))).toBe('2024-12-31');
	});
	it('navigates across years using local calendar days', () => {
		expect(dateKey(addDays(new Date(2024, 11, 31, 23), 1))).toBe('2025-01-01');
		expect(dateKey(addMonths(new Date(2025, 0, 31), -1))).toBe('2024-12-01');
		const date = new Date(2024, 1, 29);
		expect(dateKey(toNative(toValue(date)))).toBe('2024-02-29');
		expect(dateKey(fromIndex(monthIndex(date)))).toBe('2024-02-01');
	});
	it('keeps a six-week Sunday-first grid with consecutive dates', () => {
		for (let month = 0; month < 12; month++) {
			const weeks = makeWeeks(new Date(2024, month, 1));
			expect(weeks).toHaveLength(6);
			expect(weeks[0]![0]!.getDay()).toBe(0);
			const days = weeks.flat();
			expect(days).toHaveLength(42);
			for (let index = 1; index < days.length; index++) {
				expect(dateKey(days[index]!)).toBe(dateKey(addDays(days[index - 1]!, 1)));
			}
		}
	});
});
