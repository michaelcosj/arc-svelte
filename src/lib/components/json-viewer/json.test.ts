import { expect, it } from 'vite-plus/test';
import { childPath, searchJson, branchesToDepth } from './json';
it('uses unambiguous paths for punctuation and array indexes', () => {
	expect(childPath('root', 'a.b')).toBe('root["a.b"]');
	expect(childPath('root', 2)).toBe('root[2]');
	expect(childPath('root', 'a')).toBe('root.a');
});
it('opens and pages deeply nested matches without changing input', () => {
	const data = {
		items: Array.from({ length: 80 }, (_, i) => ({ label: i === 73 ? 'Refund requested' : 'Paid' }))
	};
	const result = searchJson(data, 'root', 'refund');
	expect(result.matches).toEqual(['root.items[73].label']);
	expect(result.needed.get('root.items')).toBe(74);
	expect([...result.ancestors]).toEqual(['root', 'root.items', 'root.items[73]']);
	expect(branchesToDepth(data, 'root', 1)).toEqual(['root']);
});
