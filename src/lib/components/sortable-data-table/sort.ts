import type { SortState } from './types';

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
export const isEmptyCell = (value: unknown) => value == null || value === '';
const comparable = (value: unknown) => (value instanceof Date ? value.getTime() : value);
const cellText = (value: unknown) => String(value);

export function sortRows<T extends Record<string, unknown>>(rows: T[], sort: SortState | null) {
	if (!sort) return rows;
	return rows
		.map((row, index) => ({ row, index }))
		.sort((a, b) => {
			const left = comparable(a.row[sort.key]),
				right = comparable(b.row[sort.key]);
			if (isEmptyCell(left) || isEmptyCell(right))
				return isEmptyCell(left) === isEmptyCell(right)
					? a.index - b.index
					: isEmptyCell(left)
						? 1
						: -1;
			const result =
				typeof left === 'number' && typeof right === 'number'
					? left - right
					: collator.compare(cellText(left), cellText(right));
			return (sort.direction === 'asc' ? result : -result) || a.index - b.index;
		})
		.map((entry) => entry.row);
}
