import { it, expect } from 'vite-plus/test';
import { shiftMonths, ordered, dayDiff, defaultDateRangePresets } from './dates';
it('keeps month navigation on valid dates and orders reversed selection', () => {
	const jan = new Date(2024, 0, 31),
		feb = shiftMonths(jan, 1);
	expect([feb.getMonth(), feb.getDate()]).toEqual([1, 29]);
	const range = ordered(feb, jan);
	expect(dayDiff(range.end, range.start)).toBe(29);
});
it('uses inclusive seven-day presets across year boundaries', () => {
	const today = new Date(2026, 0, 2),
		preset = defaultDateRangePresets.find((p) => p.label === 'Last 7 days')!,
		range = preset.range(today);
	expect(dayDiff(range.end, range.start)).toBe(6);
	expect(range.start.getFullYear()).toBe(2025);
});
