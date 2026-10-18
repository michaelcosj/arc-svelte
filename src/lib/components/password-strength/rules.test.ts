import { describe, it, expect } from 'vite-plus/test';
import { countCodePoints, createPasswordRules, estimateStrength } from './rules';
describe('password strength rules', () => {
	it('counts astral characters once and keeps varied short passwords at the first step', () => {
		expect(countCodePoints('A😀a1!')).toBe(5);
		expect(estimateStrength('A😀a1!')).toEqual({
			level: 1,
			label: 'Too short',
			met: ['case', 'number', 'symbol'],
			short: true
		});
		expect(
			estimateStrength('A😀a1!', undefined, { shortLength: 6, countCharacters: (p) => p.length })
		).toMatchObject({ level: 3, label: 'Good' });
	});
	it('supports Unicode case and numbers and custom translated length rules', () => {
		const rules = createPasswordRules({
			minLength: 8,
			labels: { length: (min) => `${min} signes` }
		});
		expect(rules[0]!.label).toBe('8 signes');
		expect(rules[0]!.remaining?.('Éé٢!😀')).toBe(3);
		expect(estimateStrength('Éé٢!😀abc', rules, { levels: { strong: 'Fort' } })).toEqual({
			level: 4,
			label: 'Fort',
			met: ['length', 'case', 'number', 'symbol']
		});
	});
	it('handles empty passwords and an empty custom rule set without invalid meter values', () => {
		expect(estimateStrength('')).toEqual({ level: 0, label: '', met: [] });
		expect(estimateStrength('long password', [])).toEqual({ level: 1, label: 'Weak', met: [] });
	});
});
