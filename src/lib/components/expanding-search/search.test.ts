import { describe, expect, it } from 'vite-plus/test';
import { groupSearch, rankSearch } from './search';

describe('expanding search ranking', () => {
	const items = [
		{ id: 'extra', title: 'API limits', meta: 'Billing', group: 'Docs' },
		{ id: 'inside', title: 'Rebilling', group: 'Docs' },
		{ id: 'word', title: 'Customer billing', group: 'Projects' },
		{ id: 'start', title: 'Billing migration', group: 'Projects' },
		{ id: 'tie', title: 'Billing FAQ', group: 'Docs' }
	];
	it('ranks title starts, word starts, inside-title and metadata in stable order', () => {
		expect(rankSearch(items, 'billing', 5).map((item) => item.id)).toEqual([
			'start',
			'tie',
			'word',
			'inside',
			'extra'
		]);
		expect(rankSearch(items, 'billing', 2).map((item) => item.id)).toEqual(['start', 'tie']);
	});
	it('uses source group order after ranking and limiting', () => {
		const groups = groupSearch(rankSearch(items, 'billing', 3), items);
		expect(groups.map((group) => [group.name, group.items.map((item) => item.id)])).toEqual([
			['Docs', ['tie']],
			['Projects', ['start', 'word']]
		]);
	});
});
