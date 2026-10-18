import type { DateRange, DateRangePreset } from './types';
export const DAY = 864e5;
export const startOfDay = (date: Date) =>
	new Date(date.getFullYear(), date.getMonth(), date.getDate());
export const monthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
export const monthEnd = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
export const addDays = (date: Date, amount: number) =>
	new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
export const addMonths = (date: Date, amount: number) =>
	new Date(date.getFullYear(), date.getMonth() + amount, 1);
export const shiftMonths = (date: Date, amount: number) =>
	new Date(
		date.getFullYear(),
		date.getMonth() + amount,
		Math.min(
			date.getDate(),
			new Date(date.getFullYear(), date.getMonth() + amount + 1, 0).getDate()
		)
	);
export const dayDiff = (a: Date, b: Date) =>
	Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / DAY);
export const monthDiff = (a: Date, b: Date) =>
	(a.getFullYear() - b.getFullYear()) * 12 + a.getMonth() - b.getMonth();
export const sameDay = (a?: Date | null, b?: Date | null) => Boolean(a && b && dayDiff(a, b) === 0);
export const keyOf = (date: Date) =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const fromKey = (key: string) => {
	const [year, month, day] = key.split('-').map(Number);
	return new Date(year!, month! - 1, day!);
};
export const ordered = (a: Date, b: Date): DateRange =>
	dayDiff(a, b) <= 0 ? { start: a, end: b } : { start: b, end: a };
export const sameRange = (a?: DateRange | null, b?: DateRange | null) =>
	Boolean(a && b && sameDay(a.start, b.start) && sameDay(a.end, b.end));
export const clampDate = (date: Date, min?: Date, max?: Date) =>
	min && dayDiff(date, min) < 0
		? startOfDay(min)
		: max && dayDiff(date, max) > 0
			? startOfDay(max)
			: date;

export const defaultDateRangePresets: DateRangePreset[] = [
	{ label: 'Today', range: (today) => ({ start: today, end: today }) },
	{
		label: 'Yesterday',
		range: (today) => ({ start: addDays(today, -1), end: addDays(today, -1) })
	},
	{ label: 'Last 7 days', range: (today) => ({ start: addDays(today, -6), end: today }) },
	{ label: 'Last 30 days', range: (today) => ({ start: addDays(today, -29), end: today }) },
	{ label: 'This month', range: (today) => ({ start: monthStart(today), end: today }) },
	{
		label: 'Last month',
		range: (today) => ({ start: addMonths(today, -1), end: monthEnd(addMonths(today, -1)) })
	},
	{
		label: 'This quarter',
		range: (today) => ({
			start: new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1),
			end: today
		})
	},
	{
		label: 'Year to date',
		range: (today) => ({ start: new Date(today.getFullYear(), 0, 1), end: today })
	}
];
