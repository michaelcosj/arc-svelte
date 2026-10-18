import { describe, expect, it } from 'vite-plus/test';
import { toEpoch, partsFor, basesFor } from './time';

describe('countdown targets', () => {
	it('resolves wall time independently of the device zone', () => {
		expect(toEpoch('2026-10-20T10:00:00')).toBe(Date.parse('2026-10-20T10:00:00Z'));
		expect(toEpoch('2026-10-20T10:00:00', 'America/Los_Angeles')).toBe(
			Date.parse('2026-10-20T17:00:00Z')
		);
		expect(toEpoch('2026-12-20T10:00:00', 'America/Los_Angeles')).toBe(
			Date.parse('2026-12-20T18:00:00Z')
		);
		expect(toEpoch('2026-10-20T10:00:00+05:30', 'America/Los_Angeles')).toBe(
			Date.parse('2026-10-20T04:30:00Z')
		);
	});
	it('preserves epochs and rejects invalid targets', () => {
		expect(toEpoch(123456)).toBe(123456);
		expect(toEpoch(new Date(123456))).toBe(123456);
		expect(Number.isNaN(toEpoch('invalid'))).toBe(true);
	});
	it('lets the largest displayed unit absorb omitted units and chooses carry wheels', () => {
		expect(partsFor(90061, ['hours', 'minutes', 'seconds']).map((p) => p.value)).toEqual([
			25, 1, 1
		]);
		expect(partsFor(90061, ['minutes', 'seconds']).map((p) => p.value)).toEqual([1501, 1]);
		expect(basesFor('seconds', false, 2)).toEqual([6, 10]);
		expect(basesFor('hours', false, 2)).toEqual([3, 10]);
		expect(basesFor('hours', true, 3)).toEqual([10, 10, 10]);
	});
});
