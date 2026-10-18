import { CalendarDate, type DateValue } from '@internationalized/date';

export const startOfDay = (date: Date) =>
	new Date(date.getFullYear(), date.getMonth(), date.getDate());
export const monthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
export const sameDay = (a?: Date, b?: Date) =>
	Boolean(
		a &&
		b &&
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
export const sameMonth = (a?: Date, b?: Date) =>
	Boolean(a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth());
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
export const dateKey = (date: Date) =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const toValue = (date: Date) =>
	new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
export const toNative = (date: DateValue) => new Date(date.year, date.month - 1, date.day);
export const monthIndex = (date: Date) => date.getFullYear() * 12 + date.getMonth();
export const fromIndex = (index: number) =>
	new Date(Math.floor(index / 12), ((index % 12) + 12) % 12, 1);
export const makeWeeks = (month: Date) => {
	const start = addDays(month, -month.getDay());
	return Array.from({ length: 6 }, (_, week) =>
		Array.from({ length: 7 }, (_, day) => addDays(start, week * 7 + day))
	);
};
