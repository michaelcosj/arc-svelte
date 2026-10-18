import type { ExpandingSearchItem, SearchGroup } from './types';

export function rankSearch(items: ExpandingSearchItem[], query: string, limit: number) {
	const q = query.toLocaleLowerCase();
	return items
		.flatMap((item, order) => {
			const title = item.title.toLocaleLowerCase(),
				at = title.indexOf(q);
			const extra = [item.meta ?? '', ...(item.keywords ?? [])].some((word) =>
				word.toLocaleLowerCase().includes(q)
			);
			const score =
				at === 0 ? 0 : at > 0 && /[\s\-/]/.test(title[at - 1]!) ? 1 : at > 0 ? 2 : extra ? 3 : -1;
			return score < 0 ? [] : [{ item, score, order }];
		})
		.sort((a, b) => a.score - b.score || a.order - b.order)
		.slice(0, limit)
		.map((entry) => entry.item);
}
export function groupSearch(
	list: ExpandingSearchItem[],
	source: ExpandingSearchItem[]
): SearchGroup[] {
	const order = new Map<string, number>(),
		groups = new Map<string, ExpandingSearchItem[]>();
	source.forEach((item, index) => {
		const name = item.group ?? '';
		if (!order.has(name)) order.set(name, index);
	});
	list.forEach((item) => {
		const name = item.group ?? '';
		groups.set(name, [...(groups.get(name) ?? []), item]);
	});
	return [...groups]
		.sort((a, b) => (order.get(a[0]) ?? 0) - (order.get(b[0]) ?? 0))
		.map(([name, items]) => ({ name, items }));
}
