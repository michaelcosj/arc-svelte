import type { CountdownUnit } from './types';
export const DEFAULT_UNITS: CountdownUnit[] = ['days', 'hours', 'minutes', 'seconds'];
const SECONDS: Record<CountdownUnit, number> = {
	days: 86_400,
	hours: 3_600,
	minutes: 60,
	seconds: 1
};
/** How far each unit counts before carrying into the next, when a larger unit is shown. */
const LIMIT: Record<CountdownUnit, number> = {
	days: Infinity,
	hours: 24,
	minutes: 60,
	seconds: 60
};
export const NAMES: Record<CountdownUnit, [string, string, string]> = {
	days: ['Days', 'd', 'day'],
	hours: ['Hours', 'h', 'hour'],
	minutes: ['Minutes', 'm', 'minute'],
	seconds: ['Seconds', 's', 'second']
};
export const MAX_TIMEOUT = 2_147_483_647;
export const systemClock = () => Date.now();

/** Offset of a zone from UTC at an instant, in milliseconds. */
function zoneOffset(epoch: number, timeZone: string) {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	}).formatToParts(new Date(epoch));
	const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
	return (
		Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')) -
		Math.floor(epoch / 1000) * 1000
	);
}

/** Resolves a countdown target to epoch milliseconds without ever reading the device's own time zone. */
export function toEpoch(target: Date | number | string, timeZone?: string) {
	if (typeof target === 'number') return target;
	if (target instanceof Date) return target.getTime();
	const wall = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?$/.exec(
		target.trim()
	);
	if (!wall) return Date.parse(target);
	const utc = Date.UTC(
		+wall[1]!,
		+wall[2]! - 1,
		+wall[3]!,
		+(wall[4] ?? 0),
		+(wall[5] ?? 0),
		+(wall[6] ?? 0)
	);
	if (!timeZone) return utc;
	// Two passes settle the offset across a daylight saving change.
	const guess = utc - zoneOffset(utc, timeZone);
	return utc - zoneOffset(guess, timeZone);
}

/** Whole seconds left, split across the units on show. */
export function partsFor(seconds: number, units: CountdownUnit[]) {
	return units.map((unit, index) => ({
		unit,
		value:
			index === 0
				? Math.floor(seconds / SECONDS[unit])
				: Math.floor(seconds / SECONDS[unit]) % LIMIT[unit]
	}));
}

/** Wheel sizes per column: a tens column that only ever shows 0 to 5 turns on a six-digit wheel, so 00 → 59 is a single step. */
export function basesFor(unit: CountdownUnit, largest: boolean, length: number) {
	return Array.from({ length }, (_, index) => {
		const tens = index === length - 2 && length === 2 && !largest;
		return tens ? (unit === 'hours' ? 3 : 6) : 10;
	});
}
