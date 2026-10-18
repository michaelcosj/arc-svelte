import { describe, expect, it } from 'vite-plus/test';
import { dayKey, relative } from './time';

describe('timeline dates', () => {
	it('groups one instant by the requested calendar zone', () => {
		const time = Date.parse('2026-09-21T00:30:00Z');
		expect(dayKey(time, 'UTC')).toBe('2026-09-21');
		expect(dayKey(time, 'America/Los_Angeles')).toBe('2026-09-20');
		expect(dayKey(time, 'Asia/Tokyo')).toBe('2026-09-21');
	});
	it('keeps future events at now and switches relative units at their boundaries', () => {
		const now = Date.parse('2026-09-21T14:32:00Z');
		expect(relative(now + 1000, now)).toEqual({ short: 'Now', long: 'just now' });
		expect(relative(now - 60000, now)).toEqual({ short: '1m', long: '1 minute ago' });
		expect(relative(now - 3599999, now)).toEqual({ short: '59m', long: '59 minutes ago' });
		expect(relative(now - 3600000, now)).toEqual({ short: '1h', long: '1 hour ago' });
	});
});
