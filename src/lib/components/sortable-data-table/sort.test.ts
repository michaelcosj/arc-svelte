import { describe, expect, it } from 'vite-plus/test';
import { sortRows } from './sort';

describe('table sorting', () => {
	it('keeps empty cells last and equal values stable in both directions', () => {
		const rows = [
			{ id: 'empty', v: null },
			{ id: 'a', v: 2 },
			{ id: 'b', v: 2 },
			{ id: 'c', v: 10 },
			{ id: 'blank', v: '' }
		];
		expect(sortRows(rows, { key: 'v', direction: 'asc' }).map((row) => row.id)).toEqual([
			'a',
			'b',
			'c',
			'empty',
			'blank'
		]);
		expect(sortRows(rows, { key: 'v', direction: 'desc' }).map((row) => row.id)).toEqual([
			'c',
			'a',
			'b',
			'empty',
			'blank'
		]);
	});
	it('sorts number-like labels and dates without mutating input', () => {
		const rows = [
			{ label: 'item 12', date: new Date('2026-10-01') },
			{ label: 'Item 2', date: new Date('2026-09-30') }
		];
		expect(sortRows(rows, { key: 'label', direction: 'asc' })[0]).toBe(rows[1]);
		expect(sortRows(rows, { key: 'date', direction: 'asc' })[0]).toBe(rows[1]);
		expect(rows[0]!.label).toBe('item 12');
	});
});
